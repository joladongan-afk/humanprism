import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import * as db from "./db";
import {
  summarizeRevenue,
  bucketizeRevenue,
  revenueShareByMenu,
  type PaymentRecord,
  type Granularity,
} from "../shared/revenueStats";
import {
  analyzeCustomers,
  type CustomerPaymentRecord,
} from "../shared/customerStats";

/** db Payment row → 집계용 PaymentRecord 로 정규화 */
function toRecord(p: {
  planType: string;
  amount: number;
  status: string;
  createdAt: Date;
}): PaymentRecord {
  return {
    planType: p.planType,
    amount: p.amount,
    status: p.status,
    createdAt: p.createdAt,
  };
}

/** 기본 조회 기간: 최근 N일 */
function rangeFromDays(days: number): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

/**
 * 매출 통계 라우터 (Admin Only)
 */
export const statsRouter = router({
  /**
   * 매출 종합 통계 (3계층 요약 + 시계열 + 비중).
   * - from/to: ISO 문자열(선택). 미지정 시 days(기본 30) 기준.
   * - granularity: 시계열 단위 (day/week/month)
   */
  revenue: adminProcedure
    .input(
      z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
          days: z.number().int().min(1).max(3650).optional(),
          granularity: z.enum(["day", "week", "month"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const granularity: Granularity = input?.granularity ?? "day";

      let from: Date;
      let to: Date;
      if (input?.from && input?.to) {
        from = new Date(input.from);
        to = new Date(input.to);
      } else {
        const r = rangeFromDays(input?.days ?? 30);
        from = r.from;
        to = r.to;
      }

      const rows = await db.listPaymentsInRange(from, to);
      const records = rows.map(toRecord);

      const summary = summarizeRevenue(records);
      const series = bucketizeRevenue(records, granularity);
      const shares = revenueShareByMenu(summary);

      return {
        range: { from: from.getTime(), to: to.getTime() },
        granularity,
        summary,
        series,
        shares,
      };
    }),

  /**
   * 전체 누적 매출 통계 (기간 무제한).
   */
  revenueAllTime: adminProcedure
    .input(
      z
        .object({ granularity: z.enum(["day", "week", "month"]).optional() })
        .optional()
    )
    .query(async ({ input }) => {
      const granularity: Granularity = input?.granularity ?? "month";
      const rows = await db.listAllPayments();
      const records = rows.map(toRecord);

      const summary = summarizeRevenue(records);
      const series = bucketizeRevenue(records, granularity);
      const shares = revenueShareByMenu(summary);

      return { granularity, summary, series, shares };
    }),

  /**
   * 고객 분석 (재구매율, 결제 이력, LTV).
   * 기능 자체는 데이터가 쌓일수록 의미 있으며, 인프라는 미리 구축되어 자동 채워진다.
   */
  customers: adminProcedure
    .input(z.object({ topN: z.number().int().min(1).max(200).optional() }).optional())
    .query(async ({ input }) => {
      const rows = await db.listAllPayments();
      const records: CustomerPaymentRecord[] = rows.map((p) => ({
        userId: p.userId,
        planType: p.planType,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
      }));
      const analytics = analyzeCustomers(records);
      const topN = input?.topN ?? 20;
      return {
        ...analytics,
        // 상위 고객만 전송 (전체 목록은 필요 시 별도 페이지네이션)
        profiles: analytics.profiles.slice(0, topN),
      };
    }),
});
