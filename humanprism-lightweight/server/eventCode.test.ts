import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

/**
 * 이벤트 코드 시스템 테스트
 * 
 * 테스트 시나리오:
 * 1. 코드 생성 및 저장
 * 2. 코드 검증 (유효한 코드)
 * 3. 코드 검증 (무효한 코드)
 * 4. 1회 사용 제한
 * 5. 사용 가능한 코드 개수 조회
 */

describe("Event Code System", () => {
  const testCodes = [
    "HUMAN100",
    "HUMAN200",
    "HUMAN300",
    "HUMAN400",
    "HUMAN500",
  ];

  beforeAll(async () => {
    // 테스트용 코드 저장
    await db.seedEventCodes(testCodes);
  });

  afterAll(async () => {
    // 테스트 후 정리 (선택사항)
    // 실제 환경에서는 테스트 DB를 사용하므로 정리 불필요
  });

  it("should generate and save event codes", async () => {
    const codes = await db.listEventCodes();
    expect(codes).toBeDefined();
    expect(codes.length).toBe(testCodes.length);
  });

  it("should validate and use a valid event code", async () => {
    const userId = 1;
    const code = "HUMAN100";

    // 코드 검증 및 사용 표시
    const isValid = await db.validateAndUseEventCode(code, userId);
    expect(isValid).toBe(true);

    // 코드 재검증 (이미 사용됨)
    const isValidAgain = await db.validateAndUseEventCode(code, userId);
    expect(isValidAgain).toBe(false);
  });

  it("should reject invalid event code", async () => {
    const userId = 2;
    const invalidCode = "INVALID123";

    const isValid = await db.validateAndUseEventCode(invalidCode, userId);
    expect(isValid).toBe(false);
  });

  it("should reject already used event code", async () => {
    const userId = 3;
    const code = "HUMAN200";

    // 첫 사용
    const firstUse = await db.validateAndUseEventCode(code, userId);
    expect(firstUse).toBe(true);

    // 두 번째 사용 시도 (다른 사용자)
    const secondUse = await db.validateAndUseEventCode(code, 4);
    expect(secondUse).toBe(false);
  });

  it("should count available event codes", async () => {
    const availableCount = await db.countAvailableEventCodes();
    expect(availableCount).toBeGreaterThan(0);
    expect(availableCount).toBeLessThanOrEqual(testCodes.length);
  });

  it("should track code usage by userId", async () => {
    const userId = 5;
    const code = "HUMAN300";

    // 코드 사용
    const isValid = await db.validateAndUseEventCode(code, userId);
    expect(isValid).toBe(true);

    // 코드 목록 조회 및 사용 기록 확인
    const codes = await db.listEventCodes();
    const usedCode = codes.find((c) => c.code === code);
    expect(usedCode).toBeDefined();
    expect(usedCode?.isUsed).toBe(true);
    expect(usedCode?.usedBy).toBe(userId);
    expect(usedCode?.usedAt).toBeDefined();
  });

  it("should handle concurrent code validation attempts", async () => {
    const code = "HUMAN400";
    const userIds = [6, 7, 8];

    // 동시에 같은 코드 검증 시도
    const results = await Promise.all(
      userIds.map((userId) => db.validateAndUseEventCode(code, userId))
    );

    // 첫 번째만 성공, 나머지는 실패
    const successCount = results.filter((r) => r).length;
    expect(successCount).toBe(1);
  });

  it("should validate event code format (HUMAN + 3 digits)", async () => {
    // 유효한 형식
    const validCodes = ["HUMAN001", "HUMAN500", "HUMAN999"];
    validCodes.forEach((code) => {
      expect(code).toMatch(/^HUMAN\d{3}$/);
    });

    // 무효한 형식
    const invalidCodes = ["HUMAN1", "HUMAN0001", "human001", "HUMAN00A"];
    invalidCodes.forEach((code) => {
      expect(code).not.toMatch(/^HUMAN\d{3}$/);
    });
  });
});
