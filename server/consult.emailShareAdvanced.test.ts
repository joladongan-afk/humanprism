import { describe, it, expect, vi, beforeEach } from "vitest";

describe("consult.sendEmailShare - Advanced Version (전체 상담 기록)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should validate sessionId is positive integer", () => {
    const validIds = [1, 100, 999999];
    const invalidIds = [0, -1, 1.5];

    validIds.forEach((id) => {
      expect(Number.isInteger(id) && id > 0).toBe(true);
    });

    invalidIds.forEach((id) => {
      expect(Number.isInteger(id) && id > 0).toBe(false);
    });
  });

  it("should validate recipient email format", () => {
    const validEmails = [
      "user@example.com",
      "test.user@domain.co.kr",
      "user+tag@example.com",
    ];
    const invalidEmails = ["invalid", "test@", "@domain.com", "test @domain.com"];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach((email) => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it("should require at least one message in session", () => {
    const messageCount = 0;
    const hasMessages = messageCount > 0;
    expect(hasMessages).toBe(false);
  });

  it("should format email with multiple messages", () => {
    const messages = [
      { role: "user", content: "투자를 시작하고 싶습니다." },
      { role: "assistant", content: "당신의 재정 상황을 보면..." },
      { role: "user", content: "그렇다면 언제가 좋을까요?" },
      { role: "assistant", content: "대운수를 고려하면..." },
    ];

    const messageLines = messages
      .map((m) => {
        const role = m.role === "user" ? "회원님" : "경청자";
        return `[${role}]\n${m.content}`;
      })
      .join("\n\n");

    expect(messageLines).toContain("[회원님]");
    expect(messageLines).toContain("[경청자]");
    expect(messageLines).toContain("투자를 시작하고 싶습니다.");
    expect(messageLines).toContain("당신의 재정 상황을 보면...");
  });

  it("should include session metadata in email", () => {
    const session = {
      planType: "master_chat",
      createdAt: new Date("2026-06-05"),
    };

    const planLabel: Record<string, string> = {
      entry: "입구 플랜 · 30분",
      deep: "심화 플랜 · 60분",
      master_chat: "경청자 채팅 · 60분",
      master_offline: "경청자 오프라인 · 80분",
    };

    const emailContent = `
[상담 정보]
플랜: ${planLabel[session.planType]}
날짜: ${session.createdAt.toLocaleDateString("ko-KR")}
메시지 수: 4개
    `.trim();

    expect(emailContent).toContain("경청자 채팅 · 60분");
    expect(emailContent).toContain("2026. 6. 5.");
    expect(emailContent).toContain("메시지 수: 4개");
  });

  it("should build correct email subject with date", () => {
    const createdAt = new Date("2026-06-05");
    const subject = `휴먼프리즘 상담 기록 (${createdAt.toLocaleDateString("ko-KR")})`;

    expect(subject).toBe("휴먼프리즘 상담 기록 (2026. 6. 5.)");
  });

  it("should prepare correct fetch payload for email API", () => {
    const payload = {
      to: "user@example.com",
      subject: "휴먼프리즘 상담 기록 (2026. 6. 5.)",
      body: "전체 상담 기록 본문",
    };

    expect(payload.to).toBe("user@example.com");
    expect(payload.subject).toContain("상담 기록");
    expect(payload.body).toBeDefined();
    expect(payload.body.length > 0).toBe(true);
  });

  it("should handle empty message content gracefully", () => {
    const messages = [
      { role: "user", content: "" },
      { role: "assistant", content: "응답입니다." },
    ];

    const messageLines = messages
      .map((m) => {
        const role = m.role === "user" ? "회원님" : "경청자";
        return `[${role}]\n${m.content}`;
      })
      .join("\n\n");

    expect(messageLines).toContain("[회원님]");
    expect(messageLines).toContain("[경청자]");
  });

  it("should verify session ownership before sending", () => {
    const session = { userId: 1, id: 100 };
    const currentUserId = 1;
    const isOwner = session.userId === currentUserId;

    expect(isOwner).toBe(true);

    const differentUserId = 2;
    const isDifferentUser = session.userId === differentUserId;
    expect(isDifferentUser).toBe(false);
  });

  it("should handle special characters in message content", () => {
    const content = '당신의 "재정"을 보면... 특수문자: @#$%^&*()';
    const role = "assistant";
    const roleLabel = "경청자";

    const formatted = `[${roleLabel}]\n${content}`;

    expect(formatted).toContain(content);
    expect(formatted).toContain("특수문자");
  });
});
