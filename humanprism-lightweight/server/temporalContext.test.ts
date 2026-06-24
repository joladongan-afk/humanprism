import { describe, it, expect } from "vitest";
import {
  getGanjiForYear,
  ganjiToKorean,
  parseTemporalOffset,
  buildTemporalContext,
  validateGanjiSequence,
} from "./temporalContext";

describe("Temporal Context - Ganji Calculation", () => {
  it("should calculate correct Ganji for 2026 (Byeong-O)", () => {
    const ganji = getGanjiForYear(2026);
    expect(ganji).toBe("丙午");
  });

  it("should calculate correct Ganji for 2029 (Ki-Yu)", () => {
    const ganji = getGanjiForYear(2029);
    expect(ganji).toBe("己酉");
  });

  it("should calculate correct Ganji for 2030 (Gyeong-Sool)", () => {
    const ganji = getGanjiForYear(2030);
    expect(ganji).toBe("庚戌");
  });

  it("should calculate correct Ganji for 2025 (Eul-Sa)", () => {
    const ganji = getGanjiForYear(2025);
    expect(ganji).toBe("乙巳");
  });

  it("should calculate correct Ganji for 1900 (Gyeong-Ja)", () => {
    const ganji = getGanjiForYear(1900);
    expect(ganji).toBe("庚子");
  });

  it("should calculate correct Ganji for 2000 (Gyeong-Jin)", () => {
    const ganji = getGanjiForYear(2000);
    expect(ganji).toBe("庚辰");
  });
});

describe("Temporal Context - Ganji to Korean", () => {
  it("should convert 丙午 to 병오", () => {
    expect(ganjiToKorean("丙午")).toBe("병오");
  });

  it("should convert 己酉 to 기유", () => {
    expect(ganjiToKorean("己酉")).toBe("기유");
  });

  it("should convert 庚戌 to 경술", () => {
    expect(ganjiToKorean("庚戌")).toBe("경술");
  });

  it("should convert 乙巳 to 을사", () => {
    expect(ganjiToKorean("乙巳")).toBe("을사");
  });

  it("should convert 庚子 to 경자", () => {
    expect(ganjiToKorean("庚子")).toBe("경자");
  });
});

describe("Temporal Context - Offset Parsing", () => {
  it("should parse '3년 후' correctly", () => {
    const result = parseTemporalOffset("3년 후 내 재물운이 어때?", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(3);
    expect(result?.targetYear).toBe(2029);
    expect(result?.targetGanji).toBe("己酉");
    expect(result?.targetGanjiKr).toBe("기유");
  });

  it("should parse '내년' correctly", () => {
    const result = parseTemporalOffset("내년 내 재물운이 어때?", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(1);
    expect(result?.targetYear).toBe(2027);
  });

  it("should parse '작년' correctly", () => {
    const result = parseTemporalOffset("작년에 한 선택이 맞았을까?", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(-1);
    expect(result?.targetYear).toBe(2025);
    expect(result?.targetGanji).toBe("乙巳");
  });

  it("should parse '6년 전' correctly", () => {
    const result = parseTemporalOffset("6년 전에 뭐가 있었나?", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(-6);
    expect(result?.targetYear).toBe(2020);
  });

  it("should parse '올해' correctly", () => {
    const result = parseTemporalOffset("올해 내 재물운이 어때?", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(0);
    expect(result?.targetYear).toBe(2026);
  });

  it("should return null for queries without temporal offset", () => {
    const result = parseTemporalOffset("내 사주가 어떻게 되나?", 2026);
    expect(result).toBeNull();
  });

  it("should parse '다음 해' correctly", () => {
    const result = parseTemporalOffset("다음 해 재물운", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(1);
    expect(result?.targetYear).toBe(2027);
  });

  it("should parse '지난 해' correctly", () => {
    const result = parseTemporalOffset("지난 해 일들", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(-1);
    expect(result?.targetYear).toBe(2025);
  });

  it("should parse '2년 뒤' correctly", () => {
    const result = parseTemporalOffset("2년 뒤 운세", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(2);
    expect(result?.targetYear).toBe(2028);
  });

  it("should parse '5년 이전' correctly", () => {
    const result = parseTemporalOffset("5년 이전 사건", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(-5);
    expect(result?.targetYear).toBe(2021);
  });
});

describe("Temporal Context - Context Building", () => {
  it("should build context for '3년 후' query", () => {
    const context = buildTemporalContext("3년 후 내 재물운이 어때?", 2026);
    expect(context).toContain("2029년");
    expect(context).toContain("기유");
    expect(context).toContain("己酉");
    expect(context).toContain("절대 다른 연도로 해석하지 마세요");
  });

  it("should build context for query without temporal offset", () => {
    const context = buildTemporalContext("내 사주가 어떻게 되나?", 2026);
    expect(context).toContain("2026년");
    expect(context).toContain("병오");
    expect(context).toContain("현재 연도(2026년)를 기준으로");
  });

  it("should build context for '작년' query", () => {
    const context = buildTemporalContext("작년에 한 선택이 맞았을까?", 2026);
    expect(context).toContain("2025년");
    expect(context).toContain("을사");
    expect(context).toContain("乙巳");
  });
});

describe("Temporal Context - Ganji Sequence Validation", () => {
  it("should generate correct Ganji sequence from 2026 to 2030", () => {
    const sequence = validateGanjiSequence(2026, 5);
    expect(sequence).toHaveLength(5);
    expect(sequence[0]).toEqual({ year: 2026, ganji: "丙午", kr: "병오" });
    expect(sequence[1]).toEqual({ year: 2027, ganji: "丁未", kr: "정미" });
    expect(sequence[2]).toEqual({ year: 2028, ganji: "戊申", kr: "무신" });
    expect(sequence[3]).toEqual({ year: 2029, ganji: "己酉", kr: "기유" });
    expect(sequence[4]).toEqual({ year: 2030, ganji: "庚戌", kr: "경술" });
  });

  it("should generate correct Ganji sequence backward from 2026", () => {
    const sequence = validateGanjiSequence(2022, 5);
    expect(sequence).toHaveLength(5);
    expect(sequence[0]).toEqual({ year: 2022, ganji: "壬寅", kr: "임인" });
    expect(sequence[1]).toEqual({ year: 2023, ganji: "癸卯", kr: "계묘" });
    expect(sequence[2]).toEqual({ year: 2024, ganji: "甲辰", kr: "갑진" });
    expect(sequence[3]).toEqual({ year: 2025, ganji: "乙巳", kr: "을사" });
    expect(sequence[4]).toEqual({ year: 2026, ganji: "丙午", kr: "병오" });
  });
});

describe("Temporal Context - Edge Cases", () => {
  it("should handle multiple temporal references (uses first match)", () => {
    const result = parseTemporalOffset("3년 후 또는 5년 전?", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(3); // First match
  });

  it("should handle large year offsets", () => {
    const result = parseTemporalOffset("100년 후", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(100);
    expect(result?.targetYear).toBe(2126);
  });

  it("should handle negative years correctly", () => {
    const result = parseTemporalOffset("50년 전", 2026);
    expect(result).not.toBeNull();
    expect(result?.offset).toBe(-50);
    expect(result?.targetYear).toBe(1976);
  });

  it("should calculate Ganji for very old years", () => {
    const ganji = getGanjiForYear(1900);
    expect(ganji).toBe("庚子");
  });

  it("should calculate Ganji for future years", () => {
    const ganji = getGanjiForYear(2100);
    expect(ganji).toBe("庚申");
  });
});

describe("Temporal Context - 입춘 보정 기본값(현재 시각 기준)", () => {
  it("currentYear 미지정 시 하드코딩 2026이 아니라 실제 시각 기준으로 동작한다", () => {
    // 인자를 주지 않으면 서버 시각(입춘 보정 사주연도)을 사용한다.
    // 결과 문자열에는 항상 '상담 시간 맥락' 헤더가 포함되어야 한다.
    const ctx = buildTemporalContext("내 사주가 어떻게 되나?");
    expect(ctx).toContain("【상담 시간 맥락】");
    // 연도 형태(4자리 + '년')가 들어 있어야 한다.
    expect(ctx).toMatch(/\d{4}년/);
  });

  it("명시 연도를 주면 기존 산식 동작(하위호환)을 유지한다", () => {
    const ctx = buildTemporalContext("내 사주가 어떻게 되나?", 2030);
    expect(ctx).toContain("2030년");
    expect(ctx).toContain("경술");
  });
});
