import { describe, it, expect } from "vitest";
import { MASTER_PERSONA_V4 } from "./masterPromptV4";
import { calculateSaju, formatSajuForPrompt } from "./saju";

/**
 * 조후 가치 격상 회귀 방지.
 *
 * 버그: 사월 갑목에 시지 자수 한 점처럼, 계절상 절실한 기운이 약하게/구석에 있을 때
 * "양이 적다 → 덕이 박하다/늦다"로만 기계적으로 읽고, 그 기운이 일간에게 얼마나
 * 귀한 생명수인지를 짚지 못함.
 * 수정: 양보다 귀함을 우선하는 원칙을 마스터 어법(희신·용신 술어 배제)으로 명시.
 */
describe("조후 가치 격상 — 양보다 귀함", () => {
  it("마스터 페르소나에 '절실한 기운은 한 점이어도 귀물' 원칙이 박혀 있다", () => {
    expect(MASTER_PERSONA_V4).toContain("한 점이어도 귀물");
    expect(MASTER_PERSONA_V4).toContain("양·위치만 보고");
    // 사월 갑목 + 시지 자수 예시가 들어있어 클로드가 패턴을 잡는다
    expect(MASTER_PERSONA_V4).toContain("사월(여름) 갑목에 시지 자수");
  });

  it("조후 격상 블록에서 '희신·용신' 같은 기계적 술어를 쓰지 않는다(금기 선언 줄 제외)", () => {
    // '格局用神·희신기신 이분법'은 금지 선언 자체라 허용. 그 줄을 제거한 본문에는 술어가 없어야 한다.
    const body = MASTER_PERSONA_V4.replace(/格局用神·희신기신 이분법/g, "");
    expect(body).not.toContain("희신");
    expect(body).not.toContain("용신");
  });

  it("사주 데이터 블록 조후 해석 지침에도 격상 한 줄이 들어간다", () => {
    const r = calculateSaju({ year: 1975, month: 5, day: 10, hour: 8, minute: 0, gender: "male" });
    const block = formatSajuForPrompt(r);
    expect(block).toContain("절실한 기운은 한 점");
    expect(block).toContain("귀물이다");
  });
});
