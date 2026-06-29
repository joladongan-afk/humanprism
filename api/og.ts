export const config = { runtime: "edge" };

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const certNum = url.searchParams.get("token") || "";
  const shareUrl = `https://human-prism.com/share/${certNum}`;
  const image = "https://human-prism.com/manus-storage/og-card-share-v3_92ae0c89.png?v=4";
  const title = "이름 감정결과 보고서 — 휴먼프리즘";
  const desc = "30년 명리학 전문가의 AI 이름감정 결과를 확인해보세요. human-prism.com";

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="휴먼프리즘" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="ko_KR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${image}" />
  <meta http-equiv="refresh" content="0; url=${shareUrl}" />
  <script>window.location.replace("${shareUrl}");</script>
</head>
<body><p><a href="${shareUrl}">바로가기</a></p></body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "s-maxage=3600",
    },
  });
}
