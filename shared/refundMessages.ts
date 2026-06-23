/**
 * 환불 안내 문구 단일 소스 (Single Source of Truth)
 *
 * 고객에게 전달되는 환불 안내 문구를 여기 한 곳에 모아둔다.
 * 마스터(운영자) 확인 후 필요 시 이 파일의 문구만 교체하면 전체 시스템에 반영된다.
 *
 * 결제수단(계좌입금 / 카드결제)에 따라 적절한 문구가 자동 선택된다.
 */

/** 계좌입금 환불 안내 (영업일 기준 24시간 이내 계좌 반환) */
export const REFUND_MESSAGE_BANK_TRANSFER =
  "환불 요청이 확인되었습니다. 고객님께서 입금하신 금액은 영업일 기준 24시간 이내에 고객님 계좌로 반환됩니다. 처리 완료 후 별도 안내 드리겠습니다.";

/** 카드결제 환불 안내 (토스페이먼츠 활성화 후 / 카드사 처리 기준) */
export const REFUND_MESSAGE_CARD =
  "환불 요청이 확인되었습니다. 카드 결제 환불은 카드사 처리 기준에 따라 영업일 기준 3~5일 소요될 수 있습니다. 카드사별 상황에 따라 다소 차이가 있을 수 있으니 양해 부탁드립니다. 궁금하신 점은 언제든지 문의해 주세요.";

/** 결제수단 분류 */
export type RefundPaymentMethod = "bank_transfer" | "card";

/**
 * 결제수단 문자열을 보고 환불 안내 문구를 반환한다.
 * payments.paymentMethod 값(예: "bank", "transfer", "card", "toss", "portone" 등)을
 * 느슨하게 매칭한다. 알 수 없으면 계좌입금 안내를 기본값으로 사용한다
 * (현 단계에서는 계좌입금이 주 결제수단이므로).
 */
export function getRefundMessage(paymentMethod: string | null | undefined): string {
  const m = (paymentMethod ?? "").trim().toLowerCase();
  if (
    m.includes("card") ||
    m.includes("toss") ||
    m.includes("portone") ||
    m.includes("카드")
  ) {
    return REFUND_MESSAGE_CARD;
  }
  // 계좌입금 / 무통장 / bank / transfer / 미지정
  return REFUND_MESSAGE_BANK_TRANSFER;
}

/** 결제수단을 분류 타입으로 정규화 (UI 라벨 등에 사용) */
export function classifyRefundMethod(
  paymentMethod: string | null | undefined
): RefundPaymentMethod {
  const m = (paymentMethod ?? "").trim().toLowerCase();
  if (m.includes("card") || m.includes("toss") || m.includes("portone") || m.includes("카드")) {
    return "card";
  }
  return "bank_transfer";
}
