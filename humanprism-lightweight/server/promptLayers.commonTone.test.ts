import { describe, it, expect } from "vitest";
import {
  buildSystemLayers,
  L3_COMMON_TONE,
  L3_PERSONAL_STYLE,
  L3_COMPATIBILITY_STYLE,
} from "./promptLayers";

/**
 * 공통 어조 보강 규칙(L3_COMMON_TONE)이 모든 상담 모드의
 * 시스템 프롬프트에 실제로 주입되는지 검증한다.
 * - 용어 차등 표기(한자 병기 + 쉬운 풀이)
 * - 외래어 자연화
 * - 심리학적 깊이 + 역발상
 */
describe("L3 공통 어조 보강 규칙", () => {
  it("개인/궁합 스타일 블록 양쪽에 공통 어조가 포함된다", () => {
    expect(L3_PERSONAL_STYLE).toContain(L3_COMMON_TONE.trim());
    expect(L3_COMPATIBILITY_STYLE).toContain(L3_COMMON_TONE.trim());
  });

  it("공통 어조 규칙은 핵심 4축(용어차등·풀이·외래어·심리/역발상)을 담는다", () => {
    expect(L3_COMMON_TONE).toContain("한자를 가볍게 병기");
    expect(L3_COMMON_TONE).toContain("쉬운 현대어로 한 호흡 풀어준다");
    expect(L3_COMMON_TONE).toContain("외래어를 지나치게 메마르게 피하지 않는다");
    expect(L3_COMMON_TONE).toContain("인지심리학");
    expect(L3_COMMON_TONE).toContain("통념을 한 번 뒤집어 보는");
  });

  it("개인 상담 시스템 레이어에 공통 어조가 실린다", () => {
    const { cachedBlocks } = buildSystemLayers("personal");
    const joined = cachedBlocks.join("\n\n");
    expect(joined).toContain("한자를 가볍게 병기");
    expect(joined).toContain("통념을 한 번 뒤집어 보는");
  });

  it("궁합 상담 시스템 레이어에 공통 어조가 실린다", () => {
    const { cachedBlocks } = buildSystemLayers("compatibility");
    const joined = cachedBlocks.join("\n\n");
    expect(joined).toContain("쉬운 현대어로 한 호흡 풀어준다");
    expect(joined).toContain("인지심리학");
  });

  it("용어 남발 금지 — 한자 병기를 한두 곳으로 제한하는 가드가 있다", () => {
    expect(L3_COMMON_TONE).toContain("남발하지 않는다");
  });
});
