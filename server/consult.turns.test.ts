import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * 질문 횟수제(maxTurns/usedTurns) 검증.
 *
 * - 남은 질문이 있으면 AI 응답 후 질문이 1회 차감되고 remaining이 반환된다.
 * - 질문을 모두 소진(usedTurns >= maxTurns)하면 sendMessage가 FORBIDDEN으로 차단된다.
 * - 시간제(마스터) 세션(maxTurns=null)은 차감 없이 remaining=null.
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

// 활성 횟수제 세션 기본형 (24시간 만료, 사주 프로필 연결)
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
    expiresAt: new Date(Date.now() + 1440 * 60 * 1000),
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

describe("질문 횟수제 sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.resolveOwnedUserIds as any).mockResolvedValue([1]);
    (db.getSajuProfileById as any).mockResolvedValue(sajuProfile);
    (db.appendConsultMessage as any).mockResolvedValue(undefined);
    (db.listConsultMessages as any).mockResolvedValue([]);
    (db.updateConsultSession as any).mockResolvedValue(undefined);
    (invokeClaudeWithRagLayers as any).mockResolvedValue({ content: "마스터의 답변입니다.", stopReason: "end_turn" });
  });

  it("남은 질문이 있으면 AI 응답 후 질문이 차감되고 remaining을 반환한다", async () => {
    (db.getConsultSessionById as any).mockResolvedValue(baseSession({ usedTurns: 5 }));
    (db.consumeTurn as any).mockResolvedValue({ ok: true, remaining: 14 });

    const caller = appRouter.createCaller(createUserContext(1));
    const res = await caller.consult.sendMessage({ sessionId: 100, content: "올해 재물운은?" });

    expect(res.content).toBe("마스터의 답변입니다.");
    expect(res.remaining).toBe(14);
    expect(db.consumeTurn).toHaveBeenCalledWith(100);
  });

  it("질문을 모두 소진하면 FORBIDDEN으로 차단한다", async () => {
    (db.getConsultSessionById as any).mockResolvedValue(baseSession({ usedTurns: 20, maxTurns: 20 }));

    const caller = appRouter.createCaller(createUserContext(1));
    await expect(
      caller.consult.sendMessage({ sessionId: 100, content: "한 번 더" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // 소진 상태에서는 LLM 호출/차감이 일어나지 않아야 한다 (크레딧 보호)
    expect(invokeClaudeWithRagLayers).not.toHaveBeenCalled();
    expect(db.consumeTurn).not.toHaveBeenCalled();
  });

  it("시간제(마스터) 세션은 maxTurns=null이라 차감 없이 remaining=null", async () => {
    (db.getConsultSessionById as any).mockResolvedValue(
      baseSession({ planType: "master_chat", maxTurns: null, durationMinutes: 60 }),
    );
    (db.consumeTurn as any).mockResolvedValue({ ok: true, remaining: null });

    const caller = appRouter.createCaller(createUserContext(1));
    const res = await caller.consult.sendMessage({ sessionId: 100, content: "안녕하세요" });

    expect(res.remaining).toBeNull();
    expect(db.consumeTurn).toHaveBeenCalledWith(100);
  });
});
