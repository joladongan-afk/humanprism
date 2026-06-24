/**
 * 궁합 결제 자격(엔타이틀먼트) 판정 — 순수 로직.
 *
 * 모델: "결제 1건(7,900원, paid) = 궁합 분석 1회".
 * 어떤 paid 궁합 결제건이 아직 어떤 분석에도 연결(소비)되지 않았다면,
 * 그 결제건으로 분석 1회를 수행할 수 있다.
 *
 * DB 접근과 분리해 외부 의존성 없이 단위 테스트가 가능하도록 한다.
 */

export interface PaidCompatPayment {
  id: number;
  paidAt?: Date | null;
}

/**
 * paid 궁합 결제건 목록(최신순)과 이미 소비된 paymentId 집합을 받아,
 * 아직 소비되지 않은 첫 결제건을 반환한다. 없으면 undefined.
 *
 * @param paidPayments paid 상태의 compatibility 결제건 (정렬 무관, 호출부에서 최신순 권장)
 * @param usedPaymentIds sajuComparisons.paymentId 로 이미 사용된 결제 ID 들
 */
export function pickUnconsumedPayment<T extends PaidCompatPayment>(
  paidPayments: T[],
  usedPaymentIds: ReadonlyArray<number | null | undefined>,
): T | undefined {
  const used = new Set<number>();
  usedPaymentIds.forEach((v) => {
    if (typeof v === "number") used.add(v);
  });
  return paidPayments.find((p) => !used.has(p.id));
}

/** 분석을 수행할 자격이 있는지 여부 */
export function canAnalyze(
  paidPayments: PaidCompatPayment[],
  usedPaymentIds: ReadonlyArray<number | null | undefined>,
): boolean {
  return pickUnconsumedPayment(paidPayments, usedPaymentIds) !== undefined;
}
