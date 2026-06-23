import { describe, it, expect } from "vitest";
import {
  parseInternalPaymentId,
  buildMerchantPaymentId,
  decidePaymentValidity,
} from "./_core/paymentVerification";

describe("merchantPaymentId 생성/파싱", () => {
  it("buildMerchantPaymentId는 hp-{userId}-{paymentId}-{ts} 형식이어야 함", () => {
    const id = buildMerchantPaymentId(7, 42, 1700000000000);
    expect(id).toBe("hp-7-42-1700000000000");
  });

  it("parseInternalPaymentId는 내부 paymentId를 복원해야 함", () => {
    expect(parseInternalPaymentId("hp-7-42-1700000000000")).toBe(42);
  });

  it("hp- 접두사가 없으면 null", () => {
    expect(parseInternalPaymentId("xx-7-42-1700000000000")).toBeNull();
  });

  it("세그먼트가 부족하면 null", () => {
    expect(parseInternalPaymentId("hp-7")).toBeNull();
  });

  it("paymentId 자리가 숫자가 아니면 null", () => {
    expect(parseInternalPaymentId("hp-7-abc-1700000000000")).toBeNull();
  });

  it("생성 후 즉시 파싱하면 동일한 paymentId를 얻는다(왕복)", () => {
    const mid = buildMerchantPaymentId(123, 999);
    expect(parseInternalPaymentId(mid)).toBe(999);
  });
});

describe("decidePaymentValidity (상태/금액 검증)", () => {
  it("PAID이고 금액이 일치하면 통과", () => {
    const d = decidePaymentValidity({
      portoneStatus: "PAID",
      paidTotal: 30000,
      expectedAmount: 30000,
    });
    expect(d.ok).toBe(true);
  });

  it("PAID가 아니면 not_paid로 거부", () => {
    const d = decidePaymentValidity({
      portoneStatus: "FAILED",
      paidTotal: 30000,
      expectedAmount: 30000,
    });
    expect(d).toEqual({ ok: false, reason: "not_paid" });
  });

  it("금액이 다르면 amount_mismatch로 거부(위변조 방지)", () => {
    const d = decidePaymentValidity({
      portoneStatus: "PAID",
      paidTotal: 100,
      expectedAmount: 30000,
    });
    expect(d).toEqual({ ok: false, reason: "amount_mismatch" });
  });

  it("결제 금액이 누락되면 amount_mismatch로 거부", () => {
    const d = decidePaymentValidity({
      portoneStatus: "PAID",
      paidTotal: undefined,
      expectedAmount: 30000,
    });
    expect(d).toEqual({ ok: false, reason: "amount_mismatch" });
  });
});
