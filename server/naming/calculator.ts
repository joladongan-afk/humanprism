/**
 * 작명 서비스 계산 엔진
 * 
 * 원획법 보정, 자원오행·파동오행·수리사격 계산을 담당한다.
 */

import { getHanja, getSurisageon, isBulmyong } from "./dataLoader";

/**
 * 원획법 보정 규칙 (12개 변형 부수)
 * 
 * 구현지침에서 제시한 12개 변형 부수별 보정값
 */
const STROKE_CORRECTION_MAP: Record<string, number> = {
  "氵": 4, // 수 부수 → 4획
  "火": 4, // 불 부수 → 4획
  "忄": 4, // 심 부수 → 4획
  "辶": 3, // 변 부수 → 3획
  "廾": 3, // 공 부수 → 3획
  "彳": 3, // 척 부수 → 3획
  "艹": 3, // 풀 부수 → 3획
  "亻": 2, // 인 부수 → 2획
  "刂": 2, // 칼 부수 → 2획
  "阝": 3, // 언덕 부수 → 3획
  "广": 3, // 광 부수 → 3획
  "门": 3, // 문 부수 → 3획
};

/**
 * 초성 오행 매핑 (파동오행)
 */
const INITIAL_OHAENG_MAP: Record<string, "木" | "火" | "土" | "金" | "水"> = {
  // 자음 → 오행
  "ㄱ": "木", "ㄲ": "木", // 기역
  "ㄴ": "水", // 니은
  "ㄷ": "火", // 디귿
  "ㄸ": "火", // 쌍디귿
  "ㄹ": "木", // 리을
  "ㅁ": "水", // 미음
  "ㅂ": "金", // 비읍
  "ㅃ": "金", // 쌍비읍
  "ㅅ": "金", // 시옷
  "ㅆ": "金", // 쌍시옷
  "ㅇ": "土", // 응
  "ㅈ": "火", // 지읒
  "ㅉ": "火", // 쌍지읒
  "ㅊ": "火", // 치읓
  "ㅋ": "木", // 키읔
  "ㅌ": "土", // 티읕
  "ㅍ": "金", // 피읖
  "ㅎ": "木", // 히읗
};

/**
 * 오행 상생 관계
 * 木→火→土→金→水→木 (순환)
 */
const OHAENG_SANGSUNG: Record<string, string> = {
  "木": "火",
  "火": "土",
  "土": "金",
  "金": "水",
  "水": "木",
};

/**
 * 오행 상극 관계
 * 木剋土, 土剋水, 水剋火, 火剋金, 金剋木
 */
const OHAENG_SANGGEUK: Record<string, string> = {
  "木": "土",
  "土": "水",
  "水": "火",
  "火": "金",
  "金": "木",
};

/**
 * 한자 획수 계산 (원획법 보정 포함)
 * 
 * @param char 한자
 * @returns 보정된 획수
 */
export function calculateStrokes(char: string): number {
  const hanjaRecord = getHanja(char);
  if (!hanjaRecord) {
    console.warn(`[Naming] Hanja not found: ${char}`);
    return 0;
  }

  let strokes = hanjaRecord.strokes;
  const radical = hanjaRecord.radical;

  // 12개 변형 부수 보정 적용
  if (STROKE_CORRECTION_MAP[radical]) {
    strokes = STROKE_CORRECTION_MAP[radical];
  }

  return strokes;
}

/**
 * 자원오행 계산 (한자의 오행 기반)
 * 
 * @param nameHanja 이름 한자 (예: "순희" → ["順", "姫"])
 * @returns 오행 배열 (예: ["木", "火"])
 */
export function calculateJawonOhaeng(nameHanja: string): string[] {
  const chars = nameHanja.split("");
  return chars.map((char) => {
    const hanjaRecord = getHanja(char);
    return hanjaRecord?.ohaeng || "土"; // 기본값: 土
  });
}

/**
 * 파동오행 계산 (이름 초성 기반)
 * 
 * @param nameKorean 이름 한글 (예: "순희")
 * @returns 초성 오행 배열 (예: ["水", "木"])
 */
export function calculatePadoOhaeng(nameKorean: string): string[] {
  const jamo = nameKorean.split("").map((char) => {
    const code = char.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      // 한글 음절 범위
      const index = code - 0xac00;
      const initial = Math.floor(index / 588); // 초성 인덱스
      const initials = [
        "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
      ];
      return initials[initial] || "ㅇ";
    }
    return "ㅇ";
  });

  return jamo.map((j) => INITIAL_OHAENG_MAP[j] || "土");
}

/**
 * 파동오행 상생 판정
 * 
 * @param padoOhaeng 파동오행 배열 (예: ["水", "木"])
 * @returns 판정 결과 ("양호" / "보완 필요")
 */
export function judgePadoOhaeng(padoOhaeng: string[]): {
  result: string;
  detail: string;
} {
  if (padoOhaeng.length < 2) {
    return { result: "판정 불가", detail: "이름이 너무 짧습니다" };
  }

  const first = padoOhaeng[0];
  const second = padoOhaeng[1];

  // 같은 오행: 중립
  if (first === second) {
    return { result: "중립", detail: `${first}${first} (같은 오행)` };
  }

  // 상생 관계 확인
  if (OHAENG_SANGSUNG[first] === second) {
    return { result: "양호", detail: `${first}→${second} (상생)` };
  }

  // 상극 관계 확인
  if (OHAENG_SANGGEUK[first] === second) {
    return { result: "보완 필요", detail: `${first}剋${second} (상극)` };
  }

  return { result: "중립", detail: `${first}↔${second} (무관)` };
}

/**
 * 수리사격 계산 (획수 합계 기반)
 * 
 * @param nameKorean 이름 한글
 * @param nameHanja 이름 한자
 * @returns 수리 번호 (1-81)
 */
export function calculateSuri(nameKorean: string, nameHanja: string): number {
  // 한자 획수 합계
  const hanjaStrokes = nameHanja
    .split("")
    .reduce((sum, char) => sum + calculateStrokes(char), 0);

  // 수리사격: 1-81 범위로 정규화
  const suri = ((hanjaStrokes - 1) % 81) + 1;
  return suri;
}

/**
 * 수리사격 길흉 판정
 * 
 * @param suri 수리 번호 (1-81)
 * @returns 길흉 판정 및 설명
 */
export function judgeSuri(suri: number): {
  gilhyung: string;
  description: string;
} {
  const record = getSurisageon(suri);
  if (!record) {
    return { gilhyung: "판정 불가", description: "데이터 없음" };
  }

  return {
    gilhyung: record.gilhyung,
    description: record.description,
  };
}

/**
 * 불용문자 검사
 * 
 * @param nameHanja 이름 한자
 * @returns { hasBulmyong: boolean, bulmyongChars: string[] }
 */
export function checkBulmyong(nameHanja: string): {
  hasBulmyong: boolean;
  bulmyongChars: string[];
} {
  const chars = nameHanja.split("");
  const bulmyongChars = chars.filter((char) => isBulmyong(char));

  return {
    hasBulmyong: bulmyongChars.length > 0,
    bulmyongChars,
  };
}

/**
 * 종합 판정
 * 
 * @param padoResult 파동오행 판정
 * @param suriGilhyung 수리 길흉
 * @param hasBulmyong 불용문자 여부
 * @returns 최종 판정 ("우수" / "양호" / "보완 필요" / "재검토 필요")
 */
export function judgeOverall(
  padoResult: string,
  suriGilhyung: string,
  hasBulmyong: boolean
): string {
  if (hasBulmyong) {
    return "재검토 필요";
  }

  if (padoResult === "양호" && suriGilhyung === "吉") {
    return "우수";
  }

  if (padoResult === "양호" || suriGilhyung === "吉") {
    return "양호";
  }

  if (padoResult === "보완 필요" || suriGilhyung === "凶") {
    return "보완 필요";
  }

  return "중립";
}
