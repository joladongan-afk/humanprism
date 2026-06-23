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
