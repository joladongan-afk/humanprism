import { describe, it, expect } from "vitest";
import { buildCompatibilityRagContext, buildCompatibilityPrompt } from "./masterPrompt";
import { getChunksBySection } from "./rag-search";
import type { SajuResult } from "./saju";

// v3 RAG: K 섹션(궁합·인연론) 청크가 정상 적재되었는지
describe("compat RAG chunks ingestion (v3)", () => {
  it("K 섹션 궁합 룰이 다수 적재되어 있다", () => {
    const chunks = getChunksBySection("K");
    // v3 K섹션은 11개 sub_section, 총 57개 룰
    expect(chunks.length).toBeGreaterThanOrEqual(50);
  });

  it("K 섹션 청크는 K-로 시작하는 ID를 가진다", () => {
    const chunks = getChunksBySection("K");
    chunks.forEach((c) => {
      expect(c.id.startsWith("K-")).toBe(true);
    });
  });
});

// 관계별 RAG 검색이 해당 관계 라벨을 컨텍스트에 포함하는지 (재현성 핵심)
describe("relation-aware RAG retrieval (v3)", () => {
  const cases: { relation: string; mustContain: string }[] = [
    { relation: "couple", mustContain: "연인 또는 부부" },
    { relation: "parent", mustContain: "부모" },
    { relation: "child", mustContain: "자녀" },
    { relation: "family", mustContain: "가족" },
    { relation: "work", mustContain: "직장" },
    { relation: "friend", mustContain: "친구" },
    { relation: "other", mustContain: "기타 관계" },
  ];

  for (const { relation, mustContain } of cases) {
    it(`${relation} 관계는 관계 라벨과 궁합 가이드를 컨텍스트에 포함한다`, () => {
      const ctx = buildCompatibilityRagContext(relation);
      expect(ctx.length).toBeGreaterThan(0);
      expect(ctx).toContain(mustContain);
      // K섹션 가이드가 실제로 검색되어 들어왔는지
      expect(ctx).toContain("참고 자료");
    });
  }

  it("같은 입력에 대해 항상 동일한 컨텍스트를 반환한다 (재현성)", () => {
    const a = buildCompatibilityRagContext("couple", "우리 잘 맞나요?");
    const b = buildCompatibilityRagContext("couple", "우리 잘 맞나요?");
    expect(a).toBe(b);
  });

  it("모든 관계 유형에서 K섹션 궁합 가이드가 비지 않는다", () => {
    const relations = ["couple", "parent", "child", "family", "work", "friend", "other"];
    relations.forEach((rel) => {
      const ctx = buildCompatibilityRagContext(rel);
      expect(ctx).toContain("참고 자료");
      // 적어도 하나의 참고 항목이 들어와야 함
      expect(ctx).toContain("참고 1:");
    });
  });
});

// 프롬프트 빌더가 RAG 컨텍스트를 실제로 삽입하는지
describe("buildCompatibilityPrompt with RAG", () => {
  const fakeSaju = (): SajuResult =>
    ({
      input: { year: 1990, month: 5, day: 5, hour: 5, minute: 0, gender: "male" },
      pillars: {
        year: { stem: "庚", branch: "午", stemElement: "金" },
        month: { stem: "辛", branch: "巳", stemElement: "金" },
        day: { stem: "甲", branch: "子", stemElement: "木" },
        hour: { stem: "丙", branch: "寅", stemElement: "火" },
      },
    }) as unknown as SajuResult;

  it("ragContext가 주어지면 프롬프트에 포함된다", () => {
    const rag = "RAG_MARKER_TEST_TOKEN";
    const prompt = buildCompatibilityPrompt(fakeSaju(), fakeSaju(), "갑", "을", "couple", rag);
    expect(prompt).toContain("RAG_MARKER_TEST_TOKEN");
    expect(prompt).toContain("궁합");
  });

  it("ragContext가 없어도 정상 동작한다", () => {
    const prompt = buildCompatibilityPrompt(fakeSaju(), fakeSaju(), "갑", "을", "parent");
    expect(prompt).toContain("부모");
  });
});

// 호칭 규칙: "OO님"을 강제하고 "OO씨" 사용을 금지하는 지시가 프롬프트에 포함되는지
describe("호칭 규칙 (OO님 강제 / OO씨 금지)", () => {
  const fakeSaju = (): SajuResult =>
    ({
      input: { year: 1990, month: 5, day: 5, hour: 5, minute: 0, gender: "male" },
      pillars: {
        year: { stem: "庚", branch: "午", stemElement: "金" },
        month: { stem: "辛", branch: "巳", stemElement: "金" },
        day: { stem: "甲", branch: "子", stemElement: "木" },
        hour: { stem: "丙", branch: "寅", stemElement: "火" },
      },
    }) as unknown as SajuResult;

  it("궁합 프롬프트에 '님' 호칭 강제 지시가 포함된다", () => {
    const prompt = buildCompatibilityPrompt(fakeSaju(), fakeSaju(), "철수", "영희", "couple");
    expect(prompt).toContain('"OO님"');
  });

  it("궁합 프롬프트에 '씨' 호칭 금지 지시가 포함된다", () => {
    const prompt = buildCompatibilityPrompt(fakeSaju(), fakeSaju(), "철수", "영희", "couple");
    expect(prompt).toContain('"OO씨"');
    expect(prompt).toContain("절대");
  });

  it("궁합 프롬프트에 두 사람 라벨이 '님'과 함께 예시로 들어간다", () => {
    const prompt = buildCompatibilityPrompt(fakeSaju(), fakeSaju(), "철수", "영희", "couple");
    expect(prompt).toContain("철수님");
    expect(prompt).toContain("영희님");
  });
});
