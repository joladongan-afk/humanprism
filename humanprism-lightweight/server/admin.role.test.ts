import { describe, it, expect } from "vitest";
import { resolveRole } from "./_core/socialOAuth";
import { ENV } from "./_core/env";

const NAVER_ADMIN_OPENID =
  "naver:CMAwYh23dD4_5t5LdfmzIuAzGZHLd2_XQV6g8SsDFwE";
const ADMIN_IDS = ["kakao:4938782498", NAVER_ADMIN_OPENID];
const ADMIN_EMAILS = [
  "joladongan@gmail.com",
  "yomanflex@naver.com",
  "joladongan@daum.net",
];

describe("resolveRole - 관리자 판정", () => {
  it("관리자 openId면 이메일과 무관하게 admin", () => {
    expect(resolveRole("kakao:4938782498", null, ADMIN_IDS, ADMIN_EMAILS)).toBe("admin");
    expect(resolveRole("kakao:4938782498", "stranger@x.com", ADMIN_IDS, ADMIN_EMAILS)).toBe("admin");
  });

  it("네이버 로그인은 이메일이 없어도 등록된 openId면 admin", () => {
    // 네이버 검수 미승인으로 이메일이 null 로 와도 openId로 관리자 판정되어야 한다.
    expect(resolveRole(NAVER_ADMIN_OPENID, null, ADMIN_IDS, ADMIN_EMAILS)).toBe("admin");
  });

  it("관리자 이메일이면 openId가 목록에 없어도 admin (지메일/네이버 사전 등록)", () => {
    expect(resolveRole("naver:zzz", "yomanflex@naver.com", ADMIN_IDS, ADMIN_EMAILS)).toBe("admin");
    expect(resolveRole("google:abc", "joladongan@gmail.com", ADMIN_IDS, ADMIN_EMAILS)).toBe("admin");
  });

  it("이메일 비교는 대소문자/공백을 무시한다", () => {
    expect(resolveRole(null, "  JoLaDongAn@Gmail.com ", ADMIN_IDS, ADMIN_EMAILS)).toBe("admin");
  });

  it("일반 사용자는 user", () => {
    expect(resolveRole("kakao:999", "someone@daum.net", ADMIN_IDS, ADMIN_EMAILS)).toBe("user");
    expect(resolveRole(null, null, ADMIN_IDS, ADMIN_EMAILS)).toBe("user");
  });
});

describe("ENV - 관리자 식별자 환경변수 로드", () => {
  it("ADMIN_OPENIDS에 운영자 카카오 openId가 로드된다", () => {
    expect(ENV.adminOpenIds).toContain("kakao:4938782498");
  });

  it("ADMIN_EMAILS에 지메일/네이버/다음 운영자 이메일이 로드된다", () => {
    expect(ENV.adminEmails).toContain("joladongan@gmail.com");
    expect(ENV.adminEmails).toContain("yomanflex@naver.com");
    expect(ENV.adminEmails).toContain("joladongan@daum.net");
  });

  it("실제 ENV 값으로도 운영자 카카오 계정이 admin으로 판정된다", () => {
    expect(resolveRole("kakao:4938782498", null, ENV.adminOpenIds, ENV.adminEmails)).toBe("admin");
  });

  it("ADMIN_OPENIDS에 운영자 네이버 openId가 로드되고, 이메일 없이도 admin으로 판정된다", () => {
    expect(ENV.adminOpenIds).toContain(NAVER_ADMIN_OPENID);
    expect(resolveRole(NAVER_ADMIN_OPENID, null, ENV.adminOpenIds, ENV.adminEmails)).toBe("admin");
  });
});
