/**
 * 궁합 "신청하기" 클릭 시 다음 동작을 결정하는 순수 판정 함수.
 *
 * 신규 방문자 배려 정책:
 *  - 사주가 2개 미만이면 결제를 막지 말고 입력(만세력 등록) 단계로 유도한다.
 *  - 두 사람이 선택되지 않았으면 선택을 유도한다.
 *  - 동일 인물 두 번 선택 시 오류.
 *  - 모두 충족되면 결제(입금 신청) 진행.
 */
export type CompatAction =
  | { kind: "need_profiles" } // 사주 부족 → 입력 단계로
  | { kind: "need_selection" } // 두 사람 미선택 → 선택 유도
  | { kind: "same_profile" } // 동일 인물 → 오류
  | { kind: "proceed" }; // 결제 진행

export function resolveCompatAction(params: {
  profileCount: number;
  profileAId: string;
  profileBId: string;
}): CompatAction {
  const { profileCount, profileAId, profileBId } = params;
  if (profileCount < 2) {
    return { kind: "need_profiles" };
  }
  if (!profileAId || !profileBId) {
    return { kind: "need_selection" };
  }
  if (profileAId === profileBId) {
    return { kind: "same_profile" };
  }
  return { kind: "proceed" };
}
