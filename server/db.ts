import { and, desc, eq, gte, lt, getTableColumns, or, inArray, count, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";
import {
  appointments,
  consultMessages,
  consultSessions,
  csFaqs,
  csChatHistories,
  eventCodes,
  InsertAppointment,
  InsertConsultMessage,
  InsertConsultSession,
  InsertCsFaq,
  InsertCsChatHistory,
  InsertEventCode,
  InsertPayment,
  InsertSajuProfile,
  InsertUser,
  payments,
  sajuProfiles,
  sajuComparisons,
  InsertSajuComparison,
  users,
  namingServices,
  selfNamingHistories,
  popularNames,
  InsertNamingService,
  InsertSelfNamingHistory,
  InsertPopularName,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { pickUnconsumedPayment } from "./compatibilityEntitlement";
import { isOperatorEmail } from "../shared/const";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// Users
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    // 운영자 판정: (1) 명시적 role 지정 (2) OWNER_OPEN_ID 일치 (3) 운영자 이메일 일치
    // 카카오/네이버/지메일/다음 어느 소셜로 들어와도 운영자 이메일이면 admin 으로 승격한다.
    const isOwnerByOpenId = user.openId === ENV.ownerOpenId;
    const isOwnerByEmail = isOperatorEmail(user.email);
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (isOwnerByOpenId || isOwnerByEmail) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserProfile(
  userId: number,
  patch: Partial<{
    phone: string;
    nickname: string;
    realName: string;
    consentRecord: boolean;
    consentRecordAt: Date | null;
  }>,
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(patch).where(eq(users.id, userId));
}

/**
 * 운영자(admin) 계정 통합용 내부 userId 목록을 구한다.
 * 운영자는 카카오/지메일/네이버 등 여러 소셜 계정으로 로그인할 수 있는데,
 * 같은 사람이므로 어느 계정으로 들어와도 모든 운영자 계정의 데이터를 함께 보여준다.
 *
 * 운영자 식별 기준: role='admin' 이거나, ENV.adminOpenIds / ENV.adminEmails 에 해당.
 * 이 함수는 운영자 계정 전체의 내부 id 배열을 반환한다(중복 제거). 운영자가 한 명도
 * 없으면 빈 배열을 반환한다.
 */
export async function getOwnerUserIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const adminEmails = ENV.adminEmails.map((e) => e.toLowerCase());
  const adminOpenIds = ENV.adminOpenIds;

  // role=admin 인 계정
  const byRole = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  const ids = new Set<number>(byRole.map((r) => r.id));

  // openId 목록 매칭
  if (adminOpenIds.length > 0) {
    const rows = await db.select({ id: users.id }).from(users).where(inArray(users.openId, adminOpenIds));
    rows.forEach((r) => ids.add(r.id));
  }
  // email 목록 매칭 (대소문자 무시: 저장값이 소문자가 아닐 수 있어 전수 조회 후 필터)
  if (adminEmails.length > 0) {
    const all = await db.select({ id: users.id, email: users.email }).from(users);
    all.forEach((r) => {
      if (r.email && adminEmails.includes(r.email.toLowerCase())) ids.add(r.id);
    });
  }
  return Array.from(ids);
}

/**
 * 순수 규칙: 일반은 본인 id만, 운영자는 본인+운영자 전체 id를 합산(중복 제거).
 * DB 의존 없이 테스트 가능하도록 분리.
 */
export function computeOwnedUserIds(userId: number, isAdmin: boolean, ownerIds: number[]): number[] {
  if (!isAdmin) return [userId];
  const set = new Set<number>(ownerIds);
  set.add(userId);
  return Array.from(set);
}

/**
 * 순수 규칙: rowUserId 접근 허용 여부. null/undefined는 불허. 본인이면 허용.
 * 운영자면 운영자 계정 목록(ownerIds)에 포함될 때 허용.
 */
export function computeCanAccess(
  selfId: number,
  isAdmin: boolean,
  rowUserId: number | null | undefined,
  ownerIds: number[],
): boolean {
  if (rowUserId == null) return false;
  if (rowUserId === selfId) return true;
  if (!isAdmin) return false;
  return ownerIds.includes(rowUserId);
}

/**
 * 특정 사용자가 "자기 데이터로 조회할 내부 userId 목록"을 구한다.
 * - 일반 사용자: [본인 id] 만 반환 → 기존 동작과 완전히 동일.
 * - 운영자: 모든 운영자 계정 id 목록 반환 → 어느 소셜 계정으로 들어와도 데이터 통합.
 */
export async function resolveOwnedUserIds(userId: number, isAdmin: boolean): Promise<number[]> {
  if (!isAdmin) return [userId];
  const ownerIds = await getOwnerUserIds();
  return computeOwnedUserIds(userId, isAdmin, ownerIds);
}

// ============================================================================
// Saju Profiles
// ============================================================================

export async function createSajuProfile(input: InsertSajuProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [res] = await db.insert(sajuProfiles).values(input).$returningId();
  return res?.id;
}

export async function listSajuProfiles(userId: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const ids = Array.isArray(userId) ? userId : [userId];
  if (ids.length === 0) return [];
  return db
    .select()
    .from(sajuProfiles)
    .where(inArray(sajuProfiles.userId, ids))
    .orderBy(desc(sajuProfiles.updatedAt));
}

export async function getSajuProfileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(sajuProfiles).where(eq(sajuProfiles.id, id)).limit(1);
  return r[0];
}

export async function deleteSajuProfile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sajuProfiles).where(eq(sajuProfiles.id, id));
}

// ============================================================================
// Saju Comparisons (궁합)
// ============================================================================

export async function createSajuComparison(input: InsertSajuComparison) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [res] = await db.insert(sajuComparisons).values(input).$returningId();
  return res?.id;
}

export async function listSajuComparisons(userId: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const ids = Array.isArray(userId) ? userId : [userId];
  if (ids.length === 0) return [];
  return db
    .select()
    .from(sajuComparisons)
    .where(inArray(sajuComparisons.userId, ids))
    .orderBy(desc(sajuComparisons.createdAt));
}

/**
 * 사용자의 미사용 궁합 결제건 1개 조회.
 * paid 상태 + compatibility 플랜 이면서, 아직 어떤 궁합 분석에도 연결되지 않은(=소비 전) 결제건을 반환.
 * "결제 1건 = 분석 1회" 1:1 모델.
 */
export async function findUnconsumedCompatibilityPayment(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const paid = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.planType, "compatibility"),
        eq(payments.status, "paid"),
      ),
    )
    .orderBy(desc(payments.paidAt));
  if (paid.length === 0) return undefined;
  // 이미 궁합 분석에 소비된 paymentId 목록
  const used = await db
    .select({ paymentId: sajuComparisons.paymentId })
    .from(sajuComparisons)
    .where(eq(sajuComparisons.userId, userId));
  return pickUnconsumedPayment(
    paid,
    used.map((u) => u.paymentId),
  );
}

export async function getSajuComparisonById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(sajuComparisons).where(eq(sajuComparisons.id, id)).limit(1);
  return r[0];
}

/** 특정 사주 프로필이 포함된 궁합 기록 수 반환 */
export async function countCompatibilityByProfile(profileId: number, userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const r = await db
    .select({ id: sajuComparisons.id })
    .from(sajuComparisons)
    .where(
      and(
        eq(sajuComparisons.userId, userId),
        or(
          eq(sajuComparisons.profileAId, profileId),
          eq(sajuComparisons.profileBId, profileId),
        ),
      ),
    );
  return r.length;
}

export async function deleteSajuComparison(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sajuComparisons).where(eq(sajuComparisons.id, id));
}

// ============================================================================
// Payments
// ============================================================================

export async function createPayment(input: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [res] = await db.insert(payments).values(input).$returningId();
  return res?.id;
}

export async function markPaymentPaid(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(payments)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(payments.id, id));
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return r[0];
}

export async function listPaymentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt));
}

// ============================================================================
// Consult Sessions
// ============================================================================

export async function createConsultSession(input: InsertConsultSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [res] = await db.insert(consultSessions).values(input).$returningId();
  return res?.id;
}

/**
 * 질문 1회 차감 (원자적). 남은 질문이 있을 때만 usedTurns를 1 증가시킨다.
 * maxTurns가 null인 세션(시간제/마스터)은 차감 대상이 아니므로 항상 성공 처리(affected 무시).
 * 반환: { ok, remaining } — ok=false면 잔여 질문 소진.
 */
export async function consumeTurn(
  sessionId: number,
): Promise<{ ok: boolean; remaining: number | null }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const s = await getConsultSessionById(sessionId);
  if (!s) return { ok: false, remaining: 0 };
  // 시간제(마스터) 세션: 횟수 차감 없음
  if (s.maxTurns == null) return { ok: true, remaining: null };
  // 원자적 증가: usedTurns < maxTurns 조건을 WHERE에 걸어 동시 요청에도 초과 차감 방지
  await db
    .update(consultSessions)
    .set({ usedTurns: sql`${consultSessions.usedTurns} + 1` })
    .where(and(eq(consultSessions.id, sessionId), lt(consultSessions.usedTurns, s.maxTurns)));
  const after = await getConsultSessionById(sessionId);
  const used = after?.usedTurns ?? s.usedTurns;
  const max = after?.maxTurns ?? s.maxTurns;
  const remaining = Math.max(0, max - used);
  // 차감 전 used가 max 이상이면 실패
  const ok = s.usedTurns < s.maxTurns;
  return { ok, remaining };
}

export async function getConsultSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(consultSessions).where(eq(consultSessions.id, id)).limit(1);
  return r[0];
}

export async function listConsultSessionsByUser(userId: number | number[]) {
  const db = await getDb();
  if (!db) return [];
  const ids = Array.isArray(userId) ? userId : [userId];
  if (ids.length === 0) return [];
  const profilesB = alias(sajuProfiles, "profilesB");
  return db
    .select({
      ...getTableColumns(consultSessions),
      profileLabel: sajuProfiles.label,
      profileBLabel: profilesB.label,
    })
    .from(consultSessions)
    .leftJoin(sajuProfiles, eq(consultSessions.sajuProfileId, sajuProfiles.id))
    .leftJoin(profilesB, eq(consultSessions.sajuProfileBId, profilesB.id))
    .where(inArray(consultSessions.userId, ids))
    .orderBy(desc(consultSessions.startedAt));
}

export async function updateConsultSession(
  id: number,
  patch: Partial<{
    status: "active" | "expired" | "completed" | "awaiting_payment" | "approved";
    endedAt: Date | null;
    title: string | null;
    summary: string | null;
    sajuProfileId: number | null;
    additionalSajus: any;
    retain: boolean;
    purgeAfter: Date | null;
    startedAt: Date;
    expiresAt: Date;
    approvedAt: Date | null;
    firstEnteredAt: Date | null;
    enterBy: Date | null;
    maxTurns: number | null;
    usedTurns: number;
  }>,
) {
  const db = await getDb();
  if (!db) return;
  await db.update(consultSessions).set(patch).where(eq(consultSessions.id, id));
}

/**
 * 운영실(Admin)용: 입금 승인 대기 중인 세션 목록.
 * status='awaiting_payment'인 세션을 사용자/프로필/결제 정보와 함께 신청순으로 반환한다.
 */
export async function listAwaitingDepositSessions(limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      ...getTableColumns(consultSessions),
      profileLabel: sajuProfiles.label,
      userName: users.name,
      userEmail: users.email,
      paymentAmount: payments.amount,
      depositorName: payments.depositorName,
      depositorPhone: payments.depositorPhone,
      depositMemo: payments.depositMemo,
    })
    .from(consultSessions)
    .leftJoin(sajuProfiles, eq(consultSessions.sajuProfileId, sajuProfiles.id))
    .leftJoin(users, eq(consultSessions.userId, users.id))
    .leftJoin(payments, eq(consultSessions.paymentId, payments.id))
    .where(eq(consultSessions.status, "awaiting_payment"))
    .orderBy(desc(consultSessions.startedAt))
    .limit(limit);
}

/**
 * 자동 삭제 대상 세션 조회: purgeAfter가 설정되어 있고(비보관), 지정 시각을 지난 세션.
 * retain=true 세션은 purgeAfter가 null로 유지되므로 자연히 제외된다.
 */
export async function listSessionsToPurge(now: Date, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: consultSessions.id })
    .from(consultSessions)
    .where(and(eq(consultSessions.retain, false), lt(consultSessions.purgeAfter, now)))
    .limit(limit);
}

export async function deleteConsultSession(id: number) {
  const db = await getDb();
  if (!db) return;
  // 먼저 해당 세션의 모든 메시지 삭제
  await db.delete(consultMessages).where(eq(consultMessages.sessionId, id));
  // 그 다음 세션 삭제
  await db.delete(consultSessions).where(eq(consultSessions.id, id));
}

/**
 * 비보관 세션 중 삭제 예정 시각을 지난 것들을 일괄 삭제한다(메시지 포함).
 * 멱등적: 재실행되어도 이미 삭제된 것은 조회되지 않으므로 안전하다. 삭제된 세션 수를 반환.
 */
export async function purgeExpiredSessions(now = new Date(), limit = 200): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const targets = await listSessionsToPurge(now, limit);
  let deleted = 0;
  for (const t of targets) {
    await db.delete(consultMessages).where(eq(consultMessages.sessionId, t.id));
    await db.delete(consultSessions).where(eq(consultSessions.id, t.id));
    deleted += 1;
  }
  return deleted;
}

// ============================================================================
// Consult Messages
// ============================================================================

export async function appendConsultMessage(input: InsertConsultMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(consultMessages).values(input);
}

export async function listConsultMessages(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consultMessages)
    .where(eq(consultMessages.sessionId, sessionId))
    .orderBy(consultMessages.createdAt);
}

// ============================================================================
// Appointments
// ============================================================================

export async function createAppointment(input: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [res] = await db.insert(appointments).values(input).$returningId();
  return res?.id;
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return result[0];
}

export async function listAppointmentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(appointments)
    .where(eq(appointments.userId, userId))
    .orderBy(desc(appointments.preferredDate));
}

export async function listAllAppointments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments).orderBy(desc(appointments.createdAt));
}

export async function updateAppointment(
  id: number,
  patch: Partial<{
    status:
      | "requested"
      | "confirmed"
      | "payment_pending"
      | "paid"
      | "rejected"
      | "completed"
      | "cancelled";
    confirmedAt: Date | null;
    masterNote: string | null;
    depositAmount: number | null;
    depositAccountInfo: { bank: string; accountNumber: string; accountHolder: string } | null;
    paidAt: Date | null;
  }>,
) {
  const db = await getDb();
  if (!db) return;
  await db.update(appointments).set(patch).where(eq(appointments.id, id));
}

// ============================================================================
// Admin / Stats
// ============================================================================

export async function listRecentUsers(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
}

export async function getActiveSessionForUser(userId: number | number[]) {
  const db = await getDb();
  if (!db) return undefined;
  const ids = Array.isArray(userId) ? userId : [userId];
  if (ids.length === 0) return undefined;
  const now = new Date();
  const r = await db
    .select()
    .from(consultSessions)
    .where(
      and(
        inArray(consultSessions.userId, ids),
        eq(consultSessions.status, "active"),
        gte(consultSessions.expiresAt, now),
      ),
    )
    .orderBy(desc(consultSessions.startedAt))
    .limit(1);
  return r[0];
}

export async function updatePayment(
  id: number,
  patch: Partial<{
    status: "pending" | "paid" | "refunded" | "failed" | "awaiting_deposit";
    paymentMethod: string;
    externalPaymentId: string;
    paidAt: Date;
    depositorName: string;
    depositorPhone: string;
    depositMemo: string;
  }>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(payments).set(patch).where(eq(payments.id, id));
}

export async function deletePayment(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(payments).where(eq(payments.id, id));
}

// ============================================================================
// CS Chatbot
// ============================================================================

export async function listCsFaqs(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(csFaqs).where(eq(csFaqs.category, category));
  }
  return db.select().from(csFaqs);
}

export async function getCsFaqById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(csFaqs).where(eq(csFaqs.id, id)).limit(1);
  return r[0];
}

export async function saveCsChatHistory(input: InsertCsChatHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(csChatHistories).values(input);
  return result;
}

export async function listCsChatHistories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(csChatHistories)
    .where(eq(csChatHistories.userId, userId))
    .orderBy(desc(csChatHistories.createdAt));
}


// ============================================================================
// Event Codes (이벤트 상담 플랜 시크릿 코드)
// ============================================================================

/**
 * 이벤트 코드 생성 및 저장.
 * HUMAN + 1~1000 무작위 조합 100개 생성.
 */
export async function seedEventCodes(codes: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 기존 코드 삭제 (재생성)
  await db.delete(eventCodes);
  
  // 새 코드 삽입
  const insertData = codes.map((code) => ({
    code,
    isUsed: false,
  }));
  
  await db.insert(eventCodes).values(insertData);
  console.log(`[EventCodes] Seeded ${codes.length} codes`);
}

/**
 * 이벤트 코드 유효성 검증 및 사용 표시.
 * 코드가 유효하고 미사용 상태면 true 반환 후 사용 표시.
 */
export async function validateAndUseEventCode(code: string, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // 코드 조회
  const r = await db.select().from(eventCodes).where(eq(eventCodes.code, code)).limit(1);
  if (!r[0]) return false; // 코드 없음
  if (r[0].isUsed) return false; // 이미 사용됨
  
  // 코드 사용 표시
  await db
    .update(eventCodes)
    .set({
      isUsed: true,
      usedBy: userId,
      usedAt: new Date(),
    })
    .where(eq(eventCodes.code, code));
  
  return true;
}

/**
 * 이벤트 코드 목록 조회 (운영자용).
 */
export async function listEventCodes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(eventCodes).orderBy(desc(eventCodes.createdAt));
}

/**
 * 사용 가능한 이벤트 코드 개수.
 */
export async function countAvailableEventCodes(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const r = await db
    .select()
    .from(eventCodes)
    .where(eq(eventCodes.isUsed, false));
  return r.length;
}

// ============================================================================
// Refund Management
// ============================================================================

/**
 * 환불 요청 생성 또는 업데이트
 */
export async function requestRefund(
  paymentId: number,
  reason: string,
  refundAmount?: number
) {
  const db = await getDb();
  if (!db) return;
  
  const payment = await getPaymentById(paymentId);
  if (!payment) throw new Error("Payment not found");
  
  const finalRefundAmount = refundAmount || payment.amount;
  
  await db.update(payments).set({
    refundStatus: "requested",
    refundReason: reason,
    refundAmount: finalRefundAmount,
  }).where(eq(payments.id, paymentId));
}

/**
 * 환불 승인
 */
export async function approveRefund(paymentId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(payments).set({
    refundStatus: "approved",
  }).where(eq(payments.id, paymentId));
}

/**
 * 환불 처리 (실제 환불 진행)
 */
export async function processRefund(paymentId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(payments).set({
    refundStatus: "processing",
  }).where(eq(payments.id, paymentId));
}

/**
 * 환불 완료
 */
export async function completeRefund(paymentId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(payments).set({
    refundStatus: "completed",
    refundedAt: new Date(),
    status: "refunded",
  }).where(eq(payments.id, paymentId));
}

/**
 * 환불 거절
 */
export async function rejectRefund(paymentId: number, reason?: string) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(payments).set({
    refundStatus: "rejected",
    ...(reason ? { refundReason: reason } : {}),
  }).where(eq(payments.id, paymentId));
}

/**
 * 환불 요청 목록 조회 (운영자용)
 */
export async function listRefundRequests() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(payments)
    .where(
      inArray(payments.refundStatus, ["requested", "approved", "processing"])
    )
    .orderBy(desc(payments.createdAt));
}

/**
 * 사용자별 환불 이력 조회
 */
export async function listRefundHistoryByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        inArray(payments.refundStatus, ["completed", "rejected"])
      )
    )
    .orderBy(desc(payments.refundedAt));
}


// ============================================================================
// Revenue Statistics (매출 통계)
// ============================================================================

/**
 * 기간 내 모든 결제 raw 조회 (집계용).
 * 매출 통계는 이 raw 데이터를 shared/revenue 매핑으로 가공한다.
 * createdAt 기준 [from, to) 범위.
 */
export async function listPaymentsInRange(from: Date, to: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(payments)
    .where(and(gte(payments.createdAt, from), lt(payments.createdAt, to)))
    .orderBy(desc(payments.createdAt));
}

/**
 * 전체 결제 raw 조회 (집계용, 기간 무제한).
 * 데이터 규모가 커지면 listPaymentsInRange 사용 권장.
 */
export async function listAllPayments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).orderBy(desc(payments.createdAt));
}

// ============================================================================
// 공개 통계 (홈 사회적 증거 — 비로그인 접근 가능)
// ============================================================================

/**
 * 홈 화면에 공개 노출하는 과시용 집계 (실데이터, 조작 없음).
 * - totalUsers: 누적 총 회원 수
 * - totalSessions: 누적 상담 세션 수
 */
export async function getPublicStats(): Promise<{ totalUsers: number; totalSessions: number }> {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalSessions: 0 };
  const [u] = await db.select({ c: count() }).from(users);
  const [s] = await db.select({ c: count() }).from(consultSessions);
  return {
    totalUsers: Number(u?.c ?? 0),
    totalSessions: Number(s?.c ?? 0),
  };
}

// ============================================================================
// 운영 통계 (회원 수 / 신규 가입 / 상담 세션)
// ============================================================================

/**
 * 관리자 대시보드용 멤버십/이용 통계 집계.
 * - totalUsers: 누적 총 회원 수
 * - adminUsers: 관리자 계정 수 (참고용)
 * - newToday / newWeek / newMonth: 기간별 신규 가입자 수 (가입일 기준)
 * - totalSessions: 누적 상담 세션 수 (전체)
 * - sessionsToday: 오늘 시작된 상담 세션 수
 *
 * 방문객(PV/UV)은 별도 방문 추적 테이블이 없어 여기서 집계하지 않는다.
 * (외부 애널리틱스 연동 후 확장 예정)
 */
export async function getMembershipStats(now = new Date()) {
  const db = await getDb();
  if (!db) {
    return {
      totalUsers: 0,
      adminUsers: 0,
      newToday: 0,
      newWeek: 0,
      newMonth: 0,
      totalSessions: 0,
      sessionsToday: 0,
    };
  }

  // 기간 경계 계산 (서버 로컬 자정 기준)
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfToday);
  // 월요일 시작 (getDay: 0=일 ... 6=토)
  const day = startOfWeek.getDay();
  const diffToMonday = (day + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

  const countOf = async (table: typeof users | typeof consultSessions, where?: any): Promise<number> => {
    const q = db.select({ c: count() }).from(table as any);
    const rows = where ? await q.where(where) : await q;
    return Number(rows[0]?.c ?? 0);
  };

  const [
    totalUsers,
    adminUsers,
    newToday,
    newWeek,
    newMonth,
    totalSessions,
    sessionsToday,
  ] = await Promise.all([
    countOf(users),
    countOf(users, eq(users.role, "admin")),
    countOf(users, gte(users.createdAt, startOfToday)),
    countOf(users, gte(users.createdAt, startOfWeek)),
    countOf(users, gte(users.createdAt, startOfMonth)),
    countOf(consultSessions),
    countOf(consultSessions, gte(consultSessions.startedAt, startOfToday)),
  ]);

  return {
    totalUsers,
    adminUsers,
    newToday,
    newWeek,
    newMonth,
    totalSessions,
    sessionsToday,
  };
}
