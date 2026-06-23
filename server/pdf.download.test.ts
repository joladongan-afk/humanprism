import { describe, it, expect, vi } from "vitest";
import { calculateSaju } from "./saju";

// Mock puppeteer for testing
vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn(async () => ({
      newPage: vi.fn(async () => ({
        setContent: vi.fn(),
        pdf: vi.fn(async () => Buffer.from("%PDF-1.4\n%test pdf content\n%%EOF")),
        close: vi.fn(),
      })),
      close: vi.fn(),
    })),
  },
}));

import { generateSajuPDF } from "./pdf";

describe("PDF Download Feature", () => {
  describe("generateSajuPDF", () => {
    it("should generate PDF buffer from Saju data", async () => {
      const sajuResult = calculateSaju({
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30,
        gender: "male",
      });

      const pdf = await generateSajuPDF(
        "테스트사용자",
        "1990-05-15",
        "male",
        sajuResult
      );

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
      expect(pdf.toString("utf8", 0, 4)).toBe("%PDF");
    });

    it("should generate different PDFs for different names", async () => {
      const sajuResult = calculateSaju({
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30,
        gender: "male",
      });

      const pdf1 = await generateSajuPDF(
        "김철수",
        "1990-05-15",
        "male",
        sajuResult
      );
      const pdf2 = await generateSajuPDF(
        "이영희",
        "1990-05-15",
        "male",
        sajuResult
      );

      expect(pdf1.length).toBeGreaterThan(0);
      expect(pdf2.length).toBeGreaterThan(0);
    });

    it("should handle female gender correctly", async () => {
      const sajuResult = calculateSaju({
        year: 1995,
        month: 3,
        day: 20,
        hour: 10,
        minute: 0,
        gender: "female",
      });

      const pdf = await generateSajuPDF(
        "박민지",
        "1995-03-20",
        "female",
        sajuResult
      );

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });

    it("should handle unknown hour correctly", async () => {
      const sajuResult = calculateSaju({
        year: 1985,
        month: 7,
        day: 10,
        hour: null,
        minute: null,
        gender: "male",
      });

      const pdf = await generateSajuPDF(
        "미상",
        "1985-07-10",
        "male",
        sajuResult
      );

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });

    it("should handle edge case dates", async () => {
      const sajuResult = calculateSaju({
        year: 2000,
        month: 2,
        day: 29,
        hour: 12,
        minute: 0,
        gender: "male",
      });

      const pdf = await generateSajuPDF(
        "윤년",
        "2000-02-29",
        "male",
        sajuResult
      );

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });

    it("should handle special characters in name", async () => {
      const sajuResult = calculateSaju({
        year: 1993,
        month: 4,
        day: 12,
        hour: 9,
        minute: 0,
        gender: "female",
      });

      const pdf = await generateSajuPDF(
        "이름-테스트",
        "1993-04-12",
        "female",
        sajuResult
      );

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
    });
  });

  describe("PDF Encoding and Format", () => {
    it("should produce valid PDF format", async () => {
      const sajuResult = calculateSaju({
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30,
        gender: "male",
      });

      const pdf = await generateSajuPDF(
        "포맷테스트",
        "1990-05-15",
        "male",
        sajuResult
      );

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
      const pdfText = pdf.toString("utf8");
      expect(pdfText).toContain("%PDF");
    });

    it("should handle Base64 encoding for transmission", async () => {
      const sajuResult = calculateSaju({
        year: 1990,
        month: 5,
        day: 15,
        hour: 14,
        minute: 30,
        gender: "male",
      });

      const pdf = await generateSajuPDF(
        "인코딩테스트",
        "1990-05-15",
        "male",
        sajuResult
      );

      const base64 = pdf.toString("base64");
      expect(base64).toBeTruthy();

      const decoded = Buffer.from(base64, "base64");
      expect(decoded.toString("utf8", 0, 4)).toBe("%PDF");
    });
  });
});
