import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canMasterAccessMessages,
  getSessionMessagesForMaster,
  toggleMasterAccess,
  getAccessibleSessionsForMaster,
} from "./consultAccess";

// Mock getDb
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

describe("consultAccess - Master Message Viewing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("canMasterAccessMessages - should return true when allowMasterAccess is true", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, allowMasterAccess: true }]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const result = await canMasterAccessMessages(1);
    expect(result).toBe(true);
  });

  it("canMasterAccessMessages - should return false when allowMasterAccess is false", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, allowMasterAccess: false }]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const result = await canMasterAccessMessages(1);
    expect(result).toBe(false);
  });

  it("canMasterAccessMessages - should return false when session not found", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const result = await canMasterAccessMessages(999);
    expect(result).toBe(false);
  });

  it("getSessionMessagesForMaster - should throw error when access denied", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, allowMasterAccess: false }]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    await expect(getSessionMessagesForMaster(1)).rejects.toThrow(
      "Master access denied for this session"
    );
  });

  it("getSessionMessagesForMaster - should return messages when access allowed", async () => {
    const { getDb } = await import("./db");
    const mockMessages = [
      { id: 1n, sessionId: 1, role: "user", content: "안녕하세요" },
      { id: 2n, sessionId: 1, role: "assistant", content: "안녕하세요" },
    ];

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, allowMasterAccess: true }]),
      orderBy: vi.fn().mockResolvedValue(mockMessages),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const result = await getSessionMessagesForMaster(1);
    expect(result).toEqual(mockMessages);
  });

  it("toggleMasterAccess - should update allowMasterAccess to true", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 1, userId: 123, allowMasterAccess: false }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const result = await toggleMasterAccess(1, 123, true);
    expect(result).toEqual({ success: true, allowMasterAccess: true });
  });

  it("toggleMasterAccess - should throw error when session not found", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    await expect(toggleMasterAccess(999, 123, true)).rejects.toThrow(
      "Session not found or unauthorized"
    );
  });

  it("getAccessibleSessionsForMaster - should return all sessions with allowMasterAccess=true", async () => {
    const { getDb } = await import("./db");
    const mockSessions = [
      { id: 1, userId: 123, allowMasterAccess: true },
      { id: 2, userId: 456, allowMasterAccess: true },
    ];

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(mockSessions),
    };
    vi.mocked(getDb).mockResolvedValue(mockDb as any);

    const result = await getAccessibleSessionsForMaster();
    expect(result).toEqual(mockSessions);
  });
});
