import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { TRPCError } from "@trpc/server";
import { getPortoneClient, isPortoneCheckoutReady } from "./portone";
import {
  buildMerchantPaymentId,
  decidePaymentValidity,
} from "./paymentVerification";
import { ENV } from "./env";
import * as db from "../db";

/**
 * 플랜별 금액/기간/표시명. routers.ts의 PLAN_CONFIG와 동일하게 유지.
 */
// 질문 횟수제: turns=구매 질문 횟수(null=시간제). routers.ts PLAN_CONFIG와 동일하게 유지.
const PLAN_CONFIG = {
  free: { amount: 0, durationMinutes: 1440, turns: 3, label: "원픽 무료 상담" },
  taste: { amount: 9900, durationMinutes: 1440, turns: 20, label: "맛보기 상담" },
  event: { amount: 0, durationMinutes: 1440, turns: 10, label: "이벤트 상담" },
  deep: { amount: 14900, durationMinutes: 1440, turns: 30, label: "메인 상담" },
  master_chat: { amount: 100000, durationMinutes: 60, turns: null, label: "마스터 채팅 상담" },
  master_offline: { amount: 200000, durationMinutes: 80, turns: null, label: "마스터 대면 상담" },
  compatibility: { amount: 7900, durationMinutes: 0, turns: null, label: "궁합 분석" },
  compatibility_chat: { amount: 7900, durationMinutes: 1440, turns: 10, label: "궁합 채팅 상담" },
  master_kakao_15: { amount: 30000, durationMinutes: 15, turns: 0, label: "마스터 직접 채팅 15분" },
  master_kakao_30: { amount: 50000, durationMinutes: 30, turns: 0, label: "마스터 직접 채팅 30분" },
  master_kakao_60: { amount: 100000, durationMinutes: 60, turns: 0, label: "마스터 직접 채팅 60분" },
  self_naming: { amount: 50000, durationMinutes: 0, turns: null, label: "셀프 작명 1회 이용권" },
  master_naming: { amount: 300000, durationMinutes: 0, turns: null, label: "마스터 작명 1회 이용권" },
} as const;

type PlanType = keyof typeof PLAN_CONFIG;

const planSchema = z.enum(["free", "taste", "event", "deep", "master_chat", "master_offline", "compatibility", "compatibility_chat", "master_kakao_15", "master_kakao_30", "master_kakao_60", "self_naming", "master_naming"]);

/**
 * 결제 완료(검증 성공) 후 플랜에 따라 세션을 생성하거나 예약 단계로 보낸다.
 * mockPay와 동일한 다운스트림 규칙을 공유한다.
 */
async function fulfillPaidPlan(params: {
  userId: number;
  planType: PlanType;
  paymentId: number;
  sajuProfileId?: number;
  sajuProfileBId?: number;
}) {
  const cfg = PLAN_CONFIG[params.planType];

  // 마스터 직접/오프라인은 세션이 아닌 예약(대면/통화)으로 이어진다.
  if (params.planType === "master_chat" || params.planType === "master_offline") {
    return { paymentId: params.paymentId, requiresAppointment: true } as const;
  }

  // 궁합(단발성)은 상담 세션을 만들지 않는다. "결제 1건 = 분석 1회" 자격만 확보하고,
  // 실제 분석은 compatibility.analyze에서 이 paymentId를 소비하며 수행한다.
  if (params.planType === "compatibility") {
    return { paymentId: params.paymentId, requiresAppointment: false, compatibility: true } as const;
  }

  // 셀프작명은 채팅 세션 없이 결제 즉시 30일 라이선스가 시작된다.
  // payments.paidAt이 이미 기록되어 있으므로 별도 처리 없이 여기서 바로 반환.
  if (params.planType === "self_naming" || params.planType === "master_naming") {
    return { paymentId: params.paymentId, requiresAppointment: false, namingLicense: true } as const;
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + cfg.durationMinutes * 60 * 1000);
  const sessionId = await db.createConsultSession({
    userId: params.userId,
    sajuProfileId: params.sajuProfileId,
    sajuProfileBId: params.planType === "compatibility_chat" ? (params.sajuProfileBId ?? null) : null,
    paymentId: params.paymentId,
    planType: params.planType,
    durationMinutes: cfg.durationMinutes,
    maxTurns: (cfg as { turns: number | null }).turns,
    usedTurns: 0,
    startedAt,
    expiresAt,
    status: "active",
    title: `${cfg.label} 상담`,
  });
  return { paymentId: params.paymentId, sessionId, requiresAppointment: false } as const;
}

/**
 * 포트원 V2 인증 결제 라우터.
 *
 * 흐름:
 *  1) prepare: 서버가 pending 결제 기록을 만들고, 결제창 호출에 필요한 정보를 반환한다.
 *  2) (클라이언트) 포트원 SDK로 결제창을 띄워 결제한다.
 *  3) verify: 클라이언트가 paymentKey(=우리가 만든 merchantPaymentId)를 전달하면,
 *     서버가 포트원 단건조회 API로 PAID/금액을 검증하고 세션/예약으로 이어준다.
 *  4) cancel: 결제 취소(환불).
 */
export const portoneRouter = router({
  /**
   * 결제창 호출에 필요한 키가 준비됐는지 확인 (프론트에서 버튼 활성화 판단용).
   */
  config: protectedProcedure.query(() => {
    return {
      ready: isPortoneCheckoutReady(),
      storeId: ENV.portoneStoreId || null,
      channelKey: ENV.portoneChannelKey || null,
    };
  }),

  /**
   * 결제 준비: pending 결제 기록 생성 + 결제창 파라미터 반환.
   */
  prepare: protectedProcedure
    .input(
      z.object({
        planType: planSchema,
        sajuProfileId: z.number().int().optional(),
        eventCode: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isPortoneCheckoutReady()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "결제 채널이 아직 연동되지 않았습니다. 포트원 콘솔에서 PG 채널을 연동한 뒤 다시 시도해 주세요.",
        });
      }

      const cfg = PLAN_CONFIG[input.planType];

      // event 플랜: 시크릿 코드 검증
      if (input.planType === "event") {
        if (!input.eventCode) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "시크릿 코드가 필요합니다.",
          });
        }
        const isValid = await db.validateAndUseEventCode(input.eventCode, ctx.user.id);
        if (!isValid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "유효하지 않은 또는 이미 사용된 시크릿 코드입니다.",
          });
        }
      }

      // 무료 플랜은 결제창을 띄우지 않는다(별도 무료 흐름 사용).
      if (input.planType === "free" || cfg.amount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "무료 상담은 결제가 필요하지 않습니다.",
        });
      }

      // pending 결제 기록 생성
      const paymentId = await db.createPayment({
        userId: ctx.user.id,
        planType: input.planType,
        amount: cfg.amount,
        status: "pending",
        paymentMethod: "portone",
      });
      if (!paymentId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "결제 기록 생성 실패" });
      }

      // 포트원에 전달할 고유 결제 ID (중복 결제 방지 위해 paymentId+timestamp 조합)
      const merchantPaymentId = buildMerchantPaymentId(ctx.user.id, paymentId);

      // 발급한 merchantPaymentId를 externalPaymentId에 미리 저장(검증 시 매칭용)
      await db.updatePayment(paymentId, { externalPaymentId: merchantPaymentId });

      return {
        paymentId,
        merchantPaymentId,
        storeId: ENV.portoneStoreId,
        channelKey: ENV.portoneChannelKey,
        orderName: cfg.label,
        amount: cfg.amount,
        currency: "KRW" as const,
        planType: input.planType,
        customer: {
          fullName: ctx.user.name ?? undefined,
          email: ctx.user.email ?? undefined,
          phoneNumber: ctx.user.phone ?? undefined,
        },
      };
    }),

  /**
   * 결제 검증: 포트원 단건조회로 PAID/금액을 확인한 뒤 세션/예약으로 이어준다.
   */
  verify: protectedProcedure
    .input(
      z.object({
        paymentId: z.number().int(),
        merchantPaymentId: z.string().min(1),
        sajuProfileId: z.number().int().optional(),
        sajuProfileBId: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await db.getPaymentById(input.paymentId);
      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "결제 기록을 찾을 수 없습니다." });
      }
      if (payment.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다." });
      }

      // 이미 처리된 결제면 그대로 성공 반환(중복 검증 방지)
      if (payment.status === "paid") {
        return fulfillPaidPlan({
          userId: ctx.user.id,
          planType: payment.planType as PlanType,
          paymentId: payment.id,
          sajuProfileId: input.sajuProfileId,
          sajuProfileBId: input.sajuProfileBId,
        });
      }

      // prepare에서 저장한 merchantPaymentId와 일치하는지 확인(위변조 방지)
      if (payment.externalPaymentId && payment.externalPaymentId !== input.merchantPaymentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "결제 식별자가 일치하지 않습니다." });
      }

      const client = getPortoneClient();
      let portonePayment;
      try {
        portonePayment = await client.getPayment(input.merchantPaymentId);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "포트원 결제 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        });
      }

      // 상태/금액 검증(위변조 방지)
      const decision = decidePaymentValidity({
        portoneStatus: portonePayment.status,
        paidTotal: portonePayment.amount?.total,
        expectedAmount: payment.amount,
      });
      if (!decision.ok) {
        if (decision.reason === "not_paid") {
          await db.updatePayment(input.paymentId, { status: "failed" });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `결제가 완료되지 않았습니다. (상태: ${portonePayment.status})`,
          });
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "결제 금액이 일치하지 않습니다.",
        });
      }

      // 검증 통과 → paid 처리
      await db.updatePayment(input.paymentId, {
        status: "paid",
        paymentMethod: portonePayment.method?.type ?? "portone",
        externalPaymentId: input.merchantPaymentId,
        paidAt: new Date(),
      });

      return fulfillPaidPlan({
        userId: ctx.user.id,
        planType: payment.planType as PlanType,
        paymentId: payment.id,
        sajuProfileId: input.sajuProfileId,
        sajuProfileBId: input.sajuProfileBId,
      });
    }),

  /**
   * 결제 취소(환불).
   */
  cancel: protectedProcedure
    .input(z.object({ paymentId: z.number().int(), reason: z.string().max(200).optional() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await db.getPaymentById(input.paymentId);
      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "결제 기록을 찾을 수 없습니다." });
      }
      if (payment.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "권한이 없습니다." });
      }
      if (payment.status !== "paid") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "취소할 수 없는 결제 상태입니다." });
      }
      if (!payment.externalPaymentId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "결제 식별자가 없습니다." });
      }

      const client = getPortoneClient();
      try {
        await client.cancelPayment(payment.externalPaymentId, { reason: input.reason });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "결제 취소에 실패했습니다. 고객센터에 문의해 주세요.",
        });
      }

      await db.updatePayment(input.paymentId, { status: "refunded" });
      return { success: true } as const;
    }),
});
