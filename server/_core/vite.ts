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

  // /share/:token — 이름감정 공유 페이지 동적 OG 태그 주입 (static보다 먼저 처리)
  app.get("/share/:token", async (req, res) => {
    const certNum = req.params.token;
    // 기본 HTML (injectKoreanOgMeta 적용 전 raw)
    let rawHtml: string;
    try {
      rawHtml = fs.readFileSync(indexPath, "utf-8");
    } catch {
      rawHtml = "";
    }
    let title = "이름 감정결과 보고서 — 휴먼프리즘";
    let desc = "30년 명리학 전문가의 AI 이름감정 결과를 확인해보세요.";
    const image = "https://human-prism.com/og-share.jpg";
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
          const fullHanja = (r.surnameHanja || r.nameHanja) ? `${r.surnameHanja || ""}${r.nameHanja || ""}` : "";
          title = `${fullName}${fullHanja ? ` (${fullHanja})` : ""} 이름감정 결과 — 휴먼프리즘`;
          desc = `📋 이름 감정결과 보고서 | 자원오행 ${r.jawonResult || ""} · ${r.overallResult || ""} | 30년 명리학 전문가의 AI 이름감정`;
        }
      }
    } catch (e) {
      // DB 조회 실패해도 기본값으로 전송
    }
    // OG 태그 블록을 직접 구성해서 </head> 앞에 주입
    const ogBlock = [
      `<title>${title}</title>`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="휴먼프리즘" />`,
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${desc}" />`,
      `<meta property="og:url" content="https://human-prism.com/share/${certNum}" />`,
      `<meta property="og:image" content="${image}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta property="og:locale" content="ko_KR" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${title}" />`,
      `<meta name="twitter:description" content="${desc}" />`,
      `<meta name="twitter:image" content="${image}" />`,
    ].join("\n    ");
    // 기존 title/og/twitter 제거 후 새 블록 주입
    let html = rawHtml
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+[^>]*(?:name=["'](?:description|twitter:[^"']*)["|']|property=["']og:[^"']*["'])[^>]*>\s*/gi, "")
      .replace(/<\/head>/i, `    ${ogBlock}\n  </head>`);
    // 카톡 크롤러는 OG 태그 읽고, 실제 사용자는 Vercel 페이지로 리다이렉트
    const ua = req.headers["user-agent"] || "";
    const isBot = /kakao|facebook|twitter|telegram|discord|slack|whatsapp|bot|crawler|spider/i.test(ua);
    if (isBot) {
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } else {
      res.redirect(302, `https://human-prism.com/share/${certNum}`);
    }
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
