import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  value?: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(hostname = "3000-iys7hn801r5j8t63y3znv-d1aa5d3d.sg1.manus.computer"): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
  setCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];
  const setCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      hostname,
      headers: { "x-forwarded-proto": "https" },
    } as unknown as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
    } as unknown as TrpcContext["res"],
  };

  return { ctx, clearedCookies, setCookies };
}

describe("auth.logout", () => {
  it("reports success", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });

  it("clears the session cookie via clearCookie", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.logout();

    expect(clearedCookies.length).toBeGreaterThan(0);
    for (const call of clearedCookies) {
      expect(call.name).toBe(COOKIE_NAME);
      expect(call.options).toMatchObject({
        sameSite: "none",
        httpOnly: true,
        path: "/",
      });
    }
  });

  it("force-expires the cookie with a past expiry across domain variants", async () => {
    const { ctx, setCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.logout();

    expect(setCookies.length).toBeGreaterThan(0);
    // 모든 강제 만료는 빈 값 + 과거 expires여야 함
    for (const call of setCookies) {
      expect(call.name).toBe(COOKIE_NAME);
      expect(call.value).toBe("");
      const expires = call.options.expires as Date;
      expect(expires).toBeInstanceOf(Date);
      expect(expires.getTime()).toBe(0);
      expect(call.options.maxAge).toBe(0);
    }
  });

  it("includes a host-only (no domain) expiry and the sg1 manus domain variant", async () => {
    const { ctx, setCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.logout();

    const domains = setCookies.map((c) => c.options.domain);
    // host-only 쿠키 만료 (domain undefined) 포함
    expect(domains).toContain(undefined);
    // manus 프리뷰 서브도메인 변형 포함
    expect(domains).toContain(".sg1.manus.computer");
    expect(domains).toContain(".manus.computer");
  });

  it("covers both secure=true and secure=false to avoid attribute mismatch", async () => {
    const { ctx, setCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.auth.logout();

    const secureValues = new Set(setCookies.map((c) => c.options.secure));
    expect(secureValues.has(true)).toBe(true);
    expect(secureValues.has(false)).toBe(true);
  });
});
