// Gemini SDK v6
import { GoogleGenAI } from "@google/genai";

export type Role = "user" | "assistant";
export type Message = { role: Role; content: string };
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

const GEMINI_MODEL = "gemini-2.5-flash";

export async function invokeClaudeAPI(
  params: ClaudeInvokeParams
): Promise<ClaudeInvokeResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const ai = new GoogleGenAI({ apiKey });

  let systemText = "";
  if (params.cachedSystemPrompt) {
    systemText = params.cachedSystemPrompt;
    if (params.dynamicSystemPrompt?.trim())
      systemText += "\n\n" + params.dynamicSystemPrompt;
  } else if (params.systemPrompt) {
    systemText = params.systemPrompt;
  }

  const lastMsg = params.messages[params.messages.length - 1];
  const input = systemText
    ? systemText + "\n\n" + lastMsg.content
    : lastMsg.content;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: input,
      config: { maxOutputTokens: params.maxTokens ?? 2048 },
    });

    const text = response.text ?? "";
    if (!text) throw new Error("No text content in Gemini response");

    const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
    console.log(`[Gemini Usage] Input: ${inputTokens}, Output: ${outputTokens}`);

    return {
      content: text,
      stopReason: "stop",
      usage: { inputTokens, outputTokens },
    };
  } catch (err) {
    console.error("[Gemini API Exception]", err);
    throw err;
  }
}
