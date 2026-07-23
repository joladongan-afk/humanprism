/**
 * careerReading.ts — 직업 중간 판독값 생성 (파일럿: entryType + laborMeans만)
 *
 * 입력: SajuResult (기존 sajuData와 동일)
 * 출력: 텍스트 블록 (Claude dynamicSystemPrompt 끝에 삽입용)
 *
 * 이번 파일럿 제외 항목: orgForm / 정착구간 / 붕괴 / 재진입 / 가족자본
 */

import { analyzeRevealLayers, getTenGod, getTenGodCategory } from "./saju";
import type { SajuResult, SajuPillar } from "./saju";

type Confidence = "높음" | "보통" | "낮음";
type EntryType = "학업·자격 우선형" | "생계·현실 진입 우선형" | "혼합형" | "판정 불가";
type LaborMeans =
  | "머리·판단"
  | "말·설명"
  | "몸·현장"
  | "손기술"
  | "판매·협상"
  | "운영·관리"
  | "자본·투자"
  | "독립 실행";

interface RevealState {
  inStem: boolean;
  inBranch: boolean;
  hiddenOnly: boolean;
  absent: boolean;
}

interface CareerReading {
  entryType: EntryType;
  entryConfidence: Confidence;
  laborMeans: LaborMeans[];
  laborNote: string;
}

// ── 헬퍼: RevealLayer 배열에서 특정 카테고리 상태 추출 ──
function getState(layers: ReturnType<typeof analyzeRevealLayers>, category: string): RevealState {
  const layer = layers.find((l) => l.category === category);
  if (!layer) return { inStem: false, inBranch: false, hiddenOnly: false, absent: true };
  return {
    inStem: layer.inStem,
    inBranch: layer.inBranch,
    hiddenOnly: layer.hiddenOnly,
    absent: !layer.inStem && !layer.inBranch && !layer.hiddenOnly,
  };
}

// ── 헬퍼: 초년·청년 대운 천간 육친 추출 ──
function getEarlyDaeunCategories(saju: SajuResult): string[] {
  const dayStem = saju.pillars.day?.stem ?? "";
  const result: string[] = [];
  for (let i = 0; i < Math.min(2, saju.daeun.pillars.length); i++) {
    const dp = saju.daeun.pillars[i];
    if (!dp) continue;
    const stemChar = dp[0];
    const god = getTenGod(dayStem, stemChar);
    const cat = getTenGodCategory(god);
    if (cat) result.push(cat);
  }
  return result;
}

// ── 헬퍼: 년주·월주에서만 RevealLayer 계산 ──
function analyzeYearMonth(saju: SajuResult): ReturnType<typeof analyzeRevealLayers> {
  const yearPillar = saju.pillars.year;
  const monthPillar = saju.pillars.month;
  const pillarsArr: SajuPillar[] = [yearPillar, monthPillar].filter(Boolean) as SajuPillar[];
  return analyzeRevealLayers(pillarsArr);
}

// ── entryType 판정 ──
function judgeEntryType(saju: SajuResult): { type: EntryType; confidence: Confidence } {
  const ymLayers = analyzeYearMonth(saju);
  const inSung = getState(ymLayers, "인성");   // 인성
  const jaeseong = getState(ymLayers, "재성"); // 재성
  const bigyeop = getState(ymLayers, "비겁");  // 비겁
  const sungwan = getState(ymLayers, "관성");  // 관성

  const earlyDaeun = getEarlyDaeunCategories(saju);
  const earlyHasInsung = earlyDaeun.includes("인성");
  const earlyHasJaeseong = earlyDaeun.includes("재성");
  const earlyHasBigyeop = earlyDaeun.includes("비겁");

  // 학업형 신호
  const hakupStemSignal = inSung.inStem && !jaeseong.inStem;
  const hakupBranchSignal = inSung.inBranch && (sungwan.inBranch || sungwan.inStem);
  const hakupDaeunSignal = earlyHasInsung && !jaeseong.inStem;
  const hakupScore = (hakupStemSignal ? 2 : 0) + (hakupBranchSignal ? 1 : 0) + (hakupDaeunSignal ? 1 : 0);

  // 생계형 신호
  const saenggyeStemSignal = jaeseong.inStem;
  const saenggyeBigyeop = bigyeop.inStem && inSung.absent;
  const saenggyeDaeunSignal = (earlyHasJaeseong || earlyHasBigyeop) && !earlyHasInsung;
  const saenggyeScore = (saenggyeStemSignal ? 2 : 0) + (saenggyeBigyeop ? 1 : 0) + (saenggyeDaeunSignal ? 1 : 0);

  // 충돌 감지
  const conflict = hakupScore > 0 && saenggyeScore > 0;
  const bothWeak = hakupScore <= 1 && saenggyeScore <= 1;

  if (bothWeak || (conflict && Math.abs(hakupScore - saenggyeScore) < 2)) {
    return saenggyeScore > hakupScore
      ? { type: "혼합형", confidence: "낮음" }
      : { type: "판정 불가", confidence: "낮음" };
  }

  if (saenggyeScore > hakupScore) {
    return {
      type: "생계·현실 진입 우선형",
      confidence: saenggyeScore >= 3 ? "높음" : "보통",
    };
  }

  if (hakupScore > saenggyeScore) {
    return {
      type: "학업·자격 우선형",
      confidence: hakupScore >= 3 ? "높음" : "보통",
    };
  }

  return { type: "혼합형", confidence: "낮음" };
}

// ── laborMeans 판정 ──
function judgeLaborMeans(saju: SajuResult): { means: LaborMeans[]; note: string } {
  const allLayers = analyzeRevealLayers(
    Object.values(saju.pillars).filter(Boolean) as SajuPillar[]
  );
  const ymLayers = analyzeYearMonth(saju);

  // 전체 원국 기준
  const siksang = getState(allLayers, "식상");
  const jaeseong = getState(allLayers, "재성");
  const bigyeop = getState(allLayers, "비겁");
  const inSung = getState(allLayers, "인성");
  const sungwan = getState(allLayers, "관성");

  // 년월 기준 (위치 우선)
  const ymJaeseong = getState(ymLayers, "재성");
  const ymSiksang = getState(ymLayers, "식상");
  const ymBigyeop = getState(ymLayers, "비겁");
  const ymInSung = getState(ymLayers, "인성");

  // 년월 재성이 년월 식상보다 강한가
  const jaeseongStrongerThanSiksang =
    (ymJaeseong.inStem && !ymSiksang.inStem) ||
    (ymJaeseong.inBranch && ymSiksang.absent);

  const candidates: Array<{ means: LaborMeans; score: number }> = [];

  // 판매·협상: 재성 inStem + 식상 any
  if (jaeseong.inStem && !siksang.absent) {
    candidates.push({ means: "판매·협상", score: ymJaeseong.inStem ? 4 : 3 });
  }

  // 운영·관리: 재성 inBranch 이상 + 비겁 강함
  if ((jaeseong.inStem || jaeseong.inBranch) && bigyeop.inStem) {
    candidates.push({ means: "운영·관리", score: 3 });
  }

  // 몸·현장: 비겁 inStem + 재성 inBranch + 인성 없음
  if (bigyeop.inStem && (jaeseong.inBranch || jaeseong.inStem) && inSung.absent) {
    candidates.push({ means: "몸·현장", score: 2 });
  }

  // 독립 실행: 비겁 inStem + 관성 없음 + 재성 있음
  if (bigyeop.inStem && sungwan.absent && !jaeseong.absent) {
    candidates.push({ means: "독립 실행", score: 2 });
  }

  // 머리·판단: 인성 inStem + 관성 inBranch 이상
  if (inSung.inStem && (sungwan.inStem || sungwan.inBranch)) {
    candidates.push({ means: "머리·판단", score: ymInSung.inStem ? 4 : 3 });
  }

  // 말·설명: 식상 inStem — 단, 년월 재성이 더 강하면 보조로만
  if (siksang.inStem && !jaeseongStrongerThanSiksang) {
    candidates.push({ means: "말·설명", score: 2 });
  }

  // 자본·투자: 재성 inStem + 관성 약함
  if (jaeseong.inStem && sungwan.absent && !bigyeop.inStem) {
    candidates.push({ means: "자본·투자", score: 2 });
  }

  // 손기술: 비겁 + 식상 함께 강함 + 재성 없음
  if (bigyeop.inStem && siksang.inStem && jaeseong.absent) {
    candidates.push({ means: "손기술", score: 2 });
  }

  // 중복 제거 후 점수 정렬, 최대 3개
  const seen = new Set<LaborMeans>();
  const sorted = candidates
    .sort((a, b) => b.score - a.score)
    .filter((c) => { if (seen.has(c.means)) return false; seen.add(c.means); return true; })
    .slice(0, 3);

  const means = sorted.map((c) => c.means);

  // note 생성
  let note = "";
  if (jaeseongStrongerThanSiksang && !siksang.absent) {
    note = "말·설명 능력은 판매·협상·운영의 보조 수단으로 사용";
  } else if (siksang.inStem && !jaeseong.inStem) {
    note = "말·설명 능력은 존재하나 교육·콘텐츠를 1순위 경로로 제시하지 말 것";
  }

  return {
    means: means.length > 0 ? means : [],
    note,
  };
}

// ── 메인 함수: Claude 전달용 텍스트 생성 ──
export function buildCareerReadingBlock(saju: SajuResult | undefined | null): string {
  if (!saju) return "";

  try {
    const entry = judgeEntryType(saju);
    const labor = judgeLaborMeans(saju);

    if (entry.type === "판정 불가" && labor.means.length === 0) return "";

    const lines: string[] = ["[직업 중간 판독값]"];
    lines.push(`진입유형: ${entry.type}(${entry.entryConfidence})`);

    if (labor.means.length > 0) {
      lines.push(`노동수단: ${labor.means.join(" > ")}`);
    }
    if (labor.note) {
      lines.push(`보조능력: ${labor.note}`);
    }
    if (means_includes_siksang_only(labor.means)) {
      lines.push("금지: 교육·콘텐츠형을 1순위 경로로 제시하지 말 것");
    } else if (!labor.means.includes("말·설명")) {
      lines.push("금지: 교육·콘텐츠형을 1순위 경로로 제시하지 말 것");
    }

    return lines.join("\n");
  } catch {
    return "";
  }
}

function means_includes_siksang_only(means: LaborMeans[]): boolean {
  return means.length === 1 && means[0] === "말·설명";
}
