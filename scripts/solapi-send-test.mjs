// 솔라피 실발송 테스트 — 마스터 번호로 1건 발송 (비용 약 18원)
import crypto from "node:crypto";

const apiKey = process.env.SOLAPI_API_KEY ?? "";
const apiSecret = process.env.SOLAPI_API_SECRET ?? "";
const sender = process.env.SOLAPI_SENDER ?? "";
const to = process.env.SOLAPI_TEST_TO ?? sender;

if (!apiKey || !apiSecret || !sender) {
  console.error("[send-test] 키/발신번호 미설정");
  process.exit(2);
}

const date = new Date().toISOString();
const salt = crypto.randomBytes(32).toString("hex");
const signature = crypto
  .createHmac("sha256", apiSecret)
  .update(date + salt)
  .digest("hex");

const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

const res = await fetch("https://api.solapi.com/messages/v4/send", {
  method: "POST",
  headers: {
    Authorization: authorization,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: {
      to,
      from: sender,
      text: "[휴먼프리즘] 솔라피 문자 발송 연동 테스트입니다. 이 문자가 도착했다면 알림 발송이 정상 작동합니다.",
    },
  }),
});

const text = await res.text();
console.log(`[send-test] HTTP ${res.status}`);
console.log(`[send-test] from=${sender} to=${to}`);
console.log(`[send-test] body=${text}`);

if (res.ok) {
  console.log("[send-test] ✅ 발송 접수 성공");
  process.exit(0);
} else {
  console.error("[send-test] ❌ 발송 실패");
  process.exit(1);
}
