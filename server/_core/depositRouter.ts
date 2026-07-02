import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./trpc";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./notification";
import { sendMasterSms, sendCustomerSms } from "./sms";
import * as db from "../db";
import { USAGE_WINDOW_MS } from "@shared/const";

/**
 * 무통장 입금 트랙 라우터.
 *
 * 카드결제(portoneRouter)와 완전히 분리된 별도 트랙으로, 토스페이먼츠/카드결제가
 * 활성화되기 전까지의 임시 운영 방식이다. 기존 흐름은 일절 건드리지 않는다.
 *
 * 흐름:
 *  1) requestDeposit (고객): 입금 신청 → 결제기록(awaiting_deposit) + 세션(awaiting_payment) 생성.
 *     이 시점에는 시간 카운트가 시작되지 않는다(startedAt/expiresAt은 임시 placeholder).
 *     마스터에게 알림(notifyOwner + SMS 자리) 발송.
 *  2) approve (운영자): 입금 확인 → 세션을 approved로, approvedAt 기록, enterBy = 승인+3일(72시간).
 *     결제기록은 paid로. 여전히 카운트 시작 안 함. 승인 시 고객에게도 알림 발송.
 *  3) enterSession (고객): 채팅방 첫 입장 → 이 순간 startedAt 찍고 expiresAt = startedAt + duration,
 *     status를 active로 전환. 3일(enterBy)이 지났으면 입장 불가(소멸).
 *  4) listAwaiting (운영자): 승인 대기 목록 조회.
 */

// 질문 횟수제: turns=구매 질문 횟수. routers.ts PLAN_CONFIG와 동일하게 유지.
const PLAN_CONFIG = {
  taste: { amount: 9900, durationMinutes: 1440, turns: 20, label: "맛보기 상담" },
  deep: { amount: 14900, durationMinutes: 1440, turns: 30, label: "메인 상담" },
  compatibility_chat: { amount: 7900, durationMinutes: 1440, turns: 10, label: "궁합 채팅 상담" },
  master_kakao_15: { amount: 30000, durationMinutes: 15, turns: 0, label: "마스터 카카오 채팅 15분" },
  master_kakao_30: { amount: 60000, durationMinutes: 30, turns: 0, label: "마스터 카카오 채팅 30분" },
  master_kakao_60: { amount: 100000, durationMinutes: 60, turns: 0, label: "마스터 카카오 채팅 60분" },
} as const;

type DepositPlan = keyof typeof PLAN_CONFIG;

const depositPlanSchema = z.enum(["taste", "deep", "master_kakao_15", "master_kakao_30", "master_kakao_60", "compatibility_chat"]);

// 승인 후 입장 유효기간 (3일 = 72시간)
const ENTER_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
// awaiting_payment 세션의 임시 placeholder 만료값(먼 미래). 실제 카운트는 입장 시 확정.
// MySQL TIMESTAMP 최대값은 2038-01-19. 100년 뒤(2126) 등은 범위를 초과해 INSERT가 실패한다.
// awaiting_payment 상태에서는 카운트하지 않고, 실제 만료는 승인·입장 시 재확정하므로 placeholder는 +1년이면 충분하다.
const PLACEHOLDER_FAR_FUTURE_MS = 365 * 24 * 60 * 60 * 1000;

export const depositRouter = router({
  /**
   * 고객: 무통장 입금 신청. 세션을 awaiting_payment로 생성하고 마스터에게 알린다.
   */
  requestDeposit: protectedProcedure
    .input(
      z.object({
        planType: depositPlanSchema,
        sajuProfileId: z.number().int().optional(),
        sajuProfileBId: z.number().int().optional(),
        depositorName: z.string().min(1).max(64),
        depositorPhone: z
          .string()
          .trim()
          .regex(/^0\d{1,2}-?\d{3,4}-?\d{4}$/, "올바른 휴대폰 번호를 입력해 주세요.")
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cfg = PLAN_CONFIG[input.planType];

      // 맛보기/메인(taste/deep)은 사주 선택 없이 결제한다.
      // 상담할 사주는 채팅방 입장 후 대화로 받는다(시간제·인원 무제한 가치 보존).
      // 궁합 채팅만 두 사주가 본질이므로 두 프로필을 요구한다.
      if (input.planType === "compatibility_chat" && (!input.sajuProfileId || !input.sajuProfileBId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "궁합 채팅은 두 사주 프로필이 필요합니다." });
      }

      // 결제 기록(입금 대기) 생성
      const paymentId = await db.createPayment({
        userId: ctx.user.id,
        planType: input.planType,
        amount: cfg.amount,
        status: "awaiting_deposit",
        paymentMethod: "bank_transfer",
        depositorName: input.depositorName,
        depositorPhone: input.depositorPhone ?? null,
      });
      if (!paymentId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "결제 기록 생성 실패" });
      }

      // 세션을 awaiting_payment로 생성. startedAt/expiresAt은 placeholder(아직 카운트 안 함).
      const now = new Date();
      const placeholderExpires = new Date(now.getTime() + PLACEHOLDER_FAR_FUTURE_MS);
      const sessionId = await db.createConsultSession({
        userId: ctx.user.id,
        sajuProfileId: input.sajuProfileId ?? null,
        sajuProfileBId: input.planType === "compatibility_chat" ? (input.sajuProfileBId ?? null) : null,
        paymentId,
        planType: input.planType,
        durationMinutes: cfg.durationMinutes,
        maxTurns: cfg.turns,
        usedTurns: 0,
        startedAt: now,
        expiresAt: placeholderExpires,
        status: "awaiting_payment",
        title: `${cfg.label} 상담`,
      });
      if (!sessionId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "상담 세션 생성 실패" });
      }

      // 마스터 알림 (무료 Manus 알림 + SMS 자리)
      const smsBody =
        `[휴먼프리즘] 새 입금 상담 신청\n` +
        `· 상품: ${cfg.label} (${cfg.amount.toLocaleString()}원)\n` +
        `· 입금자명: ${input.depositorName}\n` +
        `· 연락처: ${input.depositorPhone ?? "(미입력)"}\n` +
        `· 회원ID: ${ctx.user.id} (${ctx.user.name ?? ""})\n` +
        `운영실에서 입금 확인 후 승인해 주세요.`;
      // 알림 실패가 신청 자체를 막지 않도록 안전 처리
      try {
        await notifyOwner({ title: "[휴먼프리즘] 새 입금 상담 신청", content: smsBody });
      } catch (e) {
        console.warn("[deposit] notifyOwner 실패:", e);
      }
      try {
        await sendMasterSms(smsBody);
      } catch (e) {
        console.warn("[deposit] sendMasterSms 실패:", e);
      }

      return { paymentId, sessionId } as const;
    }),

  /**
   * 운영자: 승인 대기 목록 조회.
   */
  listAwaiting: adminProcedure.query(() => db.listAwaitingDepositSessions()),

  /**
   * 운영자: 입금 확인·승인. 세션을 approved로, enterBy = 승인 + 3일(72시간).
   * 승인 시 고객에게도 알림을 보내 입장을 유도한다.
   */
  approve: adminProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .mutation(async ({ input }) => {
      const s = await db.getConsultSessionById(input.sessionId);
      if (!s) {
        throw new TRPCError({ code: "NOT_FOUND", message: "세션을 찾을 수 없습니다." });
      }
      if (s.status !== "awaiting_payment") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "승인 대기 상태가 아닙니다." });
      }
      const approvedAt = new Date();
      const enterBy = new Date(approvedAt.getTime() + ENTER_WINDOW_MS);
      await db.updateConsultSession(input.sessionId, {
        status: "approved",
        approvedAt,
        enterBy,
      });
      // 결제기록을 paid로
      if (s.paymentId) {
        await db.updatePayment(s.paymentId, { status: "paid", paidAt: approvedAt });
      }

      // 고객에게 승인 알림 발송 (놓치지 않도록 입장 유도).
      // 현재는 알리고 SMS 단일 채널로 통일한다(키 주입 전까지는 안전하게 skip).
      const enterByStr = enterBy.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
      const customerMsg =
        `[휴먼프리즘] 입금이 확인되어 상담이 승인되었습니다.\n` +
        `· 상품: ${s.title ?? "상담"}\n` +
        `· 입장 가능 기한: ${enterByStr}까지 (승인 후 72시간)\n` +
        `기한 내 채팅방에 입장하지 않으면 상담은 자동 소멸되며 환불되지 않습니다. 지금 입장해 주세요.\n` +
        `※ 입장(첫 질문) 후에는 72시간(3일) 안에 남은 질문을 사용해 주세요. 기간이 지나면 남은 질문이 있어도 종료됩니다.`;
      try {
        // 고객 SMS (알리고 키 주입 전까지는 안전하게 skip).
        // 입금 신청 시 고객이 남긴 연락처(payment.depositorPhone)로 발송.
        let customerPhone: string | null = null;
        if (s.paymentId) {
          const pay = await db.getPaymentById?.(s.paymentId);
          customerPhone = (pay?.depositorPhone as string | undefined) ?? null;
        }
        await sendCustomerSms(customerPhone, customerMsg);
      } catch (e) {
        console.warn("[deposit] 고객 SMS 실패:", e);
      }

      return { success: true, enterBy } as const;
    }),

  /**
   * 운영자: 입금 신청 거절(반려). 세션·결제를 취소 상태로.
   */
  reject: adminProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .mutation(async ({ input }) => {
      const s = await db.getConsultSessionById(input.sessionId);
      if (!s) {
        throw new TRPCError({ code: "NOT_FOUND", message: "세션을 찾을 수 없습니다." });
      }
      await db.updateConsultSession(input.sessionId, { status: "completed", endedAt: new Date() });
      if (s.paymentId) {
        await db.updatePayment(s.paymentId, { status: "failed" });
      }
      return { success: true } as const;
    }),

  /**
   * 고객: 채팅방 첫 입장. 이 순간부터 시간 카운트 시작.
   * - approved 상태이고 enterBy 이내여야 입장 가능.
   * - 첫 입장: startedAt=now, expiresAt=now+duration, status=active, firstEnteredAt=now.
   * - 이미 active면 그대로 통과(재입장).
   */
  enterSession: protectedProcedure
    .input(z.object({ sessionId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const s = await db.getConsultSessionById(input.sessionId);
      if (!s || s.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "세션을 찾을 수 없습니다." });
      }

      // 이미 활성화된 세션(이미 입장함) → 그대로 진행
      if (s.status === "active" || s.status === "completed" || s.status === "expired") {
        return { status: s.status, alreadyStarted: true } as const;
      }

      // 아직 승인 전
      if (s.status === "awaiting_payment") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "입금 확인 후 마스터의 승인을 기다리고 있습니다. 승인되면 입장하실 수 있습니다.",
        });
      }

      // approved 상태 → 첫 입장 처리
      if (s.status === "approved") {
        const now = new Date();
        // 3일(72시간) 유효기간 경과 체크
        if (s.enterBy && now.getTime() > new Date(s.enterBy).getTime()) {
          await db.updateConsultSession(input.sessionId, { status: "expired", endedAt: now });
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "입장 유효기간(승인 후 72시간)이 지나 상담이 소멸되었습니다.",
          });
        }
        const startedAt = now;
        // 횟수제 세션의 실제 통제는 maxTurns(남은 질문)와 이용 기한(첫 입장+72h)이다.
        // expiresAt도 firstEnteredAt+72h와 일치시켜 두 기준이 어깇나지 않도록 한다.
        const expiresAt = new Date(startedAt.getTime() + USAGE_WINDOW_MS);
        await db.updateConsultSession(input.sessionId, {
          status: "active",
          startedAt,
          expiresAt,
          firstEnteredAt: startedAt,
        });
        return { status: "active", alreadyStarted: false, expiresAt } as const;
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: "입장할 수 없는 상태입니다." });
    }),
});
