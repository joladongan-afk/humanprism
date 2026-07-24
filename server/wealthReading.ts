/**
 * wealthReading.ts — 재물 중간 판독값 생성 (파일럿)
 * - 단일 십성 사실 하나로 어떤 축도 확정하지 않음
 * - 신강·신약 점수 없음, 격국 명칭 없음, 조후(한난조습) 미판정
 * - 월령 세력 상태(득령/상령/실령)는 "조후"로 표기하지 않음
 * - saju.ts만 import, careerReading.ts 참조 없음
 */

import {
  analyzeRevealLayers, getMonthlyStatus, getTenGod, getTenGodCategory,
  getBranchTenGod, findBranchRelations, HIDDEN_STEMS, STEM_ELEMENT, BRANCH_ELEMENT,
} from "./saju";
import type { SajuResult, SajuPillar } from "./saju";

type Conf = "높음" | "중간" | "낮음" | "판정 불가";
type DaeunState = "기회 확대 가능" | "수입 통로 변화 가능" | "축적 조건 강화 가능"
  | "변동성 확대 가능" | "손실 위험 가능" | "재건 가능" | "판정 불가";

interface SF {  // SinsungFacts
  inStem: boolean; inBranch: boolean; hiddenOnly: boolean; absent: boolean;
  stemCount: number; branchCount: number; hasRoot: boolean; relNotes: string[];
}

interface WF {  // WealthFacts
  j: SF; s: SF; g: SF; i: SF; b: SF;  // 재성/식상/관성/인성/비겁
  monthlyStatus: "득령" | "상령" | "실령";
  linkConf: "충분" | "부분적" | "부족" | "판정 불가";
}

interface AR { summary: string; evidence: string[]; counterEvidence: string[]; conf: Conf; condition: string; }
interface DS { pillar: string; ageRange: [number,number]; state: DaeunState; basis: string[]; }

// ── 사실값 추출 ──
function sf(cat: string, pillars: SajuPillar[], dayStem: string, rels: ReturnType<typeof findBranchRelations>): SF {
  const layers = analyzeRevealLayers(pillars);
  const l = layers.find(x => x.category === cat)!;
  let stemCount = 0, branchCount = 0;
  for (const p of pillars) {
    if (p.tenGod && p.tenGod !== "일간(아신)" && getTenGodCategory(p.tenGod) === cat) stemCount++;
    if (p.branchTenGod && getTenGodCategory(p.branchTenGod) === cat) branchCount++;
  }
  let hasRoot = false;
  if (l.inStem) {
    outer: for (const p of pillars) {
      if (p.tenGod && p.tenGod !== "일간(아신)" && getTenGodCategory(p.tenGod) === cat) {
        const el = STEM_ELEMENT[p.stem] ?? "";
        for (const p2 of pillars) { if (BRANCH_ELEMENT[p2.branch] === el) { hasRoot = true; break outer; } }
      }
    }
  }
  const relNotes: string[] = [];
  for (const r of rels) {
    for (const b of [r.branch1, r.branch2, r.branch3].filter(Boolean) as string[]) {
      if (getTenGodCategory(getBranchTenGod(dayStem, b)) === cat) relNotes.push(`${b}(${r.type})`);
    }
  }
  return { inStem: l.inStem, inBranch: l.inBranch, hiddenOnly: l.hiddenOnly && !l.inStem && !l.inBranch,
           absent: !l.inStem && !l.inBranch && !l.hiddenOnly, stemCount, branchCount, hasRoot, relNotes: [...new Set(relNotes)] };
}

function linkConf(s: SF, j: SF): WF["linkConf"] {
  if (s.absent || j.absent) return "판정 불가";
  if (s.inStem && j.inStem) return (s.relNotes.length + j.relNotes.length) > 0 ? "부분적" : "충분";
  if (s.inStem || j.inStem) return "부분적";
  return "부족";
}

// ── 공통 AR 생성 헬퍼 ──
function ar(ev: string[], cev: string[], summary: string, conf: Conf, condition = ""): AR {
  if (ev.length === 0) return { summary: "계산값만으로 판단하기 어렵습니다", evidence: [], counterEvidence: [], conf: "판정 불가", condition: "" };
  return { summary, evidence: ev, counterEvidence: cev, conf, condition };
}

// ── 여섯 축 ──
function desire(f: WF): AR {
  const ev: string[] = [], cev: string[] = [];
  if (f.j.inStem) ev.push("재성 천간투출 — 돈에 대한 관심이 외부로 드러나는 구조");
  else if (f.j.inBranch) ev.push("재성 지지정기 — 관심은 있으나 드러내지 않는 경향");
  else if (f.j.hiddenOnly) ev.push("재성 지장간만 — 돈 욕망이 잠재적 상태");
  else { ev.push("원국 재성 부재 — 관성·비겁 등 다른 동기로 재물 활동"); }
  if (f.b.inStem && f.j.absent) ev.push("비겁 강세+무재 — 경쟁·실행 동기가 앞서는 가능성");
  if (f.g.inStem) cev.push("관성 강세 — 돈보다 지위·인정이 더 강한 동기일 수 있음");
  return ar(ev, cev,
    f.j.inStem ? "돈에 대한 관심이 행동으로 드러나는 구조입니다"
    : f.j.absent ? "돈 자체보다 다른 동기가 재물 활동의 원동력일 수 있습니다"
    : "돈에 대한 관심이 내부에 있으나 강하게 드러나지 않는 경향입니다",
    ev.length >= 2 ? "중간" : "낮음",
    "대운 재성 진입 시 욕망과 관심이 표면화될 수 있음");
}

function sense(f: WF): AR {
  const ev: string[] = [], cev: string[] = [];
  if (f.linkConf === "충분") ev.push(f.s.inStem && f.j.inStem ? "식상·재성 모두 천간투출 — 기회 감지와 실현 통로 동시 존재" : "식상→재성 연결 충분");
  else if (f.linkConf === "부분적") ev.push("식상→재성 연결 부분적 — 감각은 있으나 실현 통로 약함");
  if (f.s.absent) cev.push("식상 부재 — 기회 감지 통로 약함");
  if ((f.s.relNotes.length + f.j.relNotes.length) > 0) cev.push("형충합 관계로 통로 손상 가능");
  return ar(ev, cev,
    f.linkConf === "충분" ? "돈의 흐름과 기회를 읽는 감각이 행동으로 연결되는 구조입니다"
    : "어느 정도 감각은 있으나 실현 조건에 따라 달라집니다",
    ev.length >= 2 ? "중간" : "낮음",
    "식상·재성 대운 겹칠 때 감각이 실제 수입으로 연결될 가능성 확대");
}

function acquisition(f: WF): AR {
  const ev: string[] = [], cev: string[] = [];

  // primaryIncomeChannel: 반복적·지속적으로 생활 기반을 만드는 통로
  // 관성/인성/비겁/식상/재성 모두 수입 통로 후보 — 어느 것이든 작동하면 생활 기반 가능
  const primary: string[] = [];
  if (f.g.inStem) primary.push("관성 천간투출 — 조직·직위·권한 기반 수입");
  else if (f.g.inBranch) primary.push("관성 지지정기 — 역할·책임 기반 수입 기반");
  if (f.i.inStem) primary.push("인성 천간투출 — 자격·전문성·기술 기반 수입");
  if (f.s.inStem && f.j.inStem) primary.push("식상+재성 천간투출 — 생산·영업·거래 기반 수입");
  else if (f.s.inStem) primary.push("식상 천간투출 — 표현·성과·기술 기반 수입");
  if (f.j.inStem && !f.s.inStem) primary.push("재성 천간투출 — 거래·사업 기반 수입");
  if (f.b.inStem && primary.length === 0) primary.push("비겁 강세 — 독립 실행·경쟁·인맥 기반 수입");
  if (primary.length === 0) primary.push("원국 투출 기준 주된 통로 불명확 — 대운 흐름 확인 필요");
  ev.push(...primary);

  // expansionIncomeChannel: 기존 수입을 넘어 재물 규모를 키울 통로
  // primary와 같을 수도 다를 수도 있음 — 다를 때만 별도 표기
  const expansion: string[] = [];
  if (f.j.inStem && f.j.hasRoot && !f.g.inStem) expansion.push("재성 천간투출+통근 — 거래·자산 운용으로 규모 확장 가능");
  if (f.g.inStem && (f.j.inBranch || f.j.inStem)) expansion.push("관성+재성 조합 — 직위·권한이 사업·지분 기회로 연결 가능");
  if (f.linkConf === "충분" && f.b.inStem) expansion.push("식상→재성+비겁 — 독립·실행 기반 확장 통로");
  // primary와 expansion이 사실상 동일하면 생략
  const sameChannel = primary.length > 0 && expansion.length > 0 &&
    primary.some(p => expansion.some(e => p.slice(0,4) === e.slice(0,4)));
  if (!sameChannel && expansion.length > 0) ev.push(...expansion.map(e => `(확장) ${e}`));

  if (f.monthlyStatus !== "실령") ev.push(`월령 ${f.monthlyStatus} — 일간 활동 기반 안정`);
  else cev.push("월령 실령 — 일간 기운이 계절에서 지지받지 못함");
  if (f.j.relNotes.length > 0) cev.push(`재성 형충: ${f.j.relNotes.join(",")} — 수입 불안정 가능`);

  return ar(ev, cev, "생활 기반 수입 통로와 재물 확장 통로를 구분해 판독했습니다",
    ev.length >= 2 ? "중간" : "낮음", "대운에서 관성·재성·식상 진입 시 통로 전환 또는 확장 가능");
}

function accumulation(f: WF): AR {
  const ev: string[] = [], cev: string[] = [];
  if (f.j.inStem && f.j.hasRoot) ev.push("재성 천간투출+통근 — 번 돈을 자산으로 정착시키는 구조");
  else if (f.j.inStem) { ev.push("재성 천간투출이나 통근 없음 — 수입은 있어도 자산 정착 불안정 가능"); cev.push("뿌리 없는 천간 재성 — 운 변화에 유동적"); }
  else if (f.j.inBranch) ev.push("재성 지지정기 — 내재된 저축 성향");
  else if (f.j.hiddenOnly) ev.push("재성 지장간만 — 특정 운에서 축적력 활성화");
  else ev.push("원국 재성 부재 — 자연스러운 자산 정착 구조가 원국에 없음");
  if (f.b.inStem && !f.j.absent) cev.push("비겁 천간투출+재성 동시 — 수입 분산 가능성 검토 필요");
  if (f.j.relNotes.length > 0) cev.push(`재성 형충: ${f.j.relNotes.join(",")} — 자산 정착 불안정 신호`);
  const pos = f.j.inStem && f.j.hasRoot;
  return ar(ev, cev,
    pos ? "번 돈을 자산으로 전환하는 구조적 조건이 갖춰져 있습니다"
    : f.j.absent ? "자연스러운 자산 축적 흐름이 원국 구조에서 약하며 대운 보완이 필요합니다"
    : "축적 능력이 일부 있으나 운의 흐름에 따라 달라집니다",
    pos ? "중간" : "낮음", "재성 대운 진입+통근 조건 갖춰질 때 축적력 강화 가능");
}

function expansion(f: WF): AR {
  const ev: string[] = [], cev: string[] = [];
  if (f.linkConf === "충분" && f.b.inStem) ev.push("식상→재성 연결+비겁 실행력 — 규모 확장 기반");
  else if (f.linkConf === "충분") ev.push("식상→재성 연결 충분 — 사업·활동 확장 통로");
  if (f.g.inStem && f.j.inStem) ev.push("관성+재성 천간 동시 투출 — 조직 확장 통한 수입 성장 가능");
  if (f.b.inStem && f.s.inStem) { ev.push("비겁+식상 강세 — 독립·실행 기반 확장 가능성"); if (f.j.absent) cev.push("재성 부재 — 확장 규모를 자산으로 굳히는 구조 약함"); }
  if (f.j.relNotes.length > 0) cev.push(`재성 형충 — 확장 국면 변동성`);
  return ar(ev, cev, "수입과 자산 규모를 키울 수 있는 구조적 신호가 확인됩니다",
    ev.length >= 2 ? "중간" : "낮음", "식상·재성 대운 겹칠 때 실질 확장 기회 가능");
}

function preservation(f: WF): AR {
  const ev: string[] = [], cev: string[] = [];
  if (f.j.inStem && f.j.hasRoot) ev.push("재성 천간투출+통근 — 형성한 자산을 지키는 구조적 기반");
  if (f.j.inBranch && !f.b.inStem) ev.push("재성 지지정기+비겁 약함 — 자산 보존 환경 안정");
  if (f.b.inStem && f.j.inStem && f.j.hasRoot) cev.push("비겁 강세이나 재성 뿌리 있음 — 분산 위협 존재하지만 제한적");
  else if (f.b.inStem && (f.j.absent || f.j.hiddenOnly)) cev.push("비겁 강세+재성 약함/부재 — 형성한 자산이 분산되기 쉬운 구조 신호");
  if (f.j.relNotes.length > 0) cev.push(`재성 형충: ${f.j.relNotes.join(",")} — 자산 보존 불안정 신호`);
  if (ev.length === 0 && f.j.absent && f.b.inStem) ev.push("원국 무재+비겁 강세 — 보존력은 의지와 통제력에 의존");
  if (ev.length === 0 && cev.length === 0) return ar([], [], "", "판정 불가");
  return ar(ev.length > 0 ? ev : [""], cev,
    ev.length > cev.length ? "형성한 자산을 지키는 구조적 조건이 어느 정도 갖춰져 있습니다"
    : "자산 보존에 주의가 필요한 구조적 신호가 있습니다",
    cev.length === 0 ? "중간" : "낮음", "재성 대운+비겁 약화 시기에 보존력 강화, 반대 시기 점검 필요");
}

// ── 대운 상태 판정 ──
function daeunState(pillar: string, dayStem: string, f: WF, prevState: DaeunState | null): DS {
  const stem = pillar[0], branch = pillar[1];
  const sc = getTenGodCategory(getTenGod(dayStem, stem));
  const ms = HIDDEN_STEMS[branch]?.[0] ?? "";
  const bc = ms ? getTenGodCategory(getTenGod(dayStem, ms)) : "";
  const hasJ = sc === "재성" || bc === "재성";
  const hasS = sc === "식상" || bc === "식상";
  const hasB = sc === "비겁" || bc === "비겁";
  const basis: string[] = [];
  const ageRange: [number,number] = [0,0]; // 호출부에서 채움

  if (!hasJ && !hasS && !hasB && sc !== "관성" && bc !== "관성") {
    return { pillar, ageRange, state: "판정 불가", basis: ["재물 관련 신호 없음"] };
  }
  if (hasJ) {
    if (f.j.absent) {
      basis.push(`원국 무재+대운 재성 진입`);
      if (hasB || f.b.inStem) { basis.push("비겁 기운 동반"); return { pillar, ageRange, state: "변동성 확대 가능", basis }; }
      if (prevState === "손실 위험 가능") { basis.push("직전 손실 구간 후"); return { pillar, ageRange, state: "재건 가능", basis }; }
      return { pillar, ageRange, state: "기회 확대 가능", basis };
    }
    if (f.j.inStem) { basis.push("원국 재성 투출+대운 재성 추가"); return { pillar, ageRange, state: "축적 조건 강화 가능", basis }; }
    basis.push("원국 재성 약+대운 재성 진입"); return { pillar, ageRange, state: "수입 통로 변화 가능", basis };
  }
  if (hasB) {
    basis.push(`대운 비겁+원국 재성 ${f.j.absent ? "부재" : "약함"}`);
    return { pillar, ageRange, state: "변동성 확대 가능", basis };
  }
  if (hasS && !f.j.absent) {
    basis.push("대운 식상+원국 재성 존재"); return { pillar, ageRange, state: "수입 통로 변화 가능", basis };
  }
  return { pillar, ageRange, state: "판정 불가", basis: ["단일 신호만으로 판정 불충분"] };
}

// ── 현재 대운 인덱스 ──
function curIdx(saju: SajuResult): number {
  const now = new Date(); const kst = new Date(now.getTime() + 9*3600000);
  const countAge = kst.getUTCFullYear() - saju.input.year + 1;
  for (let i = 0; i < saju.daeun.pillars.length; i++) {
    const s = saju.daeun.daeunNumber + i*10;
    if (countAge >= s && countAge <= s+9) return i;
  }
  return -1;
}

// ── 메인 ──
export function buildWealthReadingBlock(saju: SajuResult | undefined | null): string {
  if (!saju) return "";
  try {
    const all = Object.values(saju.pillars).filter(Boolean) as SajuPillar[];
    if (!all.length) return "";
    const ds = saju.pillars.day?.stem ?? "";
    const rels = findBranchRelations(all.map(p => p.branch));
    const f: WF = {
      j: sf("재성", all, ds, rels), s: sf("식상", all, ds, rels),
      g: sf("관성", all, ds, rels), i: sf("인성", all, ds, rels), b: sf("비겁", all, ds, rels),
      monthlyStatus: getMonthlyStatus(saju.pillars.day?.stemElement ?? "", saju.pillars.month?.branch ?? "").status,
      linkConf: "판정 불가",
    };
    f.linkConf = linkConf(f.s, f.j);

    const axes: [string, AR][] = [
      ["욕망·관심", desire(f)], ["재물 감각", sense(f)], ["획득력", acquisition(f)],
      ["축적력", accumulation(f)], ["확장력", expansion(f)], ["보존력", preservation(f)],
    ];

    const ci = curIdx(saju);
    let cdSeg: DS|null = null, ndSeg: DS|null = null;
    if (ci >= 0) {
      const ca = saju.daeun.daeunNumber + ci*10;
      cdSeg = daeunState(saju.daeun.pillars[ci], ds, f, null);
      cdSeg.ageRange = [ca, ca+9];
      if (ci+1 < saju.daeun.pillars.length) {
        ndSeg = daeunState(saju.daeun.pillars[ci+1], ds, f, cdSeg.state);
        ndSeg.ageRange = [ca+10, ca+19];
      }
    }

    // Claude 전달 블록
    const mk = (c: Conf) => c==="판정 불가"?"??":c==="높음"?"●":c==="중간"?"◐":"○";
    const lines: string[] = ["[재물 중간 판독값]"];
    for (const [label, a] of axes) {
      lines.push(`${label}(${mk(a.conf)}): ${a.summary}`);
      if (a.condition && a.conf !== "판정 불가") lines.push(`  → ${a.condition}`);
    }
    if (cdSeg) lines.push(`현재 대운 ${cdSeg.pillar}(${cdSeg.ageRange[0]}~${cdSeg.ageRange[1]}세): ${cdSeg.state}`);
    if (ndSeg) lines.push(`다음 대운 ${ndSeg.pillar}(${ndSeg.ageRange[0]}~${ndSeg.ageRange[1]}세): ${ndSeg.state}`);
    lines.push("주의: 위 판독값은 계산 근거 요약이다. 여섯 축을 소제목으로 그대로 노출하지 말 것.");

    const full = lines.join("\n");
    if (full.length <= 600) return full;

    // 500자 초과 시 condition 제거
    const short = ["[재물 중간 판독값]",
      ...axes.map(([label, a]) => `${label}(${mk(a.conf)}): ${a.summary}`),
      ...(cdSeg ? [`현재 대운 ${cdSeg.pillar}: ${cdSeg.state}`] : []),
      ...(ndSeg ? [`다음 대운 ${ndSeg.pillar}: ${ndSeg.state}`] : []),
      "주의: 여섯 축을 소제목으로 그대로 노출하지 말 것."
    ].join("\n");
    return short;
  } catch { return ""; }
}
