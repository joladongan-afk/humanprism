import { describe, expect, it } from "vitest";
import {
  summarizeRevenue,
  bucketizeRevenue,
  bucketKey,
  revenueShareByMenu,
  type PaymentRecord,
} from "../shared/revenueStats";

/**
 * 테스트용 결제 데이터.
 * - deep(메인 30,000, AI) paid 2건
 * - taste(맛보기 9,900, AI) paid 1건
 * - master_chat(직접채팅 100,000, 마스터) paid 1건
 * - master_offline(대면 200,000, 마스터) paid 1건
 * - free(무료, AI) 2건 (매출 0, 건수 포함)
 * - deep pending 1건 (매출 미산입)
 */
const SAMPLE: PaymentRecord[] = [
  { planType: "deep", amount: 30000, status: "paid", createdAt: new Date("2026-06-01T10:00:00") },
  { planType: "deep", amount: 30000, status: "paid", createdAt: new Date("2026-06-02T10:00:00") },
  { planType: "taste", amount: 9900, status: "paid", createdAt: new Date("2026-06-03T10:00:00") },
  { planType: "master_chat", amount: 100000, status: "paid", createdAt: new Date("2026-06-04T10:00:00") },
  { planType: "master_offline", amount: 200000, status: "paid", createdAt: new Date("2026-06-05T10:00:00") },
  { planType: "free", amount: 0, status: "paid", createdAt: new Date("2026-06-06T10:00:00") },
  { planType: "free", amount: 0, status: "paid", createdAt: new Date("2026-06-07T10:00:00") },
  { planType: "deep", amount: 30000, status: "pending", createdAt: new Date("2026-06-08T10:00:00") },
];

describe("매출 통계 3계층 집계", () => {
  const summary = summarizeRevenue(SAMPLE);

  it("총매출 = paid 결제만 합산 (30000*2 + 9900 + 100000 + 200000 = 369,900)", () => {
    expect(summary.totalRevenue).toBe(369900);
  });

  it("pending 결제는 매출에 산입되지 않음", () => {
    // deep pending 30000은 제외됨
    const deepMenu = summary.channels
      .flatMap((c) => c.menus)
      .find((m) => m.planType === "deep");
    expect(deepMenu?.revenue).toBe(60000); // paid 2건만
    expect(deepMenu?.paidCount).toBe(2);
    expect(deepMenu?.totalCount).toBe(3); // pending 포함 전체 건수
  });

  it("총 이용 건수는 무료 포함 전체 8건", () => {
    expect(summary.totalCount).toBe(8);
  });

  it("무료 건수는 2건으로 별도 집계", () => {
    expect(summary.freeCount).toBe(2);
  });

  it("AI 채널 매출 = deep 60000 + taste 9900 = 69,900", () => {
    const ai = summary.channels.find((c) => c.channel === "ai");
    expect(ai?.revenue).toBe(69900);
  });

  it("마스터 채널 매출 = master_chat 100000 + master_offline 200000 = 300,000 (묶음)", () => {
    const master = summary.channels.find((c) => c.channel === "master");
    expect(master?.revenue).toBe(300000);
  });

  it("채널 매출 합 = 총매출", () => {
    const sum = summary.channels.reduce((s, c) => s + c.revenue, 0);
    expect(sum).toBe(summary.totalRevenue);
  });

  it("마스터 채널은 master_chat, master_offline 2개 메뉴를 포함", () => {
    const master = summary.channels.find((c) => c.channel === "master");
    const planTypes = master?.menus.map((m) => m.planType).sort();
    expect(planTypes).toEqual(["master_chat", "master_offline"]);
  });
});

describe("매출 비중 계산", () => {
  const summary = summarizeRevenue(SAMPLE);
  const shares = revenueShareByMenu(summary);

  it("매출이 0인 메뉴(free)는 비중 목록에서 제외", () => {
    expect(shares.find((s) => s.planType === "free")).toBeUndefined();
  });

  it("매출 내림차순 정렬 (master_offline가 최상위)", () => {
    expect(shares[0].planType).toBe("master_offline");
  });

  it("비중 합계는 약 100% (반올림 오차 허용)", () => {
    const total = shares.reduce((s, r) => s + r.sharePct, 0);
    expect(total).toBeGreaterThan(99);
    expect(total).toBeLessThan(101);
  });
});

describe("기간 버킷 키 생성", () => {
  it("일별 키는 YYYY-MM-DD", () => {
    expect(bucketKey(new Date("2026-06-05T13:00:00"), "day")).toBe("2026-06-05");
  });

  it("월별 키는 YYYY-MM", () => {
    expect(bucketKey(new Date("2026-06-05T13:00:00"), "month")).toBe("2026-06");
  });

  it("주별 키는 해당 주 월요일", () => {
    // 2026-06-05는 금요일 → 그 주 월요일은 2026-06-01
    expect(bucketKey(new Date("2026-06-05T13:00:00"), "week")).toBe("2026-06-01");
  });
});

describe("시계열 버킷팅", () => {
  it("일별 집계: 각 날짜별 매출 분리", () => {
    const buckets = bucketizeRevenue(SAMPLE, "day");
    const jun1 = buckets.find((b) => b.key === "2026-06-01");
    expect(jun1?.revenue).toBe(30000);
    expect(jun1?.paidCount).toBe(1);
  });

  it("월별 집계: 2026-06 한 버킷에 모든 매출 합산", () => {
    const buckets = bucketizeRevenue(SAMPLE, "month");
    expect(buckets.length).toBe(1);
    expect(buckets[0].key).toBe("2026-06");
    expect(buckets[0].revenue).toBe(369900);
    expect(buckets[0].totalCount).toBe(8);
  });

  it("버킷은 키 오름차순 정렬", () => {
    const buckets = bucketizeRevenue(SAMPLE, "day");
    const keys = buckets.map((b) => b.key);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  it("빈 입력은 빈 배열", () => {
    expect(bucketizeRevenue([], "day")).toEqual([]);
  });
});

describe("빈 데이터/엣지 케이스", () => {
  it("결제가 없으면 총매출 0, 건수 0", () => {
    const s = summarizeRevenue([]);
    expect(s.totalRevenue).toBe(0);
    expect(s.totalCount).toBe(0);
    expect(s.freeCount).toBe(0);
  });

  it("정의된 모든 채널이 항상 존재 (AI, 마스터)", () => {
    const s = summarizeRevenue([]);
    const channels = s.channels.map((c) => c.channel).sort();
    expect(channels).toEqual(["ai", "master"]);
  });
});

import { periodRange, type PeriodMode } from "../shared/revenueStats";

describe("매출 통계 기간 모드 (오늘/이번 주/이번 달/올해)", () => {
  // 기준 시각: 2026-06-11 (목요일) 14:30
  const now = new Date(2026, 5, 11, 14, 30, 0, 0);

  it("오늘: from은 오늘 00:00, to는 now, 일별", () => {
    const r = periodRange("today", now);
    expect(r.from.getFullYear()).toBe(2026);
    expect(r.from.getMonth()).toBe(5);
    expect(r.from.getDate()).toBe(11);
    expect(r.from.getHours()).toBe(0);
    expect(r.from.getMinutes()).toBe(0);
    expect(r.to.getTime()).toBe(now.getTime());
    expect(r.granularity).toBe("day");
  });

  it("이번 주: from은 그 주 월요일 00:00 (2026-06-08), 일별", () => {
    const r = periodRange("week", now);
    // 2026-06-11은 목요일 → 그 주 월요일은 2026-06-08
    expect(r.from.getDate()).toBe(8);
    expect(r.from.getMonth()).toBe(5);
    expect(r.from.getHours()).toBe(0);
    expect(r.granularity).toBe("day");
  });

  it("이번 주: 일요일 기준일 때도 직전 월요일로 계산", () => {
    // 2026-06-14는 일요일 → 그 주 월요일은 2026-06-08
    const sunday = new Date(2026, 5, 14, 9, 0, 0, 0);
    const r = periodRange("week", sunday);
    expect(r.from.getDate()).toBe(8);
    expect(r.from.getMonth()).toBe(5);
  });

  it("이번 주: 월요일이면 그날 00:00이 시작", () => {
    const monday = new Date(2026, 5, 8, 9, 0, 0, 0);
    const r = periodRange("week", monday);
    expect(r.from.getDate()).toBe(8);
    expect(r.from.getHours()).toBe(0);
  });

  it("이번 달: from은 1일 00:00 (2026-06-01), 일별", () => {
    const r = periodRange("month", now);
    expect(r.from.getDate()).toBe(1);
    expect(r.from.getMonth()).toBe(5);
    expect(r.from.getHours()).toBe(0);
    expect(r.granularity).toBe("day");
  });

  it("올해: from은 1월 1일 00:00, granularity는 월별", () => {
    const r = periodRange("year", now);
    expect(r.from.getMonth()).toBe(0);
    expect(r.from.getDate()).toBe(1);
    expect(r.from.getFullYear()).toBe(2026);
    expect(r.granularity).toBe("month");
  });

  it("모든 모드에서 from <= to 가 성립", () => {
    const modes: PeriodMode[] = ["today", "week", "month", "year"];
    for (const m of modes) {
      const r = periodRange(m, now);
      expect(r.from.getTime()).toBeLessThanOrEqual(r.to.getTime());
    }
  });

  it("연초 경계: 1월 3일 기준 올해 from은 같은 해 1월 1일", () => {
    const jan3 = new Date(2026, 0, 3, 10, 0, 0, 0);
    const r = periodRange("year", jan3);
    expect(r.from.getFullYear()).toBe(2026);
    expect(r.from.getMonth()).toBe(0);
    expect(r.from.getDate()).toBe(1);
  });
});
