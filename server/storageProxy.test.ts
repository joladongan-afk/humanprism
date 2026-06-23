import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Express, Request, Response } from "express";
import { registerStorageProxy, clearPresignCache } from "./_core/storageProxy";

/**
 * 카카오 로그인 시 /manus-storage 이미지 404 회귀 방지 테스트.
 *
 * 핵심 보장:
 *  1) 프록시는 더 이상 302/307 리다이렉트를 하지 않는다(res.redirect 미호출).
 *  2) 서버가 presigned URL로 직접 fetch한 바이트를 200으로 그대로 전달한다.
 *  3) Content-Type 등 콘텐츠 헤더가 보존된다.
 *  4) upstream이 만료(403/404)로 실패하면 캐시를 비우고 1회 재시도한다.
 */

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;

function captureHandler(): {
  app: Express;
  getHandler: () => Handler;
  routes: () => string[];
  handlerFor: (path: string) => Handler;
} {
  const handlers = new Map<string, Handler>();
  let first: Handler | undefined;
  const app = {
    get: (path: string, h: Handler) => {
      if (!first) first = h;
      handlers.set(path, h);
    },
  } as unknown as Express;
  return {
    app,
    getHandler: () => first!,
    routes: () => Array.from(handlers.keys()),
    handlerFor: (path: string) => handlers.get(path)!,
  };
}

function makeReq(key: string, headers: Record<string, string> = {}): Request {
  return {
    params: { 0: key },
    headers,
  } as unknown as Request;
}

function makeRes() {
  const state: {
    statusCode: number;
    headers: Record<string, string>;
    body?: Buffer | string;
    redirectedTo?: string;
    redirectStatus?: number;
    headersSent: boolean;
  } = { statusCode: 200, headers: {}, headersSent: false };

  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    setHeader(name: string, value: string) {
      state.headers[name.toLowerCase()] = value;
      return res;
    },
    set(name: string, value: string) {
      state.headers[name.toLowerCase()] = value;
      return res;
    },
    send(body: string) {
      state.body = body;
      state.headersSent = true;
      return res;
    },
    end(body?: Buffer) {
      state.body = body;
      state.headersSent = true;
      return res;
    },
    redirect(arg1: number | string, arg2?: string) {
      if (typeof arg1 === "number") {
        state.redirectStatus = arg1;
        state.redirectedTo = arg2;
      } else {
        state.redirectStatus = 302;
        state.redirectedTo = arg1;
      }
      state.headersSent = true;
      return res;
    },
    get headersSent() {
      return state.headersSent;
    },
  } as unknown as Response;

  return { res, state };
}

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

beforeEach(() => {
  process.env.BUILT_IN_FORGE_API_URL = "https://forge.test/api";
  process.env.BUILT_IN_FORGE_API_KEY = "test-key";
  clearPresignCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("storageProxy direct streaming", () => {
  it("streams bytes with 200 and preserves content-type, never redirects", async () => {
    const fetchMock = vi
      .fn()
      // 1) forge presign
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ url: "https://cdn.test/signed.png?Expires=123" }),
        text: async () => "",
      } as unknown as Response)
      // 2) upstream image fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([
          ["content-type", "image/png"],
          ["content-length", String(PNG_BYTES.length)],
        ]) as unknown as Headers,
        arrayBuffer: async () => PNG_BYTES.buffer.slice(0),
      } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const { app, getHandler } = captureHandler();
    registerStorageProxy(app);
    const { res, state } = makeRes();

    await getHandler()(makeReq("hero-bg.png"), res);

    expect(state.redirectStatus).toBeUndefined(); // 리다이렉트 없음
    expect(state.statusCode).toBe(200);
    expect(state.headers["content-type"]).toBe("image/png");
    expect(Buffer.isBuffer(state.body)).toBe(true);
  });

  it("retries once after upstream 403 (expired url) by re-presigning", async () => {
    const fetchMock = vi
      .fn()
      // 1) forge presign
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ url: "https://cdn.test/expired.png" }),
        text: async () => "",
      } as unknown as Response)
      // 2) upstream fails (expired)
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Map() as unknown as Headers,
        arrayBuffer: async () => new ArrayBuffer(0),
      } as unknown as Response)
      // 3) re-presign
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ url: "https://cdn.test/fresh.png" }),
        text: async () => "",
      } as unknown as Response)
      // 4) upstream success
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "image/png"]]) as unknown as Headers,
        arrayBuffer: async () => PNG_BYTES.buffer.slice(0),
      } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const { app, getHandler } = captureHandler();
    registerStorageProxy(app);
    const { res, state } = makeRes();

    await getHandler()(makeReq("zodiac-pig.png"), res);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(state.statusCode).toBe(200);
    expect(state.headers["content-type"]).toBe("image/png");
  });

  it("returns 400 when key is missing", async () => {
    const { app, getHandler } = captureHandler();
    registerStorageProxy(app);
    const { res, state } = makeRes();

    await getHandler()(makeReq(""), res);

    expect(state.statusCode).toBe(400);
  });

  it("registers both /img/* and /manus-storage/* routes", () => {
    const { app, routes } = captureHandler();
    registerStorageProxy(app);
    expect(routes()).toContain("/img/*");
    expect(routes()).toContain("/manus-storage/*");
  });

  it("/img/* handler also streams bytes with 200, never redirects", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ url: "https://cdn.test/signed.png?Expires=123" }),
        text: async () => "",
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([["content-type", "image/png"]]) as unknown as Headers,
        arrayBuffer: async () => PNG_BYTES.buffer.slice(0),
      } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const { app, handlerFor } = captureHandler();
    registerStorageProxy(app);
    const { res, state } = makeRes();

    await handlerFor("/img/*")(makeReq("hero-bg.png"), res);

    expect(state.redirectStatus).toBeUndefined();
    expect(state.statusCode).toBe(200);
    expect(state.headers["content-type"]).toBe("image/png");
    expect(Buffer.isBuffer(state.body)).toBe(true);
  });

  it("returns 502 when forge presign fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => "boom",
    } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const { app, getHandler } = captureHandler();
    registerStorageProxy(app);
    const { res, state } = makeRes();

    await getHandler()(makeReq("broken.png"), res);

    expect(state.statusCode).toBe(502);
    expect(state.redirectStatus).toBeUndefined();
  });
});
