import { describe, expect, it } from "vitest";
import {
  getRefundMessage,
  classifyRefundMethod,
  REFUND_MESSAGE_BANK_TRANSFER,
  REFUND_MESSAGE_CARD,
} from "../shared/refundMessages";

/**
 * 환불 안내 문구 자동 선택 검증.
 * 결제수단 문자열을 보고 계좌입금 / 카드 안내를 올바르게 선택해야 한다.
 */
describe("환불 안내 문구 선택", () => {
  it("계좌입금(bank)은 계좌 반환 안내", () => {
    expect(getRefundMessage("bank")).toBe(REFUND_MESSAGE_BANK_TRANSFER);
    expect(getRefundMessage("transfer")).toBe(REFUND_MESSAGE_BANK_TRANSFER);
    expect(getRefundMessage("무통장입금")).toBe(REFUND_MESSAGE_BANK_TRANSFER);
  });

  it("카드/토스/포트원은 카드사 처리 안내", () => {
    expect(getRefundMessage("card")).toBe(REFUND_MESSAGE_CARD);
    expect(getRefundMessage("toss")).toBe(REFUND_MESSAGE_CARD);
    expect(getRefundMessage("portone")).toBe(REFUND_MESSAGE_CARD);
    expect(getRefundMessage("카드결제")).toBe(REFUND_MESSAGE_CARD);
  });

  it("미지정/알 수 없는 결제수단은 계좌입금 안내를 기본값으로", () => {
    expect(getRefundMessage(null)).toBe(REFUND_MESSAGE_BANK_TRANSFER);
    expect(getRefundMessage(undefined)).toBe(REFUND_MESSAGE_BANK_TRANSFER);
    expect(getRefundMessage("")).toBe(REFUND_MESSAGE_BANK_TRANSFER);
  });

  it("계좌 안내 문구는 '24시간 이내' 표현을 포함한다", () => {
    expect(REFUND_MESSAGE_BANK_TRANSFER).toContain("24시간 이내");
  });

  it("카드 안내 문구는 '3~5일' 표현을 포함한다", () => {
    expect(REFUND_MESSAGE_CARD).toContain("3~5일");
  });

  it("classifyRefundMethod는 결제수단을 두 분류로 정규화한다", () => {
    expect(classifyRefundMethod("card")).toBe("card");
    expect(classifyRefundMethod("toss")).toBe("card");
    expect(classifyRefundMethod("bank")).toBe("bank_transfer");
    expect(classifyRefundMethod(null)).toBe("bank_transfer");
  });
});

/**
 * 환불 상태 전이(state machine) 검증.
 * none → requested → approved → processing → completed
 *                  ↘ rejected
 * 허용되지 않는 전이는 막아야 한다.
 */
type RefundStatus =
  | "none"
  | "requested"
  | "approved"
  | "processing"
  | "completed"
  | "rejected";

const ALLOWED_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  none: ["requested"],
  requested: ["approved", "rejected"],
  approved: ["processing", "rejected"],
  processing: ["completed"],
  completed: [],
  rejected: [],
};

function canTransition(from: RefundStatus, to: RefundStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

describe("환불 상태 전이 규칙", () => {
  it("정상 흐름: none→requested→approved→processing→completed", () => {
    expect(canTransition("none", "requested")).toBe(true);
    expect(canTransition("requested", "approved")).toBe(true);
    expect(canTransition("approved", "processing")).toBe(true);
    expect(canTransition("processing", "completed")).toBe(true);
  });

  it("요청/승인 단계에서 거절 가능", () => {
    expect(canTransition("requested", "rejected")).toBe(true);
    expect(canTransition("approved", "rejected")).toBe(true);
  });

  it("완료/거절은 종결 상태 (추가 전이 불가)", () => {
    expect(canTransition("completed", "requested")).toBe(false);
    expect(canTransition("rejected", "approved")).toBe(false);
  });

  it("단계 건너뛰기 불가 (requested→completed 직접 전이 차단)", () => {
    expect(canTransition("requested", "completed")).toBe(false);
    expect(canTransition("none", "completed")).toBe(false);
  });

  it("처리 중 단계에서 거절로 되돌릴 수 없음", () => {
    expect(canTransition("processing", "rejected")).toBe(false);
  });
});

/**
 * 환불액 산정 정책: 명시적 환불액이 없으면 원 결제액 전액 환불.
 */
function resolveRefundAmount(
  paymentAmount: number,
  requestedAmount?: number
): number {
  if (requestedAmount === undefined || requestedAmount === null) {
    return paymentAmount;
  }
  return requestedAmount;
}

describe("환불액 산정", () => {
  it("환불액 미지정 시 전액 환불", () => {
    expect(resolveRefundAmount(30000)).toBe(30000);
  });

  it("부분 환불액 지정 시 해당 금액", () => {
    expect(resolveRefundAmount(30000, 10000)).toBe(10000);
  });

  it("0원 환불도 명시적 지정으로 처리", () => {
    expect(resolveRefundAmount(30000, 0)).toBe(0);
  });
});
