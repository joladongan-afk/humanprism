/**
 * CS 챗봇 상담 라우터 - RAG 통합
 * 사주 상담 시 벡터 DB에서 관련 규칙/관법 검색 후 LLM으로 상담 생성
 */

import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { searchRagChunks, formatRagContext, getAllChunks } from "../rag-search";
import { invokeLLM } from "../_core/llm";

export const csConsultationRouter = router({
  /**
   * RAG 검색 테스트
   */
  searchRag: publicProcedure
    .input(
      z.object({
        query: z.string().describe("검색 쿼리"),
        topK: z.number().optional().describe("반환할 청크 개수"),
      })
    )
    .query(async ({ input }) => {
      try {
        const chunks = searchRagChunks(input.query, input.topK || 3);
        return {
          success: true,
          query: input.query,
          results: chunks.map((chunk) => ({
            id: chunk.id,
            section: chunk.section,
            title: chunk.title,
            tags: chunk.tags,
            contentPreview: chunk.content.substring(0, 200),
          })),
          totalResults: chunks.length,
        };
      } catch (error) {
        console.error("RAG 검색 실패:", error);
        return {
          success: false,
          error: "RAG 검색 중 오류가 발생했습니다.",
          results: [],
          totalResults: 0,
        };
      }
    }),

  /**
   * RAG DB 상태 확인
   */
  checkRAGStatus: publicProcedure.query(async () => {
    try {
      const chunks = getAllChunks();
      const sections = new Set(chunks.map((c) => c.section));

      return {
        success: true,
        status: {
          totalChunks: chunks.length,
          sections: Array.from(sections),
          sampleChunks: chunks.slice(0, 3).map((c) => ({
            id: c.id,
            section: c.section,
            title: c.title,
          })),
        },
      };
    } catch (error) {
      console.error("RAG 상태 확인 실패:", error);
      return {
        success: false,
        error: "RAG DB를 찾을 수 없습니다.",
        status: null,
      };
    }
  }),
});
