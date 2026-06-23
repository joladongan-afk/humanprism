import { describe, it, expect } from "vitest";

/**
 * 상담 AI 인증 검증.
 *
 * 과거에는 별도 발급한 CLAUDE_API_KEY로 Anthropic을 직접 호출했으나, 그 키가 만료·차단(403)되면
 * 상담이 통째로 멈추는 위험이 있어 Manus 내장 LLM(Forge)으로 일원화했다.
 * 따라서 이제 검증 대상은 외부 Anthropic 키가 아니라, 플랫폼이 항상 주입하는 내장 LLM 키다.
 *
 * 내장 LLM 엔드포인트(claude-sonnet-4-6)로 ping을 보내 인증이 통과(200)하는지 확인한다.
 */
describe("내장 LLM(Forge) 상담 인증", () => {
  it("is configured (BUILT_IN_FORGE_API_KEY non-empty)", () => {
    const key = process.env.BUILT_IN_FORGE_API_KEY ?? "";
    expect(key.length).toBeGreaterThan(0);
  });

  it("can authenticate against built-in LLM (claude model)", async () => {
    const key = process.env.BUILT_IN_FORGE_API_KEY ?? "";
    if (!key) throw new Error("BUILT_IN_FORGE_API_KEY missing");

    const base =
      (process.env.BUILT_IN_FORGE_API_URL ?? "").replace(/\/$/, "") ||
      "https://forge.manus.im";

    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 16,
        messages: [{ role: "user", content: "ping" }],
      }),
    });

    // 401/403 = 키 무효 → 반드시 실패시켜 재요청 유도
    expect([401, 403]).not.toContain(res.status);
    // 정상 인증이면 200
    expect(res.status).toBe(200);
  }, 30000);
});
