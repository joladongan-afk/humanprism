import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * 궁합 채팅(compatibility_chat) 무통장 입금 신청 검증.
 *
 * 궁합은 "두 사주가 본질"이므로 requestDeposit 시 두 프로필(sajuProfileId, sajuProfileBId)이
 * 모두 필요하다. 프론트(Compatibility.tsx)가 카드결제 대신 입금 다이얼로그로 전환됨에 따라
 * 이 가드와 정상 신청 흐름을 명시적으로 보장한다.
 *
 * 외부 의존(DB/알림/SMS)은 모두 모킹하여 크레딧/네트워크 소모 없이 procedure 로직만 검증한다.
 */

vi.mock("./db", () => ({
  createPayment: vi.fn(),
  createConsultSession: vi.fn(),
  getConsultSessionById: vi.fn(),
  getPaymentById: vi.fn(),
  listAwaitingDepositSessions: vi.fn(),
  updateConsultSession: vi.fn(),
  updatePayment: vi.fn(),
}));
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(),
}));
vi.mock("./_core/sms", () => ({
  sendMasterSms: vi.fn(),
  sendCustomerSms: vi.fn(),
}));

import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sendMasterSms } from "./_core/sms";
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

describe("궁합 채팅 무통장 입금 신청(requestDeposit · compatibility_chat)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.createPayment as any).mockResolvedValue(1001);
    (db.createConsultSession as any).mockResolvedValue(2002);
    (notifyOwner as any).mockResolvedValue(true);
    (sendMasterSms as any).mockResolvedValue(true);
  });

  it("두 사주 프로필이 모두 있으면 결제기록과 세션을 생성한다", async () => {
    const caller = appRouter.createCaller(createUserContext(7));
    const res = await caller.payment.requestDeposit({
      planType: "compatibility_chat",
      sajuProfileId: 10,
      sajuProfileBId: 20,
      depositorName: "홍길동",
      depositorPhone: "010-1234-5678",
    });

    expect(res.paymentId).toBe(1001);
    expect(res.sessionId).toBe(2002);

    // 결제기록은 7,900원 / 무통장입금 / 입금대기 상태로 생성
    expect(db.createPayment).toHaveBeenCalledTimes(1);
    const paymentArg = (db.createPayment as any).mock.calls[0][0];
    expect(paymentArg.planType).toBe("compatibility_chat");
    expect(paymentArg.amount).toBe(7900);
    expect(paymentArg.status).toBe("awaiting_deposit");
    expect(paymentArg.paymentMethod).toBe("bank_transfer");

    // 세션은 두 사주를 모두 보관하고, 카운트 미시작(awaiting_payment)
    expect(db.createConsultSession).toHaveBeenCalledTimes(1);
    const sessionArg = (db.createConsultSession as any).mock.calls[0][0];
    expect(sessionArg.sajuProfileId).toBe(10);
    expect(sessionArg.sajuProfileBId).toBe(20);
    expect(sessionArg.planType).toBe("compatibility_chat");
    // 질문 횟수제 전환: 시간은 1440분(24h)으로 넓히고 실제 통제는 maxTurns(궁합 채팅 10회)로 한다.
    expect(sessionArg.durationMinutes).toBe(1440);
    expect(sessionArg.maxTurns).toBe(10);
    expect(sessionArg.usedTurns).toBe(0);
    expect(sessionArg.status).toBe("awaiting_payment");
  });

  it("두 번째 사주(sajuProfileBId)가 없으면 BAD_REQUEST로 거절한다", async () => {
    const caller = appRouter.createCaller(createUserContext(7));
    await expect(
      caller.payment.requestDeposit({
        planType: "compatibility_chat",
        sajuProfileId: 10,
        // sajuProfileBId 누락
        depositorName: "홍길동",
        depositorPhone: "010-1234-5678",
      }),
    ).rejects.toThrow(/두 사주/);

    // 가드에서 막혔으므로 결제/세션 생성이 일어나면 안 된다
    expect(db.createPayment).not.toHaveBeenCalled();
    expect(db.createConsultSession).not.toHaveBeenCalled();
  });

  it("첫 번째 사주(sajuProfileId)가 없어도 BAD_REQUEST로 거절한다", async () => {
    const caller = appRouter.createCaller(createUserContext(7));
    await expect(
      caller.payment.requestDeposit({
        planType: "compatibility_chat",
        sajuProfileBId: 20,
        depositorName: "홍길동",
        depositorPhone: "010-1234-5678",
      }),
    ).rejects.toThrow(/두 사주/);
    expect(db.createPayment).not.toHaveBeenCalled();
  });
});
