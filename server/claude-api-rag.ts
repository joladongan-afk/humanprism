/**
 * Claude API + RAG 통합 모듈
 * RAG 검색 결과를 Claude 시스템 프롬프트에 통합하여 상담 생성.
 *
 * 캐싱 전략(4계층 아키텍처와 연동):
 *   - 고정 캐시 블록 = L1+L2+L3 (페르소나/정책/스타일) → cachedSystemPrompt
 *   - 동적 비캐시 블록 = L4 (사주 데이터 + temporal + RAG) → dynamicSystemPrompt
 *   고정 블록은 사주가 달라도 동일하므로 캐시가 유지되고, 동적 블록만 매번 바뀐다.
 */

import { invokeClaudeAPI } from "./claude-api";
import { searchRagChunks, formatRagContext } from "./rag-search";

// MASTER_SYSTEM_PROMPT v4 — masterPrompt.ts의 MASTER_PERSONA와 동기화
import { MASTER_PERSONA_V4 } from "./masterPromptV4";
export const MASTER_SYSTEM_PROMPT = MASTER_PERSONA_V4;

/**
 * invokeClaudeWithRag / invokeClaudeWithRagLayers의 반환 타입.
 * 기존에는 content 문자열만 반환하여 Anthropic 응답의 stop_reason이
 * 호출부까지 전달되지 못했다(P19-041). 절단 여부를 관측하기 위해
 * stopReason을 함께 반환한다.
 */
export type ClaudeRagResult = {
  content: string;
  stopReason: string;
};

/**
 * RAG 검색 결과를 포함한 확장된 시스템 프롬프트 생성(하위호환).
 */
export function buildRagSystemPrompt(userQuery: string, topK: number = 3): string {
  const ragChunks = searchRagChunks(userQuery, topK);
  let systemPrompt = MASTER_SYSTEM_PROMPT;
  if (ragChunks.length > 0) {
    systemPrompt += "\n" + formatRagContext(ragChunks);
  }
  return systemPrompt;
}

/**
 * Claude API를 RAG와 함께 호출(하위호환 단일 문자열 경로).
 *
 * @param baseSystemPrompt 고정+동적이 섞인 시스템 프롬프트. 주어지면 이것을 캐시 블록으로,
 *        RAG를 동적 블록으로 분리한다. (사주가 섞여 있으면 캐시 효율은 떨어질 수 있음)
 *        최적 캐시 효율을 원하면 invokeClaudeWithRagLayers를 사용한다.
 */
export async function invokeClaudeWithRag(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  userQuery: string,
  maxTokens: number = 2048,
  baseSystemPrompt?: string,
): Promise<ClaudeRagResult> {
  const cachedSystemPrompt = baseSystemPrompt || buildRagSystemPrompt(userQuery, 3);

  let dynamicSystemPrompt = "";
  if (baseSystemPrompt) {
    const ragChunks = searchRagChunks(userQuery, 3);
    if (ragChunks.length > 0) {
      dynamicSystemPrompt = formatRagContext(ragChunks);
    }
  }

  const result = await invokeClaudeAPI({
    messages,
    maxTokens,
    cachedSystemPrompt,
    dynamicSystemPrompt,
  });
  return { content: result.content, stopReason: result.stopReason };
}

/**
 * 계층 분리 호출(권장) — 4계층 아키텍처와 직접 연동.
 *
 * 고정 캐시 블록(L1+L2+L3)과 동적 블록(L4=사주+temporal)을 명시적으로 받고,
 * RAG 컨텍스트를 동적 블록 뒤에 결합한다. 사주가 바뀌어도 고정 블록 캐시는 유지된다.
 *
 * @param cachedBlocks 고정 캐시 블록 배열(보통 1개: [L1+L2+L3])
 * @param dynamicContext 동적 컨텍스트(사주 데이터 + temporal 등, RAG 제외)
 * @param userQuery RAG 검색 쿼리
 * @param ragOverride RAG 컨텍스트를 직접 지정(예: 궁합 관계별 컨텍스트). 없으면 userQuery로 검색.
 */
export async function invokeClaudeWithRagLayers(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  opts: {
    cachedBlocks: string[];
    dynamicContext: string;
    userQuery: string;
    maxTokens?: number;
    ragOverride?: string;
    ragTopK?: number;
  },
): Promise<ClaudeRagResult> {
  const { cachedBlocks, dynamicContext, userQuery, maxTokens = 2048, ragOverride, ragTopK = 3 } = opts;

  // RAG 결합: 명시 지정이 있으면 그것을, 없으면 쿼리로 검색.
  let ragText = ragOverride ?? "";
  if (!ragOverride) {
    const ragChunks = searchRagChunks(userQuery, ragTopK);
    if (ragChunks.length > 0) ragText = formatRagContext(ragChunks);
  }

  const dynamicSystemPrompt = [dynamicContext, ragText].filter((s) => s && s.trim()).join("\n\n");

  // 고정 블록이 여러 개면 합쳐서 단일 캐시 블록으로 전달(현재 claude-api는 단일 캐시 블록 사용).
  const cachedSystemPrompt = cachedBlocks.join("\n\n");

  const result = await invokeClaudeAPI({
    messages,
    maxTokens,
    cachedSystemPrompt,
    dynamicSystemPrompt,
  });
  return { content: result.content, stopReason: result.stopReason };
}

/**
 * 테스트용: RAG 검색 결과 미리보기
 */
export function previewRagSearch(query: string) {
  const chunks = searchRagChunks(query, 3);
  return {
    query,
    totalResults: chunks.length,
    results: chunks.map((chunk) => ({
      id: chunk.id,
      section: chunk.section,
      title: chunk.title,
      tags: chunk.tags,
      contentPreview: chunk.content.substring(0, 300),
    })),
  };
}
