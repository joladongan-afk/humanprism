import Anthropic from "@anthropic-ai/sdk";

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

const MODEL = "claude-sonnet-4-6";

export async function invokeClaudeAPI(
  params: ClaudeInvokeParams
): Promise<ClaudeInvokeResult> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY is not configured");

  const client = new Anthropic({ apiKey });

  type TextBlock = {
    type: "text";
    text: string;
    cache_control?: { type: "ephemeral" };
  };

  let systemBlocks: TextBlock[] | undefined;

  if (params.cachedSystemPrompt) {
    systemBlocks = [
      {
        type: "text",
        text: params.cachedSystemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ];
    if (params.dynamicSystemPrompt?.trim()) {
      systemBlocks.push({
        type: "text",
        text: params.dynamicSystemPrompt,
      });
    }
  } else if (params.systemPrompt) {
    systemBlocks = [
      {
        type: "text",
        text: params.systemPrompt,
        ...(params.enableCaching && { cache_control: { type: "ephemeral" } }),
      },
    ];
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: params.maxTokens ?? 4000,
      ...(systemBlocks && { system: systemBlocks }),
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    if (!text) throw new Error("No text content in Claude response");

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cacheCreationTokens =
      (response.usage as Record<string, number>).cache_creation_input_tokens ?? 0;
    const cacheReadTokens =
      (response.usage as Record<string, number>).cache_read_input_tokens ?? 0;

    if (cacheCreationTokens || cacheReadTokens) {
      console.log(
        `[Claude Caching] Creation: ${cacheCreationTokens}, Read: ${cacheReadTokens}, Input: ${inputTokens}, Output: ${outputTokens}`
      );
    } else {
      console.log(`[Claude Usage] Input: ${inputTokens}, Output: ${outputTokens}`);
    }

    return {
      content: text,
      stopReason: response.stop_reason ?? "stop",
      usage: { inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens },
    };
  } catch (err) {
    console.error("[Claude API Exception]", err);
    throw err;
  }
}
