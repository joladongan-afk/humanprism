import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

/**
 * 솔라피(SOLAPI) SMS 모듈 검증.
 *
 * 실제 발송 없이(전역 fetch를 모킹) 다음을 검증한다.
 *  1) 키가 모두 설정되면 sendCustomerSms가 솔라피 엔드포인트로 올바른 본문/헤더로 호출한다.
 *  2) Authorization 헤더가 HMAC-SHA256 규격(apiKey/date/salt/signature)을 만족하고,
 *     signature가 HMAC-SHA256(date+salt, secret)와 일치한다.
 *  3) from(발신번호)은 SOLAPI_SENDER, to(수신번호)는 하이픈이 제거된 숫자다.
 *  4) 운영자 발송(sendMasterSms)은 MASTER_SMS_TO로 발송된다.
 *  5) 키 미설정 시에는 fetch를 호출하지 않고 안전하게 skip한다.
 *
 * 주의: env.ts는 모듈 로드시 process.env를 읽으므로, 각 테스트에서 환경변수를 세팅한 뒤
 *       vi.resetModules()로 sms 모듈을 새로 import한다.
 */

const KEY = "TESTKEY1234567890";
const SECRET = "TESTSECRETABCDEFG1234567890";
const SENDER = "01044488064"; // 010-4448-8064
const MASTER = "01044488064";

const ORIGINAL_ENV = { ...process.env };

function setSolapiEnv() {
  process.env.SOLAPI_API_KEY = KEY;
  process.env.SOLAPI_API_SECRET = SECRET;
  process.env.SOLAPI_SENDER = SENDER;
  process.env.MASTER_SMS_TO = MASTER;
}

function clearSolapiEnv() {
  delete process.env.SOLAPI_API_KEY;
  delete process.env.SOLAPI_API_SECRET;
  delete process.env.SOLAPI_SENDER;
  delete process.env.MASTER_SMS_TO;
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("솔라피 발송 본문/서명 검증", () => {
  beforeEach(() => {
    vi.resetModules();
    setSolapiEnv();
  });

  it("고객 발송 시 솔라피 엔드포인트로 올바른 본문/헤더를 보낸다", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ statusCode: "2000", messageId: "M123" }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { sendCustomerSms } = await import("./_core/sms");
    const r = await sendCustomerSms("010-1234-5678", "안녕하세요 휴먼프리즘입니다");

    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.solapi.com/messages/v4/send");
    expect(init.method).toBe("POST");

    const body = JSON.parse(String(init.body));
    expect(body.message.from).toBe(SENDER);
    expect(body.message.to).toBe("01012345678"); // 하이픈 제거됨
    expect(body.message.text).toContain("휴먼프리즘");
  });

  it("Authorization 헤더가 HMAC-SHA256 규격을 만족하고 signature가 일치한다", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ statusCode: "2000", messageId: "M124" }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { sendCustomerSms } = await import("./_core/sms");
    await sendCustomerSms("01099998888", "서명 검증 테스트");

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const auth = (init.headers as Record<string, string>)["Authorization"];
    expect(auth).toMatch(/^HMAC-SHA256 /);

    const apiKey = /apiKey=([^,]+)/.exec(auth)?.[1]?.trim();
    const date = /date=([^,]+)/.exec(auth)?.[1]?.trim();
    const salt = /salt=([^,]+)/.exec(auth)?.[1]?.trim();
    const signature = /signature=([^,]+)/.exec(auth)?.[1]?.trim();

    expect(apiKey).toBe(KEY);
    expect(date).toBeTruthy();
    expect(salt).toBeTruthy();

    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(String(date) + String(salt))
      .digest("hex");
    expect(signature).toBe(expected);
  });

  it("운영자 발송은 MASTER_SMS_TO로 보낸다", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ statusCode: "2000", messageId: "M125" }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { sendMasterSms } = await import("./_core/sms");
    const r = await sendMasterSms("새 입금 신청이 접수되었습니다");
    expect(r.ok).toBe(true);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.message.to).toBe(MASTER);
    expect(body.message.from).toBe(SENDER);
  });

  it("솔라피가 에러 응답(statusCode 비2000)을 주면 ok=false로 처리한다", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        errorCode: "ValidationError",
        errorMessage: "잘못된 발신번호",
      }),
    }));
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { sendCustomerSms } = await import("./_core/sms");
    const r = await sendCustomerSms("01012345678", "에러 케이스");
    expect(r.ok).toBe(false);
    expect(r.skipped).toBe(false);
    expect(r.detail).toContain("발신번호");
  });
});

describe("솔라피 키 미설정 시 안전 skip", () => {
  beforeEach(() => {
    vi.resetModules();
    clearSolapiEnv();
  });

  it("키가 없으면 fetch를 호출하지 않고 skip한다 (고객)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { sendCustomerSms } = await import("./_core/sms");
    const r = await sendCustomerSms("01012345678", "키 없음");
    expect(r.skipped).toBe(true);
    expect(r.detail).toContain("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("키가 없으면 fetch를 호출하지 않고 skip한다 (운영자)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const { sendMasterSms } = await import("./_core/sms");
    const r = await sendMasterSms("키 없음 운영자 알림");
    expect(r.skipped).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
