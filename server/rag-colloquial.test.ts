import { describe, it, expect } from "vitest";
import { searchRagChunks } from "./rag-search";

/**
 * 구어체(일상어) 질문 RAG 검색 품질 회귀 방지 테스트
 *
 * 배경: "돈은 언제쯤 모이나요?" 같은 구어체 질문은 "언제쯤/모이나요" 같은
 * 일반 토큰이 Jaccard 분모를 키워 점수를 희석시켜, 기본 threshold(0.02)에서
 * 0건이 반환되던 문제가 있었다. 이를 (1) 단음절 명사+1글자 조사 분리(돈은→돈),
 * (2) 동의어 핵심어 매칭 보너스 가중치로 해결했다.
 *
 * 토큰 비용 0인 순수 로직이며, 실제 상담 sendMessage 경로(기본 threshold)에서도
 * 재물/직업/배우자/자식/관운 등 핵심 육친 질문이 안정적으로 청크를 끌어와야 한다.
 */
describe("RAG 구어체 질문 검색 품질", () => {
  it("구어체 재물 질문도 재성 관련 청크를 끌어온다 (기본 threshold)", () => {
    for (const q of [
      "돈은 언제쯤 모이나요?",
      "돈 언제 벌어요?",
      "재물운이 궁금합니다",
    ]) {
      const chunks = searchRagChunks(q, 3);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      // 재물/재성/사업 관련 청크가 적어도 하나는 포함되어야 함
      const joined = chunks.map((c) => c.title + c.tags.join(" ")).join(" ");
      expect(/재성|재물|사업/.test(joined)).toBe(true);
    }
  });

  it("단음절 명사+1글자 조사도 정규화되어 검색된다 (돈은→돈)", () => {
    const withParticle = searchRagChunks("돈은 어떤가요?", 3);
    expect(withParticle.length).toBeGreaterThanOrEqual(1);
  });

  it("핵심 육친 구어체 질문이 관련 청크를 끌어온다", () => {
    const cases: Array<[string, RegExp]> = [
      ["이 사람 배우자운 어때?", /배우자|처자|인연|관성|재성/],
      ["이 사람 직업이 뭘것 같아?", /직업|재성|관성|식상/],
      ["자식운이 궁금해요", /자식|관성/],
      ["승진은 언제 할까요?", /관성|관운|직장|조직/],
    ];
    for (const [q, pattern] of cases) {
      const chunks = searchRagChunks(q, 3);
      expect(chunks.length).toBeGreaterThanOrEqual(1);
      const joined = chunks.map((c) => c.title + c.tags.join(" ")).join(" ");
      expect(pattern.test(joined)).toBe(true);
    }
  });

  it("보너스가 무관한 청크를 과도하게 끌어오지 않는다 (상한 적용)", () => {
    // 무의미한 질문은 여전히 적은 결과(혹은 0건)를 반환해야 한다
    const chunks = searchRagChunks("xyzabc 12345 ???", 5);
    expect(chunks.length).toBeLessThanOrEqual(2);
  });
});
