/**
 * 고객 분석 집계 (순수 함수)
 *
 * payments raw 배열을 받아 고객(userId) 단위로 결제 행동을 분석한다.
 *  - 재방문(재구매)율: 유료 결제를 2건 이상 한 고객 비율
 *  - 결제 이력: 고객별 총 결제액/건수/최근 결제일
 *  - LTV(고객생애가치): 유료 고객 1인당 평균 누적 매출
 *
 * 무료(free/event)는 매출 0이므로 매출/LTV 계산에서 제외하되,
 * "유입 고객 수"에는 별도로 셀 수 있도록 구분한다.
 *
 * DB 접근이 없는 순수 함수라 단위 테스트가 용이하다.
 */

import { isFreePlan } from "./revenue";

export interface CustomerPaymentRecord {
  userId: number;
  planType: string;
  amount: number;
  status: string; // "paid" 만 매출/재구매로 산입
  createdAt: Date | string | number;
}

/** 고객 1인 단위 집계 */
export interface CustomerProfile {
  userId: number;
  /** 유료 결제 건수 */
  paidCount: number;
  /** 누적 결제액 */
  totalSpent: number;
  /** 무료 이용 포함 전체 활동 건수 */
  totalActivity: number;
  /** 최초 결제 시각 (ms) — 유료 기준, 없으면 null */
  firstPaidAt: number | null;
  /** 최근 결제 시각 (ms) — 유료 기준, 없으면 null */
  lastPaidAt: number | null;
  /** 재구매 고객 여부 (유료 2건 이상) */
  isReturning: boolean;
}

export interface CustomerAnalytics {
  /** 결제(유료) 경험이 있는 고유 고객 수 */
  payingCustomers: number;
  /** 무료 포함 전체 활동 고객 수 */
  totalCustomers: number;
  /** 재구매(유료 2건 이상) 고객 수 */
  returningCustomers: number;
  /** 재구매율 (%) = 재구매 고객 / 유료 고객 */
  repurchaseRatePct: number;
  /** 총매출 (유료 합) */
  totalRevenue: number;
  /** LTV = 총매출 / 유료 고객 수 */
  ltv: number;
  /** 유료 고객 1인당 평균 결제 건수 */
  avgPaidCountPerCustomer: number;
  /** 고객 프로필 목록 (누적 결제액 내림차순) */
  profiles: CustomerProfile[];
}

function toMs(v: Date | string | number): number {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  return new Date(v).getTime();
}

function isPaid(status: string): boolean {
  return status === "paid";
}

/**
 * payments raw → 고객 분석.
 */
export function analyzeCustomers(
  records: CustomerPaymentRecord[]
): CustomerAnalytics {
  const map = new Map<number, CustomerProfile>();

  for (const r of records) {
    let p = map.get(r.userId);
    if (!p) {
      p = {
        userId: r.userId,
        paidCount: 0,
        totalSpent: 0,
        totalActivity: 0,
        firstPaidAt: null,
        lastPaidAt: null,
        isReturning: false,
      };
      map.set(r.userId, p);
    }

    p.totalActivity += 1;

    // 유료 결제만 매출/재구매에 산입 (무료 플랜은 amount가 0이라도 paidCount에서 제외)
    if (isPaid(r.status) && !isFreePlan(r.planType) && r.amount > 0) {
      const ts = toMs(r.createdAt);
      p.paidCount += 1;
      p.totalSpent += r.amount;
      if (p.firstPaidAt === null || ts < p.firstPaidAt) p.firstPaidAt = ts;
      if (p.lastPaidAt === null || ts > p.lastPaidAt) p.lastPaidAt = ts;
    }
  }

  const profiles = Array.from(map.values());
  for (const p of profiles) {
    p.isReturning = p.paidCount >= 2;
  }

  const payingProfiles = profiles.filter((p) => p.paidCount > 0);
  const payingCustomers = payingProfiles.length;
  const totalCustomers = profiles.length;
  const returningCustomers = profiles.filter((p) => p.isReturning).length;
  const totalRevenue = payingProfiles.reduce((s, p) => s + p.totalSpent, 0);
  const totalPaidCount = payingProfiles.reduce((s, p) => s + p.paidCount, 0);

  const repurchaseRatePct =
    payingCustomers > 0
      ? Math.round((returningCustomers / payingCustomers) * 1000) / 10
      : 0;
  const ltv =
    payingCustomers > 0 ? Math.round(totalRevenue / payingCustomers) : 0;
  const avgPaidCountPerCustomer =
    payingCustomers > 0
      ? Math.round((totalPaidCount / payingCustomers) * 100) / 100
      : 0;

  profiles.sort((a, b) => b.totalSpent - a.totalSpent);

  return {
    payingCustomers,
    totalCustomers,
    returningCustomers,
    repurchaseRatePct,
    totalRevenue,
    ltv,
    avgPaidCountPerCustomer,
    profiles,
  };
}
