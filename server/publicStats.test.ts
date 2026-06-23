import { describe, it, expect } from "vitest";
import { getPublicStats } from "./db";

describe("getPublicStats", () => {
  it("총 회원 수와 누적 상담 세션 수를 음수가 아닌 정수로 반환한다", async () => {
    const stats = await getPublicStats();
    expect(stats).toHaveProperty("totalUsers");
    expect(stats).toHaveProperty("totalSessions");
    expect(Number.isInteger(stats.totalUsers)).toBe(true);
    expect(Number.isInteger(stats.totalSessions)).toBe(true);
    expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
    expect(stats.totalSessions).toBeGreaterThanOrEqual(0);
  });
});
