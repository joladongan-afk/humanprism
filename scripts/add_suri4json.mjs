import { createConnection } from "mysql2/promise";

const conn = await createConnection(process.env.DATABASE_URL);
try {
  await conn.execute("ALTER TABLE namingServices ADD COLUMN suri4Json text");
  console.log("✅ suri4Json 컬럼 추가 완료");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("이미 존재함 — OK");
  } else {
    console.error("❌ 오류:", e.message);
  }
} finally {
  await conn.end();
}
