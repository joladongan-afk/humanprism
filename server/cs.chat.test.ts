import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("CS Chatbot Router", () => {
  describe("cs.chat", () => {
    it("should return a response for a valid message", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.cs.chat({
        message: "사주 상담이 뭐예요?",
      });

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe("string");
    });

    it("should return related FAQs when similarity is low", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.cs.chat({
        message: "아무거나 물어봅니다",
      });

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.relatedFaqs).toBeDefined();
      expect(Array.isArray(result.relatedFaqs)).toBe(true);
    });


  });

  describe("cs.getFaqs", () => {
    it("should return all FAQs when no category is specified", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.cs.getFaqs({});

      expect(result).toBeDefined();
      expect(result.faqs).toBeDefined();
      expect(Array.isArray(result.faqs)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });

    it("should return FAQs for a specific category", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.cs.getFaqs({
        category: "consultation",
      });

      expect(result).toBeDefined();
      expect(result.faqs).toBeDefined();
      expect(Array.isArray(result.faqs)).toBe(true);
      result.faqs.forEach((faq: any) => {
        expect(faq.category).toBe("consultation");
      });
    });
  });

  describe("cs.saveChatHistory", () => {
    it("should save chat history for authenticated users", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.cs.saveChatHistory({
        message: "테스트 메시지",
        response: "테스트 응답",
        matchedFaqId: "faq-1",
        similarityScore: 85,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should reject unauthenticated users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.cs.saveChatHistory({
          message: "테스트 메시지",
          response: "테스트 응답",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Please login");
      }
    });
  });

  describe("cs.getChatHistory", () => {
    it("should return chat history for authenticated users", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.cs.getChatHistory();

      expect(result).toBeDefined();
      expect(result.histories).toBeDefined();
      expect(Array.isArray(result.histories)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it("should reject unauthenticated users", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.cs.getChatHistory();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Please login");
      }
    });
  });
});
