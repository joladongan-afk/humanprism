/**
 * 작명 놀림방지 및 맞춤법 검증 필터 (세션17)
 *
 * 성씨-이름 결합 시 발생할 수 있는 놀림 유발 조합, 발음 연음 함정,
 * 두음법칙 오류를 사전에 걸러낸다.
 *
 * 자동 작명 알고리즘에서 이 검사는 "이진 필터"로 동작한다 —
 * 하나라도 걸리면 그 이름 조합은 후보에서 완전히 제외한다.
 *
 * 파이프라인 위치: 불용문자 필터(checkBulmyong) 다음, 81수리 계산 이전.
 * 이유: 문자열 비교가 획수 계산보다 훨씬 가벼워서, 비싼 연산 전에
 * 값싼 필터로 후보를 먼저 줄이는 것이 효율적이다.
 *
 * 데이터 출처: 나무위키 "특이한 이름/사례" 실제 사례 기반 + 한글 맞춤법
 * 제11·12항 대조 검증 완료 (세션17에서 오류 발견 및 정정: 롱→농, 래→내가
 * 정확한 표기이며 이전 조사에서 "롱→옹, 래→애"로 잘못 파악되었던 것을
 * 바로잡음).
 */

import fs from "fs";
import path from "path";

interface SurnameCombo {
  surname: string;
  pattern: string;
  reason: string;
  severity: "high" | "medium";
}

interface LiaisonTrap {
  surname: string;
  patterns: string[];
  reason: string;
  severity: "high" | "medium";
}

interface SafetyBlacklist {
  surnameCombos: SurnameCombo[];
  liaisonTraps: LiaisonTrap[];
  initialSoundRule: {
    article11: { description: string; map: Record<string, string> };
    article12: { description: string; map: Record<string, string> };
  };
}

let cache: SafetyBlacklist | null = null;

function loadBlacklist(): SafetyBlacklist {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), "server/naming/data/naming_safety_blacklist.json");
  const fileContent = fs.readFileSync(filePath, "utf-8");
  cache = JSON.parse(fileContent) as SafetyBlacklist;
  return cache;
}

export interface HazardHit {
  type: "성씨결합형" | "연음트랩" | "두음법칙";
  reason: string;
  severity: "high" | "medium";
}

export interface HazardResult {
  pass: boolean;
  hazards: HazardHit[];
}

/**
 * 성씨결합형 위험 조합 검사
 * 이름 1자, 2자, 1+2자를 붙인 것까지 전부 대조한다.
 * (예: 성="방", 이름1="가", 이름2="방" -> "가방"도 대조 대상)
 */
function checkSurnameCombo(surname: string, name1: string, name2: string): HazardHit[] {
  const data = loadBlacklist();
  const hits: HazardHit[] = [];
  const candidates = [name1, name2, name1 + name2];
  for (const combo of data.surnameCombos) {
    if (combo.surname !== surname) continue;
    if (candidates.some((c) => c.includes(combo.pattern))) {
      hits.push({ type: "성씨결합형", reason: combo.reason, severity: combo.severity });
    }
  }
  return hits;
}

/**
 * 음성학적 연음 함정 검사
 * 성씨 받침 + 이름 첫 글자(모음 시작)가 이어 읽힐 때 다른 단어로
 * 들리는 경우를 잡아낸다. (예: 박+아지 -> "바가지")
 */
function checkLiaisonTrap(surname: string, name1: string): HazardHit[] {
  const data = loadBlacklist();
  const hits: HazardHit[] = [];
  for (const trap of data.liaisonTraps) {
    if (trap.surname !== surname) continue;
    if (trap.patterns.some((p) => name1.startsWith(p) || name1 === p)) {
      hits.push({ type: "연음트랩", reason: trap.reason, severity: trap.severity });
    }
  }
  return hits;
}

/**
 * 두음법칙 확인 (한글 맞춤법 제11·12항)
 * 성씨 자체가 두음법칙 대상 음으로 시작하는 경우, 올바른 표기를 안내한다.
 */
function checkInitialSoundRule(surname: string): HazardHit[] {
  const data = loadBlacklist();
  const map = { ...data.initialSoundRule.article11.map, ...data.initialSoundRule.article12.map };
  const corrected = map[surname];
  if (corrected && corrected !== surname) {
    return [
      {
        type: "두음법칙",
        reason: `'${surname}'은(는) 한글 맞춤법상 '${corrected}'로 표기해야 합니다`,
        severity: "high",
      },
    ];
  }
  return [];
}

/**
 * 률/율, 렬/열 표기 규칙 확인 (한글 맞춤법 제11항)
 * 앞 글자에 받침이 없거나 받침이 'ㄴ'이면 '률/렬'이 아니라 '율/열'을 써야 한다.
 * (예: 백분율 O, 백분률 X / 나열 O, 나렬 X)
 */
function hasNoBatchimOrNieun(syllable: string): boolean {
  if (!syllable) return false;
  const code = syllable.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false; // 한글 완성형 범위 밖
  const jongseongIndex = code % 28;
  return jongseongIndex === 0 || jongseongIndex === 4; // 0=받침없음, 4=ㄴ받침
}

export function checkYulYeolRule(
  prevSyllable: string,
  targetSyllable: "률" | "렬" | "율" | "열"
): boolean {
  const isYulYeolForm = targetSyllable === "율" || targetSyllable === "열";
  const shouldBeYulYeol = hasNoBatchimOrNieun(prevSyllable);
  return isYulYeolForm === shouldBeYulYeol;
}

/**
 * 종합 검사 - 성씨결합형 + 연음트랩 + 두음법칙을 전부 확인해서
 * 하나라도 걸리면 통과 실패(pass: false)로 판정한다.
 * 자동 작명 알고리즘은 이 결과가 false인 조합을 후보에서 완전히 제외해야 한다.
 */
export function checkNamingHazard(
  surnameKorean: string,
  name1Korean: string,
  name2Korean: string
): HazardResult {
  const hazards: HazardHit[] = [
    ...checkSurnameCombo(surnameKorean, name1Korean, name2Korean),
    ...checkLiaisonTrap(surnameKorean, name1Korean),
    ...checkInitialSoundRule(surnameKorean),
  ];
  return { pass: hazards.length === 0, hazards };
}
