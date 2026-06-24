import { describe, expect, it } from "vitest";
import {
  analyzeCustomers,
  type CustomerPaymentRecord,
} from "../shared/customerStats";

/**
 * 고객 시나리오:
 * - user 1: deep 30000 paid 2건 → 재구매 고객, 누적 60,000
 * - user 2: master_offline 200000 paid 1건 → 단건 고객, 누적 200,000
 * - user 3: free 1건 → 무료만, 유료 없음 (유료 고객 아님)
 * - user 4: deep 30000 pending 1건 → 유료 산입 안됨 (활동 고객만)
 */
const SAMPLE: CustomerPaymentRecord[] = [
  { userId: 1, planType: "deep", amount: 30000, status: "paid", createdAt: new Date("2026-06-01") },
  { userId: 1, planType: "deep", amount: 30000, status: "paid", createdAt: new Date("2026-06-10") },
  { userId: 2, planType: "master_offline", amount: 200000, status: "paid", createdAt: new Date("2026-06-05") },
  { userId: 3, planType: "free", amount: 0, status: "paid", createdAt: new Date("2026-06-06") },
  { userId: 4, planType: "deep", amount: 30000, status: "pending", createdAt: new Date("2026-06-07") },
];

describe("고객 분석", () => {
  const a = analyzeCustomers(SAMPLE);

  it("유료 고객 수는 2명 (user1, user2)", () => {
    expect(a.payingCustomers).toBe(2);
  });

  it("전체 활동 고객 수는 4명 (무료/pending 포함)", () => {
    expect(a.totalCustomers).toBe(4);
  });

  it("재구매 고객은 user1 1명", () => {
    expect(a.returningCustomers).toBe(1);
  });

  it("재구매율 = 1/2 = 50%", () => {
    expect(a.repurchaseRatePct).toBe(50);
  });

  it("총매출 = 60000 + 200000 = 260,000", () => {
    expect(a.totalRevenue).toBe(260000);
  });

  it("LTV = 260000 / 2 = 130,000", () => {
    expect(a.ltv).toBe(130000);
  });

  it("유료 고객 1인당 평균 결제 건수 = 3건 / 2명 = 1.5", () => {
    expect(a.avgPaidCountPerCustomer).toBe(1.5);
  });

  it("무료 고객(user3)은 유료 고객에서 제외", () => {
    const user3 = a.profiles.find((p) => p.userId === 3);
    expect(user3?.paidCount).toBe(0);
    expect(user3?.totalSpent).toBe(0);
  });

  it("pending 고객(user4)은 매출 미산입, 활동만 카운트", () => {
    const user4 = a.profiles.find((p) => p.userId === 4);
    expect(user4?.paidCount).toBe(0);
    expect(user4?.totalActivity).toBe(1);
  });

  it("user1의 최초/최근 결제 시각이 올바름", () => {
    const user1 = a.profiles.find((p) => p.userId === 1);
    expect(user1?.firstPaidAt).toBe(new Date("2026-06-01").getTime());
    expect(user1?.lastPaidAt).toBe(new Date("2026-06-10").getTime());
  });

  it("프로필은 누적 결제액 내림차순 (user2가 최상위)", () => {
    expect(a.profiles[0].userId).toBe(2);
  });
});

describe("고객 분석 엣지 케이스", () => {
  it("빈 입력은 0으로 안전 처리", () => {
    const a = analyzeCustomers([]);
    expect(a.payingCustomers).toBe(0);
    expect(a.repurchaseRatePct).toBe(0);
    expect(a.ltv).toBe(0);
    expect(a.avgPaidCountPerCustomer).toBe(0);
    expect(a.profiles).toEqual([]);
  });

  it("무료 고객만 있으면 유료 고객 0, LTV 0", () => {
    const a = analyzeCustomers([
      { userId: 1, planType: "free", amount: 0, status: "paid", createdAt: new Date() },
    ]);
    expect(a.payingCustomers).toBe(0);
    expect(a.totalCustomers).toBe(1);
    expect(a.ltv).toBe(0);
  });
});
