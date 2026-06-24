import { describe, expect, it } from "vitest";
import {
  calculateSaju,
  getHourBranch,
  getHourStem,
  getShinsal,
} from "./saju";

describe("getHourBranch (시지 계산, 야자시/조자시 미사용)", () => {
  it("23:00 → 子", () => {
    expect(getHourBranch(23, 0)).toBe("子");
  });
  it("00:30 → 子", () => {
    expect(getHourBranch(0, 30)).toBe("子");
  });
  it("03:00 → 寅", () => {
    expect(getHourBranch(3, 0)).toBe("寅");
  });
  it("12:30 → 午", () => {
    expect(getHourBranch(12, 30)).toBe("午");
  });
  it("22:59 → 亥", () => {
    expect(getHourBranch(22, 59)).toBe("亥");
  });
});

describe("getHourStem (시간 천간, 오자둔)", () => {
  it("甲일 子시 → 甲", () => {
    expect(getHourStem("甲", 0, 30)).toBe("甲");
  });
  it("丙일 午시 → 甲 (丙辛은 戊子부터, 戊+午인덱스(6)→甲)", () => {
    // 丙: start=4, 午 idx=6, (4+6)%10 = 0 → 甲
    expect(getHourStem("丙", 12, 0)).toBe("甲");
  });
  it("癸일 寅시 → (戊癸 start=8, 寅 idx=2 → 甲)", () => {
    expect(getHourStem("癸", 4, 0)).toBe("甲");
  });
});

describe("getShinsal (12신살)", () => {
  it("일지가 子일 때 子는 장성살", () => {
    expect(getShinsal("子", "子")).toBe("장성살");
  });
  it("일지가 寅일 때 申은 역마살", () => {
    expect(getShinsal("寅", "申")).toBe("역마살");
  });
});

describe("대운수 보정 규칙", () => {
  it("대운수는 1세 이상 9세 이하로 보정되어야 한다", () => {
    // 임의의 다양한 생일에 대해 대운수가 1~9 범위 안에 있을 것
    const cases = [
      { y: 1985, m: 3, d: 21, g: "male" as const },
      { y: 1992, m: 8, d: 9, g: "female" as const },
      { y: 2001, m: 11, d: 5, g: "male" as const },
      { y: 1976, m: 7, d: 30, g: "female" as const },
      { y: 2010, m: 2, d: 4, g: "male" as const },
    ];
    for (const c of cases) {
      const r = calculateSaju({
        year: c.y, month: c.m, day: c.d, hour: 12, minute: 0, gender: c.g,
      });
      expect(r.daeun.daeunNumber).toBeGreaterThanOrEqual(1);
      expect(r.daeun.daeunNumber).toBeLessThanOrEqual(9);
    }
  });
});

describe("calculateSaju 통합", () => {
  it("2000-01-01 12:00 남자 사주는 4주가 모두 산출되고 대운이 채워진다", () => {
    const r = calculateSaju({
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      gender: "male",
    });
    expect(r.pillars.year.stem).toMatch(/[甲乙丙丁戊己庚辛壬癸]/);
    expect(r.pillars.month.stem).toMatch(/[甲乙丙丁戊己庚辛壬癸]/);
    expect(r.pillars.day.stem).toMatch(/[甲乙丙丁戊己庚辛壬癸]/);
    expect(r.pillars.hour).not.toBeNull();
    expect(r.daeun.daeunNumber).toBeGreaterThanOrEqual(1);
    expect(r.daeun.daeunNumber).toBeLessThanOrEqual(10);
    expect(r.daeun.pillars.length).toBeGreaterThan(0);
  });

  it("시 모름은 hourPillar가 null로 산출된다", () => {
    const r = calculateSaju({
      year: 1990,
      month: 6,
      day: 15,
      hour: null,
      minute: null,
      gender: "female",
    });
    expect(r.unknownHour).toBe(true);
    expect(r.pillars.hour).toBeNull();
    expect(r.display).toContain("시 모름");
  });

  it("입춘 전 출생은 전년도 년주를 갖는다 (2024-01-15는 癸卯년)", () => {
    const r = calculateSaju({
      year: 2024,
      month: 1,
      day: 15,
      hour: 10,
      minute: 0,
      gender: "male",
    });
    // 입춘은 2024-02-04 → 2024-01-15는 아직 癸卯년 (2023년의 간지)
    // 만세력 CSV 기반 - 절기 처리가 정확히 되어야 함
    expect(r.pillars.year.stem + r.pillars.year.branch).toBe("癸卯");
  });
});
