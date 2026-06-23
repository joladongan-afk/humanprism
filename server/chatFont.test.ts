import { describe, it, expect } from "vitest";
import {
  CHAT_FONT_MIN,
  CHAT_FONT_MAX,
  CHAT_FONT_DEFAULT,
  clampChatFontSize,
  nextChatFontSize,
  normalizeStoredFontSize,
} from "../shared/chatFont";

describe("clampChatFontSize", () => {
  it("범위 내 값은 그대로 반환한다", () => {
    expect(clampChatFontSize(18)).toBe(18);
  });
  it("최소값 미만은 MIN으로 클램프한다", () => {
    expect(clampChatFontSize(CHAT_FONT_MIN - 5)).toBe(CHAT_FONT_MIN);
  });
  it("최대값 초과는 MAX로 클램프한다", () => {
    expect(clampChatFontSize(CHAT_FONT_MAX + 10)).toBe(CHAT_FONT_MAX);
  });
  it("NaN은 기본값을 반환한다", () => {
    expect(clampChatFontSize(NaN)).toBe(CHAT_FONT_DEFAULT);
  });
});

describe("nextChatFontSize", () => {
  it("증가 시 step만큼 커진다", () => {
    expect(nextChatFontSize(16, 2)).toBe(18);
  });
  it("감소 시 step만큼 작아진다", () => {
    expect(nextChatFontSize(16, -2)).toBe(14);
  });
  it("MAX에서 더 증가시켜도 MAX를 넘지 않는다", () => {
    expect(nextChatFontSize(CHAT_FONT_MAX, 2)).toBe(CHAT_FONT_MAX);
  });
  it("MIN에서 더 감소시켜도 MIN 아래로 내려가지 않는다", () => {
    expect(nextChatFontSize(CHAT_FONT_MIN, -2)).toBe(CHAT_FONT_MIN);
  });
});

describe("normalizeStoredFontSize", () => {
  it("유효한 문자열 값을 숫자로 정규화한다", () => {
    expect(normalizeStoredFontSize("20")).toBe(20);
  });
  it("null은 기본값을 반환한다", () => {
    expect(normalizeStoredFontSize(null)).toBe(CHAT_FONT_DEFAULT);
  });
  it("범위를 벗어난 값은 기본값을 반환한다", () => {
    expect(normalizeStoredFontSize("999")).toBe(CHAT_FONT_DEFAULT);
    expect(normalizeStoredFontSize("1")).toBe(CHAT_FONT_DEFAULT);
  });
  it("숫자가 아닌 문자열은 기본값을 반환한다", () => {
    expect(normalizeStoredFontSize("abc")).toBe(CHAT_FONT_DEFAULT);
  });
});
