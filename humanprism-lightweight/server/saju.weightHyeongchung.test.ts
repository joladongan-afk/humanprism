/**
 * 형충(刑沖) 사실값 + 육친 드러남 층위(정성적 무게) 검증.
 *
 * 마스터 관법의 핵심을 코드로 못박는다:
 *  - 육친을 "개수"로 세지 않는다. 드러난 층위(천간 투출 > 지지 정기 > 지장간 잠복)로만 무게를 본다.
 *  - 지장간에만 숨은 육친은 "많다"가 아니라 "잠겨 있다"(hiddenOnly)로 잡힌다.
 *  - 형/충은 6충·삼형·상형·자형으로 나뉘고, 거리(인접/원격)·개고(진술축미)만 사실값으로 표기한다.
 */
import { describe, it, expect } from "vitest";
import {
  findBranchRelations,
  analyzeRevealLayers,
  type SajuPillar,
} from "./saju";

/** 테스트용 최소 SajuPillar 팩토리 (검증에 필요한 필드만 채운다) */
function pillar(partial: Partial<SajuPillar>): SajuPillar {
  return {
    stem: "甲",
    branch: "子",
    stemKr: "갑",
    branchKr: "자",
    stemElement: "木",
    branchElement: "水",
    hiddenStems: [],
    shinsal: "",
    tenGod: "",
    hiddenTenGods: [],
    branchTenGod: "",
    hiddenStages: [],
    twelveStage: "",
    stageVitality: "",
    ...partial,
  };
}

describe("findBranchRelations — 형충 사실값", () => {
  it("巳-亥 6충을 인접/원격 구분하여 잡는다", () => {
    // 연 巳, 월 亥 → 인접 충
    const adj = findBranchRelations(["巳", "亥", "子", "卯"]);
    const chung = adj.find((r) => r.type === "충");
    expect(chung).toBeDefined();
    expect(chung!.branches.sort()).toEqual(["亥", "巳"].sort());
    expect(chung!.adjacent).toBe(true);

    // 연 巳, 시 亥 → 원격 충 (거리 3)
    const far = findBranchRelations(["巳", "子", "卯", "亥"]);
    const farChung = far.find((r) => r.type === "충");
    expect(farChung).toBeDefined();
    expect(farChung!.adjacent).toBe(false);
  });

  it("辰-戌 충은 진술축미 개고로 표기된다", () => {
    const rels = findBranchRelations(["辰", "戌", "子", "卯"]);
    const chung = rels.find((r) => r.type === "충");
    expect(chung).toBeDefined();
    expect(chung!.opensTomb).toBe(true);
  });

  it("子-午 충은 개고가 아니다(4고 글자 없음)", () => {
    const rels = findBranchRelations(["子", "午", null, null]);
    const chung = rels.find((r) => r.type === "충");
    expect(chung).toBeDefined();
    expect(chung!.opensTomb).toBe(false);
  });

  it("인사신 삼형이 모두 모이면 삼형 완성으로 잡힌다", () => {
    const rels = findBranchRelations(["寅", "巳", "申", null]);
    const sam = rels.find((r) => r.type === "삼형");
    expect(sam).toBeDefined();
    expect(sam!.branches.sort()).toEqual(["寅", "巳", "申"].sort());
  });

  it("자묘 상형을 잡는다", () => {
    const rels = findBranchRelations(["子", "卯", null, null]);
    const sang = rels.find((r) => r.type === "상형");
    expect(sang).toBeDefined();
  });

  it("같은 글자(午午) 자형을 잡는다", () => {
    const rels = findBranchRelations(["午", "午", null, null]);
    const ja = rels.find((r) => r.type === "자형");
    expect(ja).toBeDefined();
  });

  it("巳·巳·戌·子 (정사·을사·갑술·갑자 지지)에는 충/상형/삼형 완성이 없다", () => {
    // 巳-戌, 巳-子, 戌-子 어느 것도 6충/상형/삼형 쌍이 아니다.
    // 巳가 둘이지만 自刑 글자(辰午酉亥)가 아니므로 자형도 아니다.
    const rels = findBranchRelations(["巳", "巳", "戌", "子"]);
    expect(rels.length).toBe(0);
  });
});

describe("analyzeRevealLayers — 육친 드러남 층위(개수 아님)", () => {
  // 정사(丁巳)·을사(乙巳)·갑술(甲戌)·갑자(甲子), 일간 甲木.
  // 갑목 기준 관성 = 金(편관 庚 / 정관 辛).
  // 천간: 丁(상관)·乙(겁재)·甲(일간)·甲(비견) → 金 천간 없음.
  // 지지 정기: 巳(丙→식신)·巳(丙→식신)·戌(戊→편재)·子(癸→정인) → 金 정기 없음.
  // 지장간: 巳중 庚(편관), 戌중 辛(정관) → 관성은 지장간에만 숨어 있다.
  const pillars: SajuPillar[] = [
    pillar({ stem: "丁", branch: "巳", tenGod: "상관", branchTenGod: "식신", hiddenTenGods: ["식신", "편재", "편관"] }), // 巳: 丙(식신)·戊(편재)·庚(편관)
    pillar({ stem: "乙", branch: "巳", tenGod: "겁재", branchTenGod: "식신", hiddenTenGods: ["식신", "편재", "편관"] }),
    pillar({ stem: "甲", branch: "戌", tenGod: "일간(아신)", branchTenGod: "편재", hiddenTenGods: ["편재", "상관", "정관"] }), // 戌: 戊(편재)·丁(상관)·辛(정관)
    pillar({ stem: "甲", branch: "子", tenGod: "비견", branchTenGod: "정인", hiddenTenGods: ["정인"] }), // 子: 癸(정인)
  ];

  const layers = analyzeRevealLayers(pillars);
  const find = (cat: string) => layers.find((l) => l.category === cat)!;

  it("관성은 천간·지지정기에 없고 지장간에만 잠겨 있다(hiddenOnly)", () => {
    const gwan = find("관성");
    expect(gwan.inStem).toBe(false);
    expect(gwan.inBranch).toBe(false);
    expect(gwan.hiddenOnly).toBe(true);
  });

  it("식상은 지지 정기로 드러나 있다(잠복 아님)", () => {
    const sik = find("식상");
    expect(sik.inBranch).toBe(true);
    expect(sik.hiddenOnly).toBe(false);
  });

  it("재성은 지지 정기로 드러나 있다", () => {
    const jae = find("재성");
    expect(jae.inBranch).toBe(true);
  });

  it("인성은 지지 정기(子중 癸)로 드러나 있다", () => {
    const inSeong = find("인성");
    expect(inSeong.inBranch).toBe(true);
  });

  it("어떤 카테고리도 '개수'를 노출하지 않는다(불리언 3종만 존재)", () => {
    for (const l of layers) {
      expect(Object.keys(l).sort()).toEqual(
        ["category", "hiddenOnly", "inBranch", "inStem"].sort(),
      );
    }
  });
});
