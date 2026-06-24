/**
 * 포트원 결제 검증에 쓰이는 순수 함수 모음.
 * DB/네트워크에 의존하지 않으므로 단위 테스트가 쉽다.
 */

/**
 * merchantPaymentId 형식: "hp-{userId}-{paymentId}-{timestamp}"
 * 결제 복귀(리다이렉트) 시 이 문자열에서 내부 paymentId를 복원한다.
 */
export function parseInternalPaymentId(merchantPaymentId: string): number | null {
  const segs = merchantPaymentId.split("-");
  if (segs.length < 4 || segs[0] !== "hp") return null;
  const id = parseInt(segs[2], 10);
  return Number.isFinite(id) ? id : null;
}

/**
 * 우리가 발급한 merchantPaymentId를 만든다.
 */
export function buildMerchantPaymentId(
  userId: number,
  paymentId: number,
  now: number = Date.now(),
): string {
  return `hp-${userId}-${paymentId}-${now}`;
}

export type VerifyDecision =
  | { ok: true }
  | { ok: false; reason: "not_paid" | "amount_mismatch" };

/**
 * 포트원 단건조회 결과로 결제가 유효한지 판정한다.
 * - status가 PAID 여야 하고
 * - 결제 금액(total)이 우리가 기대한 금액과 정확히 일치해야 한다.
 */
export function decidePaymentValidity(params: {
  portoneStatus: string;
  paidTotal: number | undefined;
  expectedAmount: number;
}): VerifyDecision {
  if (params.portoneStatus !== "PAID") {
    return { ok: false, reason: "not_paid" };
  }
  if (typeof params.paidTotal !== "number" || params.paidTotal !== params.expectedAmount) {
    return { ok: false, reason: "amount_mismatch" };
  }
  return { ok: true };
}
