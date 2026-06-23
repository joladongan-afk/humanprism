import { describe, it, expect } from "vitest";
import { injectKoreanOgMeta, OG } from "./_core/ogMeta";

describe("injectKoreanOgMeta", () => {
  it("영어 자동 OG 태그를 한글 브랜드 값으로 교체한다", () => {
    const input = `<!doctype html><html><head>
      <title>Human Prism - Premium AI Saju</title>
      <meta name="description" content="Premium AI Saju Web-App with RAG, Kakao/Naver login, and Portone payment." />
      <meta property="og:title" content="Human Prism - Premium AI Saju">
      <meta property="og:description" content="Premium AI Saju Web-App with RAG, Kak...">
      <meta property="og:image" content="https://files.manuscdn.com/webdev_screenshots/x.png">
      <meta name="twitter:title" content="Human Prism - Premium AI Saju">
    </head><body></body></html>`;

    const out = injectKoreanOgMeta(input);

    // 영어 흔적이 사라져야 함
    expect(out).not.toContain("Premium AI Saju");
    expect(out).not.toContain("manuscdn.com/webdev_screenshots");

    // 한글 브랜드 값이 들어가야 함
    expect(out).toContain(`<title>${OG.title}</title>`);
    expect(out).toContain(`property="og:title" content="${OG.title}"`);
    expect(out).toContain(`property="og:description" content="${OG.description}"`);
    expect(out).toContain(`property="og:image" content="${OG.image}"`);
    expect(out).toContain(`property="og:site_name" content="${OG.siteName}"`);
    expect(out).toContain(`name="twitter:image" content="${OG.image}"`);
    expect(out).toContain(`property="og:locale" content="ko_KR"`);
  });

  it("og:image는 만료/리다이렉트 없는 고정 /img 경로를 사용한다 (카카오 스크랩 호환)", () => {
    // CloudFront 서명 URL로 307 리다이렉트되는 /manus-storage 경로는 카카오가 못 읽으므로 금지
    expect(OG.image).toContain("/img/");
    expect(OG.image).not.toContain("/manus-storage/");
    expect(OG.image).not.toContain("?"); // 만료 쿼리 등 부착 금지
  });

  it("og:title이 정확히 하나만 존재한다 (중복 주입 방지)", () => {
    const input = `<html><head><meta property="og:title" content="OLD"></head><body></body></html>`;
    const out = injectKoreanOgMeta(input);
    const matches = out.match(/property="og:title"/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("title이 정확히 하나만 존재한다", () => {
    const input = `<html><head><title>OLD</title></head><body></body></html>`;
    const out = injectKoreanOgMeta(input);
    const matches = out.match(/<title>/g) ?? [];
    expect(matches.length).toBe(1);
    expect(out).toContain(`<title>${OG.title}</title>`);
  });

  it("</head>가 없으면 원본을 그대로 반환한다", () => {
    const input = `<div>no head here</div>`;
    expect(injectKoreanOgMeta(input)).toBe(input);
  });

  it("주입된 메타 블록은 </head> 이전에 위치한다", () => {
    const input = `<html><head><title>OLD</title></head><body></body></html>`;
    const out = injectKoreanOgMeta(input);
    expect(out.indexOf(`og:image`)).toBeLessThan(out.indexOf(`</head>`));
  });
});
