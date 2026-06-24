/**
 * 상담 세션 상태 → 마이룸(/me) 표기용 한국어 라벨/버튼 매핑.
 *
 * 무통장 입금 트랙이 도입되면서 세션은 다음 상태를 가진다:
 *  - awaiting_payment: 입금 신청 후 마스터 승인 대기 (입장 불가, 안내만)
 *  - approved: 승인 완료, 첫 입장 전 (입장 시 카운트 시작)
 *  - active: 진행 중 (만료 전)
 *  - completed: 상담 종료
 *  - expired: 시간 만료
 *
 * 컴포넌트에서 분리해 단위 테스트가 가능하도록 순수 함수로 둔다.
 */

export type SessionStatus =
  | "awaiting_payment"
  | "approved"
  | "active"
  | "completed"
  | "expired"
  | string;

export type SessionStatusKr = "승인 대기" | "입장 가능" | "진행 가능" | "완료" | "만료";

export interface SessionStatusView {
  /** 배지에 표시할 한국어 라벨 */
  label: SessionStatusKr;
  /** 입장(이어가기 포함) 가능 여부 — 강조 버튼 노출 */
  canEnter: boolean;
  /** 승인 대기 상태 — 입장 불가, 비활성 버튼 */
  isAwaiting: boolean;
  /** 버튼에 표시할 문구 */
  buttonLabel: string;
}

/**
 * 세션 상태와 만료 여부로 마이룸 표기 정보를 계산한다.
 * @param status 세션 상태
 * @param expired expiresAt이 현재 시각을 지났는지 여부
 */
export function getSessionStatusView(status: SessionStatus, expired: boolean): SessionStatusView {
  let label: SessionStatusKr;
  if (status === "awaiting_payment") {
    label = "승인 대기";
  } else if (status === "approved") {
    label = "입장 가능";
  } else if (status === "active" && !expired) {
    label = "진행 가능";
  } else if (status === "completed") {
    label = "완료";
  } else {
    label = "만료";
  }

  const canEnter = label === "진행 가능" || label === "입장 가능";
  const isAwaiting = label === "승인 대기";

  let buttonLabel: string;
  if (label === "입장 가능") {
    buttonLabel = "지금 입장하기";
  } else if (label === "진행 가능") {
    buttonLabel = "이어가기";
  } else if (isAwaiting) {
    buttonLabel = "입금 확인 중";
  } else {
    buttonLabel = "기록 보기";
  }

  return { label, canEnter, isAwaiting, buttonLabel };
}
