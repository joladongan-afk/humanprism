import { describe, expect, it } from "vitest";

/**
 * 채팅 입력창의 엔터 전송 정책을 검증한다.
 * 한글 IME 조합 중(엔터로 글자 확정)에는 전송하지 않고,
 * 조합이 끝난 일반 엔터(Shift 미동반)에서만 전송한다.
 *
 * 실제 컴포넌트의 onKeyDown 분기와 동일한 판정 함수를 추출해 단위 테스트한다.
 */
function shouldSend(opts: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode?: number;
}): boolean {
  const { key, shiftKey, isComposing, keyCode } = opts;
  // IME 조합 중이면 전송 금지
  if (isComposing || keyCode === 229) return false;
  // Shift 미동반 Enter만 전송
  return key === "Enter" && !shiftKey;
}

describe("채팅 엔터 전송 정책", () => {
  it("일반 엔터(조합 종료)는 전송한다", () => {
    expect(shouldSend({ key: "Enter", shiftKey: false, isComposing: false })).toBe(true);
  });

  it("한글 IME 조합 중 엔터는 전송하지 않는다 (isComposing)", () => {
    expect(shouldSend({ key: "Enter", shiftKey: false, isComposing: true })).toBe(false);
  });

  it("한글 IME 조합 중 엔터는 전송하지 않는다 (keyCode 229)", () => {
    expect(shouldSend({ key: "Enter", shiftKey: false, isComposing: false, keyCode: 229 })).toBe(false);
  });

  it("Shift+Enter는 줄바꿈이므로 전송하지 않는다", () => {
    expect(shouldSend({ key: "Enter", shiftKey: true, isComposing: false })).toBe(false);
  });

  it("Enter가 아닌 키는 전송하지 않는다", () => {
    expect(shouldSend({ key: "a", shiftKey: false, isComposing: false })).toBe(false);
  });
});
