// 세션17: payments/consultSessions 테이블의 planType enum에
// self_naming(셀프작명 5만원)을 추가한다.
//
// 사용법 (Railway 콘솔):
//   node scripts/fix-plantype-enum-selfnaming.cjs

const mysql = require("mysql2/promise");

(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);

  console.log("[1/3] payments.planType 에 self_naming 추가...");
  await c.execute(`
    ALTER TABLE payments MODIFY COLUMN planType ENUM(
      'free','taste','event','deep',
      'master_chat','master_offline',
      'compatibility','compatibility_chat',
      'master_kakao_15','master_kakao_30','master_kakao_60',
      'self_naming'
    ) NOT NULL
  `);

  console.log("[2/3] consultSessions.planType 에 self_naming 추가...");
  await c.execute(`
    ALTER TABLE consultSessions MODIFY COLUMN planType ENUM(
      'free','taste','event','deep',
      'master_chat','master_offline',
      'compatibility_chat',
      'master_kakao_15','master_kakao_30','master_kakao_60',
      'self_naming'
    ) NOT NULL
  `);

  console.log("[3/3] 변경 후 확인...");
  const [after1] = await c.execute(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME='payments' AND COLUMN_NAME='planType'"
  );
  const [after2] = await c.execute(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_NAME='consultSessions' AND COLUMN_NAME='planType'"
  );
  console.log("payments.planType       =", after1[0]?.COLUMN_TYPE);
  console.log("consultSessions.planType=", after2[0]?.COLUMN_TYPE);

  console.log("\n완료. 셀프작명 결제(무통장입금/카드결제) 모두 정상 작동해야 합니다.");
  await c.end();
})().catch((e) => {
  console.error("실패:", e);
  process.exit(1);
});
