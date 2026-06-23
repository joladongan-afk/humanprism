import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * verifySession requires a non-empty `name`; derive a stable fallback so accounts
 * without a display name don't get stuck in an auth redirect loop (cookie issued
 * but later rejected as invalid). Priority: name -> email local-part -> openId label.
 */
export function deriveSessionName(userInfo: {
  name?: string | null;
  email?: string | null;
  openId: string;
}): string {
  return (
    userInfo.name?.trim() ||
    userInfo.email?.split("@")[0] ||
    `이용자-${userInfo.openId.slice(0, 6)}`
  );
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    console.log(
      "[OAuth] callback hit",
      "url=", req.originalUrl,
      "host=", req.headers.host,
      "xfproto=", req.headers["x-forwarded-proto"],
      "hasCode=", Boolean(code),
      "hasState=", Boolean(state),
    );

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: deriveSessionName(userInfo),
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      console.log(
        "[OAuth] session cookie set",
        "secure=", cookieOptions.secure,
        "sameSite=", cookieOptions.sameSite,
        "domain=", cookieOptions.domain,
        "openId=", userInfo.openId,
      );

      // 쿠키가 제대로 설정된 후 리다이렉트 (프록시 환경에서 타이밍 이슈 방지)
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
