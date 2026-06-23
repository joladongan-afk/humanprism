import { describe, it, expect } from "vitest";
import { calculateSaju, formatSajuForPrompt } from "./saju";

/**
 * 성별 주입 회귀 방지.
 *
 * 버그: 만세력이 "남"으로 확정했는데도 상담 프롬프트(formatSajuForPrompt)에 성별이
 * 한 줄도 들어가지 않아, LLM이 자식을 "여명=식상"으로 오판하는 치명적 오류 발생.
 * 수정: 사주 데이터 머리말에 성별 + 성별별 자식·배우자 육친을 코드 확정값으로 못박는다.
 */
describe("상담 프롬프트 성별 주입", () => {
  const baseInput = { year: 1975, month: 5, day: 10, hour: 8, minute: 0 } as const;

  it("남명: 자식=관성, 배우자(처)=재성 명시", () => {
    const r = calculateSaju({ ...baseInput, gender: "male" });
    const block = formatSajuForPrompt(r);
    expect(block).toContain("내담자 성별: 남자(남명)");
    expect(block).toContain("남명이다. 자식=관성, 배우자(처)=재성");
    // 반대 성별로 오판하지 말라는 경고 포함
    expect(block).toContain("'여명' 운운하면 명백한 오류");
  });

  it("여명: 자식=식상, 배우자(남편)=관성 명시", () => {
    const r = calculateSaju({ ...baseInput, gender: "female" });
    const block = formatSajuForPrompt(r);
    expect(block).toContain("내담자 성별: 여자(여명)");
    expect(block).toContain("여명이다. 자식=식상, 배우자(남편)=관성");
    expect(block).toContain("'남명' 운운하면 명백한 오류");
  });

  it("성별 라인이 사주팔자 표보다 먼저(최상단)에 온다", () => {
    const r = calculateSaju({ ...baseInput, gender: "male" });
    const block = formatSajuForPrompt(r);
    const genderIdx = block.indexOf("내담자 성별");
    const paljaIdx = block.indexOf("【사주팔자】");
    expect(genderIdx).toBeGreaterThanOrEqual(0);
    expect(genderIdx).toBeLessThan(paljaIdx);
  });
});
