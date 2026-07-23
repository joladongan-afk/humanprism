import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { invokeClaudeWithRag, previewRagSearch } from "./claude-api-rag";

describe("Claude API Consultation Performance", () => {
  // Increase timeout for Claude API calls (15s)
  const testTimeout = 15000;
  let startTime: number;
  let endTime: number;

  beforeAll(() => {
    console.log("\n=== Claude API Consultation Test Suite ===\n");
  });

  afterAll(() => {
    console.log("\n=== Test Suite Complete ===\n");
  });

  it("should search RAG chunks for sample query", () => {
    const query = "직업";
    const result = previewRagSearch(query);
    
    console.log(`\n📚 RAG Search Results for: "${query}"`);
    console.log(`   Total chunks found: ${result.totalResults}`);
    
    expect(result.totalResults).toBeGreaterThanOrEqual(0);
    expect(result.results).toBeInstanceOf(Array);
    
    result.results.forEach((r, i) => {
      console.log(`   [${i + 1}] ${r.section} > ${r.title}`);
      console.log(`       Tags: ${r.tags.join(", ")}`);
      console.log(`       Preview: ${r.contentPreview.substring(0, 100)}...`);
    });
  });

  it("should invoke Claude API with RAG context", async () => {
    // @ts-ignore - vitest timeout
    this.timeout?.(testTimeout);
    const messages = [
      {
        role: "user" as const,
        content: "안녕하세요. 저는 1990년 1월 1일 정오 서울 출생입니다. 제 사주에서 직업 방향성을 알고 싶습니다.",
      },
    ];

    const userQuery = "직업 추천 사주 분석";

    console.log(`\n🤖 Invoking Claude API with RAG...`);
    console.log(`   User Query: "${userQuery}"`);
    console.log(`   Message: "${messages[0].content.substring(0, 50)}..."`);

    startTime = Date.now();

    try {
      const { content: response } = await invokeClaudeWithRag(messages, userQuery, 1024);
      endTime = Date.now();

      const duration = endTime - startTime;
      console.log(`\n✅ Claude API Response Received`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Response length: ${response.length} chars`);
      console.log(`   Response preview: ${response.substring(0, 150)}...`);

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    } catch (error) {
      endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`\n❌ Claude API Error (${duration}ms):`);
      console.error(`   ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  it("should handle multi-turn consultation", async () => {
    // @ts-ignore - vitest timeout
    this.timeout?.(testTimeout);
    const messages = [
      {
        role: "user" as const,
        content: "안녕하세요. 저는 1990년 1월 1일 정오 서울 출생입니다.",
      },
      {
        role: "assistant" as const,
        content: "안녕하세요. 당신의 사주를 분석해드리겠습니다. 己巳년 丙子월 丙寅일 甲午시로 보이네요.",
      },
      {
        role: "user" as const,
        content: "제 직업 방향성과 앞으로의 운세를 알고 싶습니다.",
      },
    ];

    const userQuery = "직업 운세 대운 분석";

    console.log(`\n🔄 Multi-turn Consultation Test`);
    console.log(`   Total messages: ${messages.length}`);

    startTime = Date.now();

    try {
      const { content: response } = await invokeClaudeWithRag(messages, userQuery, 1024);
      endTime = Date.now();

      const duration = endTime - startTime;
      console.log(`\n✅ Multi-turn Response Received`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Response length: ${response.length} chars`);

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000);
    } catch (error) {
      endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`\n❌ Multi-turn Error (${duration}ms):`);
      console.error(`   ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });

  it("should handle active probing question", async () => {
    // @ts-ignore - vitest timeout
    this.timeout?.(testTimeout);
    const messages = [
      {
        role: "user" as const,
        content: "제 인생이 힘들어요. 어떻게 해야 할까요?",
      },
    ];

    const userQuery = "인생 상담 심리 분석";

    console.log(`\n💭 Active Probing Test (Emotional Query)`);
    console.log(`   User Query: "${userQuery}"`);

    startTime = Date.now();

    try {
      const { content: response } = await invokeClaudeWithRag(messages, userQuery, 1024);
      endTime = Date.now();

      const duration = endTime - startTime;
      console.log(`\n✅ Emotional Query Response Received`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Response preview: ${response.substring(0, 200)}...`);

      // Should include probing questions or empathetic response
      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(30000);
    } catch (error) {
      endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`\n❌ Emotional Query Error (${duration}ms):`);
      console.error(`   ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  });
});
