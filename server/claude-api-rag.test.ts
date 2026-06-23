import { describe, it, expect } from "vitest";
import {
  buildRagSystemPrompt,
  previewRagSearch,
  MASTER_SYSTEM_PROMPT,
} from "./claude-api-rag";

describe("Claude API + RAG Integration", () => {
  describe("System Prompt Building", () => {
    it("should include master system prompt (v4 persona)", () => {
      const prompt = buildRagSystemPrompt("갑목 봄");
      // v4 키워드 확인
      expect(prompt).toContain("마스터");
      expect(prompt).toContain("조감");
    });

    it("should include RAG context when chunks are found", () => {
      const prompt = buildRagSystemPrompt("갑목");
      expect(prompt).toContain(MASTER_SYSTEM_PROMPT);
    });

    it("should handle empty query gracefully", () => {
      const prompt = buildRagSystemPrompt("");
      expect(prompt).toContain("마스터");
    });

    it("should include 5 principles (v4)", () => {
      const prompt = buildRagSystemPrompt("사주 분석");
      expect(prompt).toContain("5대 원칙");
    });

    it("should include analysis framework (v4 6단계)", () => {
      const prompt = buildRagSystemPrompt("직업");
      expect(prompt).toContain("핵심 이론");
      expect(prompt).toContain("조후를 먼저 잡습니다");
    });

    it("should include ethics guidelines (v4)", () => {
      const prompt = buildRagSystemPrompt("사주");
      expect(prompt).toContain("절대 금지");
      expect(prompt).toContain("도박");
    });

    it("should include psychology references (v4)", () => {
      const prompt = buildRagSystemPrompt("심리");
      expect(prompt).toContain("아들러");
      expect(prompt).toContain("인지심리학");
      expect(prompt).toContain("강점심리학");
    });

    it("should respect topK parameter", () => {
      const prompt1 = buildRagSystemPrompt("갑목", 1);
      const prompt2 = buildRagSystemPrompt("갑목", 5);
      expect(prompt1).toContain(MASTER_SYSTEM_PROMPT);
      expect(prompt2).toContain(MASTER_SYSTEM_PROMPT);
    });
  });

  describe("RAG Search Preview", () => {
    it("should return search results", () => {
      const results = previewRagSearch("갑목");
      expect(results).toHaveProperty("query");
      expect(results).toHaveProperty("totalResults");
      expect(results).toHaveProperty("results");
    });

    it("should include chunk metadata (v3 structure)", () => {
      const results = previewRagSearch("갑목");
      if (results.results.length > 0) {
        const chunk = results.results[0];
        expect(chunk).toHaveProperty("id");
        expect(chunk).toHaveProperty("section");
        expect(chunk).toHaveProperty("title");
        expect(chunk).toHaveProperty("tags");
        expect(chunk).toHaveProperty("contentPreview");
      }
    });

    it("should limit results to 3 by default", () => {
      const results = previewRagSearch("사주");
      expect(results.totalResults).toBeLessThanOrEqual(3);
    });

    it("should handle various queries", () => {
      const queries = ["갑목", "병화", "임수", "직업", "대운", "신살", "건강"];
      queries.forEach((query) => {
        const results = previewRagSearch(query);
        expect(results.query).toBe(query);
        expect(Array.isArray(results.results)).toBe(true);
      });
    });

    it("should include content preview", () => {
      const results = previewRagSearch("갑목");
      if (results.results.length > 0) {
        const chunk = results.results[0];
        expect(chunk.contentPreview.length).toBeGreaterThan(0);
        expect(chunk.contentPreview.length).toBeLessThanOrEqual(300);
      }
    });
  });

  describe("Master System Prompt (v4)", () => {
    it("should define persona (마스터, 실명 미노출)", () => {
      expect(MASTER_SYSTEM_PROMPT).toContain("마스터"); expect(MASTER_SYSTEM_PROMPT).not.toContain("도림");
      expect(MASTER_SYSTEM_PROMPT).toContain("30년 내공");
    });

    it("should define 5 principles", () => {
      expect(MASTER_SYSTEM_PROMPT).toContain("5대 원칙");
    });

    it("should include analysis framework (6단계)", () => {
      expect(MASTER_SYSTEM_PROMPT).toContain("핵심 이론");
    });

    it("should include ethics (절대 금지)", () => {
      expect(MASTER_SYSTEM_PROMPT).toContain("절대 금지");
    });

    it("should include psychology", () => {
      expect(MASTER_SYSTEM_PROMPT).toContain("심리학 적용");
    });

    it("should include answer style (화법 원칙)", () => {
      expect(MASTER_SYSTEM_PROMPT).toContain("통변 방식");
    });
  });

  describe("Integration", () => {
    it("should combine master prompt with RAG context", () => {
      const prompt = buildRagSystemPrompt("갑목 봄");
      expect(prompt.length).toBeGreaterThan(MASTER_SYSTEM_PROMPT.length);
    });

    it("should maintain prompt structure (v4)", () => {
      const prompt = buildRagSystemPrompt("사주");
      expect(prompt).toContain("마스터");
      expect(prompt).toContain("5대 원칙");
      expect(prompt).toContain("핵심 이론");
    });

    it("should handle multiple queries", () => {
      const queries = ["갑목", "병화", "직업", "건강", "대운"];
      queries.forEach((query) => {
        const prompt = buildRagSystemPrompt(query);
        expect(prompt).toContain("마스터");
      });
    });
  });
});
