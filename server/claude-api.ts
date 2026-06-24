import { ENV } from "./_core/env";

export type Role = "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
};

export type ClaudeInvokeParams = {
  messages: Message[];
  maxTokens?: number;
  systemPrompt?: string;
  enableCaching?: boolean; // 프롬프트 캐싱 활성화 플래그
  // 분리형 캐싱(권장): 고정 부분(페르소나 등)은 캐시, 가변 부분(RAG)은 캐시 밖.
  // cachedSystemPrompt가 주어지면 systemPrompt는 무시되고 이 두 필드로 system 블록을 구성한다.
  cachedSystemPrompt?: string; // 자주 변하지 않는 긴 프롬프트(캐시 대상)
  dynamicSystemPrompt?: string; // 매 호출마다 바뀌는 프롬프트(캐시 안 함, 예: RAG 컨텍스트)
};

export type ClaudeInvokeResult = {
  content: string;
  stopReason: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
};

// 상담에 사용할 모델 — 내장 LLM(Forge) 카탈로그에 동일 모델이 존재한다.
const MODEL = "claude-sonnet-4-6";

/**
 * 상담 응답 생성.
 *
 * 과거에는 Anthropic(api.anthropic.com)을 별도 발급 키(CLAUDE_API_KEY)로 직접 호출했으나,
 * 그 키가 만료·권한차단(403)되면 상담이 통째로 멈추는 위험이 있었다.
 * 이제는 플랫폼에 항상 주입되는 Manus 내장 LLM(Forge) 엔드포인트를 통해 동일 모델을 호출한다.
 *  - 별도 외부 키 관리 불필요(만료 리스크 제거)
 *  - 모델/페르소나/프롬프트 캐싱(cache_control) 동작은 그대로 유지
 *
 * Forge는 OpenAI 호환 /v1/chat/completions 규약을 쓰므로, system 프롬프트는 messages의
 * system 메시지로 전달한다. Anthropic 프롬프트 캐싱을 쓰려면 content를 블록 배열로 주고
 * cache_control: { type: "ephemeral" } 를 붙인다(Forge가 그대로 전달).
 */
export async function invokeClaudeAPI(
  params: ClaudeInvokeParams
): Promise<ClaudeInvokeResult> {
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const apiUrl =
    (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
      ? ENV.forgeApiUrl.replace(/\/$/, "")
      : "https://forge.manus.im") + "/v1/chat/completions";

  // system 메시지(캐싱 블록 포함)를 구성한다.
  type ContentBlock = {
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
  };
  let systemMessage:
    | { role: "system"; content: string | ContentBlock[] }
    | null = null;

  if (params.cachedSystemPrompt) {
    // 우선순위 1: 분리형 캐싱 — 고정(캐시) + 가변(비캐시) 블록
    const blocks: ContentBlock[] = [
      {
        type: "text",
        text: params.cachedSystemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ];
    if (params.dynamicSystemPrompt && params.dynamicSystemPrompt.trim()) {
      blocks.push({ type: "text", text: params.dynamicSystemPrompt });
    }
    systemMessage = { role: "system", content: blocks };
  } else if (params.systemPrompt) {
    // 우선순위 2: 단일 프롬프트
    if (params.enableCaching) {
      systemMessage = {
        role: "system",
        content: [
          {
            type: "text",
            text: params.systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
      };
    } else {
      systemMessage = { role: "system", content: params.systemPrompt };
    }
  }

  const chatMessages: Array<Record<string, unknown>> = [];
  if (systemMessage) chatMessages.push(systemMessage);
  for (const m of params.messages) {
    chatMessages.push({ role: m.role, content: m.content });
  }

  const payload: Record<string, unknown> = {
    model: MODEL,
    max_tokens: params.maxTokens ?? 2048,
    messages: chatMessages,
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Claude(LLM) API Error]", response.status, errorText);
      throw new Error(
        `Claude API failed: ${response.status} ${response.statusText} – ${errorText}`
      );
    }

    // OpenAI 호환 응답 파싱
    const result = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ type: string; text?: string }>;
        };
        finish_reason?: string | null;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        // 일부 게이트웨이는 캐싱 토큰을 detail에 담아 전달할 수 있다(있으면 사용, 없으면 0).
        prompt_tokens_details?: {
          cached_tokens?: number;
          cache_creation_tokens?: number;
        };
      };
    };

    const choice = result.choices?.[0];
    const rawContent = choice?.message?.content;

    // content가 문자열이거나 블록 배열일 수 있다 — 텍스트만 모은다.
    let text = "";
    if (typeof rawContent === "string") {
      text = rawContent;
    } else if (Array.isArray(rawContent)) {
      text = rawContent
        .filter((c) => c && c.type === "text" && typeof c.text === "string")
        .map((c) => c.text as string)
        .join("");
    }

    if (!text) {
      throw new Error("No text content in LLM response");
    }

    const inputTokens = result.usage?.prompt_tokens ?? 0;
    const outputTokens = result.usage?.completion_tokens ?? 0;
    const cacheReadTokens =
      result.usage?.prompt_tokens_details?.cached_tokens ?? 0;
    const cacheCreationTokens =
      result.usage?.prompt_tokens_details?.cache_creation_tokens ?? 0;

    if (cacheCreationTokens || cacheReadTokens) {
      console.log(
        `[Claude Caching] Creation: ${cacheCreationTokens} tokens, ` +
          `Read: ${cacheReadTokens} tokens, ` +
          `Input: ${inputTokens} tokens, Output: ${outputTokens} tokens`
      );
    } else {
      console.log(
        `[Claude Usage] Input: ${inputTokens} tokens, Output: ${outputTokens} tokens`
      );
    }

    return {
      content: text,
      stopReason: choice?.finish_reason ?? "stop",
      usage: result.usage
        ? {
            inputTokens,
            outputTokens,
            cacheCreationTokens,
            cacheReadTokens,
          }
        : undefined,
    };
  } catch (err) {
    console.error("[Claude(LLM) API Exception]", err);
    throw err;
  }
}
