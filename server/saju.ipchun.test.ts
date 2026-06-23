import { describe, it, expect } from "vitest";
import { getCurrentSajuYear } from "./saju";

/**
 * 입춘 세수 보정 검증
 *
 * 사주에서 한 해의 시작은 양력 1월 1일이 아니라 입춘(立春)이다.
 * 입춘 시각은 한국천문연구원(KASI) 고시값(만세력 CSV term_time)을 따른다.
 *
 * KASI 기준 입춘 시각:
 *  - 2026년: 2월 4일 04:38 (KST)  → 그 전 乙巳, 그 후 丙午
 *  - 2025년: 2월 3일 22:49 (KST)  → 2월 3일이 입춘인 해(2월 4일 고정 가정이면 틀림)
 *  - 2027년: 2월 4일 10:27 (KST)
 *
 * KST 기준 Date를 만들기 위해 Date.UTC(...) 에 시각을 그대로 넣고
 * getCurrentSajuYear 내부 규약(getUTC*로 KST를 읽음)에 맞춘다.
 */

// KST 벽시계 시각을 그대로 표현하는 Date (내부에서 getUTC*로 읽힘)
function kst(y: number, mo: number, d: number, h = 12, mi = 0): Date {
  return new Date(Date.UTC(y, mo - 1, d, h, mi));
}

describe("getCurrentSajuYear — 입춘 세수 보정 (KASI 기준)", () => {
  it("입춘 한참 후(2026-06-13)는 사주연도=달력연도, 丙午", () => {
    const r = getCurrentSajuYear(kst(2026, 6, 13));
    expect(r.ganji).toBe("丙午");
    expect(r.sajuYearNo).toBe(2026);
    expect(r.calendarYear).toBe(2026);
    expect(r.beforeIpchun).toBe(false);
  });

  it("1월 중순(2026-01-15)은 아직 입춘 전 → 전년(2025) 乙巳", () => {
    const r = getCurrentSajuYear(kst(2026, 1, 15));
    expect(r.ganji).toBe("乙巳");
    expect(r.sajuYearNo).toBe(2025);
    expect(r.calendarYear).toBe(2026);
    expect(r.beforeIpchun).toBe(true);
  });

  it("입춘 직전(2026-02-03)은 아직 乙巳, 사주연도 2025", () => {
    const r = getCurrentSajuYear(kst(2026, 2, 3, 23, 59));
    expect(r.ganji).toBe("乙巳");
    expect(r.sajuYearNo).toBe(2025);
    expect(r.beforeIpchun).toBe(true);
  });

  it("입춘 당일 시각 전(2026-02-04 04:00, 입춘 04:38)은 아직 乙巳", () => {
    const r = getCurrentSajuYear(kst(2026, 2, 4, 4, 0));
    expect(r.ganji).toBe("乙巳");
    expect(r.sajuYearNo).toBe(2025);
    expect(r.isIpchunDay).toBe(true);
    expect(r.beforeIpchun).toBe(true);
  });

  it("입춘 당일 시각 후(2026-02-04 05:00, 입춘 04:38)은 丙午", () => {
    const r = getCurrentSajuYear(kst(2026, 2, 4, 5, 0));
    expect(r.ganji).toBe("丙午");
    expect(r.sajuYearNo).toBe(2026);
    expect(r.isIpchunDay).toBe(true);
    expect(r.beforeIpchun).toBe(false);
  });

  it("입춘 다음날(2026-02-05)은 丙午, 사주연도 2026", () => {
    const r = getCurrentSajuYear(kst(2026, 2, 5));
    expect(r.ganji).toBe("丙午");
    expect(r.sajuYearNo).toBe(2026);
    expect(r.beforeIpchun).toBe(false);
  });

  it("2025년 입춘은 2월 3일(고정일 아님): 2025-02-03 23:00은 입춘 후 乙巳", () => {
    // 2025 입춘 22:49 → 23:00은 입춘 후
    const r = getCurrentSajuYear(kst(2025, 2, 3, 23, 0));
    expect(r.ganji).toBe("乙巳");
    expect(r.sajuYearNo).toBe(2025);
    expect(r.beforeIpchun).toBe(false);
  });

  it("2025-02-03 22:00은 입춘(22:49) 전 → 전년(2024) 甲辰", () => {
    const r = getCurrentSajuYear(kst(2025, 2, 3, 22, 0));
    expect(r.ganji).toBe("甲辰");
    expect(r.sajuYearNo).toBe(2024);
    expect(r.beforeIpchun).toBe(true);
  });

  it("2025-02-02(입춘 전)은 전년(2024) 甲辰", () => {
    const r = getCurrentSajuYear(kst(2025, 2, 2));
    expect(r.ganji).toBe("甲辰");
    expect(r.sajuYearNo).toBe(2024);
    expect(r.beforeIpchun).toBe(true);
  });

  it("2027-01-20(입춘 전)은 전년(2026) 丙午, 2027 정미 아님", () => {
    const r = getCurrentSajuYear(kst(2027, 1, 20));
    expect(r.ganji).toBe("丙午");
    expect(r.sajuYearNo).toBe(2026);
    expect(r.beforeIpchun).toBe(true);
  });

  it("2027-03-01(입춘 후)은 丁未, 사주연도 2027", () => {
    const r = getCurrentSajuYear(kst(2027, 3, 1));
    expect(r.ganji).toBe("丁未");
    expect(r.sajuYearNo).toBe(2027);
    expect(r.beforeIpchun).toBe(false);
  });
});
