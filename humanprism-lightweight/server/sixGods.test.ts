import { describe, it, expect } from "vitest";
import { buildPersonalKnowledgeBlock } from "./personalKnowledge";

/**
 * 육친(십성) 체계 교육 블록 회귀 방지 테스트
 *
 * 마스터 정정 기준:
 * - 천간 음양: 갑병무경임=양 / 을정기신계=음
 * - 지지 음양: 寅양 卯음 / 巳양 午음 / 申양 酉음 / 亥양 子음 / 辰양 戌양 丑음 未음
 * - 명명: 음양 같으면 偏, 다르면 正 (단 비겁·식상은 고유명)
 * - 음양 동/이 비대칭: 관은 편관(음양동)이 더 사납고, 식상은 식신(음양동)이 더 부드럽다
 * - 폄하 금지: 계모/편모/서자 식 해석 금지 — 인성은 그냥 어머니
 * - 생물학적 매핑: 처=재성, 남편=관성, 자식 남명=관성/여명=식상, 부모=재성, 모친=인성
 */
describe("육친(십성) 체계 상주 블록", () => {
  const block = buildPersonalKnowledgeBlock();

  it("천간·지지 음양 배속이 명시된다", () => {
    expect(block).toContain("갑병무경임=양");
    expect(block).toContain("을정기신계=음");
    expect(block).toContain("寅양");
    expect(block).toContain("巳양"); // 마스터 기준: 巳는 양화 (체용 배제)
    expect(block).toContain("亥양"); // 마스터 기준: 亥는 양수 (체용 배제)
  });

  it("정/편 명명 규칙과 비겁·식상 고유명 예외가 들어있다", () => {
    expect(block).toContain("음양이 같으면 偏");
    expect(block).toContain("비견");
    expect(block).toContain("겁재");
    expect(block).toContain("식신");
    expect(block).toContain("상관");
  });

  it("음양 동/이 비대칭(편관 사납고, 식신 부드러움)이 명문화된다", () => {
    expect(block).toContain("편관이 더 사납");
    expect(block).toContain("식신이 더 부드럽");
  });

  it("식신=온건파 / 상관=급진파 구분이 들어있다", () => {
    expect(block).toContain("온건파");
    expect(block).toContain("급진파");
  });

  it("생물학적 인물 매핑이 정확하다", () => {
    expect(block).toContain("처=재성");
    expect(block).toContain("남편=관성");
    expect(block).toContain("부모=남녀 공히 재성");
    expect(block).toContain("모친=남녀 공히 인성");
    expect(block).toContain("조상"); // 조부 이상은 조상으로 대변
  });

  it("계모/편모 식 폄하 금지가 명시된다", () => {
    // '계모'·'편모' 단어는 오직 '금지' 맥락에서만 등장해야 한다
    expect(block).toContain("폄하하지 않는다");
    expect(block).toContain("그냥 어머니");
  });

  it("성별 배우자 구분(남명=재성 / 여명=관성)이 유지된다", () => {
    expect(block).toContain("배우자");
    expect(block).toContain("재성");
    expect(block).toContain("관성");
  });
});
