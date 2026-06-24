export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

// 카카오/네이버 간편 로그인 진입 URL.
// 백엔드 라우트(server/_core/socialOAuth.ts)가 제공자 인증 페이지로 리다이렉트한다.
export const getKakaoLoginUrl = () =>
  `${window.location.origin}/api/oauth/kakao`;
export const getNaverLoginUrl = () =>
  `${window.location.origin}/api/oauth/naver`;
