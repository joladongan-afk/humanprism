import { describe, it, expect } from "vitest";
import {
  getTenGod,
  getTenGodCategory,
  calculateSaju,
  formatSajuForPrompt,
} from "./saju";

describe("getTenGod (육친/십성 결정론적 계산)", () => {
  // 일간 丙(火, 양) 기준 — 사용자 캡처 사례: 水를 재성으로 잘못 답했던 버그 재발 방지
  describe("일간 丙(병화) 기준", () => {
    it("水(壬)는 편관(관성)이다 — 절대 재성이 아니다", () => {
      expect(getTenGod("丙", "壬")).toBe("편관");
      expect(getTenGodCategory(getTenGod("丙", "壬"))).toBe("관성");
    });
    it("水(癸)는 정관(관성)이다", () => {
      expect(getTenGod("丙", "癸")).toBe("정관");
      expect(getTenGodCategory(getTenGod("丙", "癸"))).toBe("관성");
    });
    it("金(庚/辛)이라야 재성이다", () => {
      expect(getTenGodCategory(getTenGod("丙", "庚"))).toBe("재성");
      expect(getTenGodCategory(getTenGod("丙", "辛"))).toBe("재성");
    });
    it("木(甲/乙)은 인성, 土(戊/己)는 식상, 火(丙/丁)는 비겁", () => {
      expect(getTenGodCategory(getTenGod("丙", "甲"))).toBe("인성");
      expect(getTenGodCategory(getTenGod("丙", "乙"))).toBe("인성");
      expect(getTenGodCategory(getTenGod("丙", "戊"))).toBe("식상");
      expect(getTenGodCategory(getTenGod("丙", "己"))).toBe("식상");
      expect(getTenGodCategory(getTenGod("丙", "丙"))).toBe("비겁");
      expect(getTenGodCategory(getTenGod("丙", "丁"))).toBe("비겁");
    });
  });

  // 일간 甲(木, 양) 기준 — 표준 검증
  describe("일간 甲(갑목) 기준", () => {
    it("같은 木: 甲=비견, 乙=겁재", () => {
      expect(getTenGod("甲", "甲")).toBe("비견");
      expect(getTenGod("甲", "乙")).toBe("겁재");
    });
    it("我生 火: 丙=식신, 丁=상관", () => {
      expect(getTenGod("甲", "丙")).toBe("식신");
      expect(getTenGod("甲", "丁")).toBe("상관");
    });
    it("我剋 土: 戊=편재, 己=정재", () => {
      expect(getTenGod("甲", "戊")).toBe("편재");
      expect(getTenGod("甲", "己")).toBe("정재");
    });
    it("剋我 金: 庚=편관, 辛=정관", () => {
      expect(getTenGod("甲", "庚")).toBe("편관");
      expect(getTenGod("甲", "辛")).toBe("정관");
    });
    it("生我 水: 壬=편인, 癸=정인", () => {
      expect(getTenGod("甲", "壬")).toBe("편인");
      expect(getTenGod("甲", "癸")).toBe("정인");
    });
  });

  it("잘못된 입력은 빈 문자열을 반환한다", () => {
    expect(getTenGod("X", "甲")).toBe("");
    expect(getTenGod("甲", "Z")).toBe("");
    expect(getTenGodCategory("없는것")).toBe("");
  });
});

describe("formatSajuForPrompt (조후·드러남 층위·형충 주입)", () => {
  it("개수 분포가 아니라 드러남 층위·형충 블록이 주입된다", () => {
    const r = calculateSaju({
      year: 1974,
      month: 6,
      day: 15,
      hour: 10,
      minute: 0,
      gender: "male",
    });
    const text = formatSajuForPrompt(r);
    expect(text).toContain("천간육친:");
    // 조후 섹션이 먼저 등장
    expect(text).toContain("【조후");
    // 개편 핵심: 개수 합산 분포·보조 카드는 제거되고, 드러남 층위로 대체되었다
    expect(text).not.toContain("육친(십성) 분포");
    expect(text).toContain("육친 드러남 층위");
    expect(text).toContain("【형·충");
    // 12운성 라벨이 각 기둘에 주입된다
    expect(text).toContain("12운성:");
    // 일간 자신은 "일간(아신)"으로 표기
    expect(r.pillars.day.tenGod).toBe("일간(아신)");
  });

  it("각 기둥은 tenGod과 hiddenTenGods를 갖는다", () => {
    const r = calculateSaju({
      year: 1990,
      month: 3,
      day: 20,
      hour: 14,
      minute: 0,
      gender: "female",
    });
    for (const key of ["year", "month", "hour"] as const) {
      const p = r.pillars[key];
      if (!p) continue;
      expect(typeof p.tenGod).toBe("string");
      expect(Array.isArray(p.hiddenTenGods)).toBe(true);
      expect(p.hiddenTenGods.length).toBe(p.hiddenStems.length);
    }
  });
});
