import type { SajuResult } from "./saju";
import { searchRagChunks, formatRagContext } from "./rag-search";
import { MASTER_PERSONA_V4 } from "./masterPromptV4";
import { buildPersonalKnowledgeBlock } from "./personalKnowledge";
import {
  buildSystemLayers,
  buildPersonalDynamicContext,
  buildGanjiMappingTable,
  L2_PERSONAL_POLICY,
  L3_PERSONAL_STYLE,
  type ConsultMode,
} from "./promptLayers";

/**
 * masterPrompt.ts — 시스템 프롬프트 조립 진입점
 *
 * 내부적으로 promptLayers.ts의 4계층(L1 페르소나 / L2 정책 / L3 스타일 / L4 동적)을
 * 조립한다. 외부 호출부(routers 등)의 시그니처와 출력 동작은 그대로 유지한다.
 *
 * - buildSystemPrompt: 개인 상담용. L1+L2+L3(고정) + L4(동적)를 합친 단일 문자열을 반환한다
 *   (하위호환). 분리형 캐싱이 필요한 호출부는 buildSystemLayers + L4를 직접 사용한다.
 * - buildCompatibilityPrompt: 궁합 상담용.
 */

// 하위호환: 기존 코드가 MASTER_PERSONA를 참조할 수 있으므로 재노출
const MASTER_PERSONA = MASTER_PERSONA_V4;
export { MASTER_PERSONA, buildGanjiMappingTable };

/**
 * 개인 상담 시스템 프롬프트(단일 문자열, 하위호환).
 * L1+L2+L3 고정 계층 + L4 동적(사주/플랜)을 합쳐 반환한다.
 * RAG는 호출부에서 별도로 가변 블록으로 붙인다.
 */
export function buildSystemPrompt(saju: SajuResult, plan: string): string {
  const mode: ConsultMode = "personal";
  const { cachedBlocks } = buildSystemLayers(mode);
  // 형충회합(C)·육친통변(D) 상주 블록을 고정 계층에 항상 포함(검색 운에 의존하지 않음)
  const fixed = [...cachedBlocks, buildPersonalKnowledgeBlock()].join("\n\n");
  const dynamic = buildPersonalDynamicContext(saju, plan);
  return `${fixed}\n\n${dynamic}`;
}

/**
 * 개인 상담용 계층 분리 접근자 — 분리형 캐싱에 사용.
 * 고정(캐시) 블록과 동적(비캐시) 블록을 따로 돌려준다.
 */
export function buildPersonalPromptLayers(
  saju: SajuResult,
  plan: string,
  opts: { splitStyleLayer?: boolean } = {},
): { cachedBlocks: string[]; dynamic: string } {
  const { cachedBlocks } = buildSystemLayers("personal", opts);
  // 형충회합(C)·육친통변(D) 상주 블록을 고정(캐시) 계층에 항상 포함
  const withKnowledge = [...cachedBlocks, buildPersonalKnowledgeBlock()];
  const dynamic = buildPersonalDynamicContext(saju, plan);
  return { cachedBlocks: withKnowledge, dynamic };
}

/**
 * 초기 인사말 생성
 */
export function buildInitialGreeting(plan: string, _currentSajuInfo?: string): string {
  // 마스터 직접 상담(예약제, 시간제)과 횟수제 AI 세션의 첫 인사를 구분한다.
  // 횟수제 세션은 "사주 뽑기는 자유, 단 질문은 1회 차감 + 첫 입장 후 72시간"을 분명히 고지한다.
  const isMaster = plan === "master_chat" || plan === "master_offline";
  if (isMaster) {
    return `반갑습니다. 사주가 오른쪽에 준비되어 있습니다. 지금부터 초격차 사주 풀이를 시작하겠습니다.`;
  }
  return `반갑습니다. 사주가 오른쪽에 준비되어 있습니다.\n\n사주를 새로 뽑는 것은 제한이 없습니다. 본인뿐 아니라 가족·연인·친구 누구의 사주든, 오른쪽 \“만세력에서 사주 입력\”을 눌러 생년월일시를 넣으시면 몇 분이든 불러오실 수 있습니다.\n\n다만 **질문을 한 번 보내실 때마다 횟수가 1회 차감**되니, 가벼운 단답이라도 신중하고 정성스럽게 모아서 물어주시면 좋습니다. 구매하신 질문은 **첫 입장 후 72시간(3일) 안에** 사용해 주십시오.\n\n자, 그럼 초격차 사주 풀이를 시작하겠습니다.`;
}

/**
 * 궁합/사주 비교 전용.
 */
const RELATION_LABEL: Record<string, string> = {
  couple: "연인 또는 부부",
  parent: "부모",
  child: "자녀",
  family: "가족(형제·자매)",
  work: "직장(상사·동료·부하)",
  friend: "친구",
  other: "기타 관계",
};

/**
 * 관계 유형별 RAG 검색 쿼리. v3 K섹션(궁합·인연론)에서 관계별 가이드를
 * 안정적으로 끌어오기 위해 관계별 대표 키워드를 명시한다.
 */
const RELATION_RAG_QUERY: Record<string, string> = {
  couple: "궁합 일지 일간 합 충 원진 도화 배우자 애증 결혼 속궁합 부부 연인 오행보완 육친",
  parent: "궁합 부모 자식 인성 식상 세대 양육 일간 오행보완 육친 상호작용",
  child: "궁합 자식 인연 식상 인성 양육 일간 일지 오행보완 육친 상호작용",
  family: "궁합 비겁 형제 일간 일지 삼합 충 오행보완 육친 상호작용 대원칙",
  work: "궁합 관성 식상 재성 협업 동업 일간 상호작용 사업 재물 육친",
  friend: "궁합 비겁 일지 삼합 편안함 일간 상호작용 대원칙 오행보완",
  other: "궁합 인연 일간 일지 오행보완 육친 상호작용 대원칙 재물",
};

/**
 * 관계 유형에 맞는 궁합 RAG 컨텍스트를 생성한다.
 * v3 K섹션(궁합·인연론, 57룰)에서 관계별 가이드를 안정적으로 끌어온다.
 * 관계 라벨을 항상 머리말로 명시하여 어떤 관계 분석인지 컨텍스트에 보장한다.
 */
export function buildCompatibilityRagContext(
  relationType: string,
  question?: string,
): string {
  const relQuery = RELATION_RAG_QUERY[relationType] ?? RELATION_RAG_QUERY.other;
  const query = question?.trim() ? `${relQuery} ${question.trim()}` : relQuery;
  const chunks = searchRagChunks(query, 5, 0);
  const relLabel = RELATION_LABEL[relationType] ?? "기타 관계";
  const header = `## 궁합 분석 대상 관계: ${relLabel}\n이 관계 유형(${relLabel})에 맞춰 아래 궁합·인연론 가이드를 근거로 상호작용을 해석한다.\n`;
  return header + formatRagContext(chunks);
}

function formatCompatPillars(saju: SajuResult): string {
  const p = saju.pillars;
  const hour = p.hour ? `${p.hour.stem}${p.hour.branch}` : "(시 모름)";
  return [
    `- 연주(年柱): ${p.year.stem}${p.year.branch}`,
    `- 월주(月柱): ${p.month.stem}${p.month.branch}`,
    `- 일주(日柱): ${p.day.stem}${p.day.branch}`,
    `- 시주(時柱): ${hour}`,
    `- 일간(日干): ${p.day.stem}(${p.day.stemElement})`,
    `- 성별: ${saju.input.gender === "male" ? "남자" : "여자"}`,
    `- 현재 나이: ${2026 - saju.input.year}세`,
  ].join("\n");
}

/**
 * 궁합 상담용 동적(L4) 블록 — 두 사람 사주 + 관계 + (선택)RAG.
 */
export function buildCompatibilityDynamicContext(
  sajuA: SajuResult,
  sajuB: SajuResult,
  labelA: string,
  labelB: string,
  relationType: string,
  ragContext?: string,
): string {
  const relLabel = RELATION_LABEL[relationType] ?? "관계";
  const ragBlock = ragContext?.trim() ? `\n${ragContext}\n` : "";
  return `${ragBlock}
## 지금은 "궁합(사주 비교)" 상담입니다
당신은 지금 한 사람이 아니라 두 사람의 사주를 함께 봅니다.
관계 유형: ${relLabel}

【${labelA}의 사주】
${formatCompatPillars(sajuA)}

【${labelB}의 사주】
${formatCompatPillars(sajuB)}

## 이번 분석의 호칭
- 두 사람을 부를 때는 "${labelA}님", "${labelB}님"으로 부른다.

## 대화 방식 — 가장 중요한 원칙
이 상담은 처음부터 긴 리포트를 던지는 자리가 아니다. 티키타카가 기본이다.
- 상대가 먼저 질문하면 -> 질문의 무게에 맞게 반응한다. 가벼운 질문엔 단답, 깊은 질문엔 깊은 답.
- 상대가 뭘 물어야 할지 모르면 -> 먼저 어떻게 시작할지 부드럽게 제안한다.
- 경우의 수 쪼개기: 되묻지 말고, 2~3가지 경우의 수로 갈래를 나눠 먼저 풀어 제시한다. 역질문은 시점이 모호할 때만 최대 1회.`;
}

/**
 * 궁합 상담 시스템 프롬프트(단일 문자열, 하위호환).
 * L1 + L2(궁합정책) + L3(궁합스타일) 고정 계층 + L4(두 사주/RAG) 동적.
 */
export function buildCompatibilityPrompt(
  sajuA: SajuResult,
  sajuB: SajuResult,
  labelA: string,
  labelB: string,
  relationType: string,
  ragContext?: string,
): string {
  const { cachedBlocks } = buildSystemLayers("compatibility");
  const fixed = cachedBlocks.join("\n\n");
  const dynamic = buildCompatibilityDynamicContext(
    sajuA,
    sajuB,
    labelA,
    labelB,
    relationType,
    ragContext,
  );
  return `${fixed}\n${dynamic}`;
}

/**
 * 궁합 상담용 계층 분리 접근자 — 분리형 캐싱에 사용.
 */
export function buildCompatibilityPromptLayers(
  sajuA: SajuResult,
  sajuB: SajuResult,
  labelA: string,
  labelB: string,
  relationType: string,
  ragContext?: string,
  opts: { splitStyleLayer?: boolean } = {},
): { cachedBlocks: string[]; dynamic: string } {
  const { cachedBlocks } = buildSystemLayers("compatibility", opts);
  const dynamic = buildCompatibilityDynamicContext(
    sajuA,
    sajuB,
    labelA,
    labelB,
    relationType,
    ragContext,
  );
  return { cachedBlocks, dynamic };
}

// 하위호환: 정책/스타일 상수를 기존 이름으로도 접근 가능하게 재노출
export { L2_PERSONAL_POLICY, L3_PERSONAL_STYLE };
