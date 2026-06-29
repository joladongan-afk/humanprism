export const config = { runtime: "edge" };

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const certNum = url.searchParams.get("token") || "";
  const shareUrl = `https://human-prism.com/share/${certNum}`;
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
      // 실패시 기본 OG
    }
  }

  // 사람 — share 페이지로 리다이렉트
  return Response.redirect(shareUrl, 302);
}
