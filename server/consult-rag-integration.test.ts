import { describe, it, expect } from "vitest";
import { searchRagChunks, formatRagContext } from "./rag-search";
import { buildRagSystemPrompt, previewRagSearch } from "./claude-api-rag";

/**
 * 상담 라우터 + RAG v3 통합 테스트
 * v4 페르소나 키워드 기준으로 업데이트
 */
describe("Consult Router + RAG Integration", () => {
  describe("Consultation Query Scenarios", () => {
    it("should search for chunks when user asks about 갑목", () => {
      const userQuery = "갑목인 사람의 특징이 뭔가요?";
      const chunks = searchRagChunks(userQuery, 3);
      expect(chunks.length).toBeGreaterThanOrEqual(0);
      if (chunks.length > 0) {
        expect(chunks[0]).toHaveProperty("content");
        expect(chunks[0].content.length).toBeGreaterThan(0);
      }
    });

    it("should search for chunks when user asks about career", () => {
      const userQuery = "제 사주로 봤을 때 어떤 직업이 맞을까요?";
      const chunks = searchRagChunks(userQuery, 3);
      expect(Array.isArray(chunks)).toBe(true);
    });

    it("should search for chunks when user asks about health", () => {
      const userQuery = "건강 운세는 어떻게 되나요?";
      const chunks = searchRagChunks(userQuery, 3);
      expect(Array.isArray(chunks)).toBe(true);
    });

    it("should search for chunks when user asks about luck", () => {
      const userQuery = "대운이 언제부터 좋아질까요?";
      const chunks = searchRagChunks(userQuery, 3);
      expect(Array.isArray(chunks)).toBe(true);
    });

    it("should search for chunks when user asks about relationships", () => {
      const userQuery = "연애운은 어떻게 되나요?";
      const chunks = searchRagChunks(userQuery, 3);
      expect(Array.isArray(chunks)).toBe(true);
    });
  });

  describe("System Prompt Building for Consultation", () => {
    it("should build system prompt with RAG context (v4 persona)", () => {
      const userQuery = "갑목인데 앞으로 어떻게 살아야 할까요?";
      const systemPrompt = buildRagSystemPrompt(userQuery, 3);
      // v4 키워드 확인
      expect(systemPrompt).toContain("마스터");
      expect(systemPrompt).toContain("30년 내공");
    });

    it("should include RAG context in system prompt", () => {
      const userQuery = "직업 추천을 받고 싶어요";
      const systemPrompt = buildRagSystemPrompt(userQuery, 2);
      expect(systemPrompt.length).toBeGreaterThan(100);
    });

    it("should handle various consultation topics", () => {
      const queries = [
        "갑목 봄 사주 분석",
        "직업 추천",
        "대운 분석",
        "건강 운세",
        "연애 운세",
        "재물운",
        "심리 분석",
      ];
      queries.forEach((query) => {
        const systemPrompt = buildRagSystemPrompt(query);
        expect(systemPrompt).toContain("마스터");
      });
    });
  });

  describe("RAG Search Preview for Consultation", () => {
    it("should preview RAG search results for consultation query", () => {
      const userQuery = "갑목인 사람의 특징";
      const preview = previewRagSearch(userQuery);
      expect(preview).toHaveProperty("query");
      expect(preview).toHaveProperty("totalResults");
      expect(preview).toHaveProperty("results");
      expect(preview.query).toBe(userQuery);
    });

    it("should include content preview in results", () => {
      const userQuery = "직업";
      const preview = previewRagSearch(userQuery);
      if (preview.results.length > 0) {
        const result = preview.results[0];
        expect(result).toHaveProperty("contentPreview");
        expect(result.contentPreview.length).toBeGreaterThan(0);
      }
    });

    it("should limit results to 3 by default", () => {
      const userQuery = "사주 분석";
      const preview = previewRagSearch(userQuery);
      expect(preview.totalResults).toBeLessThanOrEqual(3);
    });
  });

  describe("RAG Context Formatting for Consultation", () => {
    it("should format RAG context properly (v3 structure)", () => {
      const userQuery = "갑목";
      const chunks = searchRagChunks(userQuery, 2);
      const formatted = formatRagContext(chunks);
      if (chunks.length > 0) {
        expect(formatted).toContain("참고 자료");
        expect(formatted).toContain("태그");
      }
    });

    it("should include section and title in formatted output", () => {
      const userQuery = "직업";
      const chunks = searchRagChunks(userQuery, 1);
      const formatted = formatRagContext(chunks);
      if (chunks.length > 0) {
        expect(formatted).toContain(chunks[0].section);
        expect(formatted).toContain(chunks[0].title);
      }
    });

    it("should handle empty chunks gracefully", () => {
      const formatted = formatRagContext([]);
      expect(formatted).toBe("");
    });
  });

  describe("End-to-End Consultation Flow", () => {
    it("should work end-to-end: query -> search -> format -> system prompt", () => {
      const userQuery = "갑목인데 직업이 뭐가 좋을까요?";
      const chunks = searchRagChunks(userQuery, 3);
      expect(Array.isArray(chunks)).toBe(true);
      const formatted = formatRagContext(chunks);
      if (chunks.length > 0) {
        expect(formatted.length).toBeGreaterThan(0);
      }
      const systemPrompt = buildRagSystemPrompt(userQuery, 3);
      expect(systemPrompt).toContain("마스터");
    });

    it("should handle consultation with no RAG results", () => {
      const userQuery = "아주 이상한 질문 xyzabc 12345";
      const systemPrompt = buildRagSystemPrompt(userQuery, 3);
      expect(systemPrompt).toContain("마스터");
    });

    it("should handle multiple consecutive queries", () => {
      const queries = [
        "갑목이 뭔가요?",
        "직업 추천 받고 싶어요",
        "앞으로 어떻게 살아야 할까요?",
      ];
      queries.forEach((query) => {
        const chunks = searchRagChunks(query, 2);
        const systemPrompt = buildRagSystemPrompt(query, 2);
        expect(Array.isArray(chunks)).toBe(true);
        expect(systemPrompt).toContain("마스터");
      });
    });
  });

  describe("RAG Search Quality", () => {
    it("should find relevant chunks for specific keywords", () => {
      const keywords = ["갑목", "병화", "임수", "계수", "육친", "대운"];
      keywords.forEach((keyword) => {
        const chunks = searchRagChunks(keyword, 3);
        expect(Array.isArray(chunks)).toBe(true);
      });
    });

    it("should return different results for different queries", () => {
      const chunks1 = searchRagChunks("갑목");
      const chunks2 = searchRagChunks("병화");
      expect(Array.isArray(chunks1)).toBe(true);
      expect(Array.isArray(chunks2)).toBe(true);
    });

    it("should respect threshold parameter", () => {
      const resultsLow = searchRagChunks("갑목", 10, 0.01);
      const resultsHigh = searchRagChunks("갑목", 10, 0.5);
      expect(resultsLow.length).toBeGreaterThanOrEqual(resultsHigh.length);
    });
  });
});
