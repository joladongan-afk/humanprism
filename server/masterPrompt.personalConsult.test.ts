import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./masterPrompt";
import { calculateSaju } from "./saju";

// 개인 상담 시스템 프롬프트가 새 정책을 담고 있는지 검증한다:
//  - 여러 사람의 사주를 자유롭게 올려 각자 풀이받을 수 있다 (다중 사주 허용)
//  - 두 사람의 관계 궁합은 본격적으로 풀지 않고 궁합 자리로 부드럽게 안내한다 (궁합 절제)
const fakeSaju = () =>
  calculateSaju({ year: 1990, month: 5, day: 5, hour: 5, minute: 0, gender: "male" });

describe("개인 상담 시스템 프롬프트 - 다중 사주 + 궁합 절제", () => {
  const prompt = buildSystemPrompt(fakeSaju(), "60분 무제한");

  it("여러 사람의 사주를 자유롭게 올려 각자 풀이받을 수 있다고 명시한다", () => {
    expect(prompt).toContain("여러 사람의 사주를 자유롭게 올려");
  });

  it("관계 궁합 질문은 본격적으로 풀지 않도록 규칙을 담는다", () => {
    expect(prompt).toContain("궁합은 개인상담에서 본격적으로 풀지 않습니다");
    // 상호작용을 줄줄이 분석하지 말라는 절제 지침 포함
    expect(prompt).toContain("줄줄이 분석하지 말고");
  });

  it("궁합 자리로 부드럽게 안내하는 지침을 담는다 (차단하듯 말하지 않음)", () => {
    expect(prompt).toContain("부드럽게 안내");
    expect(prompt).toContain("따로 자리를 마련");
  });

  it("궁합 가격 숫자를 영업하듯 강조하지 말라는 지침을 담는다", () => {
    expect(prompt).toContain("직접 언급·영업 반복 금지");
  });

  it("자기 사주를 임의 계산/생성하지 말라는 무결성 지침을 유지한다", () => {
    expect(prompt).toContain("임의로 사주를 계산·생성하지 않습니다");
  });

  it("호칭을 'OO님'으로 강제하고 'OO씨'를 금지하는 규칙을 담는다", () => {
    expect(prompt).toContain("OO님");
    expect(prompt).toContain("OO씨");
  });
});

describe("개인 상담 프롬프트 - 추가 사주 존재 인정 + 개인/궁합 구분", () => {
  const prompt = buildSystemPrompt(fakeSaju(), "60분 무제한");

  it("이미 올라온 추가 사주를 '없다'고 말하지 않도록 절대 금지 규칙을 담는다", () => {
    expect(prompt).toContain("절대 금지");
    expect(prompt).toContain("사실 오류");
  });

  it("추가 사주가 들어오면 먼저 그 사실을 인정하라는 지침을 담는다", () => {
    expect(prompt).toContain("먼저 그 사실을 인정");
  });

  it("개인 풀이는 가능하나 궁합은 별도 플랜임을 구분 안내하는 지침을 담는다", () => {
    expect(prompt).toContain("개인 풀이와 궁합을 구분");
    expect(prompt).toContain("별개의 플랜");
  });
});
