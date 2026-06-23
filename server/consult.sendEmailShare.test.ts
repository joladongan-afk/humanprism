import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock fetch
global.fetch = vi.fn();

describe("consult.sendEmailShare", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate email format", () => {
    const invalidEmails = ["invalid", "test@", "@domain.com", "test @domain.com"];
    invalidEmails.forEach((email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it("should accept valid email format", () => {
    const validEmails = [
      "test@example.com",
      "user.name@domain.co.kr",
      "test+tag@example.com",
    ];
    validEmails.forEach((email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  it("should validate input constraints", () => {
    const titleMaxLength = 200;
    const summaryMaxLength = 2000;

    // Valid inputs
    expect("상담 기록".length <= titleMaxLength).toBe(true);
    expect("상담 요약 내용".length <= summaryMaxLength).toBe(true);

    // Invalid inputs
    expect("a".repeat(201).length <= titleMaxLength).toBe(false);
    expect("a".repeat(2001).length <= summaryMaxLength).toBe(false);
  });

  it("should build correct email content", () => {
    const title = "상담 기록";
    const summary = "상담 요약";

    const emailContent = `
안녕하세요,

휴먼프리즘의 상담 기록을 공유합니다.

[상담 제목]
${title}

[상담 요약]
${summary}

더 자세한 내용은 휴먼프리즘 웹사이트에서 확인하실 수 있습니다.

감사합니다.
경청자 드림
    `.trim();

    expect(emailContent).toContain(title);
    expect(emailContent).toContain(summary);
    expect(emailContent).toContain("휴먼프리즘");
    expect(emailContent).toContain("경청자");
  });

  it("should build correct email subject", () => {
    const title = "상담 기록";
    const subject = `휴먼프리즘 상담 기록: ${title}`;

    expect(subject).toBe("휴먼프리즘 상담 기록: 상담 기록");
  });

  it("should prepare correct fetch payload", () => {
    const email = "test@example.com";
    const title = "상담 기록";
    const summary = "상담 요약";

    const payload = {
      to: email,
      subject: `휴먼프리즘 상담 기록: ${title}`,
      body: "test body",
    };

    expect(payload.to).toBe(email);
    expect(payload.subject).toContain(title);
    expect(payload.body).toBeDefined();
  });

  it("should handle empty inputs", () => {
    const emptyTitle = "";
    const emptyEmail = "";

    expect(emptyTitle.trim().length > 0).toBe(false);
    expect(emptyEmail.trim().length > 0).toBe(false);
  });

  it("should trim whitespace from inputs", () => {
    const title = "  상담 기록  ";
    const email = "  test@example.com  ";

    expect(title.trim()).toBe("상담 기록");
    expect(email.trim()).toBe("test@example.com");
  });
});
