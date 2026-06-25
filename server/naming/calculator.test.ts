import { describe, it, expect, beforeAll } from "vitest";
import {
  calculateJawonOhaeng,
  calculatePadoOhaeng,
  calculateSuri,
  judgePadoOhaeng,
  judgeSuri,
  checkBulmyong,
  judgeOverall,
} from "./calculator";
import { initializeNamingData } from "./dataLoader";

describe("Naming Calculator", () => {
  beforeAll(() => {
    initializeNamingData();
  });

  describe("calculateJawonOhaeng", () => {
    it("should calculate jawon ohaeng from hanja", () => {
      const result = calculateJawonOhaeng("民俊");
      expect(result).toHaveLength(2);
      expect(["木", "火", "土", "金", "水"]).toContain(result[0]);
      expect(["木", "火", "土", "金", "水"]).toContain(result[1]);
    });

    it("should handle empty string", () => {
      const result = calculateJawonOhaeng("");
      expect(result).toEqual([]);
    });
  });

  describe("calculatePadoOhaeng", () => {
    it("should calculate pado ohaeng from korean name", () => {
      const result = calculatePadoOhaeng("민준");
      expect(result).toHaveLength(2);
      expect(["木", "火", "土", "金", "水"]).toContain(result[0]);
      expect(["木", "火", "土", "金", "水"]).toContain(result[1]);
    });

    it("should return empty array for empty string", () => {
      const result = calculatePadoOhaeng("");
      expect(result).toEqual([]);
    });
  });

  describe("calculateSuri", () => {
    it("should calculate suri from name", () => {
      const result = calculateSuri("민준", "民俊");
      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(81);
    });
  });

  describe("judgePadoOhaeng", () => {
    it("should judge pado ohaeng as positive when ohaeng flows well", () => {
      // 목 -> 화 (상생)
      const result = judgePadoOhaeng(["木", "火"]);
      expect(result.result).toContain("양호");
      expect(result.detail).toBeTruthy();
    });

    it("should judge pado ohaeng as negative when ohaeng conflicts", () => {
      // 목 -> 금 (상극)
      const result = judgePadoOhaeng(["木", "金"]);
      expect(result.result).toContain("보완 필요");
      expect(result.detail).toBeTruthy();
    });
  });

  describe("judgeSuri", () => {
    it("should judge suri 1 as 吉", () => {
      const result = judgeSuri(1);
      expect(result.gilhyung).toBe("大吉");
    });

    it("should judge suri 2 as 凶", () => {
      const result = judgeSuri(2);
      expect(result.gilhyung).toBe("凶");
    });

    it("should return description for any suri", () => {
      const result = judgeSuri(15);
      expect(result.description).toBeTruthy();
      expect(result.description.length).toBeGreaterThan(0);
    });
  });

  describe("checkBulmyong", () => {
    it("should detect bulmyong characters", () => {
      const result = checkBulmyong("死");
      expect(result.hasBulmyong).toBe(true);
      expect(result.bulmyongChars).toContain("死");
    });

    it("should return false for normal characters", () => {
      const result = checkBulmyong("民俊");
      expect(result.hasBulmyong).toBe(false);
      expect(result.bulmyongChars).toHaveLength(0);
    });
  });

  describe("judgeOverall", () => {
    it("should judge overall as 우수 when pado and suri are both good", () => {
      const result = judgeOverall("양호", "吉", false);
      expect(result).toBe("우수");
    });

    it("should judge overall as 양호 when at least one is good", () => {
      // pado good, suri not good
      const result1 = judgeOverall("양호", "凶", false);
      expect(result1).toBe("양호");

      // pado not good, suri good
      const result2 = judgeOverall("보완 필요", "吉", false);
      expect(result2).toBe("양호");
    });

    it("should judge overall as 보완 필요 when both are not good", () => {
      const result = judgeOverall("보완 필요", "凶", false);
      expect(result).toBe("보완 필요");
    });

    it("should judge overall as 재검토 필요 when bulmyong is present", () => {
      const result = judgeOverall("양호", "吉", true);
      expect(result).toBe("재검토 필요");
    });
  });
});
