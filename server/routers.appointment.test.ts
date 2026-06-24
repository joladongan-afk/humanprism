import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// DB와 운영자 알림을 모킹하여 외부 의존 없이 procedure 로직만 검증한다.
vi.mock("./db", () => ({
  createAppointment: vi.fn(),
  listAppointmentsByUser: vi.fn(),
  listAllAppointments: vi.fn(),
  updateAppointment: vi.fn(),
  listRecentUsers: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(),
}));

import * as db from "./db";
import { notifyOwner } from "./_core/notification";
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

function createAdminContext(userId = 99): TrpcContext {
  const ctx = createUserContext(userId);
  ctx.user!.role = "admin";
  return ctx;
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const baseCreateInput = {
  consultType: "chat" as const,
  realName: "전원석",
  phone: "010-0000-0000",
  preferredDate: new Date("2026-07-01T10:00:00Z"),
};

describe("appointment.create", () => {
  beforeEach(() => {
    vi.mocked(db.createAppointment).mockReset();
    vi.mocked(notifyOwner).mockReset();
    vi.mocked(db.createAppointment).mockResolvedValue(42 as any);
    vi.mocked(notifyOwner).mockResolvedValue(true as any);
  });

  it("채팅 예약을 status=requested 로 생성하고 운영자에게 알린다", async () => {
    const caller = appRouter.createCaller(createUserContext(7));
    const res = await caller.appointment.create(baseCreateInput);

    expect(res.id).toBe(42);
    expect(db.createAppointment).toHaveBeenCalledOnce();
    const arg = vi.mocked(db.createAppointment).mock.calls[0][0] as any;
    expect(arg.userId).toBe(7);
    expect(arg.status).toBe("requested");
    expect(arg.consultType).toBe("chat");
    // 운영자 알림이 발송되고 채팅 라벨이 포함되어야 한다
    expect(notifyOwner).toHaveBeenCalledOnce();
    const notifyArg = vi.mocked(notifyOwner).mock.calls[0][0] as any;
    expect(notifyArg.content).toContain("채팅");
  });

  it("대면 예약 라벨이 운영자 알림에 반영된다", async () => {
    const caller = appRouter.createCaller(createUserContext(7));
    await caller.appointment.create({ ...baseCreateInput, consultType: "offline" });
    const notifyArg = vi.mocked(notifyOwner).mock.calls[0][0] as any;
    expect(notifyArg.content).toContain("대면");
  });

  it("폐지된 'phone' 상담유형은 입력 검증에서 거부된다", async () => {
    const caller = appRouter.createCaller(createUserContext(7));
    await expect(
      // @ts-expect-error phone 은 더 이상 허용되지 않는 값
      caller.appointment.create({ ...baseCreateInput, consultType: "phone" }),
    ).rejects.toThrow();
    expect(db.createAppointment).not.toHaveBeenCalled();
  });

  it("비로그인 사용자는 예약을 생성할 수 없다", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.appointment.create(baseCreateInput)).rejects.toThrow();
    expect(db.createAppointment).not.toHaveBeenCalled();
  });
});

describe("admin.updateAppointment - 상태 전환 로직", () => {
  beforeEach(() => {
    vi.mocked(db.updateAppointment).mockReset();
    vi.mocked(notifyOwner).mockReset();
    vi.mocked(db.updateAppointment).mockResolvedValue(undefined as any);
    vi.mocked(notifyOwner).mockResolvedValue(true as any);
  });

  it("confirmed 전환 시 confirmedAt 을 기록한다", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.admin.updateAppointment({ id: 5, status: "confirmed" });
    const [id, patch] = vi.mocked(db.updateAppointment).mock.calls[0] as any;
    expect(id).toBe(5);
    expect(patch.status).toBe("confirmed");
    expect(patch.confirmedAt).toBeInstanceOf(Date);
  });

  it("payment_pending 전환 시에도 confirmedAt 을 기록한다", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.admin.updateAppointment({ id: 5, status: "payment_pending" });
    const [, patch] = vi.mocked(db.updateAppointment).mock.calls[0] as any;
    expect(patch.confirmedAt).toBeInstanceOf(Date);
  });

  it("paid 전환은 confirmedAt 을 새로 기록하지 않는다(null)", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.admin.updateAppointment({ id: 5, status: "paid" });
    const [, patch] = vi.mocked(db.updateAppointment).mock.calls[0] as any;
    expect(patch.confirmedAt).toBeNull();
  });

  it("masterNote 가 있으면 patch 에 반영하고, 없으면 null 로 비운다", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.admin.updateAppointment({ id: 5, status: "completed", masterNote: "입금 확인" });
    let patch = vi.mocked(db.updateAppointment).mock.calls[0][1] as any;
    expect(patch.masterNote).toBe("입금 확인");

    vi.mocked(db.updateAppointment).mockClear();
    await caller.admin.updateAppointment({ id: 6, status: "completed" });
    patch = vi.mocked(db.updateAppointment).mock.calls[0][1] as any;
    expect(patch.masterNote).toBeNull();
  });

  it("주요 상태 전환 시 운영자에게 알림을 보낸다", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.admin.updateAppointment({ id: 5, status: "paid" });
    expect(notifyOwner).toHaveBeenCalledOnce();
    const notifyArg = vi.mocked(notifyOwner).mock.calls[0][0] as any;
    expect(notifyArg.content).toContain("입금이 확인되었습니다");
  });

  it("일반 사용자는 예약 상태를 변경할 수 없다(FORBIDDEN)", async () => {
    const caller = appRouter.createCaller(createUserContext(1));
    await expect(
      caller.admin.updateAppointment({ id: 5, status: "confirmed" }),
    ).rejects.toThrow();
    expect(db.updateAppointment).not.toHaveBeenCalled();
  });
});
