import {
  bigint,
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // 휴먼 프리즘 확장 컬럼
  phone: varchar("phone", { length: 32 }),
  nickname: varchar("nickname", { length: 64 }),
  realName: varchar("realName", { length: 64 }),
  consentRecord: boolean("consentRecord").default(false).notNull(),
  consentRecordAt: timestamp("consentRecordAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  loginCount: int("loginCount").default(0).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 사주 프로필 - 사용자가 입력한 생년월일시와 계산된 사주 데이터.
 * 한 사용자가 본인 + 가족 등 여러 사주를 저장할 수 있다.
 */
export const sajuProfiles = mysqlTable("sajuProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 64 }).notNull().default("본인"),
  realName: varchar("realName", { length: 64 }),
  gender: mysqlEnum("gender", ["male", "female"]).notNull(),
  calendarType: mysqlEnum("calendarType", ["solar", "lunar"]).default("solar").notNull(),
  isLeapMonth: boolean("isLeapMonth").default(false).notNull(),
  birthYear: int("birthYear").notNull(),
  birthMonth: int("birthMonth").notNull(),
  birthDay: int("birthDay").notNull(),
  birthHour: int("birthHour"), // null = 시 모름
  birthMinute: int("birthMinute"),
  birthplace: varchar("birthplace", { length: 128 }),
  isDst: boolean("isDst").default(false).notNull(),
  // 계산된 사주 데이터 JSON (년주/월주/일주/시주, 12신살, 대운, 대운수)
  sajuData: json("sajuData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SajuProfile = typeof sajuProfiles.$inferSelect;
export type InsertSajuProfile = typeof sajuProfiles.$inferInsert;

/**
 * 결제 기록.
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  planType: mysqlEnum("planType", [
    "free", // 01 원픽 무료 / 5분 (1아이디 1회)
    "taste", // 02 맛보기 / 15분 / 9,900원
    "event", // 03 이벤트 / 25분 / 무료 (YouTube 구독+후기)
    "deep", // 04 메인 상담 / 50분 / 30,000원
    "master_chat", // (레거시) 경청자 직접 채팅 / 60분 / 100,000원 (예약제)
    "master_offline", // 06 경청자 대면 상담 / 80분 / 200,000원 (예약제)
    "compatibility", // 07 궁합 분석 / 1회 무료 후 회당 4,900원
    "compatibility_chat", // 08 궁합 채팅 / 15분 / 4,900원
    "master_kakao_15", // 마스터 직접 채팅 15분 / 30,000원
    "master_kakao_30", // 마스터 직접 채팅 30분 / 50,000원
    "master_kakao_60", // 마스터 직접 채팅 60분 / 100,000원 (인원무제한)
    "self_naming", // 셀프 작명 1회 이용권 / 50,000원
    "master_naming", // 마스터 작명 1회 이용권 / 300,000원
  ]).notNull(),
  amount: int("amount").notNull(), // 원 단위
  // 기존 pending/paid/refunded/failed 보존 + awaiting_deposit(무통장 입금 대기) 추가
  status: mysqlEnum("status", ["pending", "paid", "refunded", "failed", "awaiting_deposit"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 64 }),
  // 무통장 입금 신청 시 고객이 남긴 정보 (nullable, 기존 행에 영향 없음)
  depositorName: varchar("depositorName", { length: 64 }), // 입금자 실명
  depositorPhone: varchar("depositorPhone", { length: 32 }), // 승인 알림을 받을 휴대폰 번호(소셜 로그인은 번호 미제공)
  depositMemo: text("depositMemo"), // 추가 메모(선택)
  externalPaymentId: varchar("externalPaymentId", { length: 128 }),
  // 환불 관련 필드
  refundStatus: mysqlEnum("refundStatus", ["none", "requested", "approved", "processing", "completed", "rejected"]).default("none").notNull(),
  refundReason: text("refundReason"), // 환불 사유
  refundAmount: int("refundAmount"), // 환불액 (원)
  refundedAt: timestamp("refundedAt"), // 환불 완료 시간
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  paidAt: timestamp("paidAt"),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * 상담 세션 - 결제로 활성화되는 상담 단위.
 */
export const consultSessions = mysqlTable("consultSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sajuProfileId: int("sajuProfileId"),
  sajuProfileBId: int("sajuProfileBId"), // 궁합 채팅 시 두 번째 사주 프로필 ID
  paymentId: int("paymentId"),
  planType: mysqlEnum("planType", ["free", "taste", "event", "deep", "master_chat", "master_offline", "compatibility_chat", "master_kakao_15", "master_kakao_30", "master_kakao_60", "self_naming", "master_naming"]).notNull(),
  durationMinutes: int("durationMinutes").notNull(), // (레거시) 시간제 세션용. 횟수제 세션에서는 마스터 시간제 상품만 사용.
  // 질문 횟수제: maxTurns=구매한 질문 횟수, usedTurns=사용한 질문 수. 남은 질문 = maxTurns - usedTurns.
  // maxTurns=null(또는 0)이고 durationMinutes만 있는 행은 레거시 시간제 세션으로 호환 처리.
  maxTurns: int("maxTurns"), // 구매한 질문 횟수 (3/10/20/30 등). null=시간제(마스터) 세션
  usedTurns: int("usedTurns").default(0).notNull(), // 사용한 질문 수
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  endedAt: timestamp("endedAt"),
  // 상태값: 기존 active/expired/completed 보존 + 입금트랙 상태 추가
  //  - awaiting_payment: 입금 신청됨, 마스터 승인 대기 (카운트 시작 안 함)
  //  - approved: 마스터 승인 완료, 고객 첫 입장 대기 (7일 유효기간, 카운트 시작 안 함)
  status: mysqlEnum("status", ["active", "expired", "completed", "awaiting_payment", "approved"]).default("active").notNull(),
  // 입금트랙 전용 타임스탬프 (모두 nullable, 기존 행에 영향 없음)
  approvedAt: timestamp("approvedAt"), // 마스터가 입금 확인·승인한 시각
  firstEnteredAt: timestamp("firstEnteredAt"), // 고객이 채팅방에 처음 입장한 시각 (이 시점부터 카운트)
  enterBy: timestamp("enterBy"), // 입장 유효기한 (승인 시각 + 7일). 이 시각 넘기면 소멸
  title: varchar("title", { length: 200 }),
  summary: text("summary"), // 세션 요약 (재방문 컨텍스트 주입용)
  allowMasterAccess: boolean("allowMasterAccess").default(false).notNull(), // 운영자 메시지 열람 동의
  additionalSajus: json("additionalSajus"), // 다중 사주: [{ id, label, sajuProfileId, addedAt }, ...]
  // 기록 보관 정책: 기본 비보관(종료 7일 후 자동 삭제). retain=true면 영구 보관.
  retain: boolean("retain").default(false).notNull(), // 사용자가 '보관'을 켜면 true
  purgeAfter: timestamp("purgeAfter"), // 이 시각 이후 자동 삭제 대상. null=삭제 예약 없음(보관 또는 미종료)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsultSession = typeof consultSessions.$inferSelect;
export type InsertConsultSession = typeof consultSessions.$inferInsert;

/**
 * 상담 메시지.
 */
export const consultMessages = mysqlTable("consultMessages", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsultMessage = typeof consultMessages.$inferSelect;
export type InsertConsultMessage = typeof consultMessages.$inferInsert;

/**
 * 마스터 직접 상담 예약.
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  paymentId: int("paymentId"),
  consultType: mysqlEnum("consultType", ["chat", "phone", "offline"]).notNull(),
  realName: varchar("realName", { length: 64 }).notNull(),
  nickname: varchar("nickname", { length: 64 }),
  phone: varchar("phone", { length: 32 }).notNull(),
  preferredDate: timestamp("preferredDate").notNull(),
  alternativeDate: timestamp("alternativeDate"),
  notes: text("notes"),
  status: mysqlEnum("status", [
    "requested", // 고객 예약 신청
    "confirmed", // 운영자 일정 확정 (입금 안내 전 단계)
    "payment_pending", // 확정 후 입금/결제 대기
    "paid", // 입금/결제 확인 완료
    "rejected", // 운영자 거절
    "completed", // 상담 완료
    "cancelled", // 취소
  ])
    .default("requested")
    .notNull(),
  confirmedAt: timestamp("confirmedAt"),
  masterNote: text("masterNote"), // 마스터 메모
  // 정산 시스템: 입금 관리
  depositAmount: int("depositAmount"), // 실제 입금액 (원)
  depositAccountInfo: json("depositAccountInfo").$type<{ bank: string; accountNumber: string; accountHolder: string }>(), // 계좌 정보
  paidAt: timestamp("paidAt"), // 입금 확인 시간
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * CS 챗봇 FAQ 데이터.
 */
export const csFaqs = mysqlTable("csFaqs", {
  id: varchar("id", { length: 64 }).primaryKey(), // "faq_001"
  category: varchar("category", { length: 64 }).notNull(), // "consultation", "booking", "pricing", "features", "general"
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  keywords: json("keywords").$type<string[]>().notNull(), // ["사주", "상담"]
  priority: int("priority").default(3).notNull(), // 1-5
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CsFaq = typeof csFaqs.$inferSelect;
export type InsertCsFaq = typeof csFaqs.$inferInsert;

/**
 * CS 챗봇 채팅 기록.
 */
export const csChatHistories = mysqlTable("csChatHistories", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId"),
  message: text("message").notNull(),
  response: text("response").notNull(),
  matchedFaqId: varchar("matchedFaqId", { length: 64 }),
  similarityScore: int("similarityScore"), // 0-100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CsChatHistory = typeof csChatHistories.$inferSelect;
export type InsertCsChatHistory = typeof csChatHistories.$inferInsert;

/**
 * 이벤트 상담 플랜 시크릿 코드 관리.
 * HUMAN + 1~1000 무작위 조합 (예: HUMAN847, HUMAN312)
 * 각 코드는 1회만 사용 가능 (1아이디 1회 제한과 함께 작동)
 */
export const eventCodes = mysqlTable("eventCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(), // "HUMAN847" 형식
  isUsed: boolean("isUsed").default(false).notNull(),
  usedBy: int("usedBy"), // 사용한 사용자 ID (null이면 미사용)
  usedAt: timestamp("usedAt"), // 사용 시각
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventCode = typeof eventCodes.$inferSelect;
export type InsertEventCode = typeof eventCodes.$inferInsert;

/**
 * 사주 비교/궁합 분석 결과.
 * 두 사주 프로필(본인 + 상대)을 골라 궁합을 분석하고 결과를 저장한다.
 * relationType: 관계 유형 (연인/배우자/가족/직장/친구 등)
 */
export const sajuComparisons = mysqlTable("sajuComparisons", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // 본인(A) 사주
  profileAId: int("profileAId").notNull(),
  labelA: varchar("labelA", { length: 64 }).notNull().default("본인"),
  // 상대(B) 사주
  profileBId: int("profileBId").notNull(),
  labelB: varchar("labelB", { length: 64 }).notNull().default("상대"),
  // 관계 유형: couple(연인/부부), parent(부모), child(자녀), family(형제/자매), work(직장), friend(친구), other(기타)
  relationType: mysqlEnum("relationType", ["couple", "parent", "child", "family", "work", "friend", "other"]) 
    .default("couple")
    .notNull(),
  // AI가 생성한 서사형 궁합 분석 결과
  result: text("result").notNull(),
  // 이 궁합을 결제로 본 경우 결제 ID (null = 무료 1회 또는 레거시)
  paymentId: int("paymentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SajuComparison = typeof sajuComparisons.$inferSelect;
export type InsertSajuComparison = typeof sajuComparisons.$inferInsert;


/**
 * 무료 이름감정 결과 저장 (7일 보관).
 * 사용자가 입력한 이름을 분석하여 자원오행·수리사격·불용문자를 판정한다.
 */
export const namingServices = mysqlTable("namingServices", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // 입력
  nameKorean: varchar("nameKorean", { length: 20 }).notNull(),
  nameHanja: varchar("nameHanja", { length: 20 }),
  surnameKorean: varchar("surnameKorean", { length: 10 }),
  surnameHanja: varchar("surnameHanja", { length: 10 }),

  // 결과: 자원오행 (한자의 오행 기반)
  jawonOhaeng: varchar("jawonOhaeng", { length: 5 }), // 木/火/土/金/水
  jawonResult: varchar("jawonResult", { length: 20 }), // "양호" / "보완 필요" 등


  // 결과: 수리사격 (획수 기반)
  suriNumber: int("suriNumber"), // 1-81
  suriGilhyung: varchar("suriGilhyung", { length: 10 }), // 吉/凶/半吉半凶
  suriResult: text("suriResult"),

  // 결과: 불용문자
  bulmyongFlag: boolean("bulmyongFlag").default(false).notNull(),
  bulmyongList: varchar("bulmyongList", { length: 100 }), // "死,病" 등

  // 종합 판정 및 코멘트
  overallResult: varchar("overallResult", { length: 20 }), // 최종 판정
  rollingComment: text("rollingComment"), // 랜덤 코멘트

  // 수리사격 4격 전체 (공유 페이지용)
  suri4Json: text("suri4Json"), // JSON: {won,hyeong,i,jeong} 각 {number,gilhyung,description}

  // 증서
  certificateNumber: varchar("certificateNumber", { length: 50 }), // "HPS-20260618-001" 형식
  certificatePdfUrl: varchar("certificatePdfUrl", { length: 500 }),

  namingConsentAt: timestamp("namingConsentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // 7일 후 자동 삭제 대상
});

export type NamingService = typeof namingServices.$inferSelect;
export type InsertNamingService = typeof namingServices.$inferInsert;

/**
 * 셀프작명 결과 저장 (1개월 보관).
 * 사용자가 성씨와 필요 오행을 선택하면 최대 30개의 이름 후보를 생성하고 저장한다.
 */
export const selfNamingHistories = mysqlTable("selfNamingHistories", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // 입력
  surnameKorean: varchar("surnameKorean", { length: 10 }).notNull(),
  surnameHanja: varchar("surnameHanja", { length: 10 }),
  requiredOhaeng: varchar("requiredOhaeng", { length: 5 }), // 木/火/土/金/水
  ohaengSelectionMethod: varchar("ohaengSelectionMethod", { length: 20 }), // "user_choice" / "auto_recommend" / "master_consultation"

  // 결과: 이름 후보 (JSON 배열)
  // [{ korean: "순희", hanja: "順姫", huneum: "순할 순 / 희 희", suri: 24, gilhyung: "吉" }, ...]
  nameCandidates: json("nameCandidates").$type<Array<{
    korean: string;
    hanja: string;
    huneum: string;
    suri: number;
    gilhyung: string;
  }>>(),

  // 사용자가 선택한 이름 (선택 시에만)
  selectedNameKorean: varchar("selectedNameKorean", { length: 20 }),
  selectedNameHanja: varchar("selectedNameHanja", { length: 20 }),

  // 증서
  certificateNumber: varchar("certificateNumber", { length: 50 }),
  certificatePdfUrl: varchar("certificatePdfUrl", { length: 500 }),

  namingConsentAt: timestamp("namingConsentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // 1개월 후 자동 삭제 대상
});

export type SelfNamingHistory = typeof selfNamingHistories.$inferSelect;
export type InsertSelfNamingHistory = typeof selfNamingHistories.$inferInsert;

/**
 * 인기이름 통계 (수동 입력용, 향후 자동 집계 가능).
 * 무료 이름감정과 셀프작명을 통해 사용자들이 감정/작명한 이름들의 순위를 관리한다.
 */
export const popularNames = mysqlTable("popularNames", {
  id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
  rank: int("rank").notNull(), // 순위 (1~100 등)
  nameKorean: varchar("nameKorean", { length: 20 }).notNull(),
  nameHanja: varchar("nameHanja", { length: 20 }),
  hanjaHuneum: varchar("hanjaHuneum", { length: 100 }), // "순(順) - 순할 순 / 희(姫) - 희 희"
  frequency: int("frequency").default(0).notNull(), // 사용 빈도 (참고용)
  category: mysqlEnum("category", ["male", "female", "unisex"]).default("unisex").notNull(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PopularName = typeof popularNames.$inferSelect;
export type InsertPopularName = typeof popularNames.$inferInsert;
