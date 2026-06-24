/**
 * 시간 상대성 처리 모듈
 * 사용자의 질문에서 시간 오프셋("3년 후", "작년", "내년" 등)을 파싱하고,
 * 현재 연도를 기준으로 목표 연도의 정확한 간지를 계산한다.
 */

import { STEMS, BRANCHES, getCurrentSajuYear } from "./saju";

/**
 * 60갑자 순환 구조
 * 년도 → 간지 매핑 (1900년부터 시작)
 */
const GANJI_CYCLE = [
  "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉",
  "戌", "亥"
]; // 12지지

const STEM_CYCLE = [
  "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"
]; // 10천간

/**
 * 특정 연도의 간지를 계산한다.
 * 기준: 1900년 = 庚子년 (경자년)
 * 
 * @param year - 서양력 연도 (예: 2026)
 * @returns 간지 문자열 (예: "丙午")
 */
export function getGanjiForYear(year: number): string {
  // 1900년을 기준점으로 설정 (庚子년)
  const baseYear = 1900;
  const baseStemIndex = 6; // 庚 (경)
  const baseBranchIndex = 0; // 子 (자)

  // 경과 년수
  const yearDiff = year - baseYear;

  // 천간과 지지는 각각 10년, 12년 주기로 순환
  const stemIndex = (baseStemIndex + yearDiff) % 10;
  const branchIndex = (baseBranchIndex + yearDiff) % 12;

  return STEM_CYCLE[stemIndex] + GANJI_CYCLE[branchIndex];
}

/**
 * 간지를 한글로 읽는다.
 * @param ganji - 간지 문자열 (예: "丙午")
 * @returns 한글 읽음 (예: "병오")
 */
export function ganjiToKorean(ganji: string): string {
  const stemKr: Record<string, string> = {
    甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
    己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
  };
  const branchKr: Record<string, string> = {
    "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
    "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
  };

  if (ganji.length !== 2) return ganji;
  return (stemKr[ganji[0]] || "") + (branchKr[ganji[1]] || "");
}

/**
 * 사용자 질문에서 시간 오프셋을 파싱한다.
 * 예: "3년 후 내 재물운" → { offset: 3, baseYear: 2026, targetYear: 2029 }
 * 예: "작년에 한 선택" → { offset: -1, baseYear: 2026, targetYear: 2025 }
 * 
 * @param query - 사용자 질문
 * @param currentYear - 현재 연도 (기본값: 2026)
 * @returns 파싱 결과 또는 null
 */
export function parseTemporalOffset(
  query: string,
  currentYear: number = 2026
): {
  offset: number;
  baseYear: number;
  targetYear: number;
  targetGanji: string;
  targetGanjiKr: string;
  description: string;
} | null {
  // 시간 오프셋 패턴 정의
  const patterns = [
    // "N년 후" 패턴
    { regex: /(\d+)년\s*후/g, offset: (n: number) => n },
    // "N년 전" 패턴
    { regex: /(\d+)년\s*전/g, offset: (n: number) => -n },
    // "내년" 패턴
    { regex: /내년|다음\s*해/g, offset: () => 1 },
    // "작년" 패턴
    { regex: /작년|지난\s*해|작년/g, offset: () => -1 },
    // "올해" 패턴 (오프셋 0)
    { regex: /올해|이번\s*해/g, offset: () => 0 },
    // "N년 뒤" 패턴
    { regex: /(\d+)년\s*뒤/g, offset: (n: number) => n },
    // "N년 이전" 패턴
    { regex: /(\d+)년\s*이전/g, offset: (n: number) => -n },
  ];

  for (const pattern of patterns) {
    const match = pattern.regex.exec(query);
    if (match) {
      let offset: number;
      if (match[1]) {
        offset = pattern.offset(parseInt(match[1], 10));
      } else {
        offset = pattern.offset(0);
      }

      const targetYear = currentYear + offset;
      const targetGanji = getGanjiForYear(targetYear);
      const targetGanjiKr = ganjiToKorean(targetGanji);

      const offsetDesc =
        offset === 0
          ? "올해"
          : offset === 1
            ? "내년"
            : offset === -1
              ? "작년"
              : offset > 0
                ? `${offset}년 후`
                : `${Math.abs(offset)}년 전`;

      return {
        offset,
        baseYear: currentYear,
        targetYear,
        targetGanji,
        targetGanjiKr,
        description: `${offsetDesc}(${targetYear}년 ${targetGanjiKr}년)`,
      };
    }
  }

  return null;
}

/**
 * 사용자 질문과 현재 연도를 기반으로 상담 맥락을 생성한다.
 * Claude에 전달할 명시적 지시사항을 포함한다.
 * 
 * @param query - 사용자 질문
 * @param currentYear - 현재 연도
 * @returns 상담 맥락 문자열
 */
export function buildTemporalContext(
  query: string,
  currentYear?: number
): string {
  // ★ 현재 연도를 하드코딩하지 않는다. 인자가 없으면 서버 시각을
  // 입춘 세수(한국천문연구원 고시 절기)로 보정한 '사주연도'를 쓴다.
  // 그래야 saju.ts의 세운 사슬 표와 완전히 동기화된다.
  let beforeIpchun = false;
  let calendarYear = currentYear;
  let resolvedYear = currentYear;
  let currentGanji: string;
  if (currentYear === undefined) {
    const nowKst = new Date(Date.now() + 9 * 3600000);
    const sy = getCurrentSajuYear(nowKst);
    resolvedYear = sy.sajuYearNo;
    calendarYear = sy.calendarYear;
    beforeIpchun = sy.beforeIpchun;
    currentGanji = sy.ganji; // 입춘 보정된 올해 간지
  } else {
    currentGanji = getGanjiForYear(currentYear);
  }
  const year = resolvedYear as number;
  const currentGanjiKr = ganjiToKorean(currentGanji);

  // 입춘 전 구간이면(달력 연도 ≠ 사주 연도) 안내 문구를 덧붙인다.
  const ipchunNote = beforeIpchun
    ? `\n- ⚠ 지금은 달력으로 ${calendarYear}년 초이지만 아직 입춘(立春) 전이므로 사주상 '올해'는 ${year}년 ${currentGanjiKr}년이다(입춘세수). 시점이 애매하면 고객에게 현재 날짜를 확인한다.`
    : "";

  const temporalInfo = parseTemporalOffset(query, year);

  if (!temporalInfo) {
    // 시간 오프셋이 없으면 현재(사주) 연도 기준
    return `\n【상담 시간 맥락】\n- 현재: ${year}년 ${currentGanjiKr}년(${currentGanji})\n- 사용자의 질문은 현재 연도(${year}년)를 기준으로 해석합니다.${ipchunNote}`;
  }

  return `\n【상담 시간 맥락】\n- 현재: ${year}년 ${currentGanjiKr}년(${currentGanji})\n- 사용자의 질문 해석: "${temporalInfo.description}"\n- 대상 연도: ${temporalInfo.targetYear}년 ${temporalInfo.targetGanjiKr}년(${temporalInfo.targetGanji})\n- 지시: 위 대상 연도의 간지를 기준으로 상담을 제공하세요. 절대 다른 연도로 해석하지 마세요. 단, 이 연도·간지는 제공된 【세운 사슬】 표의 값과 일치해야 하며, 표와 다르면 표를 우선한다.${ipchunNote}`;
}

/**
 * 테스트용: 간지 계산 검증
 */
export function validateGanjiSequence(startYear: number, count: number): Array<{ year: number; ganji: string; kr: string }> {
  const result = [];
  for (let i = 0; i < count; i++) {
    const year = startYear + i;
    const ganji = getGanjiForYear(year);
    const kr = ganjiToKorean(ganji);
    result.push({ year, ganji, kr });
  }
  return result;
}
