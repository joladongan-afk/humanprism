import { describe, it, expect, beforeAll } from "vitest";
import { invokeClaudeAPI } from "./claude-api";
import { ENV } from "./_core/env";

describe("Claude API Integration", () => {
  beforeAll(() => {
    if (!ENV.claudeApiKey) {
      console.warn("⚠️  CLAUDE_API_KEY not configured, skipping Claude API tests");
    }
  });

  it("should have CLAUDE_API_KEY configured", () => {
    expect(ENV.claudeApiKey).toBeTruthy();
    expect(ENV.claudeApiKey).toMatch(/^sk-ant-/);
  });

  it("should invoke Claude API successfully with simple message", async () => {
    if (!ENV.claudeApiKey) {
      console.log("Skipping: CLAUDE_API_KEY not configured");
      return;
    }

    const result = await invokeClaudeAPI({
      messages: [
        {
          role: "user",
          content: "한 글자로 답변해 주세요: 안녕?",
        },
      ],
      maxTokens: 100,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeTruthy();
    expect(typeof result.content).toBe("string");
    expect(result.stopReason).toBeDefined();
  });

  it("should invoke Claude API with system prompt", async () => {
    if (!ENV.claudeApiKey) {
      console.log("Skipping: CLAUDE_API_KEY not configured");
      return;
    }

    const result = await invokeClaudeAPI({
      systemPrompt: "You are a helpful Korean assistant. Always respond in Korean.",
      messages: [
        {
          role: "user",
          content: "안녕하세요?",
        },
      ],
      maxTokens: 200,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeTruthy();
    expect(typeof result.content).toBe("string");
  }, { timeout: 10000 });

  it("should handle multi-turn conversation", async () => {
    if (!ENV.claudeApiKey) {
      console.log("Skipping: CLAUDE_API_KEY not configured");
      return;
    }

    const result = await invokeClaudeAPI({
      messages: [
        {
          role: "user",
          content: "내 이름은 김철수입니다.",
        },
        {
          role: "assistant",
          content: "안녕하세요, 김철수님. 만나서 반갑습니다.",
        },
        {
          role: "user",
          content: "내 이름이 뭐라고 했지?",
        },
      ],
      maxTokens: 100,
    });

    expect(result).toBeDefined();
    expect(result.content).toBeTruthy();
    expect(result.content).toContain("김철수");
  });

  it("should return usage information", async () => {
    if (!ENV.claudeApiKey) {
      console.log("Skipping: CLAUDE_API_KEY not configured");
      return;
    }

    const result = await invokeClaudeAPI({
      messages: [
        {
          role: "user",
          content: "Hello",
        },
      ],
      maxTokens: 50,
    });

    expect(result.usage).toBeDefined();
    expect(result.usage?.inputTokens).toBeGreaterThan(0);
    expect(result.usage?.outputTokens).toBeGreaterThan(0);
  });
});
