import { describe, expect, it } from "vitest";
import { mapKakaoUser, mapNaverUser } from "./_core/socialOAuth";
import { deriveSessionName } from "./_core/oauth";

/**
 * 카카오/네이버 간편 로그인 통합 시,
 * - openId는 제공자별 네임스페이스("kakao:" / "naver:")를 붙여 Manus 계정과 충돌하지 않아야 하고,
 * - 응답에 닉네임/이메일이 없어도 안전하게 null로 매핑되어야 하며,
 * - 세션 이름은 항상 비어 있지 않은 값으로 폴백되어 도돌이표(로그인 무효화)를 막아야 한다.
 */
describe("카카오 사용자 매핑 (mapKakaoUser)", () => {
  it("회원번호에 kakao: 네임스페이스를 붙이고 닉네임/이메일을 추출한다", () => {
    const user = mapKakaoUser({
      id: 1234567890,
      kakao_account: {
        email: "jordy@kakao.com",
        profile: { nickname: "조르디" },
      },
    });
    expect(user.openId).toBe("kakao:1234567890");
    expect(user.name).toBe("조르디");
    expect(user.email).toBe("jordy@kakao.com");
  });

  it("동의 항목이 없어 프로필/이메일이 비어도 안전하게 null로 매핑한다", () => {
    const user = mapKakaoUser({ id: 42 });
    expect(user.openId).toBe("kakao:42");
    expect(user.name).toBeNull();
    expect(user.email).toBeNull();
  });
});

describe("네이버 사용자 매핑 (mapNaverUser)", () => {
  it("고유 id에 naver: 네임스페이스를 붙이고 닉네임/이메일을 추출한다", () => {
    const user = mapNaverUser({
      response: {
        id: "abc-xyz-001",
        nickname: "바다",
        email: "sea@naver.com",
      },
    });
    expect(user.openId).toBe("naver:abc-xyz-001");
    expect(user.name).toBe("바다");
    expect(user.email).toBe("sea@naver.com");
  });

  it("닉네임이 없으면 name 필드로 폴백한다", () => {
    const user = mapNaverUser({
      response: { id: "id-2", name: "홍길동" },
    });
    expect(user.name).toBe("홍길동");
  });
});

describe("소셜 로그인 세션 이름 폴백 (deriveSessionName)", () => {
  it("닉네임이 없는 카카오 사용자도 비어 있지 않은 세션 이름을 갖는다", () => {
    const social = mapKakaoUser({ id: 999 });
    const name = deriveSessionName(social);
    expect(name.length).toBeGreaterThan(0);
    expect(name).toBe(`이용자-${social.openId.slice(0, 6)}`);
  });

  it("이메일만 있는 네이버 사용자는 이메일 아이디로 폴백한다", () => {
    const social = mapNaverUser({
      response: { id: "n1", email: "alpha@naver.com" },
    });
    const name = deriveSessionName(social);
    expect(name).toBe("alpha");
  });
});

import { signState, verifyState } from "./_core/socialOAuth";

/**
 * CSRF 방어용 state는 HMAC 서명되어 위변조를 감지하고,
 * authorize 단계에서 발급한 쿠키 값과 callback 쿼리 값이 정확히 일치할 때만 통과해야 한다.
 */
describe("소셜 OAuth state 서명/검증 (signState/verifyState)", () => {
  const secret = "test-secret-key";

  it("정상 발급된 state는 쿠키 값과 일치할 때 통과한다", () => {
    const state = signState("nonce-abc", secret);
    expect(verifyState(state, state, secret)).toBe(true);
  });

  it("쿼리와 쿠키 값이 다르면 거부한다 (탈취 방지)", () => {
    const a = signState("nonce-a", secret);
    const b = signState("nonce-b", secret);
    expect(verifyState(a, b, secret)).toBe(false);
  });

  it("서명이 위조되면 거부한다 (변조 감지)", () => {
    const tampered = "nonce-abc.deadbeef";
    expect(verifyState(tampered, tampered, secret)).toBe(false);
  });

  it("다른 비밀키로 서명된 state는 거부한다", () => {
    const state = signState("nonce-abc", "other-secret");
    expect(verifyState(state, state, secret)).toBe(false);
  });

  it("값이 비어 있으면 거부한다", () => {
    expect(verifyState(undefined, undefined, secret)).toBe(false);
    expect(verifyState("", "", secret)).toBe(false);
  });
});
