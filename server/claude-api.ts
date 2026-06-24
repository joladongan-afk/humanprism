// Gemini native API v4
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

const GEMINI_MODEL = "gemini-2.0-flash";

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

  // Gemini 네이티브 형식으로 변환
  // 시스템 프롬프트를 첫 번째 user 메시지 앞에 합침
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  
  let isFirstUser = true;
  for (const m of params.messages) {
    if (m.role === "user" && isFirstUser && systemText) {
      contents.push({
        role: "user",
        parts: [{ text: systemText + "\n\n" + m.content }],
      });
      isFirstUser = false;
    } else {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
      if (m.role === "user") isFirstUser = false;
    }
  }

  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: params.maxTokens ?? 2048,
    },
  };

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
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
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
        finishReason?: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    const candidate = result.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? "").join("");

    if (!text) {
      throw new Error("No text content in Gemini response");
    }

    const inputTokens = result.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = result.usageMetadata?.candidatesTokenCount ?? 0;

    console.log(`[Gemini Usage] Input: ${inputTokens} tokens, Output: ${outputTokens} tokens`);

    return {
      content: text,
      stopReason: candidate?.finishReason ?? "stop",
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
