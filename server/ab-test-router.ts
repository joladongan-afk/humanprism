import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { invokeClaudeAPI } from "./claude-api";
import { calculateSaju, lunarToSolar } from "./saju";
import { formatSajuForPrompt } from "./saju";
import { buildPersonalPromptLayers } from "./masterPrompt";
import { MASTER_PERSONA_V623 } from "./masterPromptV623";

const NEW_PRINCIPLE = `

## [Chapter2 추가 원리]
명식 전체를 검토하되, 답변은 가장 근거가 강한 중심 작동축을 중심으로 구성한다. 그 축이 현실에서 드러나는 중요한 모습은 충분히 보여주고, 중심을 흐리는 별도 해석은 출력하지 않는다. 명리 용어보다 사람이 바로 이해하는 현실 언어를 우선한다.`;

const QUESTION = "제 배우자 운은 어떤가요?";

const CASES = [
  { id: "B0002", year: 1980, month: 6, day: 4, hour: 12, gender: "female" as const },
  { id: "B0005", year: 1978, month: 8, day: 23, hour: 18, gender: "female" as const },
  { id: "B0014", year: 1969, month: 10, day: 3, hour: 16, gender: "female" as const },
];

export const abTestRouter = router({
  run: publicProcedure
    .input(z.object({ secret: z.string() }))
    .query(async ({ input }) => {
      if (input.secret !== "humanprism-ab-test-2026") {
        throw new Error("unauthorized");
      }

      const results: Record<string, string> = {};

      for (const c of CASES) {
        const saju = calculateSaju({
          year: c.year, month: c.month, day: c.day,
          hour: c.hour, minute: 0, gender: c.gender,
        });

        const { cachedBlocks, dynamic } = buildPersonalPromptLayers(saju, "taste");
        const sajuBlock = formatSajuForPrompt(saju);
        const dynamicFull = `${sajuBlock}\n\n${dynamic}`;

        const cachedPrompt = cachedBlocks.join("\n\n");
        const cachedPromptB = cachedPrompt.replace(MASTER_PERSONA_V623, MASTER_PERSONA_V623 + NEW_PRINCIPLE);

        const messages = [{ role: "user" as const, content: QUESTION }];

        // A: 기존
        const resA = await invokeClaudeAPI({
          messages,
          cachedSystemPrompt: cachedPrompt,
          dynamicSystemPrompt: dynamicFull,
          maxTokens: 1800,
        });
        results[`${c.id}_A`] = resA.content;

        // B: 추가 원리
        const resB = await invokeClaudeAPI({
          messages,
          cachedSystemPrompt: cachedPromptB,
          dynamicSystemPrompt: dynamicFull,
          maxTokens: 1800,
        });
        results[`${c.id}_B`] = resB.content;
      }

      return results;
    }),
});
