import { describe, it, expect, afterEach } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";
import type { Request } from "express";

function fakeReq(hostname: string, headers: Record<string, string> = {}): Request {
  return {
    hostname,
    protocol: "https",
    headers: { "x-forwarded-proto": "https", ...headers },
  } as unknown as Request;
}

const original = process.env.PUBLIC_BASE_URL;

afterEach(() => {
  if (original === undefined) delete process.env.PUBLIC_BASE_URL;
  else process.env.PUBLIC_BASE_URL = original;
});

describe("getSessionCookieOptions - 쿠키 도메인 결정", () => {
  it("PUBLIC_BASE_URL 설정 시: 내부 호스트(run.app)여도 운영 도메인(.human-prism.com)으로 고정한다", () => {
    process.env.PUBLIC_BASE_URL = "https://human-prism.com";
    const opts = getSessionCookieOptions(fakeReq("bdqbea5xeb-uskagb766q-ue.a.run.app"));
    expect(opts.domain).toBe(".human-prism.com");
    expect(opts.sameSite).toBe("none");
    expect(opts.secure).toBe(true);
    expect(opts.httpOnly).toBe(true);
  });

  it("PUBLIC_BASE_URL 설정 시: www로 들어와도 apex 기준 .human-prism.com 으로 고정한다", () => {
    process.env.PUBLIC_BASE_URL = "https://human-prism.com";
    const opts = getSessionCookieOptions(fakeReq("www.human-prism.com"));
    expect(opts.domain).toBe(".human-prism.com");
  });

  it("Manus 프리뷰(.manus.computer)에서는 PUBLIC_BASE_URL을 무시하고 프리뷰 도메인을 쓴다", () => {
    process.env.PUBLIC_BASE_URL = "https://human-prism.com";
    const opts = getSessionCookieOptions(fakeReq("3000-abc.sg1.manus.computer"));
    expect(opts.domain).toBe(".sg1.manus.computer");
  });

  it("PUBLIC_BASE_URL 미설정 + 일반 도메인: .{host} 로 설정한다", () => {
    delete process.env.PUBLIC_BASE_URL;
    const opts = getSessionCookieOptions(fakeReq("human-prism.com"));
    expect(opts.domain).toBe(".human-prism.com");
  });

  it("로컬 호스트(localhost)에서는 domain을 설정하지 않는다", () => {
    delete process.env.PUBLIC_BASE_URL;
    const opts = getSessionCookieOptions(fakeReq("localhost", { "x-forwarded-proto": "http" }));
    expect(opts.domain).toBeUndefined();
  });

  it("IP 주소 호스트에서는 domain을 설정하지 않는다", () => {
    delete process.env.PUBLIC_BASE_URL;
    const opts = getSessionCookieOptions(fakeReq("127.0.0.1", { "x-forwarded-proto": "http" }));
    expect(opts.domain).toBeUndefined();
  });
});
