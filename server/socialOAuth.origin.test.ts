import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request } from "express";

function fakeReq(headers: Record<string, string | string[] | undefined>): Request {
  return {
    headers,
    protocol: "https",
  } as unknown as Request;
}

// ENV.publicBaseUrl 분기를 검증하기 위해 모듈 캐시를 초기화하며 import 한다.
async function loadGetOrigin(publicBaseUrl: string | undefined) {
  vi.resetModules();
  if (publicBaseUrl === undefined) {
    delete process.env.PUBLIC_BASE_URL;
  } else {
    process.env.PUBLIC_BASE_URL = publicBaseUrl;
  }
  const mod = await import("./_core/socialOAuth");
  return mod.getOrigin;
}

describe("getOrigin (프록시 뒤 origin 추론)", () => {
  const original = process.env.PUBLIC_BASE_URL;

  beforeEach(() => {
    delete process.env.PUBLIC_BASE_URL;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.PUBLIC_BASE_URL;
    else process.env.PUBLIC_BASE_URL = original;
  });

  it("PUBLIC_BASE_URL 이 설정되면 헤더(run.app)를 무시하고 그 값을 사용한다", async () => {
    const getOrigin = await loadGetOrigin("https://human-prism.com");
    const req = fakeReq({
      host: "bdqbea5xeb-uskagb766q-ue.a.run.app",
      "x-forwarded-host": "bdqbea5xeb-uskagb766q-ue.a.run.app",
      "x-forwarded-proto": "https",
    });
    expect(getOrigin(req)).toBe("https://human-prism.com");
  });

  it("PUBLIC_BASE_URL 끝의 슬래시는 제거된다", async () => {
    const getOrigin = await loadGetOrigin("https://human-prism.com/");
    const req = fakeReq({ host: "internal.run.app" });
    expect(getOrigin(req)).toBe("https://human-prism.com");
  });

  it("PUBLIC_BASE_URL 미설정 시 x-forwarded-host 를 host 보다 우선한다", async () => {
    const getOrigin = await loadGetOrigin(undefined);
    const req = fakeReq({
      host: "internal.run.app",
      "x-forwarded-host": "human-prism.com",
      "x-forwarded-proto": "https",
    });
    expect(getOrigin(req)).toBe("https://human-prism.com");
  });

  it("PUBLIC_BASE_URL 미설정 + x-forwarded-host 없으면 host 헤더를 사용한다", async () => {
    const getOrigin = await loadGetOrigin(undefined);
    const req = fakeReq({ host: "human-prism.com", "x-forwarded-proto": "https" });
    expect(getOrigin(req)).toBe("https://human-prism.com");
  });
});
