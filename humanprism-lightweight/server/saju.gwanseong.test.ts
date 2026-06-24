import { describe, it, expect } from "vitest";
import {
  calculateSaju,
  formatSajuForPrompt,
  analyzeRevealLayers,
  getBranchTenGod,
  type SajuPillar,
} from "./saju";

/**
 * 회귀 테스트: 배영미(1973-09-04 戌시, 여) = 癸丑 庚申 癸卯 壬戌
 * 일간 癸(水,음) 기준으로 관성이 지지 정기(연지 丑=편관, 시지 戌=정관)로 '드러나' 있어야 한다.
 * 과거 버그: AI가 이 관성을 "지장간에만 숨어있다"고 오판 → 출력 텍스트가 지지 정기 드러남을
 * 명확히 표기하는지 보장한다.
 */
describe("배영미 사주 — 관성 지지정기 드러남(오판 방지)", () => {
  const result = calculateSaju({
    year: 1973,
    month: 9,
    day: 4,
    hour: 20,
    minute: 0,
    gender: "female",
  });

  it("명식이 癸丑 庚申 癸卯 壬戌 이어야 한다", () => {
    expect(result.display).toBe("癸丑 庚申 癸卯 壬戌");
  });

  it("지지 정기 육친: 일간 癸 기준 丑=편관, 戌=정관(관성)", () => {
    expect(getBranchTenGod("癸", "丑")).toBe("편관");
    expect(getBranchTenGod("癸", "戌")).toBe("정관");
  });

  it("각 기둥의 branchTenGod이 정확히 채워진다", () => {
    expect(result.pillars.year.branchTenGod).toBe("편관"); // 丑
    expect(result.pillars.hour?.branchTenGod).toBe("정관"); // 戌
  });

  it("analyzeRevealLayers: 관성은 inBranch=true, hiddenOnly=false 여야 한다", () => {
    const arr = [
      result.pillars.year,
      result.pillars.month,
      result.pillars.day,
      result.pillars.hour,
    ].filter((p): p is SajuPillar => !!p);
    const layers = analyzeRevealLayers(arr);
    const gwan = layers.find((l) => l.category === "관성");
    expect(gwan).toBeDefined();
    expect(gwan!.inBranch).toBe(true);
    expect(gwan!.hiddenOnly).toBe(false);
  });

  it("프롬프트 텍스트: 관성이 '지지 정기로 드러남'으로 표기되고 '지장간 잠복'으로 격하되지 않는다", () => {
    const text = formatSajuForPrompt(result);
    // 관성 줄이 지지 정기 드러남으로 표기됨
    expect(text).toMatch(/관성: 지지 정기로 드러남/);
    // 위치(연지 丑·시지 戌)가 명시됨
    expect(text).toContain("연지 丑(편관)");
    expect(text).toContain("시지 戌(정관)");
    // 관성을 hiddenOnly(지장간에만 잠복)로 표기하면 안 됨
    expect(text).not.toMatch(/관성: 지장간에만 잠복/);
  });

  it("기둥 줄에 '지지정기로 드러난 육친' 표기가 포함된다", () => {
    const text = formatSajuForPrompt(result);
    expect(text).toContain("지지정기로 드러난 육친:편관");
    expect(text).toContain("지지정기로 드러난 육친:정관");
  });
});
