import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { injectKoreanOgMeta } from "./ogMeta";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(injectKoreanOgMeta(page));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // index.html 은 한글 OG 메타를 강제 주입해서 전송 (자동 영어 OG 덮어쓰기 방지)
  const indexPath = path.resolve(distPath, "index.html");
  let cachedKoreanIndex: string | null = null;
  const getKoreanIndex = (): string | null => {
    if (cachedKoreanIndex !== null) return cachedKoreanIndex;
    try {
      const raw = fs.readFileSync(indexPath, "utf-8");
      cachedKoreanIndex = injectKoreanOgMeta(raw);
    } catch {
      cachedKoreanIndex = null;
    }
    return cachedKoreanIndex;
  };

  // 정적 에셋(js/css/img 등)은 그대로, 단 index.html 직접 요청은 후처리본으로 응답
  app.use(express.static(distPath, { index: false }));

  // /share/:token — 이름감정 공유 페이지 동적 OG 태그 주입
  app.get("/share/:token", async (req, res) => {
    const certNum = req.params.token;
    let html = getKoreanIndex() || fs.readFileSync(indexPath, "utf-8");
    try {
      const { getDb } = await import("../db.js");
      const { eq } = await import("drizzle-orm");
      const { namingServices } = await import("../../drizzle/schema.js");
      const db = await getDb();
      if (db) {
        const rows = await db.select().from(namingServices)
          .where(eq(namingServices.certificateNumber, certNum)).limit(1);
        if (rows[0]) {
          const r = rows[0];
          const fullName = `${r.surnameKorean || ""}${r.nameKorean || ""}`;
          const fullHanja = r.surnameHanja || r.nameHanja ? `${r.surnameHanja || ""}${r.nameHanja || ""}` : "";
          const title = `${fullName}${fullHanja ? ` (${fullHanja})` : ""} 이름감정 결과 — 휴먼프리즘`;
          const desc = `📋 이름 감정결과 보고서 | 자원오행 ${r.jawonResult || ""} · ${r.overallResult || ""} | 30년 명리학 전문가의 AI 이름감정`;
          html = html
            .replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)
            .replace(/<meta property="og:title"[^>]*>/i, `<meta property="og:title" content="${title}" />`)
            .replace(/<meta property="og:description"[^>]*>/i, `<meta property="og:description" content="${desc}" />`)
            .replace(/<meta name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`)
            .replace(/<meta name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${desc}" />`);
        }
      }
    } catch (e) {
      // OG 주입 실패해도 기본 HTML 전송
    }
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  });

  // fall through to index.html (SPA) — 항상 한글 OG 주입본을 전송
  app.use("*", (_req, res) => {
    const html = getKoreanIndex();
    if (html) {
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } else {
      res.sendFile(indexPath);
    }
  });
}
