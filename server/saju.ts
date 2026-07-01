/**
 * 휴먼 프리즘 - 사주 계산 엔진 (TypeScript)
 *
 * 만세력 CSV 데이터 (1900~2100, 한국 표준시 KST 기준)를 사용하여
 * 양력 생년월일시 → 사주팔자, 12신살, 대운, 대운수를 계산한다.
 *
 * 핵심 원칙:
 * - 입춘 세수 기준
 * - 동경시(135E) → 한국표준시 보정은 사용자 입력시 이미 KST로 변환되어 들어온다고 가정
 * - 야자시/조자시 개념 미사용 (마스터 지침: 활용하지 않음)
 *   → 23시~24시도 그대로 子시로 처리하며 일간은 당일 일간을 사용한다.
 * - 12신살 자동 매핑
 * - 대운수 계산: 출생일에서 가장 가까운 절기까지의 일수 / 3 (반올림, 0이면 1)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 상수 =====

export const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export const STEM_KR: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
export const BRANCH_KR: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

// 12신살 (지살부터 시작하여 년살, 월살, 망신살, 장성살, 반안살, 역마살, 육해살, 화개살, 겁살, 재살, 천살)
export const SHINSAL_FROM_JISAL = [
  "지살", "년살", "월살", "망신살",
  "장성살", "반안살", "역마살", "육해살",
  "화개살", "겁살", "재살", "천살",
] as const;

// 오행
export const STEM_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
export const BRANCH_ELEMENT: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

// 지장간 (정기/중기/여기 순)
export const HIDDEN_STEMS: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

// ===== 음양 & 육친(십성) =====
// 천간 음양: 갑丙戊庚壬 = 양(+), 을丁己辛癸 = 음(-)
export const STEM_YINYANG: Record<string, "양" | "음"> = {
  甲: "양", 丙: "양", 戊: "양", 庚: "양", 壬: "양",
  乙: "음", 丁: "음", 己: "음", 辛: "음", 癸: "음",
};

// 오행 상생: 木→火→土→金→水→木 / 상극: 木→土→水→火→金→木
const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

/**
 * 일간(dayStem) 기준 대상 천간(target)의 육친(십성)을 결정론적으로 계산한다.
 *
 * 규칙 (오행 상생상극 + 음양 동/이):
 *  - 같은 오행: 음양 같으면 비견, 다르면 겁재
 *  - 일간이 생하는 오행(我生): 음양 같으면 식신, 다르면 상관
 *  - 일간이 극하는 오행(我剋): 음양 같으면 편재, 다르면 정재
 *  - 일간을 극하는 오행(剋我): 음양 같으면 편관(칠살), 다르면 정관
 *  - 일간을 생하는 오행(生我): 음양 같으면 편인, 다르면 정인
 *
 * 예) 일간 丙(火,양) 기준 壬/癸(水) → 水剋火(剋我) → 壬(양)=편관, 癸(음)=정관 → 관성.
 */
export function getTenGod(dayStem: string, target: string): string {
  const de = STEM_ELEMENT[dayStem];
  const te = STEM_ELEMENT[target];
  if (!de || !te) return "";
  const sameYy = STEM_YINYANG[dayStem] === STEM_YINYANG[target];

  if (de === te) return sameYy ? "비견" : "겁재";
  if (SHENG[de] === te) return sameYy ? "식신" : "상관"; // 我生
  if (KE[de] === te) return sameYy ? "편재" : "정재"; // 我剋
  if (KE[te] === de) return sameYy ? "편관" : "정관"; // 剋我
  if (SHENG[te] === de) return sameYy ? "편인" : "정인"; // 生我
  return "";
}

// 지지 음양(體用) — 마스터 원칙 고정표. 子음·亥양 기준. 지장간·정기를 거치지 않고 지지의 음양을 직접 고정한다.
export const BRANCH_YINYANG: Record<string, "양" | "음"> = {
  子: "음", 丑: "음", 寅: "양", 卯: "음", 辰: "양", 巳: "양",
  午: "음", 未: "음", 申: "양", 酉: "음", 戌: "양", 亥: "양",
};

/**
 * 일간(dayStem) 기준 지지(branch) 자체의 육친(십성)을 계산한다.
 * 지장간·정기를 거치지 않고, 지지의 음양(BRANCH_YINYANG)·오행(BRANCH_ELEMENT)만
 * 직접 따져 getTenGod과 동일한 상생상극 규칙으로 결정한다.
 * 예) 일간 甲(木,양) → 亥(水,양) 은 水生木·음양같음 → 편인 / 子(水,음) 은 정인.
 */
export function getBranchTenGod(dayStem: string, branch: string): string {
  const de = STEM_ELEMENT[dayStem];
  const be = BRANCH_ELEMENT[branch];
  if (!de || !be) return "";
  const sameYy = STEM_YINYANG[dayStem] === BRANCH_YINYANG[branch];
  if (de === be) return sameYy ? "비견" : "겁재";
  if (SHENG[de] === be) return sameYy ? "식신" : "상관"; // 我生
  if (KE[de] === be) return sameYy ? "편재" : "정재"; // 我剋
  if (KE[be] === de) return sameYy ? "편관" : "정관"; // 剋我
  if (SHENG[be] === de) return sameYy ? "편인" : "정인"; // 生我
  return "";
}

/** 십성을 큰 분류(육친 카테고리)로 묶는다. */
export function getTenGodCategory(tenGod: string): string {
  switch (tenGod) {
    case "비견":
    case "겁재":
      return "비겁";
    case "식신":
    case "상관":
      return "식상";
    case "편재":
    case "정재":
      return "재성";
    case "편관":
    case "정관":
      return "관성";
    case "편인":
    case "정인":
      return "인성";
    default:
      return "";
  }
}

// ===== 12운성(십이운성) — 화토동근(火土同根) =====
// 십이운성 순서(장생부터 양까지 12단계)
export const TWELVE_STAGES = [
  "장생", "목욕", "관대", "건록", "제왕", "쇠",
  "병", "사", "묘", "절", "태", "양",
] as const;

// 12지지 순행 배열
const BRANCH_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 천간별 장생지 — 화토동근(戊=丙, 己=丁). 수토동근은 쓰지 않음.
// 양간(甲丙戊庚壬)은 순행, 음간(乙丁己辛癸)은 역행.
const CHANGSAENG_BRANCH: Record<string, string> = {
  甲: "亥", 丙: "寅", 戊: "寅", 庚: "巳", 壬: "申",
  乙: "午", 丁: "酉", 己: "酉", 辛: "子", 癸: "卯",
};

/**
 * 천간(stem)이 특정 지지(branch)에서 갖는 12운성을 계산한다. (화토동근 기준)
 * 양간은 장생지에서 순행, 음간은 장생지에서 역행하며 12단계를 배치한다.
 */
export function getTwelveStage(stem: string, branch: string): string {
  const start = CHANGSAENG_BRANCH[stem];
  if (!start) return "";
  const startIdx = BRANCH_ORDER.indexOf(start);
  const targetIdx = BRANCH_ORDER.indexOf(branch);
  if (startIdx < 0 || targetIdx < 0) return "";
  const forward = STEM_YINYANG[stem] === "양";
  // 순행이면 +, 역행이면 - 방향으로 진행한 거리
  let step = forward
    ? (targetIdx - startIdx + 12) % 12
    : (startIdx - targetIdx + 12) % 12;
  return TWELVE_STAGES[step];
}

/**
 * 12운성 기세 힌트(강약 단정이 아닌 해석 보조용 라벨).
 * - 강(기세 뚜렷): 장생·관대·건록·제왕 (생록대관왕)
 * - 약(기세 약함): 절·태·묘·사
 * - 미묘(중간): 목욕·양(덜 여문 가능성), 쇠(왕지 다음, 노련함), 병
 */
export function getStageVitality(stage: string): "강" | "약" | "미묘" {
  if (["장생", "관대", "건록", "제왕"].includes(stage)) return "강";
  if (["절", "태", "묘", "사"].includes(stage)) return "약";
  return "미묘"; // 목욕, 양, 쇠, 병
}

// ===== 형충(刑沖) — 정성적 무게 판단용 사실값 계산 =====
// 마스터 관법: 개수를 세지 않는다. 어떤 글자가 어디서 형/충으로 흔들리는지,
// 거리(인접/원격)는 어떤지, 진술축미 4고가 열리는 개고인지 "사실값"만 뽑는다.
// 해석(발현/손상 양면, 기질)은 LLM이 한다.

// 지지 6충
const SIX_CHUNG: [string, string][] = [
  ["子", "午"], ["丑", "未"], ["寅", "申"],
  ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];
// 삼형(三刑): 인사신 / 축술미 (세 글자 그룹)
const SAM_HYEONG: string[][] = [
  ["寅", "巳", "申"],
  ["丑", "戌", "未"],
];
// 상형(相刑): 자묘 (두 글자)
const SANG_HYEONG: [string, string][] = [["子", "卯"]];
// 자형(自刑): 진진·오오·유유·해해 (같은 글자 둘)
const JA_HYEONG = ["辰", "午", "酉", "亥"];
// 진술축미 4고(墓庫) — 개고(開庫)는 엄밀히 이 넷이 형충으로 열릴 때만 쓴다.
const FOUR_TOMBS = ["辰", "戌", "丑", "未"];

export type RelationType = "충" | "삼형" | "상형" | "자형";
export interface BranchRelation {
  type: RelationType;
  /** 관여한 기둥 라벨(연/월/일/시) */
  positions: string[];
  /** 관여한 지지 글자 */
  branches: string[];
  /** 위치 인접 여부(연-월, 월-일, 일-시 = 인접). 충은 거리에 민감. */
  adjacent: boolean;
  /** 개고 여부: 진술축미 4고가 관여하면 true */
  opensTomb: boolean;
  /** 사람이 읽을 설명(사실 진술, 해석 아님) */
  note: string;
}

const POS_LABEL = ["연", "월", "일", "시"];

/**
 * 네 지지(연/월/일/시 순, 시 없으면 null)에서 형·충 관계를 사실값으로 찾아낸다.
 * 거리·인접·개고만 판정하고, 발현/손상 등 해석은 하지 않는다.
 */
export function findBranchRelations(branches: (string | null)[]): BranchRelation[] {
  // [{branch, posIdx}] 형태로 정리 (null 제외)
  const slots = branches
    .map((b, i) => ({ b, i }))
    .filter((s): s is { b: string; i: number } => !!s.b);
  const rels: BranchRelation[] = [];
  const isAdjacent = (a: number, c: number) => Math.abs(a - c) === 1;

  // 충 (두 글자 쌍)
  for (let x = 0; x < slots.length; x++) {
    for (let y = x + 1; y < slots.length; y++) {
      const a = slots[x], c = slots[y];
      const pair = SIX_CHUNG.find(
        ([p, q]) => (p === a.b && q === c.b) || (p === c.b && q === a.b),
      );
      if (pair) {
        const adjacent = isAdjacent(a.i, c.i);
        const opensTomb = FOUR_TOMBS.includes(a.b) || FOUR_TOMBS.includes(c.b);
        rels.push({
          type: "충",
          positions: [POS_LABEL[a.i], POS_LABEL[c.i]],
          branches: [a.b, c.b],
          adjacent,
          opensTomb,
          note: `${POS_LABEL[a.i]}지 ${a.b} ↔ ${POS_LABEL[c.i]}지 ${c.b} 충(${adjacent ? "인접·작용 강함" : "원격·거리만큼 약화"})${opensTomb ? ", 진술축미 개고" : ""}`,
        });
      }
    }
  }

  // 상형 (두 글자 쌍: 자묘)
  for (let x = 0; x < slots.length; x++) {
    for (let y = x + 1; y < slots.length; y++) {
      const a = slots[x], c = slots[y];
      const pair = SANG_HYEONG.find(
        ([p, q]) => (p === a.b && q === c.b) || (p === c.b && q === a.b),
      );
      if (pair) {
        rels.push({
          type: "상형",
          positions: [POS_LABEL[a.i], POS_LABEL[c.i]],
          branches: [a.b, c.b],
          adjacent: isAdjacent(a.i, c.i),
          opensTomb: false,
          note: `${POS_LABEL[a.i]}지 ${a.b} ↔ ${POS_LABEL[c.i]}지 ${c.b} 상형(子卯, 형은 거리 멀어도 작용)`,
        });
      }
    }
  }

  // 자형 (같은 글자 둘 이상)
  for (const jb of JA_HYEONG) {
    const found = slots.filter((s) => s.b === jb);
    if (found.length >= 2) {
      const opensTomb = FOUR_TOMBS.includes(jb);
      rels.push({
        type: "자형",
        positions: found.map((f) => POS_LABEL[f.i]),
        branches: found.map((f) => f.b),
        adjacent: found.some((f, k) => k > 0 && isAdjacent(found[k - 1].i, f.i)),
        opensTomb,
        note: `${jb}${jb} 자형(${found.map((f) => POS_LABEL[f.i]).join("·")}지)${opensTomb ? ", 진술축미 개고" : ""}`,
      });
    }
  }

  // 삼형 (세 글자 그룹: 둘 이상 모이면 부분 성립으로 표기)
  for (const group of SAM_HYEONG) {
    const present = slots.filter((s) => group.includes(s.b));
    // 서로 다른 글자가 2개 이상이어야 형 성립(같은 글자 중복은 제외)
    const distinct = Array.from(new Set(present.map((p) => p.b)));
    if (distinct.length >= 2) {
      const full = distinct.length === 3;
      const opensTomb = present.some((p) => FOUR_TOMBS.includes(p.b));
      rels.push({
        type: "삼형",
        positions: present.map((p) => POS_LABEL[p.i]),
        branches: present.map((p) => p.b),
        adjacent: present.some((p, k) => k > 0 && isAdjacent(present[k - 1].i, p.i)),
        opensTomb,
        note: `${distinct.join("")} ${full ? "삼형 완성" : "형(부분)"}(${present.map((p) => POS_LABEL[p.i]).join("·")}지, 형은 거리 멀어도 작용)${opensTomb ? ", 진술축미 개고" : ""}`,
      });
    }
  }

  return rels;
}

/**
 * findBranchRelations 확장판 — posLabels 배열을 외부에서 주입받는다.
 * 원국 4지지 외에 대운(인덱스4)·세운(인덱스5) 지지까지 포함한 형충회합 계산에 사용.
 */
export function findBranchRelationsExt(
  branches: (string | null)[],
  posLabels: string[],
): BranchRelation[] {
  const slots = branches
    .map((b, i) => ({ b, i }))
    .filter((s): s is { b: string; i: number } => !!s.b);
  const rels: BranchRelation[] = [];
  const label = (i: number) => posLabels[i] ?? String(i);
  const isAdjacent = (a: number, c: number) => Math.abs(a - c) === 1;

  // 충
  for (let x = 0; x < slots.length; x++) {
    for (let y = x + 1; y < slots.length; y++) {
      const a = slots[x], c = slots[y];
      const pair = SIX_CHUNG.find(
        ([p, q]) => (p === a.b && q === c.b) || (p === c.b && q === a.b),
      );
      if (pair) {
        const adjacent = isAdjacent(a.i, c.i);
        const opensTomb = FOUR_TOMBS.includes(a.b) || FOUR_TOMBS.includes(c.b);
        rels.push({
          type: "충",
          positions: [label(a.i), label(c.i)],
          branches: [a.b, c.b],
          adjacent,
          opensTomb,
          note: `${label(a.i)}지 ${a.b} ↔ ${label(c.i)}지 ${c.b} 충(${adjacent ? "인접·작용 강함" : "원격·거리만큼 약화"})${opensTomb ? ", 진술축미 개고" : ""}`,
        });
      }
    }
  }
  // 상형
  for (let x = 0; x < slots.length; x++) {
    for (let y = x + 1; y < slots.length; y++) {
      const a = slots[x], c = slots[y];
      const pair = SANG_HYEONG.find(
        ([p, q]) => (p === a.b && q === c.b) || (p === c.b && q === a.b),
      );
      if (pair) {
        rels.push({
          type: "상형",
          positions: [label(a.i), label(c.i)],
          branches: [a.b, c.b],
          adjacent: isAdjacent(a.i, c.i),
          opensTomb: false,
          note: `${label(a.i)}지 ${a.b} ↔ ${label(c.i)}지 ${c.b} 상형(子卯)`,
        });
      }
    }
  }
  // 자형
  for (const jb of JA_HYEONG) {
    const found = slots.filter((s) => s.b === jb);
    if (found.length >= 2) {
      const opensTomb = FOUR_TOMBS.includes(jb);
      rels.push({
        type: "자형",
        positions: found.map((f) => label(f.i)),
        branches: found.map((f) => f.b),
        adjacent: found.some((f, k) => k > 0 && isAdjacent(found[k - 1].i, f.i)),
        opensTomb,
        note: `${jb}${jb} 자형(${found.map((f) => label(f.i)).join("·")}지)${opensTomb ? ", 진술축미 개고" : ""}`,
      });
    }
  }
  // 삼형
  for (const group of SAM_HYEONG) {
    const present = slots.filter((s) => group.includes(s.b));
    const distinct = Array.from(new Set(present.map((p) => p.b)));
    if (distinct.length >= 2) {
      const full = distinct.length === 3;
      const opensTomb = present.some((p) => FOUR_TOMBS.includes(p.b));
      rels.push({
        type: "삼형",
        positions: present.map((p) => label(p.i)),
        branches: present.map((p) => p.b),
        adjacent: present.some((p, k) => k > 0 && isAdjacent(present[k - 1].i, p.i)),
        opensTomb,
        note: `${distinct.join("")} ${full ? "삼형 완성" : "형(부분)"}(${present.map((p) => label(p.i)).join("·")}지)${opensTomb ? ", 진술축미 개고" : ""}`,
      });
    }
  }
  // 육합
  for (const [p, q] of SIX_HEP) {
    const as_ = slots.filter(s => s.b === p);
    const cs_ = slots.filter(s => s.b === q);
    for (const a of as_) {
      for (const c of cs_) {
        rels.push({
          type: "합",
          positions: [label(a.i), label(c.i)],
          branches: [a.b, c.b],
          adjacent: isAdjacent(a.i, c.i),
          opensTomb: false,
          note: `${label(a.i)}지 ${a.b} ↔ ${label(c.i)}지 ${c.b} 육합`,
        });
      }
    }
  }
  // 삼합
  for (const group of SAM_HEP) {
    const present = slots.filter((s) => group.includes(s.b));
    const distinct = Array.from(new Set(present.map((p) => p.b)));
    if (distinct.length >= 2) {
      const full = distinct.length === 3;
      rels.push({
        type: "삼합",
        positions: present.map((p) => label(p.i)),
        branches: present.map((p) => p.b),
        adjacent: false,
        opensTomb: false,
        note: `${distinct.join("")} ${full ? "삼합 완성" : "반합"}(${present.map((p) => label(p.i)).join("·")}지)`,
      });
    }
  }
  return rels;
}

// ===== 드러남 층위 — 육친의 정성적 무게(개수 아님) =====
// 천간 투출(통근까지면 더 무겁다) > 지지 정기 > 지장간 잠복. 셋의 무게가 다르다.
export interface RevealLayer {
  category: string; // 비겁/식상/재성/관성/인성
  /** 천간에 투출했는가(가장 무겁다) */
  inStem: boolean;
  /** 지지 정기로 드러났는가(중간) */
  inBranch: boolean;
  /** 지장간에만 잠겨 있는가(평소 가볍다, 형충 시 깨어남) */
  hiddenOnly: boolean;
}

/**
 * 각 육친 카테고리가 어느 층위에서 드러나는지 분석한다. 개수를 세지 않는다.
 * 천간 투출 / 지지 정기 / 지장간 잠복 중 어디에 있는지(불리언)만 표기한다.
 */
export function analyzeRevealLayers(pillars: SajuPillar[]): RevealLayer[] {
  const cats = ["비겁", "식상", "재성", "관성", "인성"];
  const map: Record<string, RevealLayer> = {};
  for (const c of cats) map[c] = { category: c, inStem: false, inBranch: false, hiddenOnly: false };

  for (const p of pillars) {
    // 천간(일간 자신 제외)
    if (p.tenGod && p.tenGod !== "일간(아신)") {
      const c = getTenGodCategory(p.tenGod);
      if (c && map[c]) map[c].inStem = true;
    }
    // 지지 정기
    if (p.branchTenGod) {
      const c = getTenGodCategory(p.branchTenGod);
      if (c && map[c]) map[c].inBranch = true;
    }
  }
  // 지장간 잠복: 천간·지지 정기 어디에도 안 드러난 것
  for (const p of pillars) {
    for (const g of (p.hiddenTenGods ?? [])) {
      if (!g) continue;
      const c = getTenGodCategory(g);
      if (c && map[c] && !map[c].inStem && !map[c].inBranch) {
        map[c].hiddenOnly = true;
      }
    }
  }
  return cats.map((c) => map[c]);
}

// ===== 조후 — 월령(계절) 기준 일간 득실령 =====
// 월지 → 계절. 난강망 시각의 출발점으로, 일간이 계절의 기운을 얻었는지(득령) 판단.
const BRANCH_SEASON: Record<string, "봄" | "여름" | "가을" | "겨울" | "환절기"> = {
  寅: "봄", 卯: "봄",
  巳: "여름", 午: "여름",
  申: "가을", 酉: "가을",
  亥: "겨울", 子: "겨울",
  辰: "환절기", 未: "환절기", 戌: "환절기", 丑: "환절기",
};
// 계절별 왕한 오행(그 계절에 가장 강한 기운)
const SEASON_PRIME_ELEMENT: Record<string, string> = {
  봄: "木", 여름: "火", 가을: "金", 겨울: "水",
};

/**
 * 일간이 월령(계절)으로부터 기운을 얻었는지 판단한다.
 * 반환: 득령(계절이 일간 오행을 왕하게 함) / 상령(계절이 일간을 생함) / 실령(그 외).
 * 난강망 조후 통변의 출발 재료로 쓰되, 세밀한 계절 조후 해석은 LLM에 맡긴다.
 */
export function getMonthlyStatus(
  dayElement: string,
  monthBranch: string,
): { season: string; status: "득령" | "상령" | "실령"; note: string } {
  const season = BRANCH_SEASON[monthBranch] || "환절기";
  if (season === "환절기") {
    return { season: "환절기(土王)", status: dayElement === "土" ? "득령" : "실령", note: "토가 왕한 환절기" };
  }
  const prime = SEASON_PRIME_ELEMENT[season];
  if (dayElement === prime) {
    return { season, status: "득령", note: "계절이 일간을 왕하게 함(가장 강함)" };
  }
  // 계절 왕오행이 일간을 생하면 상령(기운을 받음)
  if (SHENG[prime] === dayElement) {
    return { season, status: "상령", note: "계절 기운이 일간을 생함" };
  }
  return { season, status: "실령", note: "계절의 기운을 얻지 못함(약함)" };
}

// 절월(월을 바꾸는 12절기)
const MONTHLY_TERMS = new Set([
  "立春", "驚蟄", "淸明", "立夏", "芒種", "小暑",
  "立秋", "白露", "寒露", "立冬", "大雪", "小寒",
]);

// ===== 만세력 데이터 로딩 =====

interface CalendarRow {
  year: number;
  month: number;
  day: number;
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  solarTermHanja: string;
  solarTermKorean: string;
  /** YYYYMMDDHHMM 형식의 절기 시각 문자열 (한국천문연구원 KASI 고시 절기, KST 기준) */
  termTime: string;
}

let CALENDAR_DATA: CalendarRow[] | null = null;
let CALENDAR_INDEX: Map<string, CalendarRow> | null = null;

function loadCalendarData(): CalendarRow[] {
  if (CALENDAR_DATA) return CALENDAR_DATA;

  // dist 빌드 환경에서도 동작하도록 여러 후보 경로를 탐색
  const candidates = [
    path.resolve(__dirname, "data/calendar_data.csv"),
    path.resolve(__dirname, "../server/data/calendar_data.csv"),
    path.resolve(process.cwd(), "server/data/calendar_data.csv"),
  ];
  let csvPath: string | null = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }
  if (!csvPath) {
    throw new Error(`Calendar data not found. Tried: ${candidates.join(", ")}`);
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split(/\r?\n/);
  const out: CalendarRow[] = [];
  // 헤더: year,month,day,year_pillar,month_pillar,day_pillar,lunar_year,lunar_month,lunar_day,solar_term_hanja,solar_term_korean,term_time
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const cols = line.split(",");
    if (cols.length < 12) continue;
    out.push({
      year: parseInt(cols[0], 10),
      month: parseInt(cols[1], 10),
      day: parseInt(cols[2], 10),
      yearPillar: cols[3],
      monthPillar: cols[4],
      dayPillar: cols[5],
      lunarYear: parseInt(cols[6], 10),
      lunarMonth: parseInt(cols[7], 10),
      lunarDay: parseInt(cols[8], 10),
      solarTermHanja: cols[9],
      solarTermKorean: cols[10],
      termTime: cols[11],
    });
  }
  CALENDAR_DATA = out;
  CALENDAR_INDEX = new Map();
  for (const row of out) {
    CALENDAR_INDEX.set(`${row.year}-${row.month}-${row.day}`, row);
  }
  return out;
}

function getRow(year: number, month: number, day: number): CalendarRow | null {
  loadCalendarData();
  return CALENDAR_INDEX!.get(`${year}-${month}-${day}`) ?? null;
}

// ===== 음력 → 양력 역변환 =====
//
// 만세력 CSV(한국천문연구원 KST 기준)의 lunar 컬럼을 "기준 진실"로 삼아
// 음력 날짜를 양력으로 역변환한다. 외부 라이브러리(중국 베이징 기준)는
// 한국 만세력과 약 4% 불일치하므로 사용하지 않는다.
//
// 윤달 판별 규칙: 같은 음력(연,월)의 1일이 CSV에 두 번 등장하면,
// 첫 번째가 평달, 두 번째가 윤달이다.

/** `${lunarYear}-${lunarMonth}-${lunarDay}-${leap?1:0}` -> 양력 {year,month,day} */
let LUNAR_INDEX: Map<string, { year: number; month: number; day: number }> | null = null;

function buildLunarIndex(): Map<string, { year: number; month: number; day: number }> {
  if (LUNAR_INDEX) return LUNAR_INDEX;
  loadCalendarData();
  const idx = new Map<string, { year: number; month: number; day: number }>();
  // 각 (음력연,월)에 대해 1일이 등장한 횟수를 추적하여 윤달 여부를 판정
  // CSV는 양력 날짜 오름차순이므로, 음력월의 두 번째 출현이 윤달이다.
  const monthOccurrence = new Map<string, number>(); // `${ly}-${lm}` -> 현재까지 본 "1일" 수
  let currentLeapFlag = new Map<string, boolean>(); // 진행 중인 (ly,lm)이 윤달인지

  for (const row of CALENDAR_DATA!) {
    const { lunarYear: ly, lunarMonth: lm, lunarDay: ld } = row;
    if (!ly || !lm || !ld) continue;
    const monthKey = `${ly}-${lm}`;
    if (ld === 1) {
      const seen = (monthOccurrence.get(monthKey) ?? 0) + 1;
      monthOccurrence.set(monthKey, seen);
      // 두 번째 이상 출현 = 윤달
      currentLeapFlag.set(monthKey, seen >= 2);
    }
    const isLeap = currentLeapFlag.get(monthKey) ?? false;
    const key = `${ly}-${lm}-${ld}-${isLeap ? 1 : 0}`;
    // 동일 키는 최초 등장만 보존 (이론상 중복 없음)
    if (!idx.has(key)) {
      idx.set(key, { year: row.year, month: row.month, day: row.day });
    }
  }
  LUNAR_INDEX = idx;
  return idx;
}

export interface LunarToSolarResult {
  year: number;
  month: number;
  day: number;
  /** 입력한 음력이 실제로 윤달로 존재했는지 */
  matchedLeap: boolean;
}

/**
 * 음력 → 양력 변환.
 * @param isLeapMonth 윤달 여부. 윤달을 요청했으나 해당 연도에 윤달이 없으면 평달로 폴백한다.
 * @throws 해당 음력 날짜를 만세력에서 찾을 수 없을 때
 */
export function lunarToSolar(
  lunarYear: number,
  lunarMonth: number,
  lunarDay: number,
  isLeapMonth: boolean = false,
): LunarToSolarResult {
  const idx = buildLunarIndex();
  if (isLeapMonth) {
    const leapKey = `${lunarYear}-${lunarMonth}-${lunarDay}-1`;
    const hit = idx.get(leapKey);
    if (hit) return { ...hit, matchedLeap: true };
    // 윤달이 존재하지 않으면 평달로 폴백
  }
  const plainKey = `${lunarYear}-${lunarMonth}-${lunarDay}-0`;
  const hit = idx.get(plainKey);
  if (hit) return { ...hit, matchedLeap: false };
  throw new Error(
    `만세력에서 해당 음력 날짜를 찾을 수 없습니다: ${lunarYear}년 ${isLeapMonth ? "윤" : ""}${lunarMonth}월 ${lunarDay}일`,
  );
}

/** 특정 음력 연/월에 윤달이 존재하는지 여부 */
export function hasLeapMonth(lunarYear: number, lunarMonth: number): boolean {
  const idx = buildLunarIndex();
  return idx.has(`${lunarYear}-${lunarMonth}-1-1`);
}

// ===== 시진 계산 =====

/**
 * 시간(0~23) + 분(0~59)을 시지로 변환.
 * 야자시/조자시 미사용 → 23:00~01:00 모두 子.
 */
export function getHourBranch(hour: number, minute: number = 0): string {
  const t = hour + minute / 60;
  if (t < 1 || t >= 23) return "子";
  if (t < 3) return "丑";
  if (t < 5) return "寅";
  if (t < 7) return "卯";
  if (t < 9) return "辰";
  if (t < 11) return "巳";
  if (t < 13) return "午";
  if (t < 15) return "未";
  if (t < 17) return "申";
  if (t < 19) return "酉";
  if (t < 21) return "戌";
  return "亥";
}

/**
 * 일간 + 시간 → 시간 천간 계산 (오자둔법)
 *  甲己일 → 甲子시부터, 乙庚 → 丙子, 丙辛 → 戊子, 丁壬 → 庚子, 戊癸 → 壬子
 */
export function getHourStem(dayStem: string, hour: number, minute: number = 0): string {
  const startMap: Record<string, number> = {
    甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8,
  };
  const start = startMap[dayStem];
  const branch = getHourBranch(hour, minute);
  const branchIdx = BRANCHES.indexOf(branch as any);
  return STEMS[(start + branchIdx) % 10];
}

// ===== 절기 시각 파싱 =====

/** YYYYMMDDHHMM 형식 절기 시각 → Date (KST 가정, JS는 로컬 타임존 보존을 위해 epoch 변환) */
function parseTermTime(s: string): Date | null {
  if (!s || s.trim() === "") return null;
  const num = String(parseInt(s, 10));
  if (num.length !== 12) return null;
  const y = parseInt(num.slice(0, 4), 10);
  const mo = parseInt(num.slice(4, 6), 10);
  const d = parseInt(num.slice(6, 8), 10);
  const h = parseInt(num.slice(8, 10), 10);
  const mi = parseInt(num.slice(10, 12), 10);
  // KST=UTC+9로 가정. UTC epoch로 환산.
  return new Date(Date.UTC(y, mo - 1, d, h - 9, mi));
}

// ===== 입춘 세수 보정: 특정 시각의 '사주연도 간지' 확정 =====
//
// 사주에서 한 해의 시작은 양력 1월 1일이 아니라 입춘(立春, 대략 2월 4일)이다.
// 따라서 1월~입춘 전에 상담하면 사주상 연도는 아직 '전년도'다.
//
// 진실의 출처는 만세력 CSV의 yearPillar(이미 입춘 세수를 일 단위로 반영) +
// 입춘 당일은 termTime(시각)까지 비교해 새벽 몇 시간의 경계도 정확히 처리한다.
// 산식(연도-1984)을 쓰지 않으므로 입춘 전 오류가 원천 차단된다.

export interface CurrentSajuYearInfo {
  /** 그 시각의 사주연도 간지 (예: "丙午") */
  ganji: string;
  /** 60갑자 인덱스 (0=甲子 ~ 59=癸亥) */
  ganjiIndex: number;
  /** 사주연도 번호 (입춘 전이면 달력연도-1) */
  sajuYearNo: number;
  /** 달력(양력) 연도 */
  calendarYear: number;
  /** 달력연도와 사주연도가 다른가 (= 입춘 전 구간인가) */
  beforeIpchun: boolean;
  /** 기준 시각이 입춘 당일인가 (시점이 가장 민감한 날) */
  isIpchunDay: boolean;
}

/** 60갑자 문자열 → 인덱스(0~59). 못 찾으면 -1 */
function ganjiToIndex(ganji: string): number {
  if (!ganji || ganji.length < 2) return -1;
  const s = STEMS.indexOf(ganji[0] as any);
  const b = BRANCHES.indexOf(ganji[1] as any);
  if (s < 0 || b < 0) return -1;
  // 60갑자 중 천간 s, 지지 b를 동시에 만족하는 유일 인덱스
  for (let k = 0; k < 60; k++) {
    if (k % 10 === s && k % 12 === b) return k;
  }
  return -1;
}

/** 인덱스(0~59) → 60갑자 문자열 */
function indexToGanji(idx: number): string {
  const k = ((idx % 60) + 60) % 60;
  return STEMS[k % 10] + BRANCHES[k % 12];
}

/**
 * 주어진 시각(KST 기준 Date)의 '사주연도 간지'를 만세력 CSV로 확정한다.
 * 입춘 세수 + 입춘 당일 시각 경계까지 반영.
 */
export function getCurrentSajuYear(atKst: Date): CurrentSajuYearInfo {
  loadCalendarData();
  const calendarYear = atKst.getUTCFullYear();
  const m = atKst.getUTCMonth() + 1;
  const d = atKst.getUTCDate();

  let row = getRow(calendarYear, m, d);
  // CSV에 없으면(범위 밖) 산식 폴백
  if (!row) {
    const gi = ((calendarYear - 1984) % 60 + 60) % 60;
    return {
      ganji: indexToGanji(gi),
      ganjiIndex: gi,
      sajuYearNo: calendarYear,
      calendarYear,
      beforeIpchun: false,
      isIpchunDay: false,
    };
  }

  let ganji = row.yearPillar;
  let isIpchunDay = false;

  // 입춘 당일이면 절기 시각(termTime)까지 비교 — 시각 미도래 시 전년 연주 사용
  if (row.solarTermHanja === "立春" && row.termTime && row.termTime.trim() !== "") {
    isIpchunDay = true;
    const termDt = parseTermTime(row.termTime);
    if (termDt) {
      const atUtcEpoch = Date.UTC(
        calendarYear, m - 1, d,
        atKst.getUTCHours() - 9, atKst.getUTCMinutes(),
      );
      if (atUtcEpoch < termDt.getTime()) {
        // 입춘 시각 전 → 아직 전년 연주
        const prev = new Date(Date.UTC(calendarYear, m - 1, d) - 86400000);
        const prevRow = getRow(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
        if (prevRow) ganji = prevRow.yearPillar;
      }
    }
  }

  const ganjiIndex = ganjiToIndex(ganji);
  // 사주연도 번호: 같은 간지가 60년 주기로 반복되므로, 달력연도에 가장 가까운
  // 동일 간지 연도를 사주연도로 본다(입춘 전이면 자동으로 calendarYear-1이 됨).
  // 기준점: 1984=甲子(index 0). 해당 간지의 기본 연도 후보를 달력연도 근처로 맞춘다.
  let sajuYearNo = calendarYear;
  if (ganjiIndex >= 0) {
    // calendarYear의 산식 간지
    const calIdx = ((calendarYear - 1984) % 60 + 60) % 60;
    if (calIdx !== ganjiIndex) {
      // 보통 입춘 전이라 사주간지가 전년(calIdx-1)인 경우
      const prevIdx = ((calIdx - 1) % 60 + 60) % 60;
      if (prevIdx === ganjiIndex) sajuYearNo = calendarYear - 1;
      else {
        // 예외적 불일치: 60갑자 차로 가장 가까운 연도 탐색
        for (let off = -1; off >= -60; off--) {
          const idx = ((calendarYear + off - 1984) % 60 + 60) % 60;
          if (idx === ganjiIndex) { sajuYearNo = calendarYear + off; break; }
        }
      }
    }
  }
  const beforeIpchun = sajuYearNo !== calendarYear;

  return { ganji, ganjiIndex, sajuYearNo, calendarYear, beforeIpchun, isIpchunDay };
}

// ===== 현재 시각 종합: KST 년월일시분 + 일진(오늘 일주) + 시진(현재 시주) =====
//
// "지금 한국 몇 년 몇 월 며칠 몇 시"를 코드가 확정값으로 제공하고,
// 나중에 시간(시점) 기반 점법을 붙일 수 있도록 그 순간의 일진/시주 간지까지 함께 준다.
// 진실의 출처는 모두 만세력 CSV(일주) + 검증된 오자둔법(시주)이며,
// 야자시/조자시는 마스터 지침대로 사용하지 않는다(23시~01시 모두 子시, 일간은 당일 일간).

export interface CurrentMomentInfo {
  /** KST 기준 정보 */
  year: number;
  month: number;
  day: number;
  hour: number;   // 0~23
  minute: number; // 0~59
  /** 요일 (0=일 ~ 6=토) */
  weekday: number;
  weekdayKr: string; // "일"~"토"
  /** HH:MM 24시간 표기 */
  timeStr: string;
  /** 오늘의 일진(일주 간지), 예 "庚午" */
  dayGanji: string;
  dayGanjiKr: string; // "경오"
  /** 현재 시진의 시주 간지(일진 기준 오자둔법), 예 "丙子" */
  hourGanji: string;
  hourGanjiKr: string; // "병자"
  /** 현재 시진 지지의 시간대 라벨, 예 "子時(23~01시)" */
  hourBranchLabel: string;
}

const WEEKDAY_KR = ["일", "월", "화", "수", "목", "금", "토"] as const;

const HOUR_BRANCH_RANGE: Record<string, string> = {
  子: "23~01시", 丑: "01~03시", 寅: "03~05시", 卯: "05~07시",
  辰: "07~09시", 巳: "09~11시", 午: "11~13시", 未: "13~15시",
  申: "15~17시", 酉: "17~19시", 戌: "19~21시", 亥: "21~23시",
};

function ganjiKr(gz: string): string {
  if (!gz || gz.length < 2) return gz;
  return (STEM_KR[gz[0]] ?? "") + (BRANCH_KR[gz[1]] ?? "");
}

/**
 * 주어진 시각(KST 기준 Date)의 '지금 이 순간' 종합 정보를 만세력 CSV로 확정한다.
 * 일진은 CSV dayPillar를 그대로, 시주는 일진 천간 기준 오자둔법으로 계산한다.
 */
export function getCurrentMoment(atKst: Date): CurrentMomentInfo {
  loadCalendarData();
  const year = atKst.getUTCFullYear();
  const month = atKst.getUTCMonth() + 1;
  const day = atKst.getUTCDate();
  const hour = atKst.getUTCHours();
  const minute = atKst.getUTCMinutes();
  const weekday = atKst.getUTCDay();

  const row = getRow(year, month, day);
  const dayGanji = row?.dayPillar ?? "";
  const dayStem = dayGanji[0] ?? "\u7532";

  const hBranch = getHourBranch(hour, minute);
  const hStem = getHourStem(dayStem, hour, minute);
  const hourGanji = hStem + hBranch;

  return {
    year, month, day, hour, minute,
    weekday,
    weekdayKr: WEEKDAY_KR[weekday],
    timeStr: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    dayGanji,
    dayGanjiKr: ganjiKr(dayGanji),
    hourGanji,
    hourGanjiKr: ganjiKr(hourGanji),
    hourBranchLabel: `${hBranch}時(${HOUR_BRANCH_RANGE[hBranch] ?? ""})`,
  };
}

/** 서버 현재 시각을 KST(UTC+9)로 변환한 Date를 돌려준다(엔진 함수에 전달용). */
export function nowKst(): Date {
  return new Date(Date.now() + 9 * 3600000);
}

// ===== 월주 (절기 보정) =====

function getMonthPillarConsideringTerm(
  year: number, month: number, day: number, hour: number, minute: number,
): string {
  const row = getRow(year, month, day);
  if (!row) return "";
  let pillar = row.monthPillar;

  if (row.termTime && row.termTime.trim() !== "") {
    const termDt = parseTermTime(row.termTime);
    if (termDt) {
      // 절기 당일 - 절기 시각 미도래시 이전 월주 사용
      const birthDt = new Date(Date.UTC(year, month - 1, day, hour - 9, minute));
      if (birthDt.getTime() < termDt.getTime() && MONTHLY_TERMS.has(row.solarTermHanja)) {
        // 약 20일 전 데이터의 월주 사용
        const prev = new Date(Date.UTC(year, month - 1, day) - 20 * 86400000);
        const prevRow = getRow(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
        if (prevRow) pillar = prevRow.monthPillar;
      }
    }
  }
  return pillar;
}

// ===== 12신살 =====

/** 일지(또는 연지) 기준 + 대상 지지 → 12신살 */
export function getShinsal(dayBranch: string, targetBranch: string): string {
  // 삼합 → 三合의 旺地(子/卯/午/酉)
  const samhap: Record<string, string> = {
    申: "子", 子: "子", 辰: "子",
    亥: "卯", 卯: "卯", 未: "卯",
    寅: "午", 午: "午", 戌: "午",
    巳: "酉", 酉: "酉", 丑: "酉",
  };
  // 지살 시작점 = 旺地의 역마지 (삼합국의 첫 글자)
  const jisalStart: Record<string, string> = {
    子: "申",
    卯: "亥",
    午: "寅",
    酉: "巳",
  };
  const wang = samhap[dayBranch];
  const start = jisalStart[wang];
  const startIdx = BRANCHES.indexOf(start as any);
  const targetIdx = BRANCHES.indexOf(targetBranch as any);
  const diff = (targetIdx - startIdx + 12) % 12;
  return SHINSAL_FROM_JISAL[diff];
}

// ===== 대운 =====

export interface DaeunInfo {
  /** 대운수 (출생 후 첫 대운 시작 나이) */
  daeunNumber: number;
  /** 순행/역행 */
  forward: boolean;
  /** 10개 대운 (간지 문자열) */
  pillars: string[];
}

export function getDaeun(
  yearStem: string,
  monthPillar: string,
  gender: "male" | "female",
  birthDate: Date,
): DaeunInfo {
  const isYangYear = STEMS.indexOf(yearStem as any) % 2 === 0;
  const isMale = gender === "male";
  const forward = isYangYear === isMale;

  let sIdx = STEMS.indexOf(monthPillar[0] as any);
  let bIdx = BRANCHES.indexOf(monthPillar[1] as any);
  const pillars: string[] = [];
  for (let i = 0; i < 10; i++) {
    if (forward) {
      sIdx = (sIdx + 1) % 10;
      bIdx = (bIdx + 1) % 12;
    } else {
      sIdx = (sIdx - 1 + 10) % 10;
      bIdx = (bIdx - 1 + 12) % 12;
    }
    pillars.push(STEMS[sIdx] + BRANCHES[bIdx]);
  }

  // 대운수 = 절기까지의 일수 / 3
  loadCalendarData();
  const candidates = CALENDAR_DATA!.filter((r) => r.termTime && r.termTime.trim() !== "");
  let nearestDt: Date | null = null;
  for (const r of candidates) {
    if (!MONTHLY_TERMS.has(r.solarTermHanja)) continue;
    const dt = parseTermTime(r.termTime);
    if (!dt) continue;
    if (forward) {
      if (dt.getTime() > birthDate.getTime()) {
        if (!nearestDt || dt.getTime() < nearestDt.getTime()) nearestDt = dt;
      }
    } else {
      if (dt.getTime() < birthDate.getTime()) {
        if (!nearestDt || dt.getTime() > nearestDt.getTime()) nearestDt = dt;
      }
    }
  }
  // 대운수 산출 규칙
  //  · 절기까지의 일수를 3으로 나눠 정수 부분을 취하고
  //  · 나머지 1일 → 절사, 나머지 2일 → 올림 (만세력 관행)
  //  · 1세 미만이면 1로 보정
  //  · 9를 초과하면 9로 보정 (대운수 9 보정 규칙: 어떠한 경우에도 9세를 넘지 않는다)
  let daeunNumber = 1;
  if (nearestDt) {
    const diffDays = Math.abs(nearestDt.getTime() - birthDate.getTime()) / 86400000;
    const whole = Math.floor(diffDays / 3);
    const remainder = diffDays - whole * 3;
    daeunNumber = remainder >= 2 ? whole + 1 : whole;
    if (daeunNumber < 1) daeunNumber = 1;
    if (daeunNumber > 9) daeunNumber = 9;
  }

  return { daeunNumber, forward, pillars };
}

// ===== 메인 계산 =====

export interface SajuInput {
  /** 양력 기준 (음력 입력은 미리 변환되어야 함) */
  year: number;
  month: number;
  day: number;
  /** 0~23 (한국표준시 KST 기준; 동경시/섬머타임 보정은 호출자가 처리) */
  hour: number | null;
  minute: number | null;
  gender: "male" | "female";
}

export interface SajuPillar {
  stem: string;
  branch: string;
  stemKr: string;
  branchKr: string;
  stemElement: string;
  branchElement: string;
  hiddenStems: string[];
  shinsal: string;
  /** 일간 기준 천간의 육친(십성). 일주 자신은 "일간(아신)". */
  tenGod: string;
  /** 지장간 각각의 육친(정기/중기/여기 순, hiddenStems와 인덱스 대응) */
  hiddenTenGods: string[];
  /** 지지 자체(정기 기준)의 육친 — 바탕 정보(팩트). 예: 일간 甲 기준 丑→정재 */
  branchTenGod: string;
  /** 지장간 각각이 그 지지에서 갖는 12운성(화토동근 기준, hiddenStems와 인덱스 대응) */
  hiddenStages: string[];
  /** 천간이 자기 지지에서 갖는 12운성(화토동근 기준) */
  twelveStage: string;
  /** 12운성 기세 힌트: 강/약/미묘 */
  stageVitality: string;
}

export interface SajuResult {
  input: SajuInput;
  /** 시 모름 여부 */
  unknownHour: boolean;
  pillars: {
    year: SajuPillar;
    month: SajuPillar;
    day: SajuPillar;
    hour: SajuPillar | null;
  };
  daeun: DaeunInfo;
  /** 60갑자 표기 (가독성용) */
  display: string;
}

export function calculateSaju(input: SajuInput): SajuResult {
  loadCalendarData();
  const { year, month, day, gender } = input;

  const row = getRow(year, month, day);
  if (!row) {
    throw new Error(`만세력 데이터에서 해당 날짜를 찾을 수 없습니다: ${year}-${month}-${day}`);
  }

  const yearPillar = row.yearPillar;
  const dayPillar = row.dayPillar;

  // 월주: 절기 보정
  const hourForTerm = input.hour ?? 12;
  const minuteForTerm = input.minute ?? 0;
  const monthPillar = getMonthPillarConsideringTerm(year, month, day, hourForTerm, minuteForTerm) || row.monthPillar;

  // 시주
  let hourPillar: string | null = null;
  if (input.hour !== null && input.hour !== undefined) {
    const dayStem = dayPillar[0];
    const hStem = getHourStem(dayStem, input.hour, input.minute ?? 0);
    const hBranch = getHourBranch(input.hour, input.minute ?? 0);
    hourPillar = hStem + hBranch;
  }

  const dayBranch = dayPillar[1];

  const dayStemForGod = dayPillar[0];
  const buildPillar = (gz: string, isDay: boolean): SajuPillar => {
    const stem = gz[0];
    const branch = gz[1];
    const hidden = HIDDEN_STEMS[branch] ?? [];
    return {
      stem,
      branch,
      stemKr: STEM_KR[stem] ?? "",
      branchKr: BRANCH_KR[branch] ?? "",
      stemElement: STEM_ELEMENT[stem] ?? "",
      branchElement: BRANCH_ELEMENT[branch] ?? "",
      hiddenStems: hidden,
      shinsal: getShinsal(dayBranch, branch),
      tenGod: isDay ? "일간(아신)" : getTenGod(dayStemForGod, stem),
      hiddenTenGods: hidden.map((h) => getTenGod(dayStemForGod, h)),
      branchTenGod: getBranchTenGod(dayStemForGod, branch),
      hiddenStages: hidden.map((h) => getTwelveStage(h, branch)),
      twelveStage: getTwelveStage(stem, branch),
      stageVitality: getStageVitality(getTwelveStage(stem, branch)),
    };
  };

  const yearP = buildPillar(yearPillar, false);
  const monthP = buildPillar(monthPillar, false);
  const dayP = buildPillar(dayPillar, true);
  const hourP = hourPillar ? buildPillar(hourPillar, false) : null;

  // 대운 계산
  const birthDate = new Date(
    Date.UTC(year, month - 1, day, (input.hour ?? 12) - 9, input.minute ?? 0),
  );
  const daeun = getDaeun(yearPillar[0], monthPillar, gender, birthDate);

  const display = hourPillar
    ? `${yearPillar} ${monthPillar} ${dayPillar} ${hourPillar}`
    : `${yearPillar} ${monthPillar} ${dayPillar} (시 모름)`;

  return {
    input,
    unknownHour: input.hour === null || input.hour === undefined,
    pillars: { year: yearP, month: monthP, day: dayP, hour: hourP },
    daeun,
    display,
  };
}

/**
 * 사람이 읽기 쉬운 텍스트 요약 - LLM 프롬프트에 주입할 형태.
 */
export function formatSajuForPrompt(r: SajuResult): string {
  const lines: string[] = [];
  const isMale = r.input.gender === "male";
  lines.push(`【★내담자 성별: ${isMale ? "남자(남명)" : "여자(여명)"} — 코드 확정값, 절대 반대로 읽지 말 것】`);
  lines.push(`- 이 명은 ${isMale ? "남명이다. 자식=관성, 배우자(처)=재성" : "여명이다. 자식=식상, 배우자(남편)=관성"}으로 본다. 성별을 반대로 둘러 ${isMale ? "'여명'" : "'남명'"} 운운하면 명백한 오류다.`);
  lines.push("【사주팔자】");
  const cols = ["year", "month", "day", "hour"] as const;
  const labels: Record<string, string> = { year: "연주", month: "월주", day: "일주", hour: "시주" };
  // 가로 표기로 정리 (LLM 가독성)
  for (const c of cols) {
    const p = r.pillars[c];
    if (!p) {
      lines.push(`- ${labels[c]}: (시 모름)`);
      continue;
    }
    // 지장간: 각 글자마다 (육친, 그 지지에서의 12운성)을 함께 표기 — 사실값(팩트)
    const hiddenWithGod = (p.hiddenStems ?? [])
      .map((h, i) => `${h}(${(p.hiddenTenGods ?? [])[i] || "-"}·12운성 ${(p.hiddenStages ?? [])[i] || "-"})`)
      .join("·");
    // 지지 자체 육친(바탕 정보) — 지지 정기로 '드러난' 육친임을 명시(지장간 잠복과 혼동 금지)
    const branchGodStr = p.branchTenGod
      ? `, ★지지정기로 드러난 육친:${p.branchTenGod}(=${p.branch}지가 바탕에 깔고 있는 기운, 지장간 잠복이 아님)`
      : "";
    lines.push(
      `- ${labels[c]}: ${p.stem}${p.branch} (${p.stemKr}${p.branchKr}, 천간오행:${p.stemElement}/지지오행:${p.branchElement}, 천간육친:${p.tenGod}${branchGodStr}, 12운성:${p.twelveStage}(기세 ${p.stageVitality}), 참고용 지장간:${hiddenWithGod}, 12신살:${p.shinsal})`,
    );
  }
  lines.push(`- 일간(나 자신): ${r.pillars.day.stem}(${r.pillars.day.stemKr}, ${r.pillars.day.stemElement}) — 사주 전체를 체감하는 기준점(개수에 포함하지 말 것)`);
  lines.push("");

  // ===== 조후(월령) — 가장 먼저 볼 재료 =====
  const dayEl = r.pillars.day.stemElement;
  const monthBr = r.pillars.month.branch;
  const ms = getMonthlyStatus(dayEl, monthBr);
  lines.push("【조후 — 월령(계절)과 일간의 관계: 가장 먼저 볼 것】");
  lines.push(`- 일간 ${r.pillars.day.stem}(${dayEl})이 월지 ${monthBr}(${ms.season})을 만남 → ${ms.status} (${ms.note})`);
  lines.push("- 해석 지침: 개수를 세지 말고, 먼저 일간이 계절 속에서 강한지/약한지를 보고, 그 일간이 무엇을 반기고 무엇이 부담인지(난강망적 조후)를 먼저 판단한다.");
  lines.push("- ★이 계절의 일간에게 먹고사는 물 같은 절실한 기운은 한 점·약하게·구석(시지 등)에 있어도 귀물이다. 양·위치만 보고 '적다·덕이 박하다'로 끝내지 말고, 그럴 때는 그 기운·육친의 귀함·고마움을 반드시 짚는다.");
  lines.push("");

  // ===== 육친 드러남 층위 — 개수가 아닌 정성적 무게 =====
  const pillarsArr = [r.pillars.year, r.pillars.month, r.pillars.day, r.pillars.hour].filter(
    (p): p is SajuPillar => !!p,
  );
  const layers = analyzeRevealLayers(pillarsArr);
  // 각 카테고리가 '어느 자리에서' 드러났는지 구체 위치를 수집(천간 투출·지지 정기) — AI 오판 방지
  const posLabel: Record<string, string> = { year: "연", month: "월", day: "일", hour: "시" };
  const cat = (g: string) => getTenGodCategory(g);
  const stemSites: Record<string, string[]> = {};
  const branchSites: Record<string, string[]> = {};
  for (const c of cols) {
    const p = r.pillars[c];
    if (!p) continue;
    if (p.tenGod && p.tenGod !== "일간(아신)") {
      const k = cat(p.tenGod);
      if (k) (stemSites[k] ??= []).push(`${posLabel[c]}간 ${p.stem}(${p.tenGod})`);
    }
    if (p.branchTenGod) {
      const k = cat(p.branchTenGod);
      if (k) (branchSites[k] ??= []).push(`${posLabel[c]}지 ${p.branch}(${p.branchTenGod})`);
    }
  }
  lines.push("【육친 드러남 층위 — 개수를 세지 말 것. 드러난 자리로 무게를 다르게 판단】");
  lines.push("- 원칙: 같은 육친이라도 천간에 투출했으면 또렷이 쓰는 무기(무겁다), 지지 정기로 드러나면 바탕에 깔림(중간), 지장간에만 숨었으면 평소엔 잠재·복병(가볍다). 지장간에만 있는 육친을 '많다'고 말하지 말 것 — '잠겨 있다 / 형충이 와야 깨어난다'로 읽는다.");
  lines.push("- ★중요: 아래에서 '지지 정기'로 표기된 육친은 지지가 바탕에 깔고 있는 「드러난」 기운이다. 절대 '지장간에만 숨어있다'고 말하면 안 된다. 관성·재성 등이 지지 정기로 드러나 있으면 그것은 명확한 현실의 기운이다.");
  for (const L of layers) {
    let tier: string;
    if (L.inStem) {
      const where = (stemSites[L.category] ?? []).join(", ");
      const bwhere = (branchSites[L.category] ?? []).join(", ");
      tier = `천간 투출(드러남·무겁다) — 명시적으로 쓰는 기운 [천간: ${where}${bwhere ? `; 지지 정기에도 드러남: ${bwhere}` : ""}]`;
    } else if (L.inBranch) {
      const bwhere = (branchSites[L.category] ?? []).join(", ");
      tier = `지지 정기로 드러남(바탕에 깔림·중간, 지장간 잠복 아님) [${bwhere}]`;
    } else if (L.hiddenOnly) {
      tier = "지장간에만 잠복(형충 없으면 평소 가볍·복병)";
    } else {
      tier = "없음(원국에 드러나지 않음)";
    }
    lines.push(`- ${L.category}: ${tier}`);
  }
  lines.push("");

  // ===== 현재 나이·현재 대운·현재 세운(코드 확정값) =====
  const now = new Date();
  const nowKst = new Date(now.getTime() + 9 * 3600000);
  const curYear = nowKst.getUTCFullYear();
  // 만 나이(생일 경과 여부 반영)
  const birthY = r.input.year, birthM = r.input.month, birthD = r.input.day;
  let age = curYear - birthY;
  const curM = nowKst.getUTCMonth() + 1;
  const curD = nowKst.getUTCDate();
  if (curM < birthM || (curM === birthM && curD < birthD)) age -= 1;
  // 현재 세운(올해 간지): ★ 입춘 세수 보정 — 산식 대신 만세력 CSV 기준.
  // 1~입춘 전에 상담하면 사주상 올해는 아직 전년 간지이므로 자동 보정된다.
  const sajuYearNow = getCurrentSajuYear(nowKst);
  const curSewoon = sajuYearNow.ganji;
  // 세운 사슬 전개의 기준점: 올해(사주연도) 간지 인덱스 / 사주연도 번호
  const baseGanjiIdx = sajuYearNow.ganjiIndex;
  const baseSajuYearNo = sajuYearNow.sajuYearNo;
  // 세는나이(한국식) = 사주연도 - 출생연도 + 1. 대운 구간 판정은 이 세는나이 기준
  // (입춘 보정된 사주연도를 써야 세운 표의 '당시 대운'과 완전히 일치한다).
  const countAge = baseSajuYearNo - birthY + 1;
  // 현재 대운 구간 찾기: daeunNumber세~ 구간, 10년 단위
  let curDaeunIdx = -1;
  for (let i = 0; i < r.daeun.pillars.length; i++) {
    const startAge = r.daeun.daeunNumber + i * 10;
    const endAge = startAge + 9;
    if (countAge >= startAge && countAge <= endAge) { curDaeunIdx = i; break; }
  }
  // 첫 대운 시작 전(countAge < daeunNumber)이면 원국운(대운 전) 상태

  // ===== 형충(刑沖) 사실값 — 원국 + 대운·세운 인동(引動) =====
  // 현재 대운 지지 추출 (간지 마지막 글자)
  let curDaeunBranch: string | null = null;
  if (curDaeunIdx >= 0) {
    const daeunGanji = r.daeun.pillars[curDaeunIdx];
    curDaeunBranch = daeunGanji ? daeunGanji[daeunGanji.length - 1] : null;
  }
  // 세운 지지: curSewoon 마지막 글자
  const curSewoonBranch: string | null = curSewoon ? curSewoon[curSewoon.length - 1] : null;

  // 원국 4지지 + 대운(인덱스4) + 세운(인덱스5)
  const branchSeqFull = [
    r.pillars.year?.branch ?? null,
    r.pillars.month?.branch ?? null,
    r.pillars.day?.branch ?? null,
    r.pillars.hour?.branch ?? null,
    curDaeunBranch,
    curSewoonBranch,
  ];
  const POS_LABEL_EXT = ["연", "월", "일", "시", "대운", "세운"];
  const relationsAll = findBranchRelationsExt(branchSeqFull, POS_LABEL_EXT);

  // 원국끼리 vs 대운·세운 인동 분리
  const origLabels = new Set(["연", "월", "일", "시"]);
  const relOrig = relationsAll.filter(rel =>
    rel.positions.every(p => origLabels.has(p))
  );
  const relInDong = relationsAll.filter(rel =>
    rel.positions.some(p => p === "대운" || p === "세운")
  );

  lines.push("【형·충 — 지지가 흔들리는 지점(사실값). 좋다/나쁘다 단정 금지, 양면으로 읽을 것】");
  if (relOrig.length === 0) {
    lines.push("- 원국 지지의 형·충 없음(운에서 들어올 때 비로소 흔들림). 안정적이나 변화·전환의 계기는 운에서 온다.");
  } else {
    for (const rel of relOrig) {
      lines.push(`- ${rel.note}`);
    }
    lines.push("- 해석 지침: 충은 '뒤바꾸는·변화에 능한' 기질(재주 많음 ↔ 진득함 부족, 양면 함께). 형은 '비틀어 보는·왜곡된' 결 — 형 맞은 육친을 정석이 아닌 방식으로 쓴다(예: 관이 형 → 권력·생사여탈·별정직 계열). 개고(진술축미)는 잠겼던 지장간이 터져나와 발현되거나 깨지는 틈 — 그 양면을 함께 읽는다.");
  }
  if (relInDong.length > 0) {
    lines.push("");
    lines.push("【대운·세운 인동(引動) — 지금 운이 원국의 무엇을 건드리는가(코드 계산값)】");
    lines.push("- 인동 원칙: 대운·세운의 형충회합은 원국에 잠재된 가능성을 — 좋든 나쁘든 — 불러일으키는(引動) 작용이다. 운 자체가 길흉을 만드는 것이 아니라, 원국에 이미 있던 것을 드러낸다.");
    for (const rel of relInDong) {
      lines.push(`- ${rel.note}`);
    }
  }
  lines.push("");

  lines.push("【대운 — 코드 확정값. 절대 임의로 다른 대운을 현재로 읽지 말 것】");
  lines.push(`- 대운수: ${r.daeun.daeunNumber}세 시작, ${r.daeun.forward ? "순행" : "역행"}`);
  for (let i = 0; i < r.daeun.pillars.length; i++) {
    const sAge = r.daeun.daeunNumber + i * 10;
    const mark = i === curDaeunIdx ? "  ← ★현재 대운(지금 이 구간)" : "";
    lines.push(`  · ${sAge}세~${sAge + 9}세: ${r.daeun.pillars[i]}${mark}`);
  }
  lines.push("");
  const moment = getCurrentMoment(nowKst);
  lines.push("【현재 시점 — 코드 확정값(반드시 이 값만 사용, 추정 금지). 입춘 세수·적용 절기 시각은 한국천문연구원(KASI) 기준】");
  lines.push(`- 지금(한국 표준시, 서버 기준): ${moment.year}년 ${moment.month}월 ${moment.day}일 (${moment.weekdayKr}요일) ${moment.timeStr}`);
  lines.push(`- 오늘의 일진(일주): ${moment.dayGanji}(${moment.dayGanjiKr}) / 지금 시진: ${moment.hourBranchLabel}, 시주 ${moment.hourGanji}(${moment.hourGanjiKr})`);
  if (sajuYearNow.beforeIpchun) {
    lines.push(`- ★ 사주상 올해 = ${baseSajuYearNo}년 ${curSewoon}년. (지금은 달력으로 ${sajuYearNow.calendarYear}년 초이지만 아직 입춘 전이라 사주의 해는 바뀌지 않았다 — 입춘세수.)`);
    if (sajuYearNow.isIpchunDay) {
      lines.push(`- ⚠ 오늘은 마침 입춘 당일이라 하루 안에서 세운이 바뀐다. 시점이 애매하면 고객에게 현재 날짜·시각을 정중히 확인한다.`);
    }
  } else {
    lines.push(`- ★ 사주상 올해 = ${baseSajuYearNo}년 ${curSewoon}년(사주연도 = 달력연도).`);
  }
  lines.push(`- 내담자 나이: 만 ${age}세(세는나이 ${countAge}세)`);
  if (curDaeunIdx >= 0) {
    const sAge = r.daeun.daeunNumber + curDaeunIdx * 10;
    lines.push(`- ★ 현재 대운: ${r.daeun.pillars[curDaeunIdx]} (${sAge}세~${sAge + 9}세 구간). 이 외의 다른 간지를 "현재 대운"라고 말하면 안 된다.`);
  } else {
    lines.push(`- ★ 현재 대운: 아직 첫 대운(${r.daeun.daeunNumber}세) 시작 전 구간 — 원국(월주) 기준으로 볼 것.`);
  }

  // ===== 세운 사슬(과거 30년 ~ 미래 30년) — 코드 확정값 =====
  // 간지 오독(머릿속 계산으로 인한 환각)을 원천 차단하기 위해, 연도별 세운 간지를
  // 그 해의 세는나이·해당 대운 구간과 함께 표로 미리 깔아준다. LLM은 이 표의 값만 사용한다.
  // ★ 기준은 '사주연도'(입춘 보정)이다. 올해 간지(baseGanjiIdx)에서 상대 회전으로 전개한다.
  lines.push("");
  lines.push("【세운 사슬 — 코드 확정값(과거 30년 ~ 미래 30년, 사주연도·입춘세수 기준). 연도·간지·라벨(올해/내년/작년 등)은 반드시 이 표의 값을 그대로 인용하고, 머릿속으로 다시 계산하지 말 것】");
  for (let y = -30; y <= 30; y++) {
    // 사주연도 번호와 간지를 함께 차근으로 전개 (둘 다 올해 기준점에서 ±y)
    const sajuYr = baseSajuYearNo + y;
    const sw = baseGanjiIdx >= 0
      ? indexToGanji(baseGanjiIdx + y)
      : `${STEMS[((sajuYr - 1984) % 60 + 60) % 60 % 10]}${BRANCHES[((sajuYr - 1984) % 60 + 60) % 60 % 12]}`;
    // 그 해 세는나이(한국식, 사주연도 기준): 그 해 - 출생연도 + 1
    const ageThatYear = sajuYr - birthY + 1;
    // 그 해에 해당하는 대운 구간 찾기(세는나이 기준)
    let dIdx = -1;
    for (let i = 0; i < r.daeun.pillars.length; i++) {
      const s = r.daeun.daeunNumber + i * 10;
      if (ageThatYear >= s && ageThatYear <= s + 9) { dIdx = i; break; }
    }
    const daeunStr = dIdx >= 0 ? r.daeun.pillars[dIdx] : `대운 전(원국)`;
    let tag = "";
    if (y === 0) tag = "  ← 올해";
    else if (y === 1) tag = "  ← 내년";
    else if (y === 2) tag = "  ← 내후년";
    else if (y === -1) tag = "  ← 작년";
    else if (y === -2) tag = "  ← 재작년";
    // 출생 이전 연도(태어나기 전)는 건너뛴다
    if (ageThatYear < 1) continue;
    lines.push(`  · ${sajuYr}년: 세운 ${sw} / 세는나이 ${ageThatYear}세 / 당시 대운 ${daeunStr}${tag}`);
  }
  lines.push("- 연도 표기는 사주연도(입춘세수) 기준이다. 입춘 전 몇 주 구간이라면 달력 연도와 한 칸 다를 수 있으니, 시점이 애매하면 고객에게 현재 날짜를 확인한다.");
  lines.push("- 활용: 운을 볼 때 위 '세운 간지'와 '당시 대운'을 원국 글자와 나란히 놓고, 합·충·12운성 등의 상호작용을 살펴 흐름을 읽는다. 단, 어느 해의 간지든 위 표에 적힌 글자만 쓰고 임의로 다른 간지를 지어내지 않는다.");
  return lines.join("\n");
}
