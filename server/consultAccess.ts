import { getDb } from "./db";
import { consultSessions, consultMessages } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * 운영자가 상담 메시지를 열람할 수 있는지 확인
 * - 세션이 존재하고
 * - allowMasterAccess가 true인 경우만 가능
 */
export async function canMasterAccessMessages(sessionId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const session = await db
    .select()
    .from(consultSessions)
    .where(eq(consultSessions.id, sessionId))
    .limit(1);

  if (!session.length) return false;
  return session[0].allowMasterAccess === true;
}

/**
 * 세션의 모든 메시지 조회 (권한 검증 후)
 */
export async function getSessionMessagesForMaster(sessionId: number) {
  const hasAccess = await canMasterAccessMessages(sessionId);
  if (!hasAccess) {
    throw new Error("Master access denied for this session");
  }

  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const messages = await db
    .select()
    .from(consultMessages)
    .where(eq(consultMessages.sessionId, sessionId))
    .orderBy(consultMessages.createdAt);

  return messages;
}

/**
 * 사용자가 상담 메시지 열람 동의 토글
 */
export async function toggleMasterAccess(sessionId: number, userId: number, allow: boolean) {
  // 세션 소유자 확인
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const session = await db
    .select()
    .from(consultSessions)
    .where(and(eq(consultSessions.id, sessionId), eq(consultSessions.userId, userId)))
    .limit(1);

  if (!session.length) {
    throw new Error("Session not found or unauthorized");
  }

  // 동의 상태 업데이트
  await db
    .update(consultSessions)
    .set({ allowMasterAccess: allow })
    .where(eq(consultSessions.id, sessionId));

  return { success: true, allowMasterAccess: allow };
}

/**
 * 운영자용: 모든 동의된 세션 목록 조회
 */
export async function getAccessibleSessionsForMaster() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const sessions = await db
    .select()
    .from(consultSessions)
    .where(eq(consultSessions.allowMasterAccess, true))
    .orderBy(consultSessions.createdAt);

  return sessions;
}
