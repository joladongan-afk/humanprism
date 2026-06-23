import type { Express, Request, Response } from "express";
import { ENV } from "./env";

/**
 * 이미지/스토리지 프록시
 *
 * [핵심 경로]
 * - `/img/*`        : 우리 Express가 100% 제어하는 자체 경로(권장).
 *                     운영 플랫폼 엣지가 가로채지 않으므로 항상 서버가 직접 스트리밍.
 * - `/manus-storage/*` : 하위호환용. 단, 운영 환경에서는 플랫폼 엣지가
 *                     이 경로를 가로채 CloudFront 307 리다이렉트로 처리하는
 *                     경우가 있어, 카카오 로그인 지연 시 임시 URL 만료로 404가
 *                     발생할 수 있다. 그래서 신규 참조는 모두 `/img/*`를 사용한다.
 *
 * [동작]
 * 서버가 forge presign으로 받은 임시 URL로 직접 fetch하여 바이트를 그대로 스트리밍.
 *   - 브라우저는 오직 동일 출처(/img/...)만 바라보므로 외부 임시 URL 만료·
 *     리다이렉트 체인·로그인 지연과 완전히 무관.
 *   - 로그인 여부/로그인 방식(카카오/지메일)과 상관없이 항상 동일하게 동작.
 */

// 서버 측 presigned URL 캐시 (만료 여유를 두고 짧게 보관)
type CacheEntry = { url: string; expiresAt: number };
const presignCache = new Map<string, CacheEntry>();
const PRESIGN_TTL_MS = 60 * 1000; // 60초만 캐시 (안전 마진)

export async function resolveSignedUrl(key: string): Promise<string | null> {
  const cached = presignCache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }
  const forgeUrl = new URL(
    "v1/storage/presign/get",
    ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
  );
  forgeUrl.searchParams.set("path", key);
  const forgeResp = await fetch(forgeUrl, {
    headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
  });
  if (!forgeResp.ok) {
    const body = await forgeResp.text().catch(() => "");
    console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
    return null;
  }
  const { url } = (await forgeResp.json()) as { url: string };
  if (!url) return null;
  presignCache.set(key, { url, expiresAt: now + PRESIGN_TTL_MS });
  return url;
}

/** 테스트/운영용 캐시 초기화 */
export function clearPresignCache() {
  presignCache.clear();
}

/** 스토리지 키로 이미지를 직접 스트리밍하는 공통 핸들러 */
export async function streamStorageKey(
  key: string | undefined,
  req: Request,
  res: Response,
) {
  if (!key) {
    res.status(400).send("Missing storage key");
    return;
  }
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    res.status(500).send("Storage proxy not configured");
    return;
  }
  try {
    const signedUrl = await resolveSignedUrl(key);
    if (!signedUrl) {
      res.status(502).send("Storage backend error");
      return;
    }

    // Range 요청(동영상 등) 지원: 클라이언트 Range 헤더를 그대로 전달
    const upstreamHeaders: Record<string, string> = {};
    const range = req.headers["range"];
    if (typeof range === "string") {
      upstreamHeaders["Range"] = range;
    }

    let upstream = await fetch(signedUrl, { headers: upstreamHeaders });

    if (!upstream.ok && upstream.status !== 206) {
      // 캐시된 URL이 만료되었을 가능성 → 캐시 무효화 후 1회 재시도
      presignCache.delete(key);
      const retryUrl = await resolveSignedUrl(key);
      if (retryUrl) {
        upstream = await fetch(retryUrl, { headers: upstreamHeaders });
      }
      if (!upstream.ok && upstream.status !== 206) {
        console.error(
          `[StorageProxy] upstream error: ${upstream.status} for ${key}`,
        );
        res.status(502).send("Storage upstream error");
        return;
      }
    }

    await streamResponse(upstream, res);
  } catch (err) {
    console.error("[StorageProxy] failed:", err);
    if (!res.headersSent) {
      res.status(502).send("Storage proxy error");
    }
  }
}

export function registerStorageProxy(app: Express) {
  // 자체 경로(권장): 플랫폼 엣지가 가로채지 않음 → 항상 서버 직접 스트리밍
  app.get("/img/*", async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string>)[0];
    await streamStorageKey(key, req, res);
  });

  // 하위호환 경로: 기존 /manus-storage 참조가 남아있어도 동작하도록 유지
  app.get("/manus-storage/*", async (req: Request, res: Response) => {
    const key = (req.params as Record<string, string>)[0];
    await streamStorageKey(key, req, res);
  });
}

async function streamResponse(
  upstream: globalThis.Response,
  res: Response,
) {
  // 콘텐츠 관련 헤더 전달
  const contentType = upstream.headers.get("content-type");
  if (contentType) res.setHeader("Content-Type", contentType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) res.setHeader("Content-Length", contentLength);
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
  const contentRange = upstream.headers.get("content-range");
  if (contentRange) res.setHeader("Content-Range", contentRange);

  // 이미지/정적 자산은 브라우저 캐시 허용(성능). presigned URL은 노출되지 않음.
  res.setHeader("Cache-Control", "public, max-age=3600");

  // 상태 코드 전달 (206 Partial Content 등)
  res.status(upstream.status);

  const arrayBuffer = await upstream.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}
