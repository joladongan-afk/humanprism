/**
 * 개인 상담 상주(常駐) 지식 블록 — 압축본.
 *
 * 배경: 통변의 토대가 되는 자료(형충회합·육친통변·12지물상 등)는 한자 위주라
 * 일상어 질문과 단어가 안 겹쳐 RAG 검색에 거의 안 잡힌다. 그래서 통변의 "사전"에
 * 해당하는 핵심만 요약해 시스템 프롬프트에 상주시킨다.
 *
 * 이 블록은 cachedBlocks에 들어가 프롬프트 캐시 대상이 된다(반복 비용 절감).
 * 원본 약 18,832자 → 압축. 핵심 관법은 보존하고 설명·예시·반복을 다이어트했다.
 *
 * 정답(특정 통변 결론)은 절대 박지 않는다. 지엽 이론을 규칙으로 못박는 것을 금지한다.
 */

const PERSONAL_KNOWLEDGE_BLOCK = "";

/**
 * 개인 상담 상주 지식 블록을 반환한다.
 * (cachedBlocks에 실려 프롬프트 캐시 대상이 됨)
 */
export function buildPersonalKnowledgeBlock(): string {
  return PERSONAL_KNOWLEDGE_BLOCK;
}

/**
 * 해당 사주의 일주(日柱) 60갑자 물상 1개를 동적 블록용으로 만든다.
 * 60개 전부 상주시키지 않고, 그 사람의 일주에 해당하는 청크만 골라 토큰을 절약한다.
 * 일주 간지 문자열(예: "甲子")을 받아 E-{간지} id로 조회한다.
 */
import { getChunkById } from "./rag-search";

export function buildDayPillarSourceBlock(dayGanji: string): string {
  const chunk = getChunkById(`E-${dayGanji}`);
  if (!chunk) return "";
  return [
    "## 참고 — 이 사주의 일주(日柱) 물상",
    `이 내담자의 일주는 ${dayGanji}입니다. 아래 일주 물상은 하나의 보조 소스입니다. 그대로 읊지 말고, 위 "정석"의 판단(계절·잘생김)을 거친 해석에 자연스럽게 녹여 쓰십시오. 필요하면 다른 기둥에도 육친 돌리기로 응용할 수 있습니다.`,
    "",
    `- (${chunk.id}) **${chunk.title}**: ${chunk.content}`,
  ].join("\n");
}
