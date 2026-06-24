/**
 * 홈 진입 마케팅 팝업 관련 공유 상수.
 *
 * 정책 변경(2026-06): "1회만 노출"에서 "홈 진입/새로고침마다 매번 노출"로 변경.
 * 이에 따라 localStorage 기반 1회 노출 판정 로직은 제거하고, CTA 경로 상수만 공유한다.
 */

/** "무료 체험 시작" CTA가 이동하는 경로 (Plans에서 무료 흐름을 1회 자동 트리거). */
export const FIRST_VISIT_POPUP_CTA_PATH = "/plans?start=free";
