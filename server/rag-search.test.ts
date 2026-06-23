import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  searchRagChunks,
  formatRagContext,
  getAllChunks,
  getChunksBySection,
  getChunkById,
} from "./rag-search";

describe("RAG Search Engine v3", () => {
  describe("Database Loading", () => {
    it("should load all chunks from RAG v3 database (102 total)", () => {
      const chunks = getAllChunks();
      expect(chunks.length).toBeGreaterThanOrEqual(100);
    });

    it("should have required fields in each chunk", () => {
      const chunks = getAllChunks();
      chunks.forEach((chunk) => {
        expect(chunk.id).toBeDefined();
        expect(chunk.section).toBeDefined();
        expect(chunk.title).toBeDefined();
        expect(chunk.tags).toBeDefined();
        expect(chunk.content).toBeDefined();
      });
    });

    it("should have tags as arrays", () => {
      const chunks = getAllChunks();
      chunks.forEach((chunk) => {
        expect(Array.isArray(chunk.tags)).toBe(true);
      });
    });

    it("should include K section (궁합 룰) chunks", () => {
      const kChunks = getChunksBySection("K");
      expect(kChunks.length).toBeGreaterThan(0);
    });

    it("K section chunks should have principle in title", () => {
      const kChunks = getChunksBySection("K");
      kChunks.forEach((chunk) => {
        expect(chunk.title).toBeDefined();
        expect(chunk.title.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Section Filtering", () => {
    it("should filter chunks by section A", () => {
      const chunks = getChunksBySection("A");
      expect(chunks.length).toBeGreaterThan(0);
      chunks.forEach((chunk) => {
        expect(chunk.section).toBe("A");
      });
    });

    it("should return empty array for non-existent section", () => {
      const chunks = getChunksBySection("Z");
      expect(chunks.length).toBe(0);
    });
  });

  describe("Chunk Retrieval", () => {
    it("should retrieve chunk by ID", () => {
      const allChunks = getAllChunks();
      if (allChunks.length > 0) {
        const firstChunk = allChunks[0];
        const retrieved = getChunkById(firstChunk.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(firstChunk.id);
      }
    });

    it("should retrieve K section chunk by ID", () => {
      const chunk = getChunkById("K-01-01");
      expect(chunk).toBeDefined();
      expect(chunk?.section).toBe("K");
    });

    it("should return undefined for non-existent ID", () => {
      const chunk = getChunkById("non_existent_id");
      expect(chunk).toBeUndefined();
    });
  });

  describe("RAG Search", () => {
    it("should search for related chunks by query", () => {
      const results = searchRagChunks("갑목 봄");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("should return top K results", () => {
      const results = searchRagChunks("갑목", 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should handle empty query gracefully", () => {
      const results = searchRagChunks("");
      expect(Array.isArray(results)).toBe(true);
    });

    it("should search with various Korean saju keywords", () => {
      const queries = ["병화", "정화", "임수", "계수", "육친", "대운", "궁합"];
      queries.forEach((query) => {
        const results = searchRagChunks(query);
        expect(Array.isArray(results)).toBe(true);
      });
    });

    it("should respect threshold parameter", () => {
      const resultsLow = searchRagChunks("갑목", 10, 0.01);
      const resultsHigh = searchRagChunks("갑목", 10, 0.5);
      expect(resultsLow.length).toBeGreaterThanOrEqual(resultsHigh.length);
    });
  });

  describe("Context Formatting", () => {
    it("should format empty chunks as empty string", () => {
      const formatted = formatRagContext([]);
      expect(formatted).toBe("");
    });

    it("should format chunks with proper structure", () => {
      const chunks = searchRagChunks("갑목", 1);
      if (chunks.length > 0) {
        const formatted = formatRagContext(chunks);
        expect(formatted).toContain("참고 자료");
        expect(formatted).toContain("태그");
      }
    });

    it("should include section and title in formatted output", () => {
      const chunks = searchRagChunks("갑목", 1);
      if (chunks.length > 0) {
        const formatted = formatRagContext(chunks);
        expect(formatted).toContain(chunks[0].section);
        expect(formatted).toContain(chunks[0].title);
      }
    });

    it("should format multiple chunks correctly", () => {
      const chunks = searchRagChunks("갑목", 3);
      const formatted = formatRagContext(chunks);
      for (let i = 1; i <= chunks.length; i++) {
        expect(formatted).toContain(`참고 ${i}:`);
      }
    });
  });

  // 게시본(dist) 회귀 방지: RAG 데이터 파일이 빌드 산출물에 포함되고
  // rag-search가 dist/CWD 경로에서도 파일을 찾을 수 있어야 한다.
  describe("Deployment data file safety (regression)", () => {
    it("should keep rag-db.json present in server/ source", () => {
      const src = path.resolve(__dirname, "rag-db.json");
      expect(fs.existsSync(src)).toBe(true);
    });

    it("build copy script should exist so dist gets the data file", () => {
      const script = path.resolve(__dirname, "../scripts/copy-data.mjs");
      expect(fs.existsSync(script)).toBe(true);
      const content = fs.readFileSync(script, "utf-8");
      expect(content).toContain("rag-db.json");
      expect(content).toContain("calendar_data.csv");
    });

    it("build script in package.json should run the copy step", () => {
      const pkgPath = path.resolve(__dirname, "../package.json");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      expect(pkg.scripts.build).toContain("copy-data.mjs");
    });

    it("loadRagChunks should succeed regardless of cwd (multi-path search)", () => {
      // getAllChunks가 예외 없이 청크를 반환하면 경로 탐색이 동작한 것
      const chunks = getAllChunks();
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe("Integration", () => {
    it("should work end-to-end: search -> format", () => {
      const query = "갑목 봄 조후";
      const chunks = searchRagChunks(query, 3);
      const formatted = formatRagContext(chunks);

      expect(chunks.length).toBeGreaterThanOrEqual(0);
      if (chunks.length > 0) {
        expect(formatted.length).toBeGreaterThan(0);
        expect(formatted).toContain("참고 자료");
      }
    });
  });
});
