import { describe, it, expect } from "vitest";
import { STEM_ICONS, BRANCH_ICONS } from "../client/src/lib/glyphIcons";
import { SAMPLE_CHART } from "../client/src/lib/sajuHeroData";

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

describe("glyphIcons mapping", () => {
  it("천간 10종이 모두 등록되어 있다", () => {
    expect(Object.keys(STEM_ICONS).sort()).toEqual([...STEMS].sort());
  });

  it("지지 12종이 모두 등록되어 있다", () => {
    expect(Object.keys(BRANCH_ICONS).sort()).toEqual([...BRANCHES].sort());
  });

  it("모든 천간 아이콘이 /img URL을 가진다", () => {
    for (const key of STEMS) {
      expect(STEM_ICONS[key].url, `천간 ${key}`).toMatch(/^\/img\/.+\.png$/);
    }
  });

  it("모든 지지 아이콘이 /img URL을 가진다", () => {
    for (const key of BRANCHES) {
      expect(BRANCH_ICONS[key].url, `지지 ${key}`).toMatch(/^\/img\/.+\.png$/);
    }
  });

  it("샘플 명조의 모든 천간/지지 키가 아이콘 테이블에 존재한다", () => {
    for (const p of SAMPLE_CHART.pillars) {
      expect(STEM_ICONS[p.stemKey]?.url, `명조 천간 ${p.stemKey}`).toBeTruthy();
      expect(BRANCH_ICONS[p.branchKey]?.url, `명조 지지 ${p.branchKey}`).toBeTruthy();
    }
  });
});
