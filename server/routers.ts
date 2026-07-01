import { COOKIE_NAME, RECORD_RETENTION_MS, USAGE_WINDOW_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { invokeClaudeAPI } from "./claude-api";
import { invokeClaudeWithRag, invokeClaudeWithRagLayers } from "./claude-api-rag";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { buildInitialGreeting, buildSystemPrompt, buildCompatibilityPrompt, buildCompatibilityRagContext, buildPersonalPromptLayers, buildCompatibilityPromptLayers } from "./masterPrompt";
import { formatSajuForPrompt } from "./saju";
import { calculateSaju, lunarToSolar, getCurrentSajuYear, type SajuInput } from "./saju";
import { buildTemporalContext } from "./temporalContext";
import { buildAnswerKey, verifySajuClaims, formatVerifyErrorsForRetry, checkClearGodOmission, buildExtraStemAnswerKey } from "./sajuVerify";
import { generateSajuPDF, generateSajuHtmlFile } from "./pdf";
import { generateConsultationPDF, generateConsultationHtmlFile } from "./consultPdf";
import { portoneRouter } from "./_core/portoneRouter";
import { depositRouter } from "./_core/depositRouter";
import { csRouter } from "./routers/cs";
import { handleAppointmentStatusNotification } from "./appointmentNotification";
import { refundRouter } from "./refundRouter";
import { statsRouter } from "./statsRouter";
import { namingRouter } from "./naming/router";
// ===== Plan / Pricing =====
// 질문 횟수제 전환:
//  - turns = 구매 질문 횟수 (AI 상담 차감 단위). null = 시간제(마스터 직접 상담).
//  - durationMinutes = 레거시/시간제 만료 기준. 횟수제 세션에서도 안전장치로 넉넉히 유지.
const PLAN_CONFIG = {
  free: { amount: 0, durationMinutes: 1440, turns: 3, label: "원픽 무료 상담" },
  taste: { amount: 9900, durationMinutes: 1440, turns: 20, label: "맛보기 상담" },
  event: { amount: 0, durationMinutes: 1440, turns: 10, label: "이벤트 상담" },
  deep: { amount: 14900, durationMinutes: 1440, turns: 30, label: "메인 상담" },
  master_chat: { amount: 100000, durationMinutes: 60, turns: null, label: "마스터 채팅 상담" },
  master_offline: { amount: 200000, durationMinutes: 80, turns: null, label: "마스터 대면 상담" },
  compatibility_chat: { amount: 7900, durationMinutes: 1440, turns: 10, label: "궁합 채팅 상담" },
} as const;
type PlanType = keyof typeof PLAN_CONFIG;
const planSchema = z.enum(["free", "taste", "event", "deep", "master_chat", "master_offline", "compatibility_chat"]);
const sajuInputSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23).nullable().optional(),
  minute: z.number().int().min(0).max(59).nullable().optional(),
  gender: z.enum(["male", "female"]),
  calendarType: z.enum(["solar", "lunar"]).optional(),
  isLeapMonth: z.boolean().optional(),
});
/**
 * 사주 계산용 양력 입력을 만든다.
 * 음력 입력이면 만세력 기준으로 양력 날짜로 변환한다.
 * 사주 계산은 반드시 양력(절기) 기준이어야 정확하다.
 */
function toSolarSajuInput<T extends z.infer<typeof sajuInputSchema>>(input: T): SajuInput {
  if (input.calendarType === "lunar") {
    const solar = lunarToSolar(input.year, input.month, input.day, input.isLeapMonth ?? false);
    return {
      ...input,
      year: solar.year,
      month: solar.month,
      day: solar.day,
    } as SajuInput;
  }
  return input as SajuInput;
}
// ===== Routers =====
/**
 * 운영자 계정 통합용 소유권 판정.
 * - 일반 사용자: 본인 id와 일치해야만 허용 (기존 동작 동일).
 * - 운영자(admin): 모든 운영자 계정(카카오/지메일/네이버)의 데이터에 접근 허용.
 * rowUserId가 null/undefined면 허용(소유자 없는 행). 그 외엔 소유 여부를 검사한다.
 */
async function canAccessRow(
  ctx: { user: { id: number; role: "user" | "admin" } },
  rowUserId: number | null | undefined,
): Promise<boolean> {
  const isAdmin = ctx.user.role === "admin";
  if (rowUserId == null) return false;
  if (rowUserId === ctx.user.id) return true;
  // 일반 사용자는 본인 id만 허용(DB 조회 불필요, 기존 동작과 동일).
  if (!isAdmin) return false;
  // 운영자는 운영자 계정 전체 데이터에 접근 허용.
  const ownerIds = await db.getOwnerUserIds();
  return ownerIds.includes(rowUserId);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      const base = getSessionCookieOptions(ctx.req);
      const hostname = ctx.req.hostname || "";

      // 명시적으로 설정될 수 있는 모든 domain 변형을 수집
      // (로그인 시 domain과 정확히 일치해야 브라우저가 삭제함)
      const domainList: (string | undefined)[] = [base.domain, undefined];
      if (hostname.includes("sg1.manus.computer")) {
        domainList.push(".sg1.manus.computer");
      }
      if (hostname.includes("manus.computer")) {
        domainList.push(".manus.computer");
      }
      if (hostname && !hostname.startsWith(".")) {
        domainList.push(`.${hostname}`, hostname);
      }
      const domainVariants = Array.from(new Set(domainList));

      // secure 두 가지 경우(true/false) 모두 만료시켜 속성 불일치로 인한 삭제 실패 방지
      const secureVariants = Array.from(new Set([base.secure === true, true, false]));

      for (const domain of domainVariants) {
        for (const secure of secureVariants) {
          const opts = {
            domain,
            httpOnly: true as const,
            path: "/" as const,
            sameSite: "none" as const,
            secure,
          };
          // clearCookie + 명시적 과거 expires 두 방법 병행
          ctx.res.clearCookie(COOKIE_NAME, opts);
          ctx.res.cookie(COOKIE_NAME, "", {
            ...opts,
            expires: new Date(0),
            maxAge: 0,
          });
        }
      }
      return { success: true } as const;
    }),
    updateProfile: protectedProcedure
      .input(
        z.object({
          phone: z.string().max(32).optional(),
          nickname: z.string().max(64).optional(),
          realName: z.string().max(64).optional(),
          consentRecord: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const patch: Parameters<typeof db.updateUserProfile>[1] = { ...input };
        if (input.consentRecord !== undefined) {
          patch.consentRecordAt = input.consentRecord ? new Date() : null;
        }
        await db.updateUserProfile(ctx.user.id, patch);
        return { success: true } as const;
      }),
  }),
  plans: publicProcedure.query(() => {
    return Object.entries(PLAN_CONFIG).map(([key, v]) => ({
      planType: key as PlanType,
      ...v,
    }));
  }),
  saju: router({
    /** 사주 계산만 수행 (저장 X) - 사전 미리보기 용도 */
    preview: publicProcedure.input(sajuInputSchema).query(({ input }) => {
      const result = calculateSaju(toSolarSajuInput(input));
      return result;
    }),
    /** 사주 프로필 생성 + 저장 */
    create: protectedProcedure
      .input(
        sajuInputSchema.extend({
          label: z.string().max(64).optional(),
          realName: z.string().max(64).optional(),
          birthplace: z.string().max(128).optional(),
          isDst: z.boolean().optional(),
          calendarType: z.enum(["solar", "lunar"]).optional(),
          isLeapMonth: z.boolean().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // 음력 입력은 양력으로 변환해 계산하되, 저장은 사용자가 입력한 원본 날짜(음력) 그대로 보존
        const sajuData = calculateSaju(toSolarSajuInput(input));
        const id = await db.createSajuProfile({
          userId: ctx.user.id,
          label: input.label ?? "본인",
          realName: input.realName,
          gender: input.gender,
          calendarType: input.calendarType ?? "solar",
          isLeapMonth: input.isLeapMonth ?? false,
          birthYear: input.year,
          birthMonth: input.month,
          birthDay: input.day,
          birthHour: input.hour ?? null,
          birthMinute: input.minute ?? null,
          birthplace: input.birthplace,
          isDst: input.isDst ?? false,
          sajuData: sajuData as unknown as Record<string, unknown>,
        });
        return { id, sajuData };
      }),
    downloadPdf: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const p = await db.getSajuProfileById(input.id);
        if (!p || !(await canAccessRow(ctx, p.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "사주 프로필을 찾을 수 없습니다." });
        }
        const sajuResult = calculateSaju({
          year: p.birthYear,
          month: p.birthMonth,
          day: p.birthDay,
          hour: p.birthHour,
          minute: p.birthMinute,
          gender: p.gender,
        });
        const birthDate = `${p.birthYear}-${String(p.birthMonth).padStart(2, "0")}-${String(p.birthDay).padStart(2, "0")}`;
        const html = await generateSajuHtmlFile(p.label, birthDate, p.gender === "male" ? "male" : "female", sajuResult);
        const base64 = Buffer.from(html, "utf-8").toString("base64");
        return {
          filename: `${p.label}_사주명식_${new Date().toISOString().split("T")[0]}.html`,
          data: base64,
        };
      }),
    list: protectedProcedure.query(async ({ ctx }) =>
      db.listSajuProfiles(await db.resolveOwnedUserIds(ctx.user.id, ctx.user.role === "admin")),
    ),
    get: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const p = await db.getSajuProfileById(input.id);
        if (!p || !(await canAccessRow(ctx, p.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "사주 프로필을 찾을 수 없습니다." });
        }
        return p;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int(), force: z.boolean().optional() }))
      .mutation(async ({ ctx, input }) => {
        const p = await db.getSajuProfileById(input.id);
        if (!p || !(await canAccessRow(ctx, p.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "사주 프로필을 찾을 수 없습니다." });
        }
        // 궁합 기록 수 확인
        const compatCount = await db.countCompatibilityByProfile(input.id, ctx.user.id);
        if (compatCount > 0 && !input.force) {
          // force=true 없이 궁합 기록이 있으면 경고 반환
          return { success: false, compatCount } as const;
        }
        await db.deleteSajuProfile(input.id);
        return { success: true, compatCount: 0 } as const;
      }),
  }),
  payment: router({
    ...portoneRouter._def.procedures,
    ...depositRouter._def.procedures,
    /** 이벤트 상담 사용 여부 (1아이디 1회, 운영자 제외) */
    eventStatus: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      if (isAdmin) {
        return { used: false } as const; // 운영자는 항상 사용 가능
      }
      const payments = await db.listPaymentsByUser(ctx.user.id);
      return { used: payments.some((p) => p.planType === "event") } as const;
    }),
    /** 모의 결제 - 즉시 paid 처리 후 세션 생성 */
    mockPay: protectedProcedure
      .input(z.object({ planType: planSchema, sajuProfileId: z.number().int().optional(), sajuProfileBId: z.number().int().optional(), eventCode: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const cfg = PLAN_CONFIG[input.planType];
        const isAdmin = ctx.user.role === "admin";
        // 원픽 무료 상담은 1아이디 최초 1회만 제공 (운영자 제외)
        if (input.planType === "free" && !isAdmin) {
          const past = await db.listPaymentsByUser(ctx.user.id);
          if (past.some((p) => p.planType === "free")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "원픽 무료 상담은 아이디당 최초 1회에 한해 제공됩니다.",
            });
          }
        }
        // 이벤트 상담은 1아이디 최초 1회만 제공 (운영자 제외) + 시크릿 코드 검증
        if (input.planType === "event" && !isAdmin) {
          const past = await db.listPaymentsByUser(ctx.user.id);
          if (past.some((p) => p.planType === "event")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "이벤트 상담은 아이디당 최초 1회에 한해 제공됩니다.",
            });
          }
          // 시크릿 코드 검증 및 사용 표시
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
        // AI 상담 플랜 (free, taste, event, deep)은 사주 필요
        if (["free", "taste", "event", "deep"].includes(input.planType) && !input.sajuProfileId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "사주 프로필이 필요합니다.",
          });
        }
        // 궁합 채팅은 두 사주 필요
        if (input.planType === "compatibility_chat" && (!input.sajuProfileId || !input.sajuProfileBId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "궁합 채팅은 두 사주 프로필이 필요합니다.",
          });
        }
        const paymentId = await db.createPayment({
          userId: ctx.user.id,
          planType: input.planType,
          amount: cfg.amount,
          status: "paid",
          paymentMethod: "mock",
          paidAt: new Date(),
        });
        if (!paymentId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "결제 기록 생성 실패" });
        }
        // 마스터 직접/오프라인은 세션이 아닌 예약으로 이어짐 → 결제만 만들고 반환
        if (input.planType === "master_chat" || input.planType === "master_offline") {
          return { paymentId, requiresAppointment: true } as const;
        }
        const startedAt = new Date();
        // 운영자는 시간 제한 없음 (9999분 = 대략 7일)
        const durationMinutes = isAdmin ? 9999 : cfg.durationMinutes;
        const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
        
        // sajuProfileId가 없으면 사용자의 가장 최근 사주를 자동으로 사용
        let finalSajuProfileId = input.sajuProfileId;
        if (!finalSajuProfileId) {
          const profiles = await db.listSajuProfiles(ctx.user.id);
          if (profiles.length > 0) {
            finalSajuProfileId = profiles[0].id; // 가장 최근 사주
          }
        }
        
        const sessionId = await db.createConsultSession({
          userId: ctx.user.id,
          sajuProfileId: finalSajuProfileId || null,
          sajuProfileBId: input.planType === "compatibility_chat" ? (input.sajuProfileBId || null) : null,
          paymentId,
          planType: input.planType,
          durationMinutes: durationMinutes,
          // 질문 횟수제: turns가 있으면 maxTurns 설정(운영자는 사실상 무제한). null=시간제(마스터).
          maxTurns: cfg.turns == null ? null : isAdmin ? 9999 : cfg.turns,
          usedTurns: 0,
          startedAt,
          expiresAt,
          status: "active",
          title: `${cfg.label} 상담`,
        });
        return { paymentId, sessionId, requiresAppointment: false } as const;
      }),
    list: protectedProcedure.query(({ ctx }) => db.listPaymentsByUser(ctx.user.id)),
    /** 원픽 무료 상담 - 선택한 사주 프로필을 세션에 연결 (없으면 채팅창에서 만세력 입력 유도) */
    freeMockPay: protectedProcedure
      .input(z.object({ sajuProfileId: z.number().int().optional() }).optional())
      .mutation(async ({ ctx, input }) => {
        const isAdmin = ctx.user.role === "admin";
        if (!isAdmin) {
          const past = await db.listPaymentsByUser(ctx.user.id);
          if (past.some((p) => p.planType === "free")) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "원픽 무료 상담은 아이디당 최초 1회에 한해 제공됩니다.",
            });
          }
        }
        const cfg = PLAN_CONFIG["free"];
        const paymentId = await db.createPayment({
          userId: ctx.user.id,
          planType: "free",
          amount: cfg.amount,
          status: "paid",
          paymentMethod: "mock",
          paidAt: new Date(),
        });
        if (!paymentId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "결제 기록 생성 실패" });
        }
        const startedAt = new Date();
        const durationMinutes = isAdmin ? 9999 : cfg.durationMinutes;
        const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
        // 선택한 사주 프로필이 있고 본인 소유면 세션에 연결, 아니면 null
        let linkedSajuProfileId: number | null = null;
        if (input?.sajuProfileId) {
          const profile = await db.getSajuProfileById(input.sajuProfileId);
          if (profile && profile.userId === ctx.user.id) {
            linkedSajuProfileId = input.sajuProfileId;
          }
        }
        const sessionId = await db.createConsultSession({
          userId: ctx.user.id,
          paymentId,
          planType: "free",
          durationMinutes,
          maxTurns: isAdmin ? 9999 : cfg.turns,
          usedTurns: 0,
          expiresAt,
          sajuProfileId: linkedSajuProfileId,
        });
        if (!sessionId) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "상담 세션 생성 실패" });
        }
        return { sessionId, paymentId } as const;
      }),
    /** 원픽 무료체험 사용 여부 (1아이디 1회, 운영자 제외) */
    freeStatus: protectedProcedure.query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "admin";
      if (isAdmin) {
        return { used: false } as const; // 운영자는 항상 사용 가능
      }
      const payments = await db.listPaymentsByUser(ctx.user.id);
      const used = payments.some((p) => p.planType === "free");
      return { used } as const;
    }),
  }),
  session: router({
    list: protectedProcedure.query(async ({ ctx }) =>
      db.listConsultSessionsByUser(await db.resolveOwnedUserIds(ctx.user.id, ctx.user.role === "admin")),
    ),
    get: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.id);
        if (!s || !(await canAccessRow(ctx, s.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "상담 세션을 찾을 수 없습니다." });
        }
        return s;
      }),
    end: protectedProcedure
      .input(z.object({ id: z.number().int(), summary: z.string().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.id);
        if (!s || !(await canAccessRow(ctx, s.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "상담 세션을 찾을 수 없습니다." });
        }
        const endedAt = new Date();
        await db.updateConsultSession(input.id, {
          status: "completed",
          endedAt,
          summary: input.summary ?? s.summary,
          // 비보관 세션은 종료 시점 + 7일 후 자동 삭제 예약. 보관 중이면 예약 없음.
          purgeAfter: s.retain ? null : new Date(endedAt.getTime() + RECORD_RETENTION_MS),
        });
        return { success: true } as const;
      }),
  }),
  compatibility: router({
    /** 저장된 두 사주 프로필로 궁합 분석 */
    analyze: protectedProcedure
      .input(
        z.object({
          profileAId: z.number().int(),
          profileBId: z.number().int(),
          relationType: z.enum(["couple", "parent", "child", "family", "work", "friend", "other"]).default("couple"),
          question: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.profileAId === input.profileBId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "서로 다른 두 사주를 선택해 주세요." });
        }
        // 궁합은 유료이다: "결제 1건 = 분석 1회". 아직 소비되지 않은 paid 결제건이 있어야 한다.
        // 단, 운영자(admin)는 결제 없이 무제한 무료로 이용한다.
        const isOperator = ctx.user.role === "admin";
        const payment = isOperator
          ? null
          : await db.findUnconsumedCompatibilityPayment(ctx.user.id);
        if (!isOperator && !payment) {
          throw new TRPCError({
            code: "PAYMENT_REQUIRED",
            message: "궁합 분석은 1회당 7,900원입니다. 결제 후 이용해 주세요.",
          });
        }
        const profileA = await db.getSajuProfileById(input.profileAId);
        const profileB = await db.getSajuProfileById(input.profileBId);
        if (!profileA || !(await canAccessRow(ctx, profileA.userId)) || !profileB || !(await canAccessRow(ctx, profileB.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "사주 프로필을 찾을 수 없습니다." });
        }
        const toSaju = (p: NonNullable<typeof profileA>) => {
          if (p.sajuData) return p.sajuData as unknown as ReturnType<typeof calculateSaju>;
          return calculateSaju({
            year: p.birthYear,
            month: p.birthMonth,
            day: p.birthDay,
            hour: p.birthHour,
            minute: p.birthMinute,
            gender: p.gender,
          });
        };
        const sajuA = toSaju(profileA);
        const sajuB = toSaju(profileB);
        const labelA = profileA.label || "본인";
        const labelB = profileB.label || "상대";
        const ragContext = buildCompatibilityRagContext(input.relationType, input.question);
        // 4계층 분리: 고정(L1+L2+L3) 캐시 블록 + 동적(두 사주 + RAG)
        const { cachedBlocks, dynamic } = buildCompatibilityPromptLayers(
          sajuA, sajuB, labelA, labelB, input.relationType, ragContext
        );
        const userMsg = input.question?.trim()
          ? `${labelA}와(과) ${labelB}의 궁합을 봐 주세요. 특히 이 부분이 궁금합니다: ${input.question.trim()}`
          : `${labelA}와(과) ${labelB}의 궁합을 깊이 있게 분석해 주세요.`;
        let result = "";
        try {
          result = await invokeClaudeWithRagLayers(
            [{ role: "user", content: userMsg }],
            {
              cachedBlocks,
              dynamicContext: dynamic,
              userQuery: input.question?.trim() || "궁합",
              maxTokens: 3000,
              ragOverride: "", // RAG는 이미 dynamic에 포함됨(중복 방지)
            }
          );
        } catch (err) {
          console.error("[compatibility.analyze] Claude API error:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "지금 잠시 분석이 어려운 상황입니다. 잠시 뒤 다시 시도해 주십시오.",
          });
        }
        if (!result || result.trim().length === 0) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "분석 결과를 받지 못했습니다. 다시 시도해 주세요." });
        }
        const id = await db.createSajuComparison({
          userId: ctx.user.id,
          profileAId: input.profileAId,
          labelA,
          profileBId: input.profileBId,
          labelB,
          relationType: input.relationType,
          result,
          paymentId: payment?.id ?? null, // 이 결제건을 소비 처리 (1:1 연결). 운영자는 결제 없이 null.
        });
        return { id, result, labelA, labelB, relationType: input.relationType } as const;
      }),
    list: protectedProcedure.query(async ({ ctx }) =>
      db.listSajuComparisons(await db.resolveOwnedUserIds(ctx.user.id, ctx.user.role === "admin")),
    ),
    get: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const c = await db.getSajuComparisonById(input.id);
        if (!c || !(await canAccessRow(ctx, c.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "궁합 분석을 찾을 수 없습니다." });
        }
        return c;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const c = await db.getSajuComparisonById(input.id);
        if (!c || !(await canAccessRow(ctx, c.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "궁합 분석을 찾을 수 없습니다." });
        }
        await db.deleteSajuComparison(input.id);
        return { success: true } as const;
      }),
  }),
  consult: router({
    /** 세션의 메시지 목록 */
    messages: protectedProcedure
      .input(z.object({ sessionId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.sessionId);
        if (!s || !(await canAccessRow(ctx, s.userId))) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return db.listConsultMessages(input.sessionId);
      }),
    /** 첫 진입 시 마스터 환영 메시지 생성/저장 */
    primeGreeting: protectedProcedure
      .input(z.object({ sessionId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.sessionId);
        if (!s || !(await canAccessRow(ctx, s.userId))) throw new TRPCError({ code: "NOT_FOUND" });
        const existing = await db.listConsultMessages(input.sessionId);
        if (existing.length > 0) return { skipped: true } as const;
        
        // 사주 데이터 로드 (시스템 프롬프트용 — 채팅창에는 사주 사이드바가 있으므로 인사말에 사주 텍스트 불포함)
        const greeting = buildInitialGreeting(s.planType as PlanType);
        
        await db.appendConsultMessage({
          sessionId: input.sessionId,
          userId: ctx.user.id,
          role: "assistant",
          content: greeting,
        });
        return { skipped: false, content: greeting } as const;
      }),
    /** 사용자 메시지 → 마스터 응답 생성 */
    sendMessage: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int(),
          content: z.string().min(1).max(4000),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.sessionId);
        if (!s || !(await canAccessRow(ctx, s.userId))) throw new TRPCError({ code: "NOT_FOUND" });
        // 세션 상태/만료 검사 (시간제는 expiresAt, 횟수제는 남은 질문 + 이용 기한으로 판정)
        const now = new Date();
        const isCountBased = s.maxTurns != null; // 횟수제 세션 여부
        const timeExpired = !isCountBased && s.expiresAt.getTime() <= now.getTime();
        const turnsExhausted = isCountBased && s.usedTurns >= (s.maxTurns ?? 0);
        // 횟수제 이용 기한: 첫 입장(firstEnteredAt) 기준 USAGE_WINDOW_MS(72h) 경과 시 종료.
        // 첫 입장 기록이 없으면(=이번이 첫 질문) 아직 카운트 전이므로 기한 만료 아님.
        const usageDeadline = s.firstEnteredAt
          ? new Date(s.firstEnteredAt).getTime() + USAGE_WINDOW_MS
          : null;
        const usageExpired = isCountBased && usageDeadline != null && now.getTime() >= usageDeadline;
        if (s.status !== "active" || timeExpired || turnsExhausted || usageExpired) {
          // 자동 종료 처리
          if (s.status === "active") {
            await db.updateConsultSession(s.id, {
              status: "expired",
              endedAt: now,
              // 비보관 세션은 자동 종료 시점 + 7일 후 자동 삭제 예약. 보관 중이면 예약 없음.
              purgeAfter: s.retain ? null : new Date(now.getTime() + RECORD_RETENTION_MS),
            });
          }
          throw new TRPCError({
            code: "FORBIDDEN",
            message: usageExpired
              ? "이용 기한(첫 입장 후 72시간)이 지나 상담이 종료되었습니다. 더 깊은 상담을 원하시면 새 플랜으로 다시 시작해 주세요."
              : isCountBased
                ? "이번 상담의 질문을 모두 사용하셨습니다. 더 깊은 상담을 원하시면 새 플랜으로 다시 시작해 주세요."
                : "상담 세션이 종료되었습니다. 새로운 플랜으로 다시 시작해 주십시오.",
          });
        }
        // 횟수제 세션에서 첫 입장 기록이 없으면(=이번이 첫 질문) 지금을 카운트 시작점으로 찍는다.
        // 무통장 경로는 enterSession에서 이미 찍히므로 영향 없음.
        if (isCountBased && !s.firstEnteredAt) {
          await db.updateConsultSession(s.id, { firstEnteredAt: now });
        }
        // 사주 데이터 로드
        const loadSaju = async (profileId: number | null | undefined) => {
          if (!profileId) return null;
          const profile = await db.getSajuProfileById(profileId);
          if (!profile) return null;
          if (profile.sajuData) {
            const snap = profile.sajuData as unknown as ReturnType<typeof calculateSaju>;
            // 옛 스냅샷은 input(생년월일)이 비어있을 수 있다 → 현재 나이/대운 계산이 깨지므로 profile 값으로 보강
            const inp = (snap as { input?: { year?: number } }).input;
            if (!inp || !inp.year) {
              (snap as { input: unknown }).input = {
                year: profile.birthYear, month: profile.birthMonth, day: profile.birthDay,
                hour: profile.birthHour, minute: profile.birthMinute, gender: profile.gender,
              };
            }
            return { saju: snap, profile };
          }
          const saju = calculateSaju({
            year: profile.birthYear, month: profile.birthMonth, day: profile.birthDay,
            hour: profile.birthHour, minute: profile.birthMinute, gender: profile.gender,
          });
          return { saju, profile };
        };
        const sajuAResult = await loadSaju(s.sajuProfileId);
        const sajuData = sajuAResult?.saju ?? null;
        if (!sajuData) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "사주 정보가 등록되지 않았습니다. 먼저 생년월일시를 입력해 주십시오.",
          });
        }
        // 사용자 메시지 저장
        await db.appendConsultMessage({
          sessionId: s.id,
          userId: ctx.user.id,
          role: "user",
          content: input.content,
        });
        // 시스템 프롬프트 + 메시지 컨텍스트 구성
        const previousMsgs = await db.listConsultMessages(s.id);
        // 4계층 분리: 고정(L1+L2+L3) 캐시 블록 + 동적(사주/temporal/RAG)
        let layerCachedBlocks: string[];
        let layerDynamic: string;
        let useRagSearch = true; // 개인상담은 질문으로 RAG 검색, 궁합은 이미 dynamic에 포함
        if (s.planType === "compatibility_chat" && s.sajuProfileBId) {
          // 궁합 채팅: 두 사주 계층 프롬프트 사용
          const sajuBResult = await loadSaju(s.sajuProfileBId);
          const sajuB = sajuBResult?.saju;
          if (!sajuB) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "두 번째 사주 정보를 찾을 수 없습니다." });
          }
          const labelA = sajuAResult?.profile?.label ?? "본인";
          const labelB = sajuBResult?.profile?.label ?? "상대";
          const ragContext = buildCompatibilityRagContext("couple", input.content);
          const layers = buildCompatibilityPromptLayers(sajuData, sajuB, labelA, labelB, "couple", ragContext);
          layerCachedBlocks = layers.cachedBlocks;
          layerDynamic = layers.dynamic;
          useRagSearch = false; // RAG는 이미 dynamic에 포함
        } else {
          const layers = buildPersonalPromptLayers(sajuData, s.planType);
          layerCachedBlocks = layers.cachedBlocks;
          // 시간 상대성 컨텍스트를 동적 블록에 합친다
          layerDynamic = layers.dynamic + buildTemporalContext(input.content);
          // 추가인원 사주 데이터를 AI 컨텍스트에 포함
          const additionalSajuEntries = (s.additionalSajus as any[]) || [];
          if (additionalSajuEntries.length > 0) {
            let additionalContext = "\n\n[추가 입력된 사주 목록]\n";
            for (const entry of additionalSajuEntries) {
              const addResult = await loadSaju(entry.sajuProfileId);
              if (addResult) {
                const p = addResult.profile;
                const sj = addResult.saju;
                const label = p.label || entry.label || "추가인원";
                const gender = p.gender === "male" ? "남" : "여";
                const age = new Date().getFullYear() - p.birthYear + 1;
                additionalContext += "\n● " + label + " (" + gender + "." + age + "세)\n";
                additionalContext += "  연주: " + (sj.pillars?.year?.stem ?? "") + (sj.pillars?.year?.branch ?? "") + " / 월주: " + (sj.pillars?.month?.stem ?? "") + (sj.pillars?.month?.branch ?? "") + " / 일주: " + (sj.pillars?.day?.stem ?? "") + (sj.pillars?.day?.branch ?? "") + " / 시주: " + (sj.pillars?.hour?.stem ?? "") + (sj.pillars?.hour?.branch ?? "") + "\n";
              }
            }
            layerDynamic += additionalContext;
          }
        }
        // 최근 30개 메시지만 사용 (컨텍스트 절약)
        const recent = previousMsgs.slice(-30);
        const claudeMessages = recent.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        let assistantContent = "";
        try {
          assistantContent = await invokeClaudeWithRagLayers(claudeMessages, {
            cachedBlocks: layerCachedBlocks,
            dynamicContext: layerDynamic,
            userQuery: input.content,
            maxTokens: 2048,
            ragOverride: useRagSearch ? undefined : "",
          });
        } catch (err) {
          console.error("[consult.sendMessage] Claude API error:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "지금 잠시 응답이 어려운 상황입니다. 잠시 뒤 다시 시도해 주십시오.",
          });
        }
        if (!assistantContent || assistantContent.trim().length === 0) {
          assistantContent = "잠시 호흡을 가다듬겠습니다. 다시 한 번 같은 질문을 보내 주시겠습니까.";
        }
        // 육친(십성) 사실 검증 — 개인상담(메인 사주가 있을 때)만 적용, 궁합은 제외
        if (sajuData && (sajuData as any)?.pillars?.day?.stem) {
          try {
            const answerKey = buildAnswerKey(sajuData as any);
            // 세운·대운 천간 육친 검증 추가
            const nowKst = new Date(Date.now() + 9 * 3600000);
            const sajuYearInfo = getCurrentSajuYear(nowKst);
            const sewoonStem = sajuYearInfo.ganji?.[0] ?? "";
            const dayStem = (sajuData as any).pillars?.day?.stem ?? "";
            let daeunStem = "";
            const daeunPillars = (sajuData as any).daeun?.pillars ?? [];
            const daeunNumber = (sajuData as any).daeun?.daeunNumber ?? 0;
            const countAge = sajuYearInfo.sajuYearNo - ((sajuData as any).input?.year ?? 0) + 1;
            for (let i = 0; i < daeunPillars.length; i++) {
              const sAge = daeunNumber + i * 10;
              if (countAge >= sAge && countAge <= sAge + 9) {
                daeunStem = (daeunPillars[i] ?? "")[0] ?? "";
                break;
              }
            }
            const extraKey = buildExtraStemAnswerKey(dayStem, [
              { stem: sewoonStem, label: "세운" },
              { stem: daeunStem, label: "대운" },
            ]);
            const fullKey = [...answerKey, ...extraKey];
            const verifyResult = verifySajuClaims(assistantContent, fullKey);
            const omissionResult = checkClearGodOmission(assistantContent, answerKey, ["편인", "정인"]);
            if (!verifyResult.ok || !omissionResult.ok) {
              console.warn(
                "[consult.sendMessage] 육친 검증 오류 발견, 재요청:",
                verifyResult.errors,
                omissionResult.missingClear,
              );
              const retryInstruction = formatVerifyErrorsForRetry(verifyResult.errors, omissionResult.missingClear);
              const retryMessages = [
                ...claudeMessages,
                { role: "assistant" as const, content: assistantContent },
                { role: "user" as const, content: retryInstruction },
              ];
              const retryContent = await invokeClaudeWithRagLayers(retryMessages, {
                cachedBlocks: layerCachedBlocks,
                dynamicContext: layerDynamic,
                userQuery: retryInstruction,
                maxTokens: 2048,
                ragOverride: useRagSearch ? undefined : "",
              });
              if (retryContent && retryContent.trim().length > 0) {
                assistantContent = retryContent;
              }
            }
          } catch (verifyErr) {
            console.error("[consult.sendMessage] 육친 검증 중 오류(무시하고 원답변 사용):", verifyErr);
          }
        }
        await db.appendConsultMessage({
          sessionId: s.id,
          userId: ctx.user.id,
          role: "assistant",
          content: assistantContent,
        });
        // AI 응답이 성공적으로 저장된 뒤에만 질문 1회 차감 (실패 시 차감되지 않음).
        // 시간제(마스터) 세션은 maxTurns=null이므로 remaining=null 반환.
        const turn = await db.consumeTurn(s.id);
        return { content: assistantContent, remaining: turn.remaining } as const;
      }),
    /** 상담 기록 HTML 파일 다운로드 (PDF 대체, 안정성 우선) */
    downloadPdf: protectedProcedure
      .input(z.object({ sessionId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.sessionId);
        if (!s || !(await canAccessRow(ctx, s.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "상담 세션을 찾을 수 없습니다." });
        }
        const messages = await db.listConsultMessages(input.sessionId);
        if (messages.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "상담 기록이 없습니다.",
          });
        }
        try {
          // 사주 카드 데이터 수집: 메인 사주 + 추가인원 사주 전체
          const sajuCards: Array<{
            label: string;
            gender: "male" | "female";
            birthYear: number;
            birthMonth: number;
            birthDay: number;
            birthHour: number | null;
            birthMinute: number | null;
            sajuData: ReturnType<typeof calculateSaju>;
          }> = [];
          const pushSajuCard = async (profileId: number | null | undefined, fallbackLabel?: string) => {
            if (!profileId) return;
            const profile = await db.getSajuProfileById(profileId);
            if (!profile) return;
            let saju: ReturnType<typeof calculateSaju>;
            if (profile.sajuData) {
              saju = profile.sajuData as unknown as ReturnType<typeof calculateSaju>;
            } else {
              saju = calculateSaju({
                year: profile.birthYear, month: profile.birthMonth, day: profile.birthDay,
                hour: profile.birthHour, minute: profile.birthMinute, gender: profile.gender,
              });
            }
            sajuCards.push({
              label: profile.label || fallbackLabel || "고객님",
              gender: profile.gender === "male" ? "male" : "female",
              birthYear: profile.birthYear,
              birthMonth: profile.birthMonth,
              birthDay: profile.birthDay,
              birthHour: profile.birthHour,
              birthMinute: profile.birthMinute,
              sajuData: saju,
            });
          };
          await pushSajuCard(s.sajuProfileId);
          const additionalSajuEntries = (s.additionalSajus as any[]) || [];
          for (const entry of additionalSajuEntries) {
            await pushSajuCard(entry.sajuProfileId, entry.label);
          }

          const html = await generateConsultationHtmlFile(
            ctx.user.name || "상담자",
            messages,
            `${s.planType} 상담 기록`,
            s.createdAt,
            sajuCards,
          );
          const base64 = Buffer.from(html, "utf-8").toString("base64");
          return { base64, fileName: `상담기록-${s.id}-${Date.now()}.html` } as const;
        } catch (err) {
          console.error("[consult.downloadPdf] HTML generation error:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "상담 기록 생성에 실패했습니다.",
          });
        }
      }),
    // 상담 메시지 열람 동의 토글
    toggleMasterAccess: protectedProcedure
      .input(z.object({ sessionId: z.number().int(), allow: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const { toggleMasterAccess } = await import("./consultAccess");
        return toggleMasterAccess(input.sessionId, ctx.user.id, input.allow);
      }),
    // 운영자: 동의된 세션 목록 조회
    getAccessibleSessions: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "운영자만 접근 가능합니다." });
      }
      const { getAccessibleSessionsForMaster } = await import("./consultAccess");
      return getAccessibleSessionsForMaster();
    }),
    // 운영자: 특정 세션 메시지 조회
    getSessionMessages: protectedProcedure
      .input(z.object({ sessionId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "운영자만 접근 가능합니다." });
        }
        const { getSessionMessagesForMaster } = await import("./consultAccess");
        try {
          return await getSessionMessagesForMaster(input.sessionId);
        } catch (err) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: err instanceof Error ? err.message : "메시지 조회 불가",
          });
        }
      }),
    // 상담 기록 이메일 공유
    sendEmailShare: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int(),
          recipientEmail: z.string().email(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const { sendConsultationEmailShare } = await import("./consultEmailShare");
        return sendConsultationEmailShare(input.sessionId, ctx.user.id, input.recipientEmail);
      }),
    // 상담 기록 삭제
    linkSaju: protectedProcedure
      .input(z.object({ sessionId: z.number().int(), sajuProfileId: z.number().int(), isAdditional: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.sessionId);
        if (!s || !(await canAccessRow(ctx, s.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "상담 세션을 찾을 수 없습니다." });
        }
        const profile = await db.getSajuProfileById(input.sajuProfileId);
        if (!profile || !(await canAccessRow(ctx, profile.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "사주 프로필을 찾을 수 없습니다." });
        }
        
        if (input.isAdditional) {
          const additionalSajus = (s.additionalSajus as any) || [];
          const newEntry = {
            id: `saju_${Date.now()}`,
            label: profile.label || "본인",
            sajuProfileId: input.sajuProfileId,
            addedAt: new Date().toISOString(),
          };
          additionalSajus.push(newEntry);
          await db.updateConsultSession(input.sessionId, { additionalSajus });
        } else {
          await db.updateConsultSession(input.sessionId, { sajuProfileId: input.sajuProfileId });
        }
        return { success: true } as const;
      }),
    deleteSession: protectedProcedure
      .input(z.object({ sessionId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.sessionId);
        if (!s || !(await canAccessRow(ctx, s.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "상담 세션을 찾을 수 없습니다." });
        }
        await db.deleteConsultSession(input.sessionId);
        return { success: true } as const;
      }),
    /** 상담 세션 제목 변경 (사용자가 기록을 구분하기 쉽도록) */
    renameSession: protectedProcedure
      .input(
        z.object({
          sessionId: z.number().int(),
          title: z.string().trim().min(1, "제목을 입력해 주세요.").max(60, "제목은 60자 이내로 입력해 주세요."),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.sessionId);
        if (!s || !(await canAccessRow(ctx, s.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "상담 세션을 찾을 수 없습니다." });
        }
        await db.updateConsultSession(input.sessionId, { title: input.title });
        return { success: true, title: input.title } as const;
      }),
    /**
     * 상담 기록 보관 토글. 기본은 비보관(종료 7일 후 자동 삭제).
     * retain=true로 켜면 purgeAfter를 비워 영구 보관, false로 끄면 다시 삭제 예약(종료 세션은 지금부터 7일).
     */
    setRetain: protectedProcedure
      .input(z.object({ sessionId: z.number().int(), retain: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const s = await db.getConsultSessionById(input.sessionId);
        if (!s || !(await canAccessRow(ctx, s.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "상담 세션을 찾을 수 없습니다." });
        }
        let purgeAfter: Date | null;
        if (input.retain) {
          // 보관: 삭제 예약 해제
          purgeAfter = null;
        } else {
          // 비보관 전환: 종료된 세션은 종료 시점 기준 7일, 아직 진행 중이면 예약 없음(종료 시 설정됨)
          const base = s.endedAt ?? null;
          purgeAfter = base ? new Date(base.getTime() + RECORD_RETENTION_MS) : null;
        }
        await db.updateConsultSession(input.sessionId, { retain: input.retain, purgeAfter });
        return { success: true, retain: input.retain, purgeAfter } as const;
      }),
  }),
  appointment: router({
    create: protectedProcedure
      .input(
        z.object({
          paymentId: z.number().int().optional(),
          consultType: z.enum(["chat", "offline"]),
          realName: z.string().min(1).max(64),
          nickname: z.string().max(64).optional(),
          phone: z.string().min(1).max(32),
          preferredDate: z.date(),
          alternativeDate: z.date().optional(),
          notes: z.string().max(2000).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const id = await db.createAppointment({
          userId: ctx.user.id,
          paymentId: input.paymentId,
          consultType: input.consultType,
          realName: input.realName,
          nickname: input.nickname,
          phone: input.phone,
          preferredDate: input.preferredDate,
          alternativeDate: input.alternativeDate,
          notes: input.notes,
          status: "requested",
        });
        // 운영자(마스터)에게 새 예약 신청 알림 - 추후 카카오톡 알림 연동 자리
        const typeLabel: Record<string, string> = {
          chat: "채팅",
          offline: "대면",
        };
        await notifyOwner({
          title: "[휴먼프리즘] 새 예약 신청",
          content: `${input.realName}님이 ${typeLabel[input.consultType] ?? input.consultType} 상담을 신청했습니다.\n희망 일시: ${input.preferredDate.toLocaleString("ko-KR")}\n연락처: ${input.phone}\n운영실에서 확정 여부를 입력해 주세요.`,
        }).catch(() => undefined);
        return { id } as const;
      }),
    listMine: protectedProcedure.query(({ ctx }) => db.listAppointmentsByUser(ctx.user.id)),
  }),
  admin: router({
    listAppointments: adminProcedure.query(() => db.listAllAppointments()),
    updateAppointment: adminProcedure
      .input(
        z.object({
          id: z.number().int(),
          status: z.enum([
            "requested",
            "confirmed",
            "payment_pending",
            "paid",
            "rejected",
            "completed",
            "cancelled",
          ]),
          masterNote: z.string().max(2000).optional(),
          depositAmount: z.number().int().min(0).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const confirmed = input.status === "confirmed" || input.status === "payment_pending";
        const isPaid = input.status === "paid";
        await db.updateAppointment(input.id, {
          status: input.status,
          confirmedAt: confirmed ? new Date() : null,
          masterNote: input.masterNote ?? null,
          depositAmount: input.depositAmount ?? null,
          paidAt: isPaid ? new Date() : null,
        });

        // 고객 알림 발송 (이메일 + 카카오톡)
        await handleAppointmentStatusNotification(input.id, input.status, input.depositAmount).catch(
          (err) => console.error("[admin.updateAppointment] Customer notification failed:", err)
        );

        // 예약 상태 전환 알림 자리 - 추후 사용자 카카오톡 알림 연동 지점
        // (현재는 운영자 알림 채널만 사용, 사용자 카카오 ID 수령 후 사용자 알림으로 확장 예정)
        const STATUS_NOTIFY: Record<string, string> = {
          confirmed: "일정이 확정되었습니다",
          payment_pending: "입금 안내가 발송되었습니다",
          paid: "입금이 확인되었습니다",
          completed: "상담이 완료 처리되었습니다",
        };
        if (STATUS_NOTIFY[input.status]) {
          await notifyOwner({
            title: "[휴먼프리즘] 예약 상태 변경",
            content: `예약 #${input.id} 상태가 "${STATUS_NOTIFY[input.status]}"로 갱신되었습니다.${input.masterNote ? `\n메모: ${input.masterNote}` : ""}`,
          }).catch(() => undefined);
        }
        return { success: true } as const;
      }),
    listUsers: adminProcedure.query(() => db.listRecentUsers(100)),
    membershipStats: adminProcedure.query(() => db.getMembershipStats()),
  }),
  refund: refundRouter,
  stats: statsRouter,
  cs: csRouter,
  naming: namingRouter,
  publicStats: publicProcedure.query(() => db.getPublicStats()),
});
export type AppRouter = typeof appRouter;
