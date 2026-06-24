import { describe, it, expect } from "vitest";
import { MASTER_PERSONA_V4 } from "./masterPromptV4";

/**
 * 마스터 프롬프트에 '연도·세운 간지 표 그대로 인용 + 입춘 세수 + 시점 애매 시 고객 확인'
 * 원칙이 실제로 포함되어 있는지 가드한다. 향후 프롬프트 리팩터 시 이 원칙이
 * 실수로 빠지는 것을 방지한다.
 */
describe("masterPromptV4 — 시점·세운·입춘 원칙 가드", () => {
  it("세운 사슬 표를 그대로 인용하라는 지침이 있다", () => {
    expect(MASTER_PERSONA_V4).toContain("세운 사슬");
    expect(MASTER_PERSONA_V4).toContain("머릿속으로 간지를 세거나");
  });

  it("입춘 세수(立春歲首) 기준임을 명시한다", () => {
    expect(MASTER_PERSONA_V4).toContain("입춘 세수");
    expect(MASTER_PERSONA_V4).toContain("立春歲首");
  });

  it("시점이 애매하면 고객에게 확인하라는 화법 원칙이 있다", () => {
    expect(MASTER_PERSONA_V4).toContain("시점이 애매하면 고객에게 확인");
    expect(MASTER_PERSONA_V4).toContain("입춘을 기준으로 해가 바뀌");
  });
});
