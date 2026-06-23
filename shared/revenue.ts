/**
 * 매출 분류 단일 진실 소스 (Single Source of Truth)
 *
 * payments.planType 하나로 3계층 매출 통계를 구성한다.
 *  - 1계층: 총매출 (Grand Total)
 *  - 2계층: 채널별 매출 — AI / 마스터
 *      · 마스터 = master_chat + master_offline 묶음
 *  - 3계층: 메뉴별 개별 매출
 *
 * 집계 원칙
 *  - 매출액: 유료 결제(status="paid")만 합산. 무료(free/event)는 0원이라 매출 0.
 *  - 이용 건수: 무료 플랜도 포함하되 무료/유료를 구분 표시.
 *
 * 프론트엔드와 백엔드가 동일한 매핑을 공유하기 위해 shared/ 에 둔다.
 */

/** 모든 결제 플랜 타입 (payments.planType 과 1:1 일치) */
export type PlanType =
  | "free"
  | "taste"
  | "event"
  | "deep"
  | "master_chat"
  | "master_offline"
  | "compatibility"
  | "compatibility_chat";

/** 2계층 채널 분류 */
export type RevenueChannel = "ai" | "master";

/** 채널 한글 라벨 */
export const CHANNEL_LABELS: Record<RevenueChannel, string> = {
  ai: "AI 상담",
  master: "마스터 직접 상담",
};

/** 메뉴(플랜) 메타데이터: 라벨 + 채널 + 무료 여부 */
export interface PlanMeta {
  planType: PlanType;
  /** 3계층 메뉴 한글 라벨 */
  label: string;
  /** 2계층 채널 */
  channel: RevenueChannel;
  /** 무료 플랜 여부 (매출 집계 제외, 건수에는 포함) */
  isFree: boolean;
  /** 정가 (원). 무료는 0, 변동가(이벤트 등)는 기준가. */
  listPrice: number;
}

/**
 * 플랜별 메타데이터 단일 정의.
 * 가격 구조는 프로젝트 기준(원픽 무료 5분 / 알뜰 9,900 / 심층 14,900 /
 * 마스터 채팅 100,000 / 마스터 대면 200,000 / 궁합 분석·채팅 4,900)을 따른다.
 */
export const PLAN_META: Record<PlanType, PlanMeta> = {
  free: { planType: "free", label: "원픽 무료 상담", channel: "ai", isFree: true, listPrice: 0 },
  taste: { planType: "taste", label: "알뜰 상담", channel: "ai", isFree: false, listPrice: 9900 },
  event: { planType: "event", label: "이벤트 상담", channel: "ai", isFree: true, listPrice: 0 },
  deep: { planType: "deep", label: "심층 상담", channel: "ai", isFree: false, listPrice: 14900 },
  master_chat: {
    planType: "master_chat",
    label: "경청자 직접 채팅",
    channel: "master",
    isFree: false,
    listPrice: 100000,
  },
  master_offline: {
    planType: "master_offline",
    label: "경청자 대면 상담",
    channel: "master",
    isFree: false,
    listPrice: 200000,
  },
  compatibility: {
    planType: "compatibility",
    label: "궁합 분석",
    channel: "ai",
    isFree: false,
    listPrice: 4900,
  },
  compatibility_chat: {
    planType: "compatibility_chat",
    label: "궁합 채팅",
    channel: "ai",
    isFree: false,
    listPrice: 4900,
  },
};

/** 안전 조회: 알 수 없는 planType 도 fallback 메타를 반환한다. */
export function getPlanMeta(planType: string): PlanMeta {
  return (
    PLAN_META[planType as PlanType] ?? {
      planType: planType as PlanType,
      label: planType || "기타",
      channel: "ai",
      isFree: false,
      listPrice: 0,
    }
  );
}

/** planType → 채널 */
export function channelOf(planType: string): RevenueChannel {
  return getPlanMeta(planType).channel;
}

/** planType → 메뉴 라벨 */
export function planLabelOf(planType: string): string {
  return getPlanMeta(planType).label;
}

/** planType → 무료 여부 */
export function isFreePlan(planType: string): boolean {
  return getPlanMeta(planType).isFree;
}

/** 채널별로 묶인 플랜 타입 목록 (UI 그룹핑/순서 고정용) */
export const PLANS_BY_CHANNEL: Record<RevenueChannel, PlanType[]> = {
  ai: ["free", "taste", "event", "deep", "compatibility", "compatibility_chat"],
  master: ["master_chat", "master_offline"],
};

/** 통계 화면에서 노출할 채널 순서 */
export const CHANNEL_ORDER: RevenueChannel[] = ["ai", "master"];
