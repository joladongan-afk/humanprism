import { describe, expect, it } from "vitest";
import {
  sendCustomerSms,
  isSolapiKeyConfigured,
} from "./_core/sms";
import { buildInitialGreeting } from "./masterPrompt";

/**
 * 무통장 입금 트랙 관련 검증.
 *
 * 1) 고객 SMS는 "번호 없음" 또는 "솔라피 키 미설정" 상황에서 절대 throw 하지 않고
 *    안전하게 skip 되어야 한다(입금 신청/승인 자체를 막으면 안 됨).
 * 2) 채팅방 첫 인사는 시간제 유료 세션에서 "인원 무제한"을 안내하고,
 *    마스터 직접상담 세션에서는 그 안내를 넣지 않는다.
 */

describe("sendCustomerSms 안전 skip", () => {
  it("고객 번호가 없으면 발송을 건너뛴다(throw 금지)", async () => {
    const r1 = await sendCustomerSms(null, "테스트 메시지");
    expect(r1.ok).toBe(false);
    expect(r1.skipped).toBe(true);

    const r2 = await sendCustomerSms("", "테스트 메시지");
    expect(r2.skipped).toBe(true);

    const r3 = await sendCustomerSms(undefined, "테스트 메시지");
    expect(r3.skipped).toBe(true);
  });

  it("메시지가 비어 있으면 발송을 건너뛴다", async () => {
    const r = await sendCustomerSms("010-1234-5678", "   ");
    expect(r.skipped).toBe(true);
  });

  it("솔라피 키가 미설정이면 번호가 있어도 안전하게 skip 된다", async () => {
    // 솔라피 키가 주입되지 않은 상태를 가정.
    // 키가 설정되어 있다면 이 케이스는 실제 발송을 시도하므로 스킵 검증을 생략한다.
    if (isSolapiKeyConfigured()) {
      expect(true).toBe(true);
      return;
    }
    const r = await sendCustomerSms("010-1234-5678", "승인 알림 테스트");
    expect(r.ok).toBe(false);
    expect(r.skipped).toBe(true);
    expect(r.detail).toContain("not configured");
  });
});

describe("buildInitialGreeting 횟수제 고지(사주 뽑기 자유/질문 차감/72시간)", () => {
  it("맛보기(taste) 세션은 사주 뽑기 자유 + 질문 차감 + 72시간 고지를 포함한다", () => {
    const g = buildInitialGreeting("taste");
    expect(g).toContain("차감");
    expect(g).toContain("72시간");
    expect(g).toContain("제한이 없");
  });

  it("메인(deep) 세션도 질문 차감 + 72시간 고지를 포함한다", () => {
    const g = buildInitialGreeting("deep");
    expect(g).toContain("차감");
    expect(g).toContain("72시간");
  });

  it("횟수제 세션은 '시간/인원 무제한' 표현을 넣지 않는다", () => {
    const g = buildInitialGreeting("taste");
    expect(g).not.toContain("무제한");
  });

  it("마스터 직접상담(master_chat) 세션은 차감/72시간 고지를 넣지 않는다", () => {
    const g = buildInitialGreeting("master_chat");
    expect(g).not.toContain("차감");
    expect(g).not.toContain("72시간");
  });

  it("마스터 대면(master_offline) 세션도 차감/72시간 고지를 넣지 않는다", () => {
    const g = buildInitialGreeting("master_offline");
    expect(g).not.toContain("차감");
    expect(g).not.toContain("72시간");
  });
});
