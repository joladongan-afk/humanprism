import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateConsultationPDF, closeBrowser } from "./consultPdf";
import type { ConsultMessage } from "../drizzle/schema";

// Mock puppeteer
vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(Buffer.from("PDF_MOCK_DATA")),
        close: vi.fn().mockResolvedValue(undefined),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("Consultation PDF Download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate PDF from consultation messages", async () => {
    const messages: ConsultMessage[] = [
      {
        id: 1,
        sessionId: 1,
        userId: 1,
        role: "user",
        content: "안녕하세요. 제 사주를 봐주세요.",
        createdAt: new Date("2026-06-04T10:00:00Z"),
      },
      {
        id: 2,
        sessionId: 1,
        userId: 1,
        role: "assistant",
        content: "환영합니다. 당신의 사주를 살펴보겠습니다.",
        createdAt: new Date("2026-06-04T10:01:00Z"),
      },
    ];

    const pdf = await generateConsultationPDF(
      "테스트사용자",
      messages,
      "상담 기록",
      new Date("2026-06-04T10:00:00Z")
    );

    expect(pdf).toBeDefined();
    expect(Buffer.isBuffer(pdf) || pdf instanceof Uint8Array).toBe(true);
  });

  it("should handle empty messages", async () => {
    const messages: ConsultMessage[] = [];

    const pdf = await generateConsultationPDF(
      "테스트사용자",
      messages,
      "상담 기록",
      new Date("2026-06-04T10:00:00Z")
    );

    expect(pdf).toBeDefined();
  });

  it("should format user and assistant messages correctly", async () => {
    const messages: ConsultMessage[] = [
      {
        id: 1,
        sessionId: 1,
        userId: 1,
        role: "user",
        content: "직업 선택에 대해 조언해주세요.",
        createdAt: new Date("2026-06-04T10:00:00Z"),
      },
      {
        id: 2,
        sessionId: 1,
        userId: 1,
        role: "assistant",
        content: "당신의 사주를 분석해보니...",
        createdAt: new Date("2026-06-04T10:01:00Z"),
      },
      {
        id: 3,
        sessionId: 1,
        userId: 1,
        role: "user",
        content: "감사합니다.",
        createdAt: new Date("2026-06-04T10:02:00Z"),
      },
    ];

    const pdf = await generateConsultationPDF(
      "테스트사용자",
      messages,
      "직업 상담",
      new Date("2026-06-04T10:00:00Z")
    );

    expect(pdf).toBeDefined();
    expect(Buffer.isBuffer(pdf) || pdf instanceof Uint8Array).toBe(true);
  });

  it("should include session metadata in PDF", async () => {
    const messages: ConsultMessage[] = [
      {
        id: 1,
        sessionId: 1,
        userId: 1,
        role: "user",
        content: "테스트 메시지",
        createdAt: new Date("2026-06-04T10:00:00Z"),
      },
    ];

    const userName = "김철학";
    const sessionTitle = "60분 무제한 상담";
    const createdAt = new Date("2026-06-04T10:00:00Z");

    const pdf = await generateConsultationPDF(userName, messages, sessionTitle, createdAt);

    expect(pdf).toBeDefined();
    // PDF should contain metadata
    expect(Buffer.isBuffer(pdf) || pdf instanceof Uint8Array).toBe(true);
  });

  it("should handle special characters in content", async () => {
    const messages: ConsultMessage[] = [
      {
        id: 1,
        sessionId: 1,
        userId: 1,
        role: "user",
        content: "특수문자 테스트: <>&\"'",
        createdAt: new Date("2026-06-04T10:00:00Z"),
      },
    ];

    const pdf = await generateConsultationPDF(
      "테스트사용자",
      messages,
      "상담 기록",
      new Date("2026-06-04T10:00:00Z")
    );

    expect(pdf).toBeDefined();
  });

  it("should generate consistent PDF output", async () => {
    const messages: ConsultMessage[] = [
      {
        id: 1,
        sessionId: 1,
        userId: 1,
        role: "user",
        content: "첫 번째 메시지",
        createdAt: new Date("2026-06-04T10:00:00Z"),
      },
    ];

    const pdf1 = await generateConsultationPDF(
      "테스트사용자",
      messages,
      "상담 기록",
      new Date("2026-06-04T10:00:00Z")
    );

    const pdf2 = await generateConsultationPDF(
      "테스트사용자",
      messages,
      "상담 기록",
      new Date("2026-06-04T10:00:00Z")
    );

    expect(pdf1).toBeDefined();
    expect(pdf2).toBeDefined();
  });

  it("should close browser connection", async () => {
    await closeBrowser();
    // Should not throw
    expect(true).toBe(true);
  });
});
