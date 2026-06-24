import type { Request, Response } from "express";
import { sdk } from "./sdk";
import { purgeExpiredSessions } from "../db";

/**
 * 비보관(retain=false) 상담 세션 자동 삭제 핸들러.
 * Heartbeat 크론(/api/scheduled/purgeSessions)이 매일 호출한다.
 *
 * 멱등성: purgeExpiredSessions 는 purgeAfter 가 지난 세션만 조회/삭제하므로,
 * 재시도되어도 이미 삭제된 세션은 다시 조회되지 않아 안전하다.
 * 인증: 크론 시스템이 설정한 user.isCron 으로만 통과시킨다(req.body 신뢰 금지).
 */
export async function purgeSessionsHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    const deleted = await purgeExpiredSessions(new Date());
    return res.json({ ok: true, deleted });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return res.status(500).json({
      error,
      stack,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
