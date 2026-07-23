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
import { analyzeRevealLayers } from "./saju";
import type { SajuResult, SajuPillar } from "./saju";
import { buildCareerReadingBlock } from "./careerReading";

type SiksangStatus = "present" | "absent" | "unknown";
function getSiksangStatus(sajuData: SajuResult | undefined | null): SiksangStatus {
  if (!sajuData) return "unknown";
  try {
    const pillarsArr = Object.values(sajuData.pillars).filter(Boolean) as SajuPillar[];
    if (pillarsArr.length === 0) return "unknown";
    const layers = analyzeRevealLayers(pillarsArr);
    const siksang = layers.find((l) => l.category === "식상");
    if (!siksang) return "unknown";
    return siksang.inStem || siksang.inBranch || siksang.hiddenOnly ? "present" : "absent";
  } catch {
    return "unknown";
  }
}

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
    sajuData?: SajuResult;
  },
): Promise<ClaudeRagResult> {
  const { cachedBlocks, dynamicContext, userQuery, maxTokens = 2048, ragOverride, ragTopK = 3, sajuData } = opts;

  // RAG 결합: 명시 지정이 있으면 그것을, 없으면 쿼리로 검색.
  let ragText = ragOverride ?? "";
  if (!ragOverride) {
    // ragOverride===undefined(개인상담 RAG ON)일 때만 조건 필터 적용.
    // ragOverride===""(기존 버그 경로)는 필터 없이 기존 동작 유지.
    const excludeIds: string[] =
      ragOverride === undefined
        ? (() => {
            const s = getSiksangStatus(sajuData);
            return s === "present" || s === "unknown" ? ["E4-06"] : [];
          })()
        : [];
    const ragChunks = searchRagChunks(userQuery, ragTopK, 0.02, excludeIds);
    if (ragChunks.length > 0) ragText = formatRagContext(ragChunks);
  }

  // 직업 직접 질문 판별: 최소 패턴만 매칭 (총평·결혼·건강·재물 질문과 혼용 금지)
  const CAREER_DIRECT_PATTERNS = [
    "난 어떤 일을 하면 좋을까",
    "무슨 일을 하면 좋을까",
    "어떤 직업이 맞을까",
    "내 직업운",
    "진로가 궁금해",
  ];
  const isCareerDirectQuery = CAREER_DIRECT_PATTERNS.some((p) =>
    userQuery.includes(p)
  );
  if (isCareerDirectQuery) {
    ragText =
      (ragText ? ragText + "\n\n" : "") +
      `[직업 질문 필수 절차]
답변 초반에는 계산값과 자리·때가 지지하는 범위에서 과거 사회 진입 방식·노동 형태·정착 구간을 1~2문장으로 자연스럽게 복원한 뒤 현재와 미래의 현실 경로를 제시한다. 근거가 약하면 하나의 사실로 단정하지 말고 가능한 사건군을 조건부로 제시한다. 이 절차를 항목식 점검표로 노출하지 않는다.`;

    // 중간 판독값 블록 추가 (entryType + laborMeans)
    if (sajuData) {
      const readingBlock = buildCareerReadingBlock(sajuData);
      if (readingBlock) {
        ragText += "\n\n" + readingBlock;
      }
    }
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
