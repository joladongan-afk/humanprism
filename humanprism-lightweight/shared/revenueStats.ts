/**
 * 매출 통계 집계 (순수 함수)
 *
 * payments raw 배열을 받아 3계층 매출 통계로 가공한다.
 *  - 1계층: 총매출 / 총건수
 *  - 2계층: 채널별 (AI / 마스터)
 *  - 3계층: 메뉴별
 *
 * 집계 원칙
 *  - 매출액: status === "paid" 인 결제만 합산 (환불 완료분은 refunded 로 status 변경되어 제외됨).
 *  - 건수: 무료 플랜 포함 전체. 단 무료/유료 건수를 구분 집계.
 *
 * DB 접근이 없는 순수 함수라 단위 테스트가 용이하다.
 */

import {
  channelOf,
  isFreePlan,
  planLabelOf,
  type RevenueChannel,
  CHANNEL_ORDER,
  CHANNEL_LABELS,
  PLANS_BY_CHANNEL,
} from "./revenue";

/** 집계 입력으로 받는 최소 결제 형태 */
export interface PaymentRecord {
  planType: string;
  amount: number;
  status: string; // "pending" | "paid" | "refunded" | "failed"
  createdAt: Date | string | number;
}

/** 메뉴(3계층) 단위 집계 결과 */
export interface MenuStat {
  planType: string;
  label: string;
  channel: RevenueChannel;
  isFree: boolean;
  /** 매출액 (유료 paid 합계) */
  revenue: number;
  /** 유료 결제 건수 (paid) */
  paidCount: number;
  /** 전체 이용 건수 (무료 포함, status 무관하게 생성된 모든 건) */
  totalCount: number;
}

/** 채널(2계층) 단위 집계 결과 */
export interface ChannelStat {
  channel: RevenueChannel;
  label: string;
  revenue: number;
  paidCount: number;
  totalCount: number;
  menus: MenuStat[];
}

/** 전체(1계층) 집계 결과 */
export interface RevenueSummary {
  totalRevenue: number;
  totalPaidCount: number;
  totalCount: number;
  freeCount: number;
  channels: ChannelStat[];
}

/** paid 상태로 매출에 산입할지 판정 */
function countsAsRevenue(status: string): boolean {
  return status === "paid";
}

/**
 * payments raw 배열 → 3계층 매출 요약.
 */
export function summarizeRevenue(payments: PaymentRecord[]): RevenueSummary {
  // 메뉴별 누산기 초기화 (정의된 모든 플랜을 0으로 시작 → UI 순서/누락 방지)
  const menuMap = new Map<string, MenuStat>();
  for (const channel of CHANNEL_ORDER) {
    for (const planType of PLANS_BY_CHANNEL[channel]) {
      menuMap.set(planType, {
        planType,
        label: planLabelOf(planType),
        channel,
        isFree: isFreePlan(planType),
        revenue: 0,
        paidCount: 0,
        totalCount: 0,
      });
    }
  }

  for (const p of payments) {
    const planType = p.planType;
    let menu = menuMap.get(planType);
    if (!menu) {
      // 알 수 없는 플랜도 안전하게 수용
      menu = {
        planType,
        label: planLabelOf(planType),
        channel: channelOf(planType),
        isFree: isFreePlan(planType),
        revenue: 0,
        paidCount: 0,
        totalCount: 0,
      };
      menuMap.set(planType, menu);
    }

    menu.totalCount += 1;
    if (countsAsRevenue(p.status)) {
      menu.revenue += p.amount;
      menu.paidCount += 1;
    }
  }

  // 채널별 묶기
  const channelMap = new Map<RevenueChannel, ChannelStat>();
  for (const channel of CHANNEL_ORDER) {
    channelMap.set(channel, {
      channel,
      label: CHANNEL_LABELS[channel],
      revenue: 0,
      paidCount: 0,
      totalCount: 0,
      menus: [],
    });
  }

  for (const menu of Array.from(menuMap.values())) {
    let ch = channelMap.get(menu.channel);
    if (!ch) {
      ch = {
        channel: menu.channel,
        label: CHANNEL_LABELS[menu.channel] ?? String(menu.channel),
        revenue: 0,
        paidCount: 0,
        totalCount: 0,
        menus: [],
      };
      channelMap.set(menu.channel, ch);
    }
    ch.menus.push(menu);
    ch.revenue += menu.revenue;
    ch.paidCount += menu.paidCount;
    ch.totalCount += menu.totalCount;
  }

  const channels = Array.from(channelMap.values());

  const totalRevenue = channels.reduce((s, c) => s + c.revenue, 0);
  const totalPaidCount = channels.reduce((s, c) => s + c.paidCount, 0);
  const totalCount = channels.reduce((s, c) => s + c.totalCount, 0);
  const freeCount = Array.from(menuMap.values())
    .filter((m) => m.isFree)
    .reduce((s, m) => s + m.totalCount, 0);

  return {
    totalRevenue,
    totalPaidCount,
    totalCount,
    freeCount,
    channels,
  };
}

// ============================================================================
// 기간 버킷팅 (일별/주별/월별 시계열)
// ============================================================================

export type Granularity = "day" | "week" | "month";

/** 시계열 한 구간 */
export interface TimeBucket {
  /** 버킷 시작 키 (YYYY-MM-DD 또는 YYYY-MM 또는 주 시작일 YYYY-MM-DD) */
  key: string;
  revenue: number;
  paidCount: number;
  totalCount: number;
}

function toDate(v: Date | string | number): Date {
  return v instanceof Date ? v : new Date(v);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 주의 시작(월요일) 날짜 키를 구한다. */
function weekStartKey(d: Date): string {
  const day = d.getDay(); // 0=일 ... 6=토
  const diff = (day + 6) % 7; // 월요일 기준 며칠 지났는지
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff);
  return `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`;
}

/** 결제 시각 → 버킷 키 */
export function bucketKey(date: Date, granularity: Granularity): string {
  const d = toDate(date);
  if (granularity === "month") {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  }
  if (granularity === "week") {
    return weekStartKey(d);
  }
  // day
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * payments raw → 시계열 버킷 배열 (키 오름차순 정렬).
 */
export function bucketizeRevenue(
  payments: PaymentRecord[],
  granularity: Granularity
): TimeBucket[] {
  const map = new Map<string, TimeBucket>();

  for (const p of payments) {
    const key = bucketKey(toDate(p.createdAt), granularity);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { key, revenue: 0, paidCount: 0, totalCount: 0 };
      map.set(key, bucket);
    }
    bucket.totalCount += 1;
    if (countsAsRevenue(p.status)) {
      bucket.revenue += p.amount;
      bucket.paidCount += 1;
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

/** 메뉴별 매출 비중(%) 계산 — 총매출 대비 각 메뉴 매출 비율 */
export function revenueShareByMenu(summary: RevenueSummary): Array<{
  planType: string;
  label: string;
  channel: RevenueChannel;
  revenue: number;
  sharePct: number;
}> {
  const total = summary.totalRevenue || 1; // 0 나눗셈 방지
  const rows: Array<{
    planType: string;
    label: string;
    channel: RevenueChannel;
    revenue: number;
    sharePct: number;
  }> = [];
  for (const ch of summary.channels) {
    for (const m of ch.menus) {
      if (m.revenue > 0) {
        rows.push({
          planType: m.planType,
          label: m.label,
          channel: m.channel,
          revenue: m.revenue,
          sharePct: Math.round((m.revenue / total) * 1000) / 10, // 소수 1자리
        });
      }
    }
  }
  return rows.sort((a, b) => b.revenue - a.revenue);
}

// ============================================================================
// 매출 통계 기간 모드 (오늘 / 이번 주 / 이번 달 / 올해)
// ============================================================================

/** UI 기간 버튼 모드 */
export type PeriodMode = "today" | "week" | "month" | "year";

/** 기간 모드 → 조회 구간(from/to) + 시계열 단위(granularity) */
export interface PeriodRange {
  /** 구간 시작 (해당 기간의 0시 0분) */
  from: Date;
  /** 구간 끝 (기준 시각, 보통 now) */
  to: Date;
  /** 시계열 집계 단위 */
  granularity: Granularity;
}

/**
 * 기간 모드와 기준 시각(now)을 받아 from/to/granularity 를 결정한다.
 *  - today : 오늘 00:00 ~ now, 일별
 *  - week  : 이번 주 월요일 00:00 ~ now, 일별
 *  - month : 이번 달 1일 00:00 ~ now, 일별
 *  - year  : 올해 1월 1일 00:00 ~ now, 월별
 *
 * DB/타임존 의존이 없는 순수 함수라 단위 테스트가 용이하다.
 * (로컬 타임존 기준으로 경계 계산 — 운영자 화면 표시 기준과 일치)
 */
export function periodRange(mode: PeriodMode, now: Date = new Date()): PeriodRange {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (mode === "today") {
    return { from: startOfToday, to: now, granularity: "day" };
  }
  if (mode === "week") {
    const day = now.getDay(); // 0=일 ... 6=토
    const diff = (day + 6) % 7; // 월요일 기준 경과일
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0);
    return { from: monday, to: now, granularity: "day" };
  }
  if (mode === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { from: first, to: now, granularity: "day" };
  }
  // year
  const jan1 = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
  return { from: jan1, to: now, granularity: "month" };
}
