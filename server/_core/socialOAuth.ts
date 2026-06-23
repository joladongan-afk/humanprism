import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { deriveSessionName } from "./oauth";
import { sdk } from "./sdk";
import { ENV } from "./env";

/**
 * 소셜 로그인 사용자의 관리자 여부를 판정한다. (순수 함수 — 테스트 가능)
 * openId가 관리자 목록에 있거나, 이메일이 관리자 이메일 목록에 있으면 admin.
 * 이메일 비교는 대소문자를 무시하고 공백을 제거해 오타/표기 차이에 강인하게 맞춘다.
 */
export function resolveRole(
  openId: string | null | undefined,
  email: string | null | undefined,
  adminOpenIds: string[],
  adminEmails: string[],
): "admin" | "user" {
  const normId = (openId ?? "").trim();
  if (normId && adminOpenIds.some(id => id.trim() === normId)) return "admin";

  const normEmail = (email ?? "").trim().toLowerCase();
  if (normEmail && adminEmails.some(e => e.trim().toLowerCase() === normEmail)) return "admin";

  return "user";
}

/** state 서명용 쿠키 이름(제공자별). */
const STATE_COOKIE = {
  kakao: "hp_oauth_state_kakao",
  naver: "hp_oauth_state_naver",
} as const;

/**
 * CSRF 방어용 state 생성·검증 유틸.
 * 임의의 nonce를 JWT_SECRET으로 HMAC 서명해 "{nonce}.{sig}" 형태로 만든다.
 * authorize 요청 시 쿼리와 서명 쿠키에 동일한 값을 실고, callback에서 둘을 대조한다.
 */
export function signState(nonce: string, secret: string = ENV.cookieSecret): string {
  const sig = crypto.createHmac("sha256", secret).update(nonce).digest("hex");
  return `${nonce}.${sig}`;
}

/** 서명된 state가 유효하고(변조 없음), 기대한 쿼키 값과 일치하는지 확인한다. */
export function verifyState(
  stateFromQuery: string | undefined | null,
  stateFromCookie: string | undefined | null,
  secret: string = ENV.cookieSecret,
): boolean {
  if (!stateFromQuery || !stateFromCookie) return false;
  if (stateFromQuery !== stateFromCookie) return false;
  const [nonce, sig] = stateFromQuery.split(".");
  if (!nonce || !sig) return false;
  const expected = crypto.createHmac("sha256", secret).update(nonce).digest("hex");
  // 길이가 다르면 timingSafeEqual이 throw하므로 먼저 검사.
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function newState(): string {
  return signState(crypto.randomBytes(16).toString("hex"));
}

function readCookie(req: Request, name: string): string | undefined {
  const parsed = parseCookieHeader(req.headers.cookie ?? "");
  return parsed[name];
}

/**
 * 카카오/네이버 간편 로그인 라우트.
 *
 * 기존 Manus OAuth(`/api/oauth/callback`)와 병행 동작한다.
 * - 인가 요청:  /api/oauth/{provider}            → 제공자 인증 페이지로 302
 * - 콜백:       /api/oauth/{provider}/callback   → code 교환 → 사용자정보 → 세션 쿠키 발급 → "/"
 *
 * 사용자 식별(openId)은 제공자별 네임스페이스를 붙여 Manus 계정과 충돌하지 않게 한다.
 *   카카오: "kakao:{회원번호}"  /  네이버: "naver:{고유 id}"
 *
 * 키가 아직 설정되지 않은 경우, 사용자에게 친절한 안내 화면을 보여주고 종료한다.
 */

// 재배포 트리거(2026-06-11): 네이버 Client ID/Secret을 실제 앱 값(hTDuQ6e…)으로 교체한
// 환경변수 갱신을 운영에 확실히 반영하기 위한 무해한 변경. 동작/디자인 변화 없음.
type Provider = "kakao" | "naver";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/** 헤더 값이 배열/콤마 결합 문자열로 와도 첫 번째 값만 안전하게 꺼낸다. */
function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]?.split(",")[0]?.trim();
  return value?.split(",")[0]?.trim() || undefined;
}

/**
 * 현재 요청의 외부 origin(https://host)을 안전하게 추론한다.
 * Cloudflare/프록시 뒤에서는 req.headers.host 가 내부 주소(run.app)로 잡히므로
 * 외부에서 실제로 접속한 도메인이 담기는 x-forwarded-host 를 최우선으로 사용한다.
 */
export function getOrigin(req: Request): string {
  // 1순위: 운영 공개 도메인이 명시돼 있으면 그대로 사용한다.
  //   (Cloudflare/Cloud Run 뒤에서는 host / x-forwarded-host 모두 내부 주소(run.app)로
  //    들어오는 경우가 있어, 헤더만으로는 외부 도메인을 알 수 없기 때문이다.)
  if (ENV.publicBaseUrl) return ENV.publicBaseUrl;

  // 2순위(로컬/미설정): 헤더에서 추론. x-forwarded-host > host 순.
  const proto =
    firstHeader(req.headers["x-forwarded-proto"]) || req.protocol || "https";
  const host =
    firstHeader(req.headers["x-forwarded-host"]) ||
    firstHeader(req.headers.host) ||
    "";
  return `${proto}://${host}`;
}

function redirectUriFor(req: Request, provider: Provider): string {
  return `${getOrigin(req)}/api/oauth/${provider}/callback`;
}

/** 키 미설정 시 보여줄 간단한 안내 페이지(한국어). */
function sendSetupNeeded(res: Response, provider: Provider) {
  const label = provider === "kakao" ? "카카오" : "네이버";
  res
    .status(503)
    .type("html")
    .send(
      `<!doctype html><html lang="ko"><head><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width, initial-scale=1">` +
        `<title>${label} 로그인 준비 중</title></head>` +
        `<body style="font-family:system-ui,'Apple SD Gothic Neo',sans-serif;background:#f7f4ee;color:#2a2520;` +
        `display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;">` +
        `<div style="max-width:420px;padding:2rem;text-align:center;line-height:1.7;">` +
        `<h1 style="font-size:1.25rem;margin-bottom:0.75rem;">${label} 간편 로그인 준비 중입니다</h1>` +
        `<p style="color:#6b6258;font-size:0.95rem;">${label} 개발자 콘솔에서 발급한 키가 아직 등록되지 않았습니다.<br/>` +
        `키 등록이 완료되면 바로 이용하실 수 있습니다.</p>` +
        `<a href="/" style="display:inline-block;margin-top:1.5rem;padding:0.6rem 1.4rem;background:#1a1714;` +
        `color:#fff;border-radius:8px;text-decoration:none;font-size:0.9rem;">홈으로 돌아가기</a>` +
        `</div></body></html>`,
    );
}

// ── 카카오 ────────────────────────────────────────────────────────────────

async function kakaoExchangeToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: ENV.kakaoRestApiKey,
    redirect_uri: redirectUri,
    code,
  });
  if (ENV.kakaoClientSecret) body.set("client_secret", ENV.kakaoClientSecret);

  const { data } = await axios.post(
    "https://kauth.kakao.com/oauth/token",
    body.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    },
  );
  return data.access_token as string;
}

export type SocialUser = {
  openId: string;
  name: string | null;
  email: string | null;
};

/** 카카오 /v2/user/me 응답을 내부 사용자 형태로 정규화한다. (네트워크와 분리되어 테스트 가능) */
export function mapKakaoUser(data: any): SocialUser {
  const account = data?.kakao_account ?? {};
  const profile = account.profile ?? {};
  return {
    openId: `kakao:${data?.id}`,
    name: profile.nickname ?? null,
    email: account.email ?? null,
  };
}

async function kakaoFetchUser(accessToken: string): Promise<SocialUser> {
  const { data } = await axios.get("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return mapKakaoUser(data);
}

// ── 네이버 ────────────────────────────────────────────────────────────────

async function naverExchangeToken(
  code: string,
  state: string,
): Promise<string> {
  const { data } = await axios.get("https://nid.naver.com/oauth2.0/token", {
    params: {
      grant_type: "authorization_code",
      client_id: ENV.naverClientId,
      client_secret: ENV.naverClientSecret,
      code,
      state,
    },
  });
  return data.access_token as string;
}

/** 네이버 /v1/nid/me 응답을 내부 사용자 형태로 정규화한다. (네트워크와 분리되어 테스트 가능) */
export function mapNaverUser(data: any): SocialUser {
  const r = data?.response ?? {};
  return {
    openId: `naver:${r.id}`,
    name: r.nickname ?? r.name ?? null,
    email: r.email ?? null,
  };
}

async function naverFetchUser(accessToken: string): Promise<SocialUser> {
  const { data } = await axios.get("https://openapi.naver.com/v1/nid/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return mapNaverUser(data);
}

// ── 공통 세션 발급 ──────────────────────────────────────────────────────────

async function issueSession(
  req: Request,
  res: Response,
  provider: Provider,
  user: SocialUser,
) {
  // 운영자 이메일 또는 openId 기반 식별
  const role = resolveRole(user.openId, user.email, ENV.adminOpenIds, ENV.adminEmails);
  if (role === "admin") {
    console.log(`[OAuth] Admin recognized: openId=${user.openId}, email=${user.email}`);
  }

  // openId 로깅 (나중에 운영자가 제공할 때 사용)
  console.log(`[OAuth] Social login: provider=${provider}, openId=${user.openId}, email=${user.email}, role=${role}`);

  await db.upsertUser({
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: provider,
    lastSignedIn: new Date(),
    role,
  });

  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: deriveSessionName({
      name: user.name,
      email: user.email,
      openId: user.openId,
    }),
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });
  res.redirect(302, "/");
}

export function registerSocialOAuthRoutes(app: Express) {
  // ── 카카오: 인가 요청 ──
  app.get("/api/oauth/kakao", (req: Request, res: Response) => {
    if (!ENV.kakaoRestApiKey) return sendSetupNeeded(res, "kakao");
    const redirectUri = redirectUriFor(req, "kakao");
    const state = newState();
    res.cookie(STATE_COOKIE.kakao, state, {
      ...getSessionCookieOptions(req),
      maxAge: 5 * 60 * 1000, // 5분
    });
    const url = new URL("https://kauth.kakao.com/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", ENV.kakaoRestApiKey);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    res.redirect(302, url.toString());
  });

  // ── 카카오: 콜백 ──
  app.get("/api/oauth/kakao/callback", async (req: Request, res: Response) => {
    if (!ENV.kakaoRestApiKey) return sendSetupNeeded(res, "kakao");
    res.clearCookie(STATE_COOKIE.kakao, { path: "/" });
    // 사용자 취소 등 제공자 에러는 홈으로 부드럽게 안내.
    if (getQueryParam(req, "error")) {
      return res.redirect(302, "/?login=cancelled");
    }
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const cookieState = readCookie(req, STATE_COOKIE.kakao);
    if (!verifyState(state, cookieState)) {
      console.warn("[OAuth][kakao] state mismatch");
      return res.redirect(302, "/?login=error");
    }
    if (!code) {
      return res.redirect(302, "/?login=error");
    }
    try {
      const redirectUri = redirectUriFor(req, "kakao");
      const accessToken = await kakaoExchangeToken(code, redirectUri);
      const user = await kakaoFetchUser(accessToken);
      await issueSession(req, res, "kakao", user);
    } catch (error) {
      console.error("[OAuth][kakao] callback failed", error);
      res.redirect(302, "/?login=error");
    }
  });

  // ── 네이버: 인가 요청 ──
  app.get("/api/oauth/naver", (req: Request, res: Response) => {
    if (!ENV.naverClientId) return sendSetupNeeded(res, "naver");
    const redirectUri = redirectUriFor(req, "naver");
    // CSRF 방지용 state. 서명 쿠키와 쿼리에 동일한 값을 실고 콜백에서 대조한다.
    const state = newState();
    res.cookie(STATE_COOKIE.naver, state, {
      ...getSessionCookieOptions(req),
      maxAge: 5 * 60 * 1000, // 5분
    });
    const url = new URL("https://nid.naver.com/oauth2.0/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", ENV.naverClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    res.redirect(302, url.toString());
  });

  // ── 네이버: 콜백 ──
  app.get("/api/oauth/naver/callback", async (req: Request, res: Response) => {
    if (!ENV.naverClientId) return sendSetupNeeded(res, "naver");
    res.clearCookie(STATE_COOKIE.naver, { path: "/" });
    if (getQueryParam(req, "error")) {
      return res.redirect(302, "/?login=cancelled");
    }
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const cookieState = readCookie(req, STATE_COOKIE.naver);
    if (!verifyState(state, cookieState)) {
      console.warn("[OAuth][naver] state mismatch");
      return res.redirect(302, "/?login=error");
    }
    if (!code) {
      return res.redirect(302, "/?login=error");
    }
    try {
      const accessToken = await naverExchangeToken(code, state!);
      const user = await naverFetchUser(accessToken);
      await issueSession(req, res, "naver", user);
    } catch (error) {
      console.error("[OAuth][naver] callback failed", error);
      res.redirect(302, "/?login=error");
    }
  });
}
