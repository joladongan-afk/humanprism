import { describe, it, expect } from "vitest";
import { MASTER_PERSONA_V4 } from "./masterPromptV4";
import { L3_PERSONAL_STYLE } from "./promptLayers";

/**
 * 지칭(3인칭↔1인칭) 혼동 시 되묻지 않고 풀어내는 화법 규칙 회귀 방지.
 *
 * 원칙: 화면에 사주가 하나뿐이면 누구 것인지 되묻지 않는다.
 * 되물으면 고객의 질문권 1회가 차감되므로, 한 줄 안내 후 곧장 정석 통변으로 풀어낸다.
 */
describe("지칭 혼동 시 되묻기 금지 규칙", () => {
  it("masterPromptV4에 지칭 흔들림 대응 규칙이 포함된다", () => {
    const p = MASTER_PERSONA_V4;
    expect(p).toContain("지칭이 흔들려도 되묻지 않는다");
    expect(p).toContain("질문권");
    // 핵심: 되물지 말고 화면의 사주 하나로 풀어낸다
    expect(p).toContain("화면에 사주는 하나뿐");
    expect(p).toContain("질문으로 끝내지 말고");
  });

  it("L3 개인 화법 규칙에 되묻기 금지 한 줄이 포함된다", () => {
    expect(L3_PERSONAL_STYLE).toContain("3인칭↔ 1인칭");
    expect(L3_PERSONAL_STYLE).toContain("되물지 않는다");
    expect(L3_PERSONAL_STYLE).toContain("질문으로 끝내지 않는다");
  });
});
