/**
 * 작명 서비스 계산 엔진
 * 
 * 자원오행·수리사격(4격) 계산을 담당한다.
 */

import { getHanja, getSurisageon, isBulmyong } from "./dataLoader";

const OHAENG_SANGSUNG: Record<string, string> = {
  "木": "火", "火": "土", "土": "金", "金": "水", "水": "木",
};

const OHAENG_SANGGEUK: Record<string, string> = {
  "木": "土", "土": "水", "水": "火", "火": "金", "金": "木",
};

export function calculateStrokes(char: string): number {
  const hanjaRecord = getHanja(char);
  if (!hanjaRecord) return 0;
  let strokes = hanjaRecord.strokes;
  return strokes;
}

/**
 * 자원오행 계산 (한자 부수 기반)
 */
export function calculateJawonOhaeng(nameHanja: string): string[] {
  const chars = nameHanja.split("");
  return chars.map((char) => {
    const hanjaRecord = getHanja(char);
    return hanjaRecord?.ohaeng || "土";
  });
}

/**
 * 자원오행 상생/상극 판정
 */
export function judgeJawonOhaeng(jawonOhaeng: string[]): {
  result: string;
  detail: string;
} {
  if (jawonOhaeng.length < 2) {
    return { result: "판정 불가", detail: "이름이 너무 짧습니다" };
  }
  const first = jawonOhaeng[0];
  const second = jawonOhaeng[1];

  if (first === second) {
    return { result: "중립", detail: `${first}${second} (같은 오행)` };
  }
  if (OHAENG_SANGSUNG[first] === second || OHAENG_SANGSUNG[second] === first) {
    return { result: "양호", detail: `${first}↔${second} (상생)` };
  }
  if (OHAENG_SANGGEUK[first] === second || OHAENG_SANGGEUK[second] === first) {
    return { result: "보완 필요", detail: `${first}↔${second} (상극)` };
  }
  return { result: "중립", detail: `${first}↔${second} (무관)` };
}

/**
 * 수리사격 4격 계산
 * 원격(가운데 글자) / 형격(끝 글자) / 이격(성+가운데) / 정격(성+가운데+끝)
 */
export function calculateSuri4(
  surnameHanja: string,
  name1Hanja: string,
  name2Hanja: string
): { won: number; hyeong: number; i: number; jeong: number } {
  const s = surnameHanja.split("").reduce((sum, c) => sum + calculateStrokes(c), 0);
  const n1 = name1Hanja.split("").reduce((sum, c) => sum + calculateStrokes(c), 0);
  const n2 = name2Hanja.split("").reduce((sum, c) => sum + calculateStrokes(c), 0);

  const normalize = (n: number) => ((n - 1) % 81) + 1;

  return {
    won: normalize(n1),           // 원격: 가운데 글자
    hyeong: normalize(n2),        // 형격: 끝 글자
    i: normalize(s + n1),         // 이격: 성+가운데
    jeong: normalize(s + n1 + n2), // 정격: 성+가운데+끝 (총격)
  };
}

/**
 * 수리사격 (총격 단일, 기존 호환용)
 */
export function calculateSuri(nameKorean: string, nameHanja: string): number {
  const hanjaStrokes = nameHanja
    .split("")
    .reduce((sum, char) => sum + calculateStrokes(char), 0);
  return ((hanjaStrokes - 1) % 81) + 1;
}

export function judgeSuri(suri: number): {
  gilhyung: string;
  description: string;
} {
  const record = getSurisageon(suri);
  if (!record) return { gilhyung: "판정 불가", description: "데이터 없음" };
  return { gilhyung: record.gilhyung, description: record.description };
}

export function checkBulmyong(nameHanja: string): {
  hasBulmyong: boolean;
  bulmyongChars: string[];
} {
  const chars = nameHanja.split("");
  const bulmyongChars = chars.filter((char) => isBulmyong(char));
  return { hasBulmyong: bulmyongChars.length > 0, bulmyongChars };
}

/**
 * 종합 판정 (자원오행 + 수리사격 기반)
 */
export function judgeOverall(
  jawonResult: string,
  suriGilhyung: string,
  hasBulmyong: boolean
): string {
  if (hasBulmyong) return "재검토 필요";
  if (jawonResult === "양호" && suriGilhyung === "吉") return "우수";
  if (jawonResult === "양호" || suriGilhyung === "吉") return "양호";
  if (jawonResult === "보완 필요" || suriGilhyung === "凶") return "보완 필요";
  return "중립";
}
