import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * PUBLIC_BASE_URL(운영 공개 도메인)이 설정되어 있으면 그 호스트를 반환한다.
 * 소셜 로그인 state 쿠키는 authorize를 시작한 호스트(www 등)와 콜백이 돌아오는
 * 호스트(apex)가 다를 수 있는데, 그 경우 쿠키가 콜백에 전송되지 않아 state 검증이 실패한다.
 * 이를 막기 위해 redirect_uri를 PUBLIC_BASE_URL로 고정한 것과 동일하게, 쿠키 도메인도
 * 운영 도메인 기준으로 고정한다.
 */
export function publicBaseHostname(): string | undefined {
  const raw = (process.env.PUBLIC_BASE_URL ?? "").trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.hostname || undefined;
  } catch {
    return undefined;
  }
}

/**
 * 주어진 호스트명에 대해 설정할 쿠키 domain 값을 결정한다. (순수 함수 — 테스트 가능)
 * - Manus 프록시 도메인: 서브도메인 포함 와일드카드로 공유
 * - 로컬/IP: domain 미설정(undefined)
 * - 일반 도메인: ".{host}"로 설정해 apex↔www 간 공유
 */
export function resolveCookieDomain(hostname: string | undefined): string | undefined {
  if (!hostname) return undefined;

  if (hostname.includes("manus.computer")) {
    if (hostname.includes("sg1.manus.computer")) return ".sg1.manus.computer";
    return ".manus.computer";
  }

  const shouldSetDomain =
    !LOCAL_HOSTS.has(hostname) && !isIpAddress(hostname);
  if (!shouldSetDomain) return undefined;

  if (hostname.startsWith(".")) return hostname;
  return `.${hostname}`;
}

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // 1순위: 운영 공개 도메인(PUBLIC_BASE_URL)이 명시돼 있으면 그 호스트를 쿠키 도메인 기준으로 쓴다.
  //   Cloudflare/Cloud Run 뒤에서는 req.hostname이 내부 주소(run.app)로 잡힐 수 있고,
  //   authorize 시작 호스트(www)와 콜백 호스트(apex)가 달라 state 쿠키가 유실될 수 있기 때문이다.
  //   단, Manus 프록시 프리뷰(.manus.computer)에서는 PUBLIC_BASE_URL을 무시하고 실제 호스트를 따른다.
  const reqHost = req.hostname;
  const isManusPreview = !!reqHost && reqHost.includes("manus.computer");
  const effectiveHost =
    !isManusPreview ? (publicBaseHostname() ?? reqHost) : reqHost;

  const domain = resolveCookieDomain(effectiveHost);

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
