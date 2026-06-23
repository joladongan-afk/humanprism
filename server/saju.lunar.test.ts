import { describe, it, expect } from "vitest";
import { lunarToSolar, hasLeapMonth } from "./saju";

describe("lunarToSolar - 음력→양력 변환 (만세력 CSV 기준)", () => {
  it("평달 변환: 음력 1900년 1월 1일 → 양력 1900-01-31", () => {
    const r = lunarToSolar(1900, 1, 1, false);
    expect(r).toEqual({ year: 1900, month: 1, day: 31, matchedLeap: false });
  });

  it("일반적인 음력 생일 변환 (음력 1988-01-01 → 양력 1988-02-18)", () => {
    const r = lunarToSolar(1988, 1, 1, false);
    expect(r.year).toBe(1988);
    expect(r.month).toBe(2);
    expect(r.day).toBe(18);
    expect(r.matchedLeap).toBe(false);
  });

  it("윤달 변환: 음력 1900년 윤8월 1일은 평8월(8/25)과 다른 양력 날짜(9/24)로 매핑된다", () => {
    const plain = lunarToSolar(1900, 8, 1, false);
    const leap = lunarToSolar(1900, 8, 1, true);
    expect(plain).toEqual({ year: 1900, month: 8, day: 25, matchedLeap: false });
    expect(leap).toEqual({ year: 1900, month: 9, day: 24, matchedLeap: true });
    // 평달과 윤달은 반드시 다른 양력 날짜여야 한다
    expect(`${plain.year}-${plain.month}-${plain.day}`).not.toBe(
      `${leap.year}-${leap.month}-${leap.day}`,
    );
  });

  it("윤달이 없는 연/월에 윤달을 요청하면 평달로 폴백한다", () => {
    // 1900년에는 윤8월만 존재 → 윤1월 요청 시 평1월로 폴백
    expect(hasLeapMonth(1900, 1)).toBe(false);
    const r = lunarToSolar(1900, 1, 1, true);
    expect(r.matchedLeap).toBe(false);
    expect(r).toMatchObject({ year: 1900, month: 1, day: 31 });
  });

  it("hasLeapMonth: 1900년 8월에는 윤달이 존재한다", () => {
    expect(hasLeapMonth(1900, 8)).toBe(true);
    expect(hasLeapMonth(1900, 7)).toBe(false);
  });

  it("존재하지 않는 음력 날짜는 오류를 던진다", () => {
    // 음력에 30일이 없는 작은 달 등 비정상 입력 (범위 밖 연도)
    expect(() => lunarToSolar(1850, 1, 1, false)).toThrow();
  });

  it("변환 결과는 항상 유효한 양력 범위(1900~2100) 내에 있다", () => {
    const r = lunarToSolar(2000, 5, 15, false);
    expect(r.year).toBeGreaterThanOrEqual(1900);
    expect(r.year).toBeLessThanOrEqual(2100);
    expect(r.month).toBeGreaterThanOrEqual(1);
    expect(r.month).toBeLessThanOrEqual(12);
    expect(r.day).toBeGreaterThanOrEqual(1);
    expect(r.day).toBeLessThanOrEqual(31);
  });
});
