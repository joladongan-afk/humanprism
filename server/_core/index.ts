import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerSocialOAuthRoutes } from "./socialOAuth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { purgeSessionsHandler } from "./scheduledHandlers";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // DB 컬럼 자동 마이그레이션
  try {
    const mysql = await import("mysql2/promise");
    const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
    await conn.execute("ALTER TABLE namingServices MODIFY COLUMN suriResult TEXT");
    await conn.execute("ALTER TABLE namingServices MODIFY COLUMN jawonResult TEXT");
    await conn.end();
    console.log("[Migration] namingServices columns updated");
  } catch (e: any) {
    // 이미 변경됐거나 테이블 없으면 무시
    if (!e.message?.includes("Duplicate")) {
      console.log("[Migration] skipped:", e.message);
    }
  }
  const app = express();
  const server = createServer(app);
  // Trust proxy: Manus 프록시 환경에서 X-Forwarded-Proto 헤더 신뢰
  // sameSite=none + secure=true 쿠키가 정상 동작하려면 필수
  app.set("trust proxy", 1);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerSocialOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // 주기적 작업(Heartbeat) 콜백 — Vite/정적 fallthrough 이전에 명시적으로 등록
  app.post("/api/scheduled/purgeSessions", purgeSessionsHandler);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
