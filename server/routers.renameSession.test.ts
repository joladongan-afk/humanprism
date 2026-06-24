import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// db 모듈을 모킹하여 실제 DB 없이 procedure 로직만 검증한다.
vi.mock("./db", () => ({
  getConsultSessionById: vi.fn(),
  updateConsultSession: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";

function createAuthContext(userId = 1): TrpcContext {
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

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const mockSession = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 10,
  userId: 1,
  planType: "deep",
  title: "예전 제목",
  status: "active",
  startedAt: new Date(),
  expiresAt: new Date(Date.now() + 3600_000),
  endedAt: null,
  summary: null,
  sajuProfileId: null,
  allowMasterAccess: false,
  ...overrides,
});

describe("consult.renameSession", () => {
  beforeEach(() => {
    vi.mocked(db.getConsultSessionById).mockReset();
    vi.mocked(db.updateConsultSession).mockReset();
  });

  it("소유자가 제목을 정상적으로 변경한다", async () => {
    vi.mocked(db.getConsultSessionById).mockResolvedValue(mockSession() as any);
    vi.mocked(db.updateConsultSession).mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.consult.renameSession({ sessionId: 10, title: "새로운 제목" });

    expect(result).toEqual({ success: true, title: "새로운 제목" });
    expect(db.updateConsultSession).toHaveBeenCalledWith(10, { title: "새로운 제목" });
  });

  it("앞뒤 공백을 제거한다", async () => {
    vi.mocked(db.getConsultSessionById).mockResolvedValue(mockSession() as any);
    vi.mocked(db.updateConsultSession).mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller(createAuthContext(1));
    const result = await caller.consult.renameSession({ sessionId: 10, title: "  공백 제거  " });

    expect(result.title).toBe("공백 제거");
    expect(db.updateConsultSession).toHaveBeenCalledWith(10, { title: "공백 제거" });
  });

  it("다른 사용자의 세션은 NOT_FOUND로 거부한다", async () => {
    vi.mocked(db.getConsultSessionById).mockResolvedValue(mockSession({ userId: 999 }) as any);

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.consult.renameSession({ sessionId: 10, title: "악의적 변경" }),
    ).rejects.toThrow();
    expect(db.updateConsultSession).not.toHaveBeenCalled();
  });

  it("존재하지 않는 세션은 거부한다", async () => {
    vi.mocked(db.getConsultSessionById).mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.consult.renameSession({ sessionId: 10, title: "제목" }),
    ).rejects.toThrow();
  });

  it("빈 제목은 검증에서 거부한다", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.consult.renameSession({ sessionId: 10, title: "   " }),
    ).rejects.toThrow();
    expect(db.getConsultSessionById).not.toHaveBeenCalled();
  });

  it("60자를 초과하는 제목은 거부한다", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.consult.renameSession({ sessionId: 10, title: "가".repeat(61) }),
    ).rejects.toThrow();
  });

  it("미인증 사용자는 거부한다", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.consult.renameSession({ sessionId: 10, title: "제목" }),
    ).rejects.toThrow();
  });
});
