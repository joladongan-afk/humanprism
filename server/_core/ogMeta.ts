/**
 * ogMeta.ts — 응답으로 나가는 index.html 의 <head> 메타(OG/Twitter/title/description)를
 * 한글 브랜드 값으로 "강제" 치환한다.
 *
 * 배경: 배포 파이프라인이 빌드 산출물의 index.html 을 자체적으로 가공하면서
 * 시스템 기본값(VITE_APP_TITLE 등) 기반의 영어 OG 태그/자동 스크린샷을 덮어쓴다.
 * 그래서 client/index.html 만 한글로 바꿔도 실제 배포본에서는 영어 카드가 노출된다.
 * 이를 막기 위해, 서버가 HTML 문서를 내보내기 직전 단계에서 메타 태그를 후처리한다.
 *
 * 개발(Vite)·배포(정적) 양쪽에서 동일하게 동작하도록 순수 문자열 변환 함수로 제공한다.
 */

export const OG = {
  title: "휴먼프리즘 - 7대 사주명가를 품은 대화형 AI 사주상담",
  description: "현대 7대 사주명가의 지혜를 AI 알고리즘으로 구현하다. 당신의 다채로움을 듣다.",
  siteName: "휴먼프리즘",
  url: "https://human-prism.com",
  image: "https://human-prism.com/og-share.jpg",
  imageWidth: "1200",
  imageHeight: "630",
  locale: "ko_KR",
} as const;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 한글 브랜드 메타 블록(HTML 조각). 항상 이 블록이 최종 권위 값이 된다. */
function brandMetaBlock(): string {
  const t = esc(OG.title);
  const d = esc(OG.description);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(OG.siteName)}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${esc(OG.url)}" />`,
    `<meta property="og:image" content="${esc(OG.image)}" />`,
    `<meta property="og:image:width" content="${OG.imageWidth}" />`,
    `<meta property="og:image:height" content="${OG.imageHeight}" />`,
    `<meta property="og:locale" content="${OG.locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${esc(OG.image)}" />`,
  ].join("\n    ");
}

/**
 * HTML 문자열에서 기존 title/description/og/twitter 메타를 모두 제거한 뒤,
 * 한글 브랜드 메타 블록을 </head> 직전에 주입한다.
 */
export function injectKoreanOgMeta(html: string): string {
  if (!html || !/<\/head>/i.test(html)) return html;

  let out = html;
  // 기존 title 제거
  out = out.replace(/<title>[\s\S]*?<\/title>/i, "");
  // 기존 description / og:* / twitter:* 메타 제거 (속성 순서 무관, 작은/큰따옴표 무관)
  out = out.replace(
    /<meta\s+[^>]*(?:name=["'](?:description|twitter:[^"']*)["']|property=["']og:[^"']*["'])[^>]*>\s*/gi,
    "",
  );
  // </head> 직전에 한글 메타 주입
  out = out.replace(/<\/head>/i, `    ${brandMetaBlock()}\n  </head>`);
  return out;
}
