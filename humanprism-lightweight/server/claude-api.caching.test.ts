import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * 분리형 프롬프트 캐싱 검증
 *
 * 상담 호출은 이제 Manus 내장 LLM(Forge, OpenAI 호환 /v1/chat/completions)을 통해
 * claude-sonnet-4-6 모델을 부른다. system 프롬프트는 messages 배열의 system 메시지로 전달되며,
 * Anthropic 프롬프트 캐싱을 위해 고정 블록에 cache_control: ephemeral 를 붙인다.
 *
 * - cachedSystemPrompt(고정)는 cache_control: ephemeral 가 붙는다
 * - dynamicSystemPrompt(가변)는 cache_control 없이 붙는다
 * - 단일 systemPrompt + enableCaching 의 기존 동작도 유지된다
 *
 * 실제 API를 호출하지 않도록 fetch를 모킹한다(크레딧 소모 없음).
 */

describe("Claude(내장 LLM) 분리형 프롬프트 캐싱", () => {
  let capturedBody: any = null;

  // messages 배열에서 system 메시지의 content를 꺼내는 헬퍼
  const systemContent = () => {
    const sys = capturedBody.messages.find((m: any) => m.role === "system");
    return sys ? sys.content : undefined;
  };

  beforeEach(() => {
    capturedBody = null;
    // 내장 LLM 키가 없으면 함수가 일찍 throw하므로 주입
    process.env.BUILT_IN_FORGE_API_KEY =
      process.env.BUILT_IN_FORGE_API_KEY || "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: any) => {
        capturedBody = JSON.parse(init.body);
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          // OpenAI 호환 응답 형식
          json: async () => ({
            choices: [
              {
                message: { role: "assistant", content: "ok" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              prompt_tokens_details: {
                cache_creation_tokens: 100,
                cached_tokens: 0,
              },
            },
          }),
        } as unknown as Response;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("모델은 claude-sonnet-4-6 이고, 내장 LLM 엔드포인트로 보낸다", async () => {
    const { invokeClaudeAPI } = await import("./claude-api");
    await invokeClaudeAPI({
      messages: [{ role: "user", content: "안녕" }],
      systemPrompt: "테스트",
    });
    expect(capturedBody.model).toBe("claude-sonnet-4-6");
    expect(Array.isArray(capturedBody.messages)).toBe(true);
  });

  it("cachedSystemPrompt는 cache_control ephemeral를 갖고, dynamic은 갖지 않는다", async () => {
    const { invokeClaudeAPI } = await import("./claude-api");
    await invokeClaudeAPI({
      messages: [{ role: "user", content: "안녕하세요" }],
      cachedSystemPrompt: "고정 페르소나 v4 (긴 프롬프트)",
      dynamicSystemPrompt: "가변 RAG 컨텍스트",
    });

    const sys = systemContent();
    expect(Array.isArray(sys)).toBe(true);
    expect(sys.length).toBe(2);

    // 첫 블록 = 고정, 캐시 제어 있음
    expect(sys[0].text).toContain("고정 페르소나");
    expect(sys[0].cache_control).toEqual({ type: "ephemeral" });

    // 둘째 블록 = 가변, 캐시 제어 없음
    expect(sys[1].text).toContain("가변 RAG");
    expect(sys[1].cache_control).toBeUndefined();
  });

  it("dynamicSystemPrompt가 비어 있으면 고정 블록만 보낸다", async () => {
    const { invokeClaudeAPI } = await import("./claude-api");
    await invokeClaudeAPI({
      messages: [{ role: "user", content: "안녕" }],
      cachedSystemPrompt: "고정 페르소나만",
      dynamicSystemPrompt: "",
    });

    const sys = systemContent();
    expect(sys.length).toBe(1);
    expect(sys[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("단일 systemPrompt + enableCaching 기존 동작이 유지된다", async () => {
    const { invokeClaudeAPI } = await import("./claude-api");
    await invokeClaudeAPI({
      messages: [{ role: "user", content: "안녕" }],
      systemPrompt: "단일 시스템 프롬프트",
      enableCaching: true,
    });

    const sys = systemContent();
    expect(Array.isArray(sys)).toBe(true);
    expect(sys.length).toBe(1);
    expect(sys[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("enableCaching이 없으면 system은 문자열로 전송된다", async () => {
    const { invokeClaudeAPI } = await import("./claude-api");
    await invokeClaudeAPI({
      messages: [{ role: "user", content: "안녕" }],
      systemPrompt: "캐싱 없는 단일 프롬프트",
    });

    expect(typeof systemContent()).toBe("string");
    expect(systemContent()).toBe("캐싱 없는 단일 프롬프트");
  });

  it("usage가 내장 LLM(OpenAI) 형식에서 올바르게 매핑된다", async () => {
    const { invokeClaudeAPI } = await import("./claude-api");
    const res = await invokeClaudeAPI({
      messages: [{ role: "user", content: "안녕" }],
      systemPrompt: "테스트",
    });
    expect(res.content).toBe("ok");
    expect(res.usage?.inputTokens).toBe(10);
    expect(res.usage?.outputTokens).toBe(5);
    expect(res.usage?.cacheCreationTokens).toBe(100);
  });
});
