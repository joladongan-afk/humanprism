/**
 * 자동 작명 알고리즘
 *
 * 최종 확정 설계안(2026-07-04)에 따라 구현.
 * 성씨+사주 기반으로 수리사격 길조 획수 조합을 필터링하고,
 * 복덕오행 매칭도 순으로 정렬된 이름 후보를 생성한다.
 */

import {
  calculateStrokes,
  calculateJawonOhaeng,
  calculateSuri4,
  judgeSuri,
} from "./calculator";
import {
  loadHanjaDb,
  getHanja,
  isBulmyong,
  getRequiredOhaeng,
  type HanjaRecord,
} from "./dataLoader";
import { checkNamingHazard } from "./nameSafety";
import comboTable from "./data/surname_suri_combo_table.json";

// ─── 타입 정의 ───────────────────────────────────────────────

export interface AutoNameGenerationRequest {
  surnameKorean: string;
  surnameHanja: string;
  mode: "A" | "B" | "C";
  specifiedHanja?: string;
  ilgan: string;
  birthMonth: string;
  page?: number;
}

export interface AutoNameCandidate {
  name1Hanja: string;
  name2Hanja: string;
  name1Korean: string;
  name2Korean: string;
  suri4: { won: number; hyeong: number; i: number; jeong: number };
  suri4Judgment: {
    won: string;
    hyeong: string;
    i: string;
    jeong: string;
  };
  jawonOhaeng: string[];
  matchingScore: number;
  rarity_score: number | null;
}

export interface AutoNameGenerationResponse {
  candidates: AutoNameCandidate[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── 헬퍼 함수 ───────────────────────────────────────────────

function getStrokePairsFromComboTable(surnameStrokes: number): [number, number][] {
  const key = String(surnameStrokes);
  const pairs = (comboTable as Record<string, [number, number][]>)[key];
  return pairs || [];
}

function getAllHanjaByStrokes(strokesList: number[]): HanjaRecord[] {
  const strokeSet = new Set(strokesList);
  const db = loadHanjaDb();
  const result: HanjaRecord[] = [];
  for (const record of db.values()) {
    if (strokeSet.has(record.strokes) && !isBulmyong(record.char)) {
      result.push(record);
    }
  }
  return result;
}

function convertHanjaToKorean(hanja: string): string {
  const record = getHanja(hanja);
  if (!record || !record.huneum) return "";
  const parts = record.huneum.trim().split(" ");
  return parts[parts.length - 1] || "";
}

function calculateMatchingScore(
  jawonOhaeng: string[],
  requiredOhaeng: { primary: string; secondary: string },
  suri4Judgment: { won: string; hyeong: string; i: string; jeong: string }
): number {
  const hasPrimary = jawonOhaeng.includes(requiredOhaeng.primary);
  const hasSecondary = jawonOhaeng.includes(requiredOhaeng.secondary);

  let baseScore = 0;
  if (hasPrimary && hasSecondary) {
    baseScore = 100;
  } else if (hasPrimary) {
    baseScore = 50;
  } else if (hasSecondary) {
    baseScore = 30;
  }

  const judgments = [
    suri4Judgment.won,
    suri4Judgment.hyeong,
    suri4Judgment.i,
    suri4Judgment.jeong,
  ];

  let suri4Weight = 0;
  for (const j of judgments) {
    if (j === "大吉") suri4Weight += 3;
    else if (j === "吉") suri4Weight += 2;
    else if (j === "半吉半凶") suri4Weight += 1;
  }

  const finalScore = baseScore * 0.8 + (suri4Weight / 12) * 20;
  return Math.min(Math.round(finalScore * 100) / 100, 100);
}

// ─── 메인 함수 ───────────────────────────────────────────────

export function generateAutoNames(input: AutoNameGenerationRequest): AutoNameGenerationResponse {
  const {
    surnameKorean,
    surnameHanja,
    mode,
    specifiedHanja,
    ilgan,
    birthMonth,
    page = 1,
  } = input;

  const surnameStrokes = calculateStrokes(surnameHanja);

  if (surnameStrokes > 45 || surnameStrokes <= 0) {
    throw new Error("자동 생성이 불가능한 성씨입니다");
  }

  const requiredOhaeng = getRequiredOhaeng(ilgan, birthMonth);

  // 방어 코드: 사주 데이터에서 복덕오행을 찾지 못하면 즉시 명확한 에러로 중단한다.
  // (null인 채로 진행하면 calculateMatchingScore에서 크래시가 난다)
  if (!requiredOhaeng) {
    throw new Error("사주 정보로 복덕오행을 계산할 수 없습니다. 생년월일시를 다시 확인해주세요.");
  }

  const allowedStrokePairs = getStrokePairsFromComboTable(surnameStrokes);

  if (allowedStrokePairs.length === 0) {
    throw new Error("자동 생성이 불가능한 성씨입니다");
  }

  let candidates1: HanjaRecord[] = [];
  let candidates2: HanjaRecord[] = [];

  if (mode === "A") {
    const strokes1Set = [...new Set(allowedStrokePairs.map((p) => p[0]))];
    const strokes2Set = [...new Set(allowedStrokePairs.map((p) => p[1]))];
    candidates1 = getAllHanjaByStrokes(strokes1Set);
    candidates2 = getAllHanjaByStrokes(strokes2Set);
  } else if (mode === "B") {
    if (!specifiedHanja) {
      throw new Error("지정된 글자와 조합 가능한 이름이 없습니다");
    }
    const specifiedStrokes = calculateStrokes(specifiedHanja);
    const allowedStrokes2 = allowedStrokePairs
      .filter((p) => p[0] === specifiedStrokes)
      .map((p) => p[1]);

    if (allowedStrokes2.length === 0) {
      throw new Error("지정된 글자와 조합 가능한 이름이 없습니다");
    }

    const specifiedRecord = getHanja(specifiedHanja);
    if (!specifiedRecord) {
      throw new Error("지정된 글자와 조합 가능한 이름이 없습니다");
    }
    candidates1 = [specifiedRecord];
    candidates2 = getAllHanjaByStrokes([...new Set(allowedStrokes2)]);
  } else if (mode === "C") {
    if (!specifiedHanja) {
      throw new Error("지정된 글자와 조합 가능한 이름이 없습니다");
    }
    const specifiedStrokes = calculateStrokes(specifiedHanja);
    const allowedStrokes1 = allowedStrokePairs
      .filter((p) => p[1] === specifiedStrokes)
      .map((p) => p[0]);

    if (allowedStrokes1.length === 0) {
      throw new Error("지정된 글자와 조합 가능한 이름이 없습니다");
    }

    candidates1 = getAllHanjaByStrokes([...new Set(allowedStrokes1)]);
    const specifiedRecord = getHanja(specifiedHanja);
    if (!specifiedRecord) {
      throw new Error("지정된 글자와 조합 가능한 이름이 없습니다");
    }
    candidates2 = [specifiedRecord];
  }

  const allowedPairSet = new Set(
    allowedStrokePairs.map((p) => `${p[0]}_${p[1]}`)
  );

  const validCandidates: AutoNameCandidate[] = [];

  for (const c1 of candidates1) {
    for (const c2 of candidates2) {
      if (!allowedPairSet.has(`${c1.strokes}_${c2.strokes}`)) {
        continue;
      }

      if (isBulmyong(c1.char) || isBulmyong(c2.char)) {
        continue;
      }

      const suri4 = calculateSuri4(surnameHanja, c1.char, c2.char);

      const suri4Judgment = {
        won: judgeSuri(suri4.won).gilhyung,
        hyeong: judgeSuri(suri4.hyeong).gilhyung,
        i: judgeSuri(suri4.i).gilhyung,
        jeong: judgeSuri(suri4.jeong).gilhyung,
      };

      if (
        suri4Judgment.won === "凶" ||
        suri4Judgment.hyeong === "凶" ||
        suri4Judgment.i === "凶" ||
        suri4Judgment.jeong === "凶"
      ) {
        continue;
      }

      const c1Korean = convertHanjaToKorean(c1.char);
      const c2Korean = convertHanjaToKorean(c2.char);

      if (!c1Korean || !c2Korean) {
        continue;
      }

      const hazardResult = checkNamingHazard(surnameKorean, c1Korean, c2Korean);
      if (!hazardResult.pass) {
        continue;
      }

      const jawonOhaeng = calculateJawonOhaeng(c1.char + c2.char);

      const matchingScore = calculateMatchingScore(
        jawonOhaeng,
        requiredOhaeng,
        suri4Judgment
      );

      validCandidates.push({
        name1Hanja: c1.char,
        name2Hanja: c2.char,
        name1Korean: c1Korean,
        name2Korean: c2Korean,
        suri4,
        suri4Judgment,
        jawonOhaeng,
        matchingScore,
        rarity_score: null,
      });
    }
  }

  validCandidates.sort((a, b) => b.matchingScore - a.matchingScore);

  if (validCandidates.length > 5000) {
    console.warn(
      `[Naming] High candidate count: ${validCandidates.length} for surname ${surnameKorean}`
    );
  }

  const totalCount = validCandidates.length;
  for (let i = 0; i < totalCount; i++) {
    validCandidates[i].rarity_score = Math.round(
      ((totalCount - i) / totalCount) * 100
    );
  }

  const pageSize = 30;
  const startIdx = (page - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const paginatedCandidates = validCandidates.slice(startIdx, endIdx);

  return {
    candidates: paginatedCandidates,
    totalCount,
    page,
    pageSize,
    hasMore: endIdx < totalCount,
  };
}
