export const config = { runtime: "edge" };

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const certNum = url.searchParams.get("token") || "";
  const railwayUrl = `https://humanprism-production.up.railway.app/share/${certNum}`;

  const ua = request.headers.get("user-agent") || "";
  const isBot = /kakao|facebook|twitter|telegram|discord|slack|whatsapp|bot|crawler|spider|preview/i.test(ua);

  if (isBot) {
    // 카톡 크롤러 — Railway에서 OG HTML 가져와서 반환
    try {
      const res = await fetch(railwayUrl, {
        headers: { "user-agent": "bot-proxy" }
      });
      const html = await res.text();
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "s-maxage=3600",
        },
      });
    } catch (e) {
      // 실패시 아래로 계속
    }
  }

  // 사람 — Vercel의 index.html 가져와서 반환 (리다이렉트 X)
  const indexUrl = `https://human-prism.com/index.html`;
  try {
    const res = await fetch(indexUrl);
    const html = await res.text();
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}
