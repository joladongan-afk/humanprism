import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { RECORD_RETENTION_MS } from "@shared/const";

// db 자동 모킹: setRetain / session.end 가 호출하는 헬퍼만 사용한다.
vi.mock("./db");

import * as db from "./db";
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

const ALLOWANCE_MS = 5000; // 호출 시각 차이 허용 오차

describe("consult.setRetain - 보관 토글 로직", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("보관 ON: retain=true, purgeAfter=null 로 비운다", async () => {
    const ended = new Date("2026-06-01T00:00:00Z");
    vi.mocked(db.getConsultSessionById).mockResolvedValue({
      id: 10,
      userId: 1,
      status: "completed",
      endedAt: ended,
      retain: false,
      purgeAfter: new Date("2026-06-08T00:00:00Z"),
    } as any);

    const caller = appRouter.createCaller(createUserContext(1));
    const res = await caller.consult.setRetain({ sessionId: 10, retain: true });

    expect(res.retain).toBe(true);
    expect(res.purgeAfter).toBeNull();
    const [, patch] = vi.mocked(db.updateConsultSession).mock.calls[0] as any;
    expect(patch.retain).toBe(true);
    expect(patch.purgeAfter).toBeNull();
  });

  it("보관 OFF(종료된 세션): 종료 시점 + 7일로 purgeAfter 재설정", async () => {
    const ended = new Date("2026-06-01T00:00:00Z");
    vi.mocked(db.getConsultSessionById).mockResolvedValue({
      id: 11,
      userId: 1,
      status: "completed",
      endedAt: ended,
      retain: true,
      purgeAfter: null,
    } as any);

    const caller = appRouter.createCaller(createUserContext(1));
    const res = await caller.consult.setRetain({ sessionId: 11, retain: false });

    expect(res.retain).toBe(false);
    expect(res.purgeAfter).toBeInstanceOf(Date);
    expect((res.purgeAfter as Date).getTime()).toBe(ended.getTime() + RECORD_RETENTION_MS);
  });

  it("보관 OFF(미종료 세션): endedAt 이 없으면 purgeAfter 는 null(종료 시 설정됨)", async () => {
    vi.mocked(db.getConsultSessionById).mockResolvedValue({
      id: 12,
      userId: 1,
      status: "active",
      endedAt: null,
      retain: false,
      purgeAfter: null,
    } as any);

    const caller = appRouter.createCaller(createUserContext(1));
    const res = await caller.consult.setRetain({ sessionId: 12, retain: false });
    expect(res.purgeAfter).toBeNull();
  });

  it("타인의 세션은 변경할 수 없다(NOT_FOUND)", async () => {
    vi.mocked(db.getConsultSessionById).mockResolvedValue({
      id: 13,
      userId: 999,
      status: "completed",
      endedAt: new Date(),
      retain: false,
      purgeAfter: null,
    } as any);

    const caller = appRouter.createCaller(createUserContext(1));
    await expect(caller.consult.setRetain({ sessionId: 13, retain: true })).rejects.toThrow();
    expect(db.updateConsultSession).not.toHaveBeenCalled();
  });
});

describe("session.end - 종료 시 보관 정책 반영", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("비보관 세션 종료 시 종료시점 + 7일로 purgeAfter 설정", async () => {
    vi.mocked(db.getConsultSessionById).mockResolvedValue({
      id: 20,
      userId: 1,
      status: "active",
      endedAt: null,
      summary: null,
      retain: false,
      purgeAfter: null,
    } as any);

    const before = Date.now();
    const caller = appRouter.createCaller(createUserContext(1));
    await caller.session.end({ id: 20 });

    const [, patch] = vi.mocked(db.updateConsultSession).mock.calls[0] as any;
    expect(patch.status).toBe("completed");
    expect(patch.purgeAfter).toBeInstanceOf(Date);
    const expected = before + RECORD_RETENTION_MS;
    expect(Math.abs((patch.purgeAfter as Date).getTime() - expected)).toBeLessThan(ALLOWANCE_MS);
  });

  it("보관 중인 세션 종료 시 purgeAfter 는 null 로 유지", async () => {
    vi.mocked(db.getConsultSessionById).mockResolvedValue({
      id: 21,
      userId: 1,
      status: "active",
      endedAt: null,
      summary: null,
      retain: true,
      purgeAfter: null,
    } as any);

    const caller = appRouter.createCaller(createUserContext(1));
    await caller.session.end({ id: 21 });

    const [, patch] = vi.mocked(db.updateConsultSession).mock.calls[0] as any;
    expect(patch.purgeAfter).toBeNull();
  });
});

describe("상담 종료 플로우 - 프론트 핸들러가 호출하는 순서(setRetain → end) 시나리오", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("저장하고 종료: setRetain(true) 후 end → 종료 시 purgeAfter=null(영구 보관)", async () => {
    // setRetain(true) 단계: 미종료 세션, 보관 ON
    vi.mocked(db.getConsultSessionById).mockResolvedValueOnce({
      id: 30,
      userId: 1,
      status: "active",
      endedAt: null,
      retain: false,
      purgeAfter: null,
    } as any);
    // end 단계: 위에서 retain=true 로 바뀐 세션을 다시 읽는다
    vi.mocked(db.getConsultSessionById).mockResolvedValueOnce({
      id: 30,
      userId: 1,
      status: "active",
      endedAt: null,
      summary: null,
      retain: true,
      purgeAfter: null,
    } as any);

    const caller = appRouter.createCaller(createUserContext(1));
    await caller.consult.setRetain({ sessionId: 30, retain: true });
    await caller.session.end({ id: 30 });

    // 마지막 호출(end)의 패치를 확인
    const calls = vi.mocked(db.updateConsultSession).mock.calls;
    const [, endPatch] = calls[calls.length - 1] as any;
    expect(endPatch.status).toBe("completed");
    expect(endPatch.purgeAfter).toBeNull();
  });

  it("저장하지 않고 종료: setRetain(false) 후 end → 종료 시점 + 7일 자동 삭제 예약", async () => {
    vi.mocked(db.getConsultSessionById).mockResolvedValueOnce({
      id: 31,
      userId: 1,
      status: "active",
      endedAt: null,
      retain: false,
      purgeAfter: null,
    } as any);
    vi.mocked(db.getConsultSessionById).mockResolvedValueOnce({
      id: 31,
      userId: 1,
      status: "active",
      endedAt: null,
      summary: null,
      retain: false,
      purgeAfter: null,
    } as any);

    const before = Date.now();
    const caller = appRouter.createCaller(createUserContext(1));
    await caller.consult.setRetain({ sessionId: 31, retain: false });
    await caller.session.end({ id: 31 });

    const calls = vi.mocked(db.updateConsultSession).mock.calls;
    const [, endPatch] = calls[calls.length - 1] as any;
    expect(endPatch.status).toBe("completed");
    expect(endPatch.purgeAfter).toBeInstanceOf(Date);
    const expected = before + RECORD_RETENTION_MS;
    expect(Math.abs((endPatch.purgeAfter as Date).getTime() - expected)).toBeLessThan(ALLOWANCE_MS);
  });
});
