import { describe, expect, it } from "vitest";
import { deriveSessionName } from "./_core/oauth";

/**
 * 세션 검증(verifySession)은 name이 비어 있지 않아야 유효하다고 본다.
 * OAuth 콜백에서 name이 비어 있을 때 폴백값을 채워 넣지 않으면,
 * 쿠키는 발급되지만 다음 요청에서 무효 처리되어 로그인 화면으로 되돌아가는
 * 도돌이표(auth redirect loop)가 발생한다.
 *
 * 이 테스트는 실제 oauth.ts의 deriveSessionName 구현을 직접 호출해
 * 폴백 규칙을 회귀 검증한다:
 *   name -> email local-part -> "이용자-{openId 앞 6자리}"
 */
describe("OAuth 세션 name 폴백 (deriveSessionName)", () => {
  it("이름이 있으면 그 이름을 사용한다", () => {
    expect(
      deriveSessionName({ name: "경청자", email: "a@b.com", openId: "abc123xyz" }),
    ).toBe("경청자");
  });

  it("이름이 비어 있으면 이메일 아이디 부분을 사용한다", () => {
    expect(
      deriveSessionName({ name: "", email: "joladongan@gmail.com", openId: "abc123xyz" }),
    ).toBe("joladongan");
  });

  it("이름이 공백뿐이면 이메일 아이디 부분을 사용한다", () => {
    expect(
      deriveSessionName({ name: "   ", email: "user@example.com", openId: "abc123xyz" }),
    ).toBe("user");
  });

  it("이름과 이메일이 모두 없으면 openId 기반 라벨을 사용한다", () => {
    expect(
      deriveSessionName({ name: null, email: null, openId: "abcdef123456" }),
    ).toBe("이용자-abcdef");
  });

  it("어떤 경우에도 비어 있지 않은 문자열을 반환한다 (세션 무효화 방지)", () => {
    const cases = [
      { name: "", email: "", openId: "zzzzzz0000" },
      { name: null, email: undefined, openId: "qwerty7890" },
    ];
    for (const c of cases) {
      const result = deriveSessionName(c);
      expect(result.length).toBeGreaterThan(0);
    }
  });
});
