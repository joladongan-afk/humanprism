import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// db와 Claude API를 모킹하여 실제 DB/외부호출 없이 procedure 로직만 검증한다.
vi.mock("./db", () => ({
  getSajuProfileById: vi.fn(),
  createSajuComparison: vi.fn(),
  listSajuComparisons: vi.fn(),
  getSajuComparisonById: vi.fn(),
  deleteSajuComparison: vi.fn(),
  findUnconsumedCompatibilityPayment: vi.fn(),
}));

vi.mock("./claude-api", () => ({
  invokeClaudeAPI: vi.fn(),
}));

import * as db from "./db";
import { invokeClaudeAPI } from "./claude-api";
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

function createAdminContext(userId = 1): TrpcContext {
  const ctx = createAuthContext(userId);
  return { ...ctx, user: { ...ctx.user!, role: "admin" } };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const mockProfile = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  userId: 1,
  label: "본인",
  gender: "male" as const,
  birthYear: 1990,
  birthMonth: 5,
  birthDay: 15,
  birthHour: 10,
  birthMinute: 30,
  sajuData: null,
  ...overrides,
});

describe("compatibility.analyze", () => {
  beforeEach(() => {
    vi.mocked(db.getSajuProfileById).mockReset();
    vi.mocked(db.createSajuComparison).mockReset();
    vi.mocked(db.findUnconsumedCompatibilityPayment).mockReset();
    vi.mocked(invokeClaudeAPI).mockReset();
    // 기본값: 유효한 미소비 결제건이 있다고 가정 (결제 게이트 통과)
    vi.mocked(db.findUnconsumedCompatibilityPayment).mockResolvedValue({ id: 555 } as any);
  });

  it("저장된 두 사주로 궁합을 분석하고 결과를 저장한다 (소비된 paymentId와 함께)", async () => {
    vi.mocked(db.getSajuProfileById)
      .mockResolvedValueOnce(mockProfile({ id: 1, label: "갑돌" }) as any)
      .mockResolvedValueOnce(mockProfile({ id: 2, label: "을순", gender: "female" }) as any);
    vi.mocked(invokeClaudeAPI).mockResolvedValue({
      content: "두 사람의 기운은 서로를 보완합니다.",
      stopReason: "end_turn",
    } as any);
    vi.mocked(db.createSajuComparison).mockResolvedValue(100 as any);

    const caller = appRouter.createCaller(createAuthContext(1));
    const res = await caller.compatibility.analyze({
      profileAId: 1,
      profileBId: 2,
      relationType: "couple",
    });

    expect(res.id).toBe(100);
    expect(res.labelA).toBe("갑돌");
    expect(res.labelB).toBe("을순");
    expect(res.result).toContain("보완");
    expect(db.createSajuComparison).toHaveBeenCalledOnce();
    expect(invokeClaudeAPI).toHaveBeenCalledOnce();
    // 결제건(555)이 분석에 소비 연결되었는지 확인
    expect(vi.mocked(db.createSajuComparison).mock.calls[0][0]).toMatchObject({ paymentId: 555 });
  });

  it("미소비 결제건이 없으면 PAYMENT_REQUIRED로 거부하고 분석을 시도하지 않는다", async () => {
    vi.mocked(db.findUnconsumedCompatibilityPayment).mockResolvedValue(undefined as any);
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.compatibility.analyze({ profileAId: 1, profileBId: 2, relationType: "couple" }),
    ).rejects.toThrow();
    // 결제 없으면 프로필 조회·Claude 호출·저장 어떠한 것도 일어나지 않아야 한다
    expect(db.getSajuProfileById).not.toHaveBeenCalled();
    expect(invokeClaudeAPI).not.toHaveBeenCalled();
    expect(db.createSajuComparison).not.toHaveBeenCalled();
  });

  it("같은 사주 두 개를 선택하면 거부한다", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.compatibility.analyze({ profileAId: 5, profileBId: 5, relationType: "couple" }),
    ).rejects.toThrow();
    expect(db.getSajuProfileById).not.toHaveBeenCalled();
  });

  it("타인의 사주 프로필은 NOT_FOUND로 거부한다", async () => {
    vi.mocked(db.getSajuProfileById)
      .mockResolvedValueOnce(mockProfile({ id: 1, userId: 999 }) as any)
      .mockResolvedValueOnce(mockProfile({ id: 2 }) as any);

    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(
      caller.compatibility.analyze({ profileAId: 1, profileBId: 2, relationType: "work" }),
    ).rejects.toThrow();
    expect(invokeClaudeAPI).not.toHaveBeenCalled();
  });

  it("미인증 사용자는 거부한다", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.compatibility.analyze({ profileAId: 1, profileBId: 2, relationType: "couple" }),
    ).rejects.toThrow();
  });

  it("운영자(admin)는 결제 없이 궁합을 분석하고 paymentId는 null로 저장된다", async () => {
    // 결제건이 아예 없어도(undefined) admin은 통과해야 한다
    vi.mocked(db.findUnconsumedCompatibilityPayment).mockResolvedValue(undefined as any);
    vi.mocked(db.getSajuProfileById)
      .mockResolvedValueOnce(mockProfile({ id: 1, label: "갑돌" }) as any)
      .mockResolvedValueOnce(mockProfile({ id: 2, label: "을순", gender: "female" }) as any);
    vi.mocked(invokeClaudeAPI).mockResolvedValue({
      content: "두 사람의 기운은 조화롭습니다.",
      stopReason: "end_turn",
    } as any);
    vi.mocked(db.createSajuComparison).mockResolvedValue(200 as any);

    const caller = appRouter.createCaller(createAdminContext(1));
    const res = await caller.compatibility.analyze({
      profileAId: 1,
      profileBId: 2,
      relationType: "couple",
    });

    expect(res.id).toBe(200);
    expect(invokeClaudeAPI).toHaveBeenCalledOnce();
    // 결제 조회 자체를 호출하지 않아야 한다(admin은 결제 게이트 우회)
    expect(db.findUnconsumedCompatibilityPayment).not.toHaveBeenCalled();
    // paymentId는 null로 저장
    expect(vi.mocked(db.createSajuComparison).mock.calls[0][0]).toMatchObject({ paymentId: null });
  });
});

describe("compatibility.get / delete", () => {
  beforeEach(() => {
    vi.mocked(db.getSajuComparisonById).mockReset();
    vi.mocked(db.deleteSajuComparison).mockReset();
  });

  it("소유자의 궁합 기록을 조회한다", async () => {
    vi.mocked(db.getSajuComparisonById).mockResolvedValue({ id: 7, userId: 1, result: "x" } as any);
    const caller = appRouter.createCaller(createAuthContext(1));
    const res = await caller.compatibility.get({ id: 7 });
    expect(res.id).toBe(7);
  });

  it("타인의 궁합 기록 삭제는 거부한다", async () => {
    vi.mocked(db.getSajuComparisonById).mockResolvedValue({ id: 7, userId: 999 } as any);
    const caller = appRouter.createCaller(createAuthContext(1));
    await expect(caller.compatibility.delete({ id: 7 })).rejects.toThrow();
    expect(db.deleteSajuComparison).not.toHaveBeenCalled();
  });

  it("소유자가 궁합 기록을 삭제한다", async () => {
    vi.mocked(db.getSajuComparisonById).mockResolvedValue({ id: 7, userId: 1 } as any);
    vi.mocked(db.deleteSajuComparison).mockResolvedValue(undefined as any);
    const caller = appRouter.createCaller(createAuthContext(1));
    const res = await caller.compatibility.delete({ id: 7 });
    expect(res).toEqual({ success: true });
    expect(db.deleteSajuComparison).toHaveBeenCalledWith(7);
  });
});
