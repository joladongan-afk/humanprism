/**
 * RAG 검색 엔진 v3
 * RAG_전체통합_v3.json 구조 지원
 * - A~J 섹션: chunks 배열 (id, title, tags, content)
 * - K 섹션: sub_sections 배열 (id, title, rules[]) — rules에 id/principle/content
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface RagChunk {
  id: string;
  section: string;
  title: string;
  tags: string[];
  content: string;
}

// 내부 파싱용 원시 타입
interface RawChunk {
  id: string;
  title: string;
  tags?: string[];
  content: string;
}

interface RawSubSection {
  id: string;
  title: string;
  rules: Array<{ id: string; principle?: string; content: string }>;
}

interface RawSection {
  section: string;
  title: string;
  description?: string;
  chunks?: RawChunk[];
  sub_sections?: RawSubSection[];
}

interface RawRagDb {
  project: string;
  version: string;
  sections: string[];
  [key: string]: unknown;
}

let ragChunksCache: RagChunk[] | null = null;

/**
 * RAG v3 JSON을 파싱하여 통합 RagChunk 배열로 변환
 */
function loadRagChunks(): RagChunk[] {
  if (ragChunksCache) return ragChunksCache;

  // dist 빌드 환경에서도 동작하도록 여러 후보 경로를 탐색
  // (saju.ts의 calendar_data.csv 로딩 패턴과 동일하게 이중 안전장치)
  const candidates = [
    path.join(__dirname, "rag-db.json"),               // 개발: server/ , 빌드: dist/ (복사된 경우)
    path.join(__dirname, "../server/rag-db.json"),     // dist 기준 상위의 server/
    path.resolve(process.cwd(), "server/rag-db.json"), // CWD 기준 (운영 런타임)
    path.resolve(process.cwd(), "dist/rag-db.json"),   // CWD 기준 dist 복사본
  ];
  let dbPath: string | null = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dbPath = p;
      break;
    }
  }
  if (!dbPath) {
    throw new Error(`RAG DB not found. Tried: ${candidates.join(", ")}`);
  }

  const data = JSON.parse(fs.readFileSync(dbPath, "utf-8")) as RawRagDb;
  const chunks: RagChunk[] = [];

  for (const sectionKey of data.sections) {
    const sec = data[sectionKey] as RawSection;
    if (!sec) continue;

    // A~J 섹션: chunks 배열
    if (sec.chunks && Array.isArray(sec.chunks)) {
      for (const chunk of sec.chunks) {
        chunks.push({
          id: chunk.id,
          section: sectionKey,
          title: chunk.title,
          tags: chunk.tags ?? [],
          content: chunk.content,
        });
      }
    }

    // K 섹션: sub_sections → rules
    if (sec.sub_sections && Array.isArray(sec.sub_sections)) {
      for (const ss of sec.sub_sections) {
        if (!ss.rules || !Array.isArray(ss.rules)) continue;
        for (const rule of ss.rules) {
          chunks.push({
            id: rule.id,
            section: sectionKey,
            title: `${ss.title} — ${rule.principle ?? rule.id}`,
            tags: [sectionKey, ss.title, rule.principle ?? ""].filter(Boolean),
            content: rule.content,
          });
        }
      }
    }
  }

  ragChunksCache = chunks;
  return chunks;
}

/**
 * 한국어 조사·어미 (토큰 끝에서 제거하여 어간 정규화)
 * 예: "배우자운을" → "배우자운", "재물이" → "재물"
 */
const KO_PARTICLES = [
  "으로부터", "으로서", "으로써", "이라고", "라고", "에서는", "에게서", "에서", "에게", "한테",
  "으로", "로서", "로써", "까지", "부터", "마저", "조차", "처럼", "보다", "이나", "나마",
  "이라", "이며", "이고", "이란", "란", "은", "는", "이", "가", "을", "를", "의", "에",
  "과", "와", "도", "만", "로", "께", "야", "여", "라",
];

// 단음절 조사(은/는/이/가/을/를/의/에/과/와/도/만/로/케/야/여/라) 의 경우,
// "돈은"(2글자)처럼 1음절 명사 + 1글자 조사 조합도 분리해야 한다.
// (이 경우에만 어간 최소 길이를 1로 허용; 그 외 조사는 기존대로 어간 2이상 요구)
const SINGLE_CHAR_PARTICLES = new Set([
  "은", "는", "이", "가", "을", "를", "의", "에", "과", "와", "도", "만", "로", "케", "야", "여", "라",
]);

function stripParticle(token: string): string {
  for (const p of KO_PARTICLES) {
    if (token.endsWith(p)) {
      // 단음절 조사는 어간 1글자까지 허용(돈은→돈), 다음절 이상 조사는 어간 2글자 이상 요구
      const minStem = p.length === 1 && SINGLE_CHAR_PARTICLES.has(p) ? 1 : 2;
      if (token.length - p.length >= minStem) {
        return token.slice(0, token.length - p.length);
      }
    }
  }
  return token;
}

/**
 * 도메인 동의어 사전 — 일상어 질문을 명리 용어로 확장 (토큰 비용 0, 순수 로직)
 * 어느 한 토큰이라도 그룹에 속하면 그룹 전체를 쿼리에 더해 관련 청크 매칭률을 높인다.
 */
const SYNONYM_GROUPS: string[][] = [
  ["배우자", "배우자운", "남편", "아내", "부인", "처", "신랑", "결혼", "혼인", "배필", "짝", "인연", "재혼"],
  ["재물", "재물운", "돈", "금전", "재성", "수입", "소득", "재산", "부", "자산", "투자", "사업"],
  ["직업", "진로", "적성", "일", "커리어", "직장", "전직", "이직", "취업", "천직", "업"],
  ["자식", "자녀", "아이", "자식운", "출산", "임신", "아들", "딸"],
  ["건강", "질병", "병", "몸", "수술", "건강운"],
  ["애정", "연애", "사랑", "이성", "이성운", "애정운", "궁합"],
  ["부모", "아버지", "어머니", "모친", "부친", "인성"],
  ["관운", "승진", "명예", "시험", "합격", "관성", "관직", "공직"],
  ["성격", "심리", "기질", "성향", "마음"],
];

function expandSynonyms(tokens: string[]): string[] {
  const set = new Set(tokens);
  for (const tok of tokens) {
    for (const group of SYNONYM_GROUPS) {
      if (group.includes(tok)) {
        for (const w of group) set.add(w);
      }
    }
  }
  return Array.from(set);
}

/**
 * 쿼리에서 활성화된 동의어 그룹의 "핵심 명리어"만 추출.
 * 구어체 질문("돈은 언제쯤 모이나요?")에서 일반 토큰이 Jaccard 분모를 키워
 * 점수를 희석시키는 문제를 보정하기 위해, 핵심어가 청크에 매칭되면 별도 보너스를 준다.
 *
 * 각 그룹의 첫 두 단어를 명리 표준어(예: 재물/재물운, 직업/진로, 관성/관운)로 간주한다.
 */
function extractCoreTerms(queryTokens: string[]): string[] {
  const core = new Set<string>();
  for (const tok of queryTokens) {
    for (const group of SYNONYM_GROUPS) {
      if (group.includes(tok)) {
        // 그룹 전체를 핵심어 후보로 등록 (청크 태그/제목의 표준 용어와 직접 매칭)
        for (const w of group) core.add(w);
      }
    }
  }
  return Array.from(core);
}

/**
 * 텍스트를 토큰화 (소문자화 + 특수문자 제거 + 한국어 조사 정규화)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map(stripParticle)
    .filter((t) => t.length > 0);
}

/**
 * 두 토큰 배열 간 Jaccard 유사도
 */
function jaccardSimilarity(tokens1: string[], tokens2: string[]): number {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = Array.from(set1).filter((t) => set2.has(t)).length;
  const union = new Set([...Array.from(set1), ...Array.from(set2)]).size;
  if (union === 0) return 0;
  return intersection / union;
}

/**
 * 쿼리와 청크 유사도 계산
 * - tags: 가중치 3
 * - title: 가중치 2
 * - content: 가중치 1
 */
function calculateSimilarity(query: string, chunk: RagChunk): number {
  const baseTokens = tokenize(query);
  const queryTokens = expandSynonyms(baseTokens);
  if (queryTokens.length === 0) return 0;

  const tagsScore =
    chunk.tags.reduce((sum, tag) => {
      return sum + jaccardSimilarity(queryTokens, tokenize(tag));
    }, 0) / Math.max(chunk.tags.length, 1);

  const titleScore = jaccardSimilarity(queryTokens, tokenize(chunk.title));

  const contentScore = jaccardSimilarity(queryTokens, tokenize(chunk.content));

  const baseScore = (tagsScore * 3 + titleScore * 2 + contentScore * 1) / 6;

  // 핵심 명리어 매칭 보너스:
  // 구어체 질문에서 일반 토큰(언제쯤/모이나요)이 Jaccard 분모를 키워 점수를 희석하므로,
  // 동의어 그룹에서 추출한 핵심어가 청크의 태그/제목에 "존재"하면 가산점을 부여한다.
  // 분모에 영향을 받지 않는 부분 일치(includes) 방식이라 구어체 질문에 특히 효과적이다.
  const coreTerms = extractCoreTerms(baseTokens);
  if (coreTerms.length > 0) {
    const tagText = chunk.tags.join(" ");
    let bonus = 0;
    for (const term of coreTerms) {
      // 태그 매칭이 가장 신뢰도 높음(+0.06), 제목 매칭(+0.03)
      if (tagText.includes(term)) {
        bonus += 0.06;
      } else if (chunk.title.includes(term)) {
        bonus += 0.03;
      }
    }
    // 보너스 상한(0.18)으로 한 청크가 과도하게 끌려오는 것을 방지
    return baseScore + Math.min(bonus, 0.18);
  }

  return baseScore;
}

/**
 * 사용자 질문에 관련된 청크 검색
 */
export function searchRagChunks(
  query: string,
  topK: number = 3,
  threshold: number = 0.02
): RagChunk[] {
  const chunks = loadRagChunks();

  const scored = chunks.map((chunk) => ({
    chunk,
    score: calculateSimilarity(query, chunk),
  }));

  return scored
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.chunk);
}

/**
 * RAG 검색 결과를 시스템 프롬프트에 추가할 형식으로 변환
 */
export function formatRagContext(chunks: RagChunk[]): string {
  if (chunks.length === 0) return "";

  const lines = ["\n---", "## 참고 자료 (RAG 검색 결과)", ""];

  chunks.forEach((chunk, index) => {
    lines.push(`### 참고 ${index + 1}: [${chunk.section}] ${chunk.title}`);
    if (chunk.tags.length > 0) {
      lines.push(`태그: ${chunk.tags.join(", ")}`);
    }
    lines.push("");
    lines.push(chunk.content);
    lines.push("");
  });

  lines.push("---\n");
  return lines.join("\n");
}

/**
 * 테스트용: 전체 청크 조회
 */
export function getAllChunks(): RagChunk[] {
  return loadRagChunks();
}

/**
 * 테스트용: 섹션별 청크 조회
 */
export function getChunksBySection(section: string): RagChunk[] {
  return loadRagChunks().filter((c) => c.section === section);
}

/**
 * 테스트용: ID로 청크 조회
 */
export function getChunkById(id: string): RagChunk | undefined {
  return loadRagChunks().find((c) => c.id === id);
}
