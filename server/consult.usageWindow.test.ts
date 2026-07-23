import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";
import { USAGE_WINDOW_MS } from "@shared/const";

/**
 * 횟수제 상담 이용 기한(첫 입장 후 72시간) 검증.
 *
 * - firstEnteredAt이 없으면(=이번이 첫 질문) 기한 만료가 아니며, 이때 firstEnteredAt이 기록된다.
 * - firstEnteredAt + 72h 이내면 정상 응답 + 차감.
 * - firstEnteredAt + 72h 경과면 FORBIDDEN으로 차단되고 LLM/차감이 일어나지 않는다(크레딧 보호).
 * - 시간제(마스터) 세션은 이용 기한 로직의 영향을 받지 않는다.
 *
 * 외부 의존(DB/LLM/RAG)은 모두 모킹하여 크레딧/네트워크 소모 없이 procedure 로직만 검증한다.
 */
vi.mock("./db", () => ({
  getConsultSessionById: vi.fn(),
  getSajuProfileById: vi.fn(),
  appendConsultMessage: vi.fn(),
  listConsultMessages: vi.fn(),
  updateConsultSession: vi.fn(),
  consumeTurn: vi.fn(),
  resolveOwnedUserIds: vi.fn(),
}));
vi.mock("./claude-api-rag", () => ({
  invokeClaudeWithRag: vi.fn(),
  invokeClaudeWithRagLayers: vi.fn(),
}));
vi.mock("./masterPrompt", () => ({
  buildInitialGreeting: vi.fn(() => "greeting"),
  buildSystemPrompt: vi.fn(() => "system"),
  buildCompatibilityPrompt: vi.fn(() => "compat"),
  buildCompatibilityRagContext: vi.fn(() => ""),
  buildPersonalPromptLayers: vi.fn(() => ({ cachedBlocks: ["block"], dynamic: "dynamic" })),
  buildCompatibilityPromptLayers: vi.fn(() => ({ cachedBlocks: ["block"], dynamic: "dynamic" })),
}));
import * as db from "./db";
import { invokeClaudeWithRagLayers } from "./claude-api-rag";
import { appRouter } from "./routers";

function createUserContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// 활성 횟수제 세션 기본형 (이용 기한 = firstEnteredAt + 72h)
function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 100,
    userId: 1,
    sajuProfileId: 10,
    sajuProfileBId: null,
    paymentId: 1,
    planType: "taste",
    durationMinutes: 1440,
    maxTurns: 20,
    usedTurns: 0,
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + USAGE_WINDOW_MS),
    firstEnteredAt: null,
    endedAt: null,
    status: "active",
    retain: false,
    ...overrides,
  };
}

const sajuProfile = {
  id: 10,
  userId: 1,
  label: "본인",
  gender: "male",
  birthYear: 1990,
  birthMonth: 5,
  birthDay: 15,
  birthHour: 10,
  birthMinute: 30,
  sajuData: { input: { year: 1990, month: 5, day: 15, hour: 10, minute: 30, gender: "male" } },
};

describe("횟수제 이용 기한(첫 입장 후 72시간)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.resolveOwnedUserIds as any).mockResolvedValue([1]);
    (db.getSajuProfileById as any).mockResolvedValue(sajuProfile);
    (db.appendConsultMessage as any).mockResolvedValue(undefined);
    (db.listConsultMessages as any).mockResolvedValue([]);
    (db.updateConsultSession as any).mockResolvedValue(undefined);
    (db.consumeTurn as any).mockResolvedValue({ ok: true, remaining: 19 });
    (invokeClaudeWithRagLayers as any).mockResolvedValue({ content: "마스터의 답변입니다.", stopReason: "end_turn" });
  });

  it("첫 질문(firstEnteredAt=null)은 기한 만료가 아니며 firstEnteredAt을 기록한다", async () => {
    (db.getConsultSessionById as any).mockResolvedValue(baseSession({ firstEnteredAt: null }));
    const caller = appRouter.createCaller(createUserContext(1));
    const res = await caller.consult.sendMessage({ sessionId: 100, content: "올해 재물운은?" });
    expect(res.content).toBe("마스터의 답변입니다.");
    // firstEnteredAt 기록 호출이 일어났는지 확인 (Date 값으로 갱신)
    const calls = (db.updateConsultSession as any).mock.calls;
    const recordedFirstEnter = calls.some(
      (c: any[]) => c[0] === 100 && c[1] && c[1].firstEnteredAt instanceof Date,
    );
    expect(recordedFirstEnter).toBe(true);
    expect(db.consumeTurn).toHaveBeenCalledWith(100);
  });

  it("이용 기한 이내(첫 입장 후 1시간)면 정상 응답 + 차감", async () => {
    (db.getConsultSessionById as any).mockResolvedValue(
      baseSession({ firstEnteredAt: new Date(Date.now() - 60 * 60 * 1000) }),
    );
    const caller = appRouter.createCaller(createUserContext(1));
    const res = await caller.consult.sendMessage({ sessionId: 100, content: "직업운은?" });
    expect(res.content).toBe("마스터의 답변입니다.");
    expect(db.consumeTurn).toHaveBeenCalledWith(100);
  });

  it("이용 기한 경과(첫 입장 후 73시간)면 FORBIDDEN으로 차단하고 LLM/차감을 막는다", async () => {
    (db.getConsultSessionById as any).mockResolvedValue(
      baseSession({ firstEnteredAt: new Date(Date.now() - (USAGE_WINDOW_MS + 60 * 60 * 1000)) }),
    );
    const caller = appRouter.createCaller(createUserContext(1));
    await expect(
      caller.consult.sendMessage({ sessionId: 100, content: "기한 지난 질문" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(invokeClaudeWithRagLayers).not.toHaveBeenCalled();
    expect(db.consumeTurn).not.toHaveBeenCalled();
    // 자동 종료(expired) 처리가 일어나야 한다
    const calls = (db.updateConsultSession as any).mock.calls;
    const markedExpired = calls.some(
      (c: any[]) => c[0] === 100 && c[1] && c[1].status === "expired",
    );
    expect(markedExpired).toBe(true);
  });

  it("시간제(마스터) 세션은 이용 기한과 무관하게(73시간 경과여도) 동작한다", async () => {
    // maxTurns=null + expiresAt이 미래면 시간제 세션은 정상. firstEnteredAt이 오래돼도 영향 없음.
    (db.getConsultSessionById as any).mockResolvedValue(
      baseSession({
        planType: "master_chat",
        maxTurns: null,
        durationMinutes: 60,
        firstEnteredAt: new Date(Date.now() - (USAGE_WINDOW_MS + 60 * 60 * 1000)),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      }),
    );
    (db.consumeTurn as any).mockResolvedValue({ ok: true, remaining: null });
    const caller = appRouter.createCaller(createUserContext(1));
    const res = await caller.consult.sendMessage({ sessionId: 100, content: "안녕하세요" });
    expect(res.remaining).toBeNull();
    expect(db.consumeTurn).toHaveBeenCalledWith(100);
  });
});
