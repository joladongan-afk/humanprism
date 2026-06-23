export const COOKIE_NAME = "app_session_id";
// 상담 기록 보관 정책: 비보관(retain=false) 세션은 종료 후 이 기간이 지나면 자동 삭제
export const RECORD_RETENTION_DAYS = 7;
export const RECORD_RETENTION_MS = 1000 * 60 * 60 * 24 * RECORD_RETENTION_DAYS;
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

// 횟수제 상담 이용 기한: 첫 입장(또는 첫 질문) 시점부터 이 기간 안에 남은 질문을 사용해야 한다.
// 기간이 지나면 남은 질문이 있어도 세션이 종료되며 미사용분은 환불되지 않는다.
export const USAGE_WINDOW_HOURS = 72; // 3일
export const USAGE_WINDOW_MS = 1000 * 60 * 60 * USAGE_WINDOW_HOURS;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// 운영자(경청자 본인) 계정 이메일 — 어떤 소셜 로그인으로 접속해도 운영자로 인식한다.
// 카카오톡 / 네이버 / 지메일 모두 동일인이다.
// 주의: 한메일(hanmail.net)과 다음(daum.net)은 동일 메일 계정이므로 둘 다 등록한다.
export const OPERATOR_EMAILS = [
  "joladongan@hanmail.net", // 카카오톡 (한메일)
  "joladongan@daum.net",    // 카카오톡 (다음 - 한메일과 동일 계정)
  "yomanflex@naver.com",    // 네이버
  "joladongan@gmail.com",   // 지메일
] as const;

// 한메일 <-> 다음 도메인은 동일 계정이므로 정규화 시 daum.net 으로 통일한다.
const DOMAIN_ALIASES: Record<string, string> = {
  "hanmail.net": "daum.net",
};

// 이메일을 비교 가능한 정규형으로 변환 (소문자 + 공백 제거 + 도메인 별칭 통합)
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  const normalized = email.trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex === -1) return normalized;
  const local = normalized.slice(0, atIndex);
  const domain = normalized.slice(atIndex + 1);
  const canonicalDomain = DOMAIN_ALIASES[domain] ?? domain;
  return `${local}@${canonicalDomain}`;
}

// 운영자 이메일 목록을 정규형으로 미리 변환한 집합
const OPERATOR_EMAIL_SET = new Set(OPERATOR_EMAILS.map((e) => normalizeEmail(e)));

// 주어진 이메일이 운영자 계정인지 판정 (대소문자/도메인 별칭 무시)
export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OPERATOR_EMAIL_SET.has(normalizeEmail(email));
}
