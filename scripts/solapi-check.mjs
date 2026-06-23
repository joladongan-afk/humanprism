// 솔라피 API 키 유효성 검증 — 잔액조회 (실발송 아님, 비용 0원)
import crypto from "node:crypto";

const apiKey = process.env.SOLAPI_API_KEY ?? "";
const apiSecret = process.env.SOLAPI_API_SECRET ?? "";
const sender = process.env.SOLAPI_SENDER ?? "";

if (!apiKey || !apiSecret) {
  console.error("[solapi-check] SOLAPI_API_KEY / SOLAPI_API_SECRET 미설정");
  process.exit(2);
}

const date = new Date().toISOString();
const salt = crypto.randomBytes(32).toString("hex");
const signature = crypto
  .createHmac("sha256", apiSecret)
  .update(date + salt)
  .digest("hex");

const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

const res = await fetch("https://api.solapi.com/cash/v1/balance", {
  method: "GET",
  headers: {
    Authorization: authorization,
    "Content-Type": "application/json",
  },
});

const text = await res.text();
console.log(`[solapi-check] HTTP ${res.status}`);
console.log(`[solapi-check] sender(발신번호)=${sender}`);
console.log(`[solapi-check] body=${text}`);

if (res.ok) {
  console.log("[solapi-check] ✅ 키 유효 — 인증 성공");
  process.exit(0);
} else {
  console.error("[solapi-check] ❌ 키 검증 실패");
  process.exit(1);
}
