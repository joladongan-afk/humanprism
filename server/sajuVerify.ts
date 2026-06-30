/**
 * AI 답변 안의 육친(십성) 단언을 사주 데이터의 정답과 대조해 검증한다.
 * 통변(서술·해석)에는 일절 관여하지 않고, "OO가 OO다"라는 사실 단언만 골라낸다.
 */
import { STEM_KR, BRANCH_KR, getTenGod, getBranchTenGod, type SajuResult } from "./saju";

const TEN_GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];

interface AnswerKeyEntry {
  char: string;
  kr: string | null;
  position: string;
  kind: "천간" | "지지";
  correctGod: string;
}

/**
 * 사주 데이터로부터 8글자(시/일/월/연 천간·지지)의 정답 육친표를 만든다.
 * 일간 자신의 천간은 검증 대상에서 빠지며(비교 기준점), 일간과 같은 글자(비견 관계)가
 * 다른 기둥에 또 있으면 그 글자의 "한자"만 검증하고 "한글 발음" 토큰은 빼서
 * "정화 기준으로" 같은 일간 지칭 표현과의 혼동을 막는다.
 */
export function buildAnswerKey(sajuData: SajuResult): AnswerKeyEntry[] {
  const dayStem = sajuData.pillars.day?.stem;
  if (!dayStem) return [];
  const order: Array<{ key: "hour" | "day" | "month" | "year"; label: string }> = [
    { key: "hour", label: "시" },
    { key: "day", label: "일" },
    { key: "month", label: "월" },
    { key: "year", label: "연" },
  ];
  const entries: AnswerKeyEntry[] = [];
  for (const o of order) {
    const p = sajuData.pillars[o.key];
    if (!p) continue;
    const isDay = o.key === "day";
    if (!isDay) {
      const sameAsDay = p.stem === dayStem;
      entries.push({
        char: p.stem,
        kr: sameAsDay ? null : (STEM_KR[p.stem] ?? null),
        position: o.label,
        kind: "천간",
        correctGod: getTenGod(dayStem, p.stem),
      });
    }
    entries.push({
      char: p.branch,
      kr: BRANCH_KR[p.branch] ?? null,
      position: o.label,
      kind: "지지",
      correctGod: getBranchTenGod(dayStem, p.branch),
    });
  }
  return entries;
}

export interface VerifyResult {
  ok: boolean;
  errors: Array<{
    char: string;
    claimedGod: string;
    correctGod: string;
    snippet: string;
  }>;
}

/**
 * AI 답변 텍스트에서 "글자+육친" 단언 패턴을 찾아 정답표와 대조한다.
 * 패턴 예: "무토가 정인", "戊가 정인" 등 — 글자 뒤 25자 이내에 육친 단어가 나오면 단언으로 간주.
 */
export function verifySajuClaims(answerText: string, answerKey: AnswerKeyEntry[]): VerifyResult {
  const errors: VerifyResult["errors"] = [];
  if (answerKey.length === 0) return { ok: true, errors };

  for (const entry of answerKey) {
    const tokens = [entry.char, entry.kr].filter((t): t is string => !!t);
    for (const token of tokens) {
      let searchFrom = 0;
      while (true) {
        const idx = answerText.indexOf(token, searchFrom);
        if (idx < 0) break;
        searchFrom = idx + token.length;
        const window = answerText.slice(idx, idx + 25);
        for (const god of TEN_GODS) {
          if (window.includes(god)) {
            if (god !== entry.correctGod) {
              const snippetStart = Math.max(0, idx - 5);
              const snippet = answerText.slice(snippetStart, idx + 25);
              errors.push({
                char: `${entry.position}${entry.kind === "천간" ? "간" : "지"} ${entry.char}`,
                claimedGod: god,
                correctGod: entry.correctGod,
                snippet,
              });
            }
            break;
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/** 결핍·잠복 단정 표현(데이터상 명확히 드러난 글자를 무시하고 "없다/약하다/잠복"이라 말하는 패턴) */
const DEFICIENCY_PHRASES = [
  "뚜렷하게 드러나지 않",
  "원국에 드러나지 않",
  "인성이 없",
  "인성이 약",
  "지장간 깊은 곳에 잠복",
  "지장간에만 잠복",
  "잠복해 있는 수준",
];

export interface OmissionCheck {
  ok: boolean;
  /** 데이터상 천간에 명확히 드러나 있는데 답변에서 언급 자체가 빠진 육친 위치 */
  missingClear: Array<{ position: string; char: string; correctGod: string }>;
}

/**
 * 천간에 명확히 투출된 육친(예: 시간 甲=정인)이 있는데도, 답변이 그 글자를 전혀 언급하지 않은 채
 * "인성이 없다/약하다/잠복했다" 같은 결핍 표현을 쓰는 모순을 잡는다.
 * (지지나 지장간의 약한 인성은 대상에서 제외 — 오직 "천간에 명확히 드러난" 경우만 엄격히 본다)
 */
export function checkClearGodOmission(answerText: string, answerKey: AnswerKeyEntry[], targetGods: string[]): OmissionCheck {
  const hasDeficiencyPhrase = DEFICIENCY_PHRASES.some((p) => answerText.includes(p));
  if (!hasDeficiencyPhrase) return { ok: true, missingClear: [] };

  const missingClear: OmissionCheck["missingClear"] = [];
  for (const entry of answerKey) {
    if (entry.kind !== "천간") continue; // 천간 투출만 엄격히 체크 (지지 정기는 해석 여지가 있어 제외)
    if (!targetGods.includes(entry.correctGod)) continue;
    const mentioned = (entry.char && answerText.includes(entry.char)) || (entry.kr && answerText.includes(entry.kr));
    if (!mentioned) {
      missingClear.push({ position: entry.position, char: entry.char, correctGod: entry.correctGod });
    }
  }
  return { ok: missingClear.length === 0, missingClear };
}

/** 검증 오류(오기재 + 누락)를 AI 재요청용 안내 문구로 변환 */
export function formatVerifyErrorsForRetry(
  errors: VerifyResult["errors"],
  omissions: OmissionCheck["missingClear"] = []
): string {
  const lines = errors.map(
    (e) => `- ${e.char}을(를) "${e.claimedGod}"로 말했으나, 데이터상 정답은 "${e.correctGod}"입니다. (해당 문장: "${e.snippet}")`
  );
  const omissionLines = omissions.map(
    (o) => `- ${o.position}간 ${o.char}이(가) 천간에 명확히 드러난 "${o.correctGod}"인데, 답변에서 이 글자를 전혀 언급하지 않은 채 인성이 없다/약하다/잠복했다는 식으로 말했습니다. 이는 모순입니다. ${o.position}간 ${o.char}을 반드시 짚어 언급하도록 고치세요.`
  );
  return (
    "[시스템 자동 점검] 방금 답변에서 육친(십성) 사실 오류가 발견되었습니다. 같은 어투와 통변 스타일을 유지한 채, 아래 오류만 정확히 고쳐서 답변 전체를 다시 작성해 주세요. 오류로 지적되지 않은 부분은 굳이 바꾸지 않아도 됩니다.\n\n" +
    [...lines, ...omissionLines].join("\n")
  );
}
