// 채팅 글자 크기 조절을 위한 순수 로직.
// UI(Consult.tsx)와 테스트가 동일한 규칙을 공유하도록 분리한다.

export const CHAT_FONT_MIN = 14;
export const CHAT_FONT_MAX = 26;
export const CHAT_FONT_STEP = 2;
export const CHAT_FONT_DEFAULT = 16;

/** 주어진 값을 허용 범위[MIN, MAX]로 클램프한다. */
export function clampChatFontSize(size: number): number {
  if (!Number.isFinite(size)) return CHAT_FONT_DEFAULT;
  return Math.min(CHAT_FONT_MAX, Math.max(CHAT_FONT_MIN, size));
}

/** 현재 크기에서 delta 만큼 증감한 뒤 클램프한다. */
export function nextChatFontSize(current: number, delta: number): number {
  return clampChatFontSize(clampChatFontSize(current) + delta);
}

/**
 * localStorage 등에서 읽은 임의 값을 유효한 폰트 크기로 정규화한다.
 * 범위를 벗어나거나 숫자가 아니면 기본값을 돌려준다.
 */
export function normalizeStoredFontSize(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < CHAT_FONT_MIN || n > CHAT_FONT_MAX) {
    return CHAT_FONT_DEFAULT;
  }
  return n;
}
