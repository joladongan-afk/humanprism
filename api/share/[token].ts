import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createConnection } from "mysql2/promise";
import * as fs from "fs";
import * as path from "path";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const certNum = req.query.token as string;

  let title = "이름 감정결과 보고서 — 휴먼프리즘";
  let desc = "30년 명리학 전문가의 AI 이름감정 결과를 확인해보세요.";
  const image = "https://human-prism.com/manus-storage/og-card-share-v3_92ae0c89.png?v=4";
  const url = `https://human-prism.com/share/${certNum}`;

  try {
    const conn = await createConnection(process.env.DATABASE_URL as string);
    const [rows]: any = await conn.execute(
      "SELECT surnameKorean, nameKorean, surnameHanja, nameHanja, jawonResult, overallResult FROM namingServices WHERE certificateNumber = ? LIMIT 1",
      [certNum]
    );
    await conn.end();
    if (rows && rows[0]) {
      const r = rows[0];
      const fullName = `${r.surnameKorean || ""}${r.nameKorean || ""}`;
      const fullHanja = (r.surnameHanja || r.nameHanja) ? `${r.surnameHanja || ""}${r.nameHanja || ""}` : "";
      title = `${fullName}${fullHanja ? ` (${fullHanja})` : ""} 이름감정 결과 — 휴먼프리즘`;
      desc = `📋 이름 감정결과 보고서 | 자원오행 ${r.jawonResult || ""} · ${r.overallResult || ""} | 30년 명리학 전문가의 AI 이름감정`;
    }
  } catch (e) {
    // DB 실패 시 기본값 사용
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="휴먼프리즘" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="ko_KR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0; url=${url}" />
  <script>window.location.replace("${url}");</script>
</head>
<body>
  <p>잠시 후 이동합니다... <a href="${url}">바로가기</a></p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
  res.status(200).send(html);
}
