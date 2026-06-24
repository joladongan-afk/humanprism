/**
 * 비용 실측 프로브 — 상담 1회가 실제로 토큰을 얼마나 쓰는지, 캐시가 작동하는지 측정.
 * 운영 과금 진단용. 측정 후 삭제 가능.
 */
import { calculateSaju } from "./saju";
import { buildPersonalPromptLayers } from "./masterPrompt";
import { buildTemporalContext } from "./temporalContext";
import { invokeClaudeAPI } from "./claude-api";
import { searchRagChunks, formatRagContext } from "./rag-search";

function roughTokens(s: string): number {
  // 한글 혼합 기준 대략 추정(문자수/2.2). 정확치는 API usage가 알려줌.
  return Math.round(s.length / 2.2);
}

async function probe() {
  const saju = calculateSaju({
    year: 1978, month: 3, day: 22, hour: 6, minute: 30, gender: "male",
  });
  const layers = buildPersonalPromptLayers(saju as any, "deep");
  const cachedSystemPrompt = layers.cachedBlocks.join("\n\n");
  const userQuery = "내 배우자 운은 어떨 것 같아?";
  const dynamic = layers.dynamic + buildTemporalContext(userQuery);
  const ragChunks = searchRagChunks(userQuery, 3);
  const ragText = ragChunks.length ? formatRagContext(ragChunks) : "";
  const dynamicSystemPrompt = [dynamic, ragText].filter((s) => s && s.trim()).join("\n\n");

  console.log("=== 프롬프트 크기(문자수 / 추정토큰) ===");
  console.log(`고정(캐시대상) 블록: ${cachedSystemPrompt.length}자 ≈ ${roughTokens(cachedSystemPrompt)} tok`);
  console.log(`동적(비캐시) 블록 : ${dynamicSystemPrompt.length}자 ≈ ${roughTokens(dynamicSystemPrompt)} tok`);

  for (let i = 1; i <= 2; i++) {
    console.log(`\n=== 호출 ${i}회차 ===`);
    const t0 = Date.now();
    const r = await invokeClaudeAPI({
      messages: [{ role: "user", content: userQuery }],
      maxTokens: 2048,
      cachedSystemPrompt,
      dynamicSystemPrompt,
    });
    const ms = Date.now() - t0;
    const u = r.usage;
    console.log(`소요: ${ms}ms, 출력길이: ${r.content.length}자`);
    if (u) {
      console.log(`input=${u.inputTokens}, output=${u.outputTokens}, cacheRead=${u.cacheReadTokens}, cacheCreate=${u.cacheCreationTokens}`);
      // Sonnet 시세(USD/1M): in 3, out 15, cacheRead 0.3, cacheWrite 3.75
      const inT = u.inputTokens || 0, outT = u.outputTokens || 0;
      const cr = u.cacheReadTokens || 0, cc = u.cacheCreationTokens || 0;
      const nonCachedIn = Math.max(0, inT - cr);
      const usd = (nonCachedIn * 3 + cc * 3.75 + cr * 0.3 + outT * 15) / 1_000_000;
      console.log(`추정 비용: $${usd.toFixed(5)}  ≈ ${Math.round(usd * 1380)}원`);
    } else {
      console.log("usage 정보 없음");
    }
  }
}

probe().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
