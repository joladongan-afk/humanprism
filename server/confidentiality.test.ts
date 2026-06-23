import { describe, it, expect } from "vitest";
import { MASTER_PERSONA_V4 } from "./masterPromptV4";
import { buildSystemLayers } from "./promptLayers";
import { buildInitialGreeting } from "./masterPrompt";

/**
 * 기밀 보호 회귀 테스트
 * 실명·아호·책이름·관법이름·문파이름 등은 내부 기밀이며,
 * 모델에 전달되는 어떤 프롬프트 산출물에도 절대 포함되면 안 된다.
 */

// 노출 금지 토큰(실명/아호 등). 새로 발견될 때마다 여기에 추가한다.
const FORBIDDEN_TOKENS = ["도림", "道林"];

function assertClean(label: string, text: string) {
  for (const token of FORBIDDEN_TOKENS) {
    expect(
      text.includes(token),
      `${label}에 금지어 "${token}"가 노출됨`,
    ).toBe(false);
  }
}

describe("기밀 보호 — 프롬프트 산출물에 실명/아호 미포함", () => {
  it("MASTER_PERSONA_V4 본문에 금지어가 없다", () => {
    assertClean("MASTER_PERSONA_V4", MASTER_PERSONA_V4);
  });

  it("개인 상담 시스템 레이어(단일 블록)에 금지어가 없다", () => {
    const layers = buildSystemLayers("personal");
    assertClean("personal cachedBlocks", layers.cachedBlocks.join("\n"));
  });

  it("개인 상담 시스템 레이어(2단 분리)에 금지어가 없다", () => {
    const layers = buildSystemLayers("personal", { splitStyleLayer: true });
    assertClean("personal split cachedBlocks", layers.cachedBlocks.join("\n"));
  });

  it("궁합 상담 시스템 레이어에 금지어가 없다", () => {
    const layers = buildSystemLayers("compatibility");
    assertClean("compatibility cachedBlocks", layers.cachedBlocks.join("\n"));
  });

  it("초기 인사말(횟수제/마스터)에 금지어가 없다", () => {
    for (const plan of ["taste", "deep", "free", "event", "master_chat", "master_offline"]) {
      assertClean(`greeting(${plan})`, buildInitialGreeting(plan));
    }
  });

  it("MASTER_PERSONA_V4는 기밀 보호 규칙을 명시한다", () => {
    expect(MASTER_PERSONA_V4).toContain("기밀");
    expect(MASTER_PERSONA_V4).toContain("정중히 거절");
  });
});
