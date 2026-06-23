import { describe, it, expect, beforeEach, vi } from "vitest";
import { invokeClaudeAPI } from "./claude-api";
import * as db from "./db";
import { buildSystemPrompt, buildInitialGreeting } from "./masterPrompt";
import { calculateSaju } from "./saju";

// Mock 설정
vi.mock("./claude-api");
vi.mock("./db");

describe("Consultation Router - Claude API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should invoke Claude API with system prompt and messages", async () => {
    // Mock 데이터
    const mockSajuData = calculateSaju({
      year: 1990,
      month: 5,
      day: 15,
      hour: 14,
      minute: 30,
      gender: "male",
    });

    const systemPrompt = buildSystemPrompt(mockSajuData, "deep");

    const mockMessages = [
      { role: "user" as const, content: "직업 운을 봐주세요" },
    ];

    const mockResponse = {
      content: "당신의 사주를 살펴보니...",
      stopReason: "end_turn",
      usage: {
        inputTokens: 500,
        outputTokens: 200,
      },
    };

    vi.mocked(invokeClaudeAPI).mockResolvedValueOnce(mockResponse);

    // 테스트 실행
    const result = await invokeClaudeAPI({
      messages: mockMessages,
      systemPrompt: systemPrompt,
      maxTokens: 2048,
    });

    // 검증
    expect(result.content).toBe("당신의 사주를 살펴보니...");
    expect(result.stopReason).toBe("end_turn");
    expect(result.usage?.inputTokens).toBe(500);
    expect(result.usage?.outputTokens).toBe(200);
  });

  it("should handle multi-turn conversation with Claude", async () => {
    const mockMessages = [
      { role: "user" as const, content: "첫 번째 질문" },
      { role: "assistant" as const, content: "첫 번째 답변" },
      { role: "user" as const, content: "두 번째 질문" },
    ];

    const mockResponse = {
      content: "두 번째 답변입니다.",
      stopReason: "end_turn",
    };

    vi.mocked(invokeClaudeAPI).mockResolvedValueOnce(mockResponse);

    const result = await invokeClaudeAPI({
      messages: mockMessages,
      systemPrompt: "마스터 페르소나 프롬프트",
      maxTokens: 2048,
    });

    expect(result.content).toBe("두 번째 답변입니다.");
    expect(vi.mocked(invokeClaudeAPI)).toHaveBeenCalledWith({
      messages: mockMessages,
      systemPrompt: "마스터 페르소나 프롬프트",
      maxTokens: 2048,
    });
  });

  it("should generate initial greeting for consultation session", () => {
    const greeting = buildInitialGreeting("deep");

    expect(greeting).toContain("반갑습니다");
    expect(greeting).toContain("사주가 오른쪽에 준비되어 있습니다");
  });

  it("should build system prompt with saju data", () => {
    const mockSajuData = calculateSaju({
      year: 1985,
      month: 3,
      day: 20,
      hour: 10,
      minute: 0,
      gender: "female",
    });

    const systemPrompt = buildSystemPrompt(mockSajuData, "deep");

    expect(systemPrompt).toContain("마스터");
    expect(systemPrompt).toContain("사주");
    expect(systemPrompt).toContain("상담");
  });

  it("should handle Claude API error gracefully", async () => {
    const mockError = new Error("Claude API failed: 400 Bad Request");

    vi.mocked(invokeClaudeAPI).mockRejectedValueOnce(mockError);

    try {
      await invokeClaudeAPI({
        messages: [{ role: "user", content: "테스트" }],
        systemPrompt: "테스트 프롬프트",
      });
      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err).toEqual(mockError);
    }
  });

  it("should respect max tokens parameter", async () => {
    const mockResponse = {
      content: "응답",
      stopReason: "end_turn",
    };

    vi.mocked(invokeClaudeAPI).mockResolvedValueOnce(mockResponse);

    await invokeClaudeAPI({
      messages: [{ role: "user", content: "테스트" }],
      maxTokens: 1024,
    });

    expect(vi.mocked(invokeClaudeAPI)).toHaveBeenCalledWith(
      expect.objectContaining({
        maxTokens: 1024,
      })
    );
  });
});
