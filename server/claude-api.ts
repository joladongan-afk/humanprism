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
  enableCaching?: boolean;
  cachedSystemPrompt?: string;
  dynamicSystemPrompt?: string;
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

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

export async function invokeClaudeAPI(
  params: ClaudeInvokeParams
): Promise<ClaudeInvokeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // 시스템 프롬프트 조합
  let systemText = "";
  if (params.cachedSystemPrompt) {
    systemText = params.cachedSystemPrompt;
    if (params.dynamicSystemPrompt?.trim()) {
      systemText += "\n\n" + params.dynamicSystemPrompt;
    }
  } else if (params.systemPrompt) {
    systemText = params.systemPrompt;
  }

  const chatMessages: Array<{ role: string; content: string }> = [];
  if (systemText) {
    chatMessages.push({ role: "system", content: systemText });
  }
  for (const m of params.messages) {
    chatMessages.push({ role: m.role, content: m.content });
  }

  const payload = {
    model: GEMINI_MODEL,
    max_tokens: params.maxTokens ?? 2048,
    messages: chatMessages,
  };

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Gemini API Error]", response.status, errorText);
      throw new Error(
        `Gemini API failed: ${response.status} ${response.statusText} – ${errorText}`
      );
    }

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
      };
    };

    const choice = result.choices?.[0];
    const rawContent = choice?.message?.content;

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
      throw new Error("No text content in Gemini response");
    }

    const inputTokens = result.usage?.prompt_tokens ?? 0;
    const outputTokens = result.usage?.completion_tokens ?? 0;

    console.log(`[Gemini Usage] Input: ${inputTokens} tokens, Output: ${outputTokens} tokens`);

    return {
      content: text,
      stopReason: choice?.finish_reason ?? "stop",
      usage: {
        inputTokens,
        outputTokens,
      },
    };
  } catch (err) {
    console.error("[Gemini API Exception]", err);
    throw err;
  }
}
