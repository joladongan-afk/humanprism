import { describe, it, expect } from "vitest";
import { isOperatorEmail, normalizeEmail, OPERATOR_EMAILS } from "../shared/const";

describe("normalizeEmail", () => {
  it("소문자로 변환하고 공백을 제거한다", () => {
    expect(normalizeEmail("  JoLaDongaN@Gmail.Com ")).toBe("joladongan@gmail.com");
  });

  it("한메일(hanmail.net)을 다음(daum.net)으로 통합한다", () => {
    expect(normalizeEmail("joladongan@hanmail.net")).toBe("joladongan@daum.net");
  });

  it("다음(daum.net)은 그대로 유지한다", () => {
    expect(normalizeEmail("joladongan@daum.net")).toBe("joladongan@daum.net");
  });

  it("null/undefined/빈 문자열은 빈 문자열을 반환한다", () => {
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail("")).toBe("");
  });

  it("@가 없는 문자열은 소문자 변환만 한다", () => {
    expect(normalizeEmail("NoAtSign")).toBe("noatsign");
  });
});

describe("isOperatorEmail - 운영자(경청자) 계정 판정", () => {
  it("지메일 계정을 운영자로 인식한다", () => {
    expect(isOperatorEmail("joladongan@gmail.com")).toBe(true);
  });

  it("네이버 계정을 운영자로 인식한다", () => {
    expect(isOperatorEmail("yomanflex@naver.com")).toBe(true);
  });

  it("카카오(한메일) 계정을 운영자로 인식한다", () => {
    expect(isOperatorEmail("joladongan@hanmail.net")).toBe(true);
  });

  it("카카오(다음) 계정을 운영자로 인식한다 — 한메일과 동일 계정", () => {
    expect(isOperatorEmail("joladongan@daum.net")).toBe(true);
  });

  it("대소문자가 섞여 있어도 운영자로 인식한다", () => {
    expect(isOperatorEmail("JoLaDongaN@HanMail.NET")).toBe(true);
    expect(isOperatorEmail("YOMANFLEX@naver.com")).toBe(true);
  });

  it("앞뒤 공백이 있어도 운영자로 인식한다", () => {
    expect(isOperatorEmail("  joladongan@daum.net  ")).toBe(true);
  });

  it("과거 오타(n 빠진) 이메일은 운영자가 아니다", () => {
    expect(isOperatorEmail("joladonga@hanmail.net")).toBe(false);
  });

  it("일반 회원 이메일은 운영자가 아니다", () => {
    expect(isOperatorEmail("random.customer@gmail.com")).toBe(false);
  });

  it("null/undefined/빈 문자열은 운영자가 아니다", () => {
    expect(isOperatorEmail(null)).toBe(false);
    expect(isOperatorEmail(undefined)).toBe(false);
    expect(isOperatorEmail("")).toBe(false);
  });
});

describe("OPERATOR_EMAILS 목록 무결성", () => {
  it("4개 운영자 이메일이 등록되어 있다 (한메일/다음/네이버/지메일)", () => {
    expect(OPERATOR_EMAILS).toContain("joladongan@hanmail.net");
    expect(OPERATOR_EMAILS).toContain("joladongan@daum.net");
    expect(OPERATOR_EMAILS).toContain("yomanflex@naver.com");
    expect(OPERATOR_EMAILS).toContain("joladongan@gmail.com");
  });

  it("등록된 모든 이메일은 isOperatorEmail로 운영자 판정된다", () => {
    for (const email of OPERATOR_EMAILS) {
      expect(isOperatorEmail(email)).toBe(true);
    }
  });
});
