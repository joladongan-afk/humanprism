import crypto from "node:crypto";
import { ENV } from "./env";

/**
 * 솔라피(SOLAPI) SMS 발송 모듈.
 *
 * 전환 배경:
 *  - 알리고는 발송 IP 고정 정책이라 클라우드(엣지/서버리스) 환경에서 사용 불가.
 *  - 솔라피는 HMAC-SHA256 서명 인증 + "모든 IP 허용" 키로 발급하면 클라우드에서도 정상 작동.
 *  - 따라서 마누스 구독/플랫폼과 무관하게 독립적으로 문자 발송이 가능하다.
 *
 * 동작 원칙(기존과 동일):
 *  - 솔라피 키(SOLAPI_API_KEY/SOLAPI_API_SECRET/SOLAPI_SENDER)와 운영자 수신번호(MASTER_SMS_TO)가
 *    모두 주입되어야 실제 발송. (sendMasterSms 기준)
 *  - 고객 발송(sendCustomerSms)은 키 3종 + 고객 번호가 있어야 발송.
 *  - 하나라도 비어 있으면 발송하지 않고 콘솔 로그만 남긴 뒤 skip 반환 → 서버는 절대 죽지 않는다.
 *
 * 솔라피 인증 방식:
 *   Authorization: HMAC-SHA256 apiKey={KEY}, date={ISO8601}, salt={랜덤 hex}, signature={HMAC-SHA256(date+salt, SECRET)}
 * 발송 엔드포인트:
 *   POST https://api.solapi.com/messages/v4/send
 *   body: { message: { to, from, text } }
 *
 * 함수 시그니처(sendMasterSms / sendCustomerSms / isSmsConfigured)는 그대로 유지하여
 * 예약(appointmentNotification.ts)·입금 승인(depositRouter.ts) 등 호출부는 수정이 필요 없다.
 */

const SOLAPI_SEND_URL = "https://api.solapi.com/messages/v4/send";

export type SmsResult = {
  ok: boolean;
  skipped: boolean; // 키 미설정/번호 없음 등으로 발송을 건너뛴 경우 true
  detail?: string;
};

/** 솔라피 키 3종이 모두 설정되었는지 확인 (발신 가능 여부의 기본 조건). */
function isSolapiKeyConfigured(): boolean {
  return Boolean(
    ENV.solapiApiKey && ENV.solapiApiSecret && ENV.solapiSender,
  );
}

/**
 * 운영자 알림 발송 가능 여부.
 * - 솔라피 키 3종 + 운영자 수신번호(MASTER_SMS_TO)가 모두 있어야 한다.
 * - 기존 호출부 호환을 위해 isSmsConfigured 이름을 유지한다.
 */
function isSmsConfigured(): boolean {
  return isSolapiKeyConfigured() && Boolean(ENV.masterSmsTo);
}

/** 솔라피 HMAC-SHA256 Authorization 헤더를 생성한다. */
function buildSolapiAuthHeader(): string {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", ENV.solapiApiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${ENV.solapiApiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/** 전화번호에서 숫자만 남긴다(하이픈/공백 제거). */
function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^0-9]/g, "");
}

/**
 * 솔라피 단건 발송 공통 함수. text 길이에 따라 SMS/LMS는 솔라피가 자동 판별하므로 type을 명시하지 않는다.
 */
async function sendViaSolapi(to: string, text: string): Promise<SmsResult> {
  try {
    const res = await fetch(SOLAPI_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: buildSolapiAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          to,
          from: ENV.solapiSender,
          text,
        },
      }),
    });

    const data = (await res.json().catch(() => null)) as
      | {
          statusCode?: string;
          statusMessage?: string;
          groupId?: string;
          messageId?: string;
          errorCode?: string;
          errorMessage?: string;
        }
      | null;

    if (!res.ok) {
      const detail =
        data?.errorMessage ?? data?.statusMessage ?? `http ${res.status}`;
      console.warn(
        `[SMS] 솔라피 발송 실패 (HTTP ${res.status}): ${JSON.stringify(data)}`,
      );
      return { ok: false, skipped: false, detail };
    }

    // 단건 발송 성공 시 statusCode "2000"(접수 성공) 계열을 반환한다.
    const statusCode = data?.statusCode ?? "";
    const success =
      statusCode === "2000" ||
      statusCode.startsWith("2") ||
      Boolean(data?.messageId);
    if (!success) {
      console.warn(`[SMS] 솔라피 응답 실패: ${JSON.stringify(data)}`);
      return {
        ok: false,
        skipped: false,
        detail: data?.statusMessage ?? data?.errorMessage ?? "unknown",
      };
    }
    return { ok: true, skipped: false, detail: data?.messageId };
  } catch (error) {
    console.warn("[SMS] 솔라피 발송 중 오류:", error);
    return { ok: false, skipped: false, detail: String(error) };
  }
}

/**
 * 마스터(운영자)에게 SMS를 보낸다. 키/수신번호가 없으면 안전하게 skip한다.
 */
export async function sendMasterSms(message: string): Promise<SmsResult> {
  const msg = (message ?? "").trim();
  if (!msg) {
    return { ok: false, skipped: true, detail: "empty message" };
  }
  if (!isSmsConfigured()) {
    console.info(
      "[SMS] 솔라피 키 또는 운영자 수신번호 미설정 — 발송 생략. 메시지 미리보기:\n" +
        msg,
    );
    return { ok: false, skipped: true, detail: "solapi not configured" };
  }
  const to = normalizePhone(ENV.masterSmsTo);
  if (!to) {
    return { ok: false, skipped: true, detail: "no master phone" };
  }
  return sendViaSolapi(to, msg);
}

/**
 * 임의의 수신번호(고객)에게 SMS를 보낸다. 키가 없거나 번호가 없으면 안전하게 skip한다.
 * - 발신번호(from)는 운영자 등록 발신번호(SOLAPI_SENDER), to는 고객 번호.
 * - 소셜 로그인 특성상 번호가 없을 수 있으므로, 번호 미입력 시엔 조용히 skip한다.
 */
export async function sendCustomerSms(
  phone: string | null | undefined,
  message: string,
): Promise<SmsResult> {
  const to = normalizePhone(phone);
  const msg = (message ?? "").trim();
  if (!to) {
    console.info(
      "[SMS] 고객 번호 없음 — 발송 생략(고객이 연락처를 남기지 않음).",
    );
    return { ok: false, skipped: true, detail: "no customer phone" };
  }
  if (!msg) {
    return { ok: false, skipped: true, detail: "empty message" };
  }
  if (!isSolapiKeyConfigured()) {
    console.info(
      "[SMS] 솔라피 키 미설정 — 고객 발송 생략. 수신:" + to + "\n" + msg,
    );
    return { ok: false, skipped: true, detail: "solapi not configured" };
  }
  return sendViaSolapi(to, msg);
}

export { isSmsConfigured, isSolapiKeyConfigured, normalizePhone };
