import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

/**
 * 카카오/네이버 OAuth 키가 환경변수에 제대로 로드되었는지 검증.
 */
describe("소셜 OAuth 키 로드 검증", () => {
  it("카카오 REST API 키가 설정되어 있고 유효한 형식이다", () => {
    expect(ENV.kakaoRestApiKey).toBeTruthy();
    expect(ENV.kakaoRestApiKey.length).toBeGreaterThan(10);
    // 16진수 문자열 형식 확인
    expect(/^[a-f0-9]{32}$/.test(ENV.kakaoRestApiKey)).toBe(true);
  });

  it("카카오 Client Secret이 설정되어 있고 유효한 형식이다", () => {
    expect(ENV.kakaoClientSecret).toBeTruthy();
    expect(ENV.kakaoClientSecret.length).toBeGreaterThan(10);
    // 영문자 + 숫자 조합
    expect(/^[A-Za-z0-9]{32}$/.test(ENV.kakaoClientSecret)).toBe(true);
  });

  it("네이버 Client ID가 설정되어 있고 유효한 형식이다", () => {
    expect(ENV.naverClientId).toBeTruthy();
    expect(ENV.naverClientId.length).toBeGreaterThan(5);
    // 영문자 + 숫자 조합
    expect(/^[A-Za-z0-9]+$/.test(ENV.naverClientId)).toBe(true);
  });

  it("네이버 Client Secret이 설정되어 있고 유효한 형식이다", () => {
    expect(ENV.naverClientSecret).toBeTruthy();
    expect(ENV.naverClientSecret.length).toBeGreaterThan(5);
    // 네이버 Client Secret은 영문·숫자와 함께 밑줄(_)을 포함할 수 있다 (예: MA3623_nw1)
    expect(/^[A-Za-z0-9_]+$/.test(ENV.naverClientSecret)).toBe(true);
  });

  it("모든 키가 비어있지 않다", () => {
    const keys = {
      kakaoRestApiKey: ENV.kakaoRestApiKey,
      kakaoClientSecret: ENV.kakaoClientSecret,
      naverClientId: ENV.naverClientId,
      naverClientSecret: ENV.naverClientSecret,
    };

    for (const [name, value] of Object.entries(keys)) {
      expect(value, `${name}이 비어있음`).toBeTruthy();
      expect(value.length, `${name}의 길이가 0`).toBeGreaterThan(0);
    }
  });

  it("카카오 authorize URL을 생성할 수 있다", () => {
    const redirectUri = "https://example.com/api/oauth/kakao/callback";
    const state = "test-state-123";
    const url = new URL("https://kauth.kakao.com/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", ENV.kakaoRestApiKey);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    const urlStr = url.toString();
    expect(urlStr).toContain("kauth.kakao.com");
    expect(urlStr).toContain(ENV.kakaoRestApiKey);
    expect(urlStr).toContain("redirect_uri="); // URL 인코딩되므로 파라미터만 확인
    expect(urlStr).toContain(state);
  });

  it("네이버 authorize URL을 생성할 수 있다", () => {
    const redirectUri = "https://example.com/api/oauth/naver/callback";
    const state = "test-state-456";
    const url = new URL("https://nid.naver.com/oauth2.0/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", ENV.naverClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);

    const urlStr = url.toString();
    expect(urlStr).toContain("nid.naver.com");
    expect(urlStr).toContain(ENV.naverClientId);
    expect(urlStr).toContain("redirect_uri="); // URL 인코딩되므로 파라미터만 확인
    expect(urlStr).toContain(state);
  });
});

/**
 * 카카오 키/시크릿이 "살아있는 앱(ID 1477047)"의 짝 맞는 값인지 실제 카카오 토큰
 * 엔드포인트로 검증한다. 삭제된 옛 앱 키였다면 KOE101(invalid_client)이 떨어진다.
 * 더미 인가코드를 보내므로 정상 키라면 KOE320(invalid_grant)이 떨어져야 한다.
 *
 * 네트워크 호출이 필요하므로 RUN_LIVE_OAUTH=1 일 때만 수행한다.
 */
const liveOAuth = process.env.RUN_LIVE_OAUTH === "1";
const liveDescribe = liveOAuth ? describe : describe.skip;

liveDescribe("카카오 키/시크릿 실연동 검증 (live)", () => {
  it("토큰 교환 시 KOE101이 아니라 KOE320이 떨어진다 (키 짝 일치)", async () => {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ENV.kakaoRestApiKey,
      client_secret: ENV.kakaoClientSecret,
      redirect_uri: "https://human-prism.com/api/oauth/kakao/callback",
      code: "dummy_invalid_code_for_validation",
    });
    const res = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: body.toString(),
    });
    const json: any = await res.json();
    // 키가 존재하지 않으면(=삭제된 옛 앱) KOE101이 떨어진다. 그 경우 실패시켜 재설정을 유도.
    expect(json.error_code, `카카오 응답: ${JSON.stringify(json)}`).not.toBe("KOE101");
    // 짝이 맞는 키라면 더미 코드라서 invalid_grant(KOE320)가 떨어져야 한다.
    expect(json.error_code).toBe("KOE320");
  }, 15000);
});
