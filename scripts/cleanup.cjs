const mysql=require("mysql2/promise");
(async()=>{
  const c=await mysql.createConnection(process.env.DATABASE_URL);

  // 찐따(1200001) 제외한 나머지 프로필 세션 삭제
  const [r1]=await c.execute("DELETE FROM consultSessions WHERE sajuProfileId != 1200001 OR sajuProfileId IS NULL");
  console.log("세션 삭제:", r1.affectedRows, "건");

  // 결제 기록 삭제 (고아 레코드)
  const [r2]=await c.execute("DELETE FROM payments WHERE id NOT IN (SELECT DISTINCT paymentId FROM consultSessions WHERE paymentId IS NOT NULL)");
  console.log("결제기록 삭제:", r2.affectedRows, "건");

  // 찐따 제외 프로필 삭제
  const [r3]=await c.execute("DELETE FROM sajuProfiles WHERE id != 1200001");
  console.log("프로필 삭제:", r3.affectedRows, "건");

  // 결과 확인
  const [s]=await c.execute("SELECT id, planType, status, sajuProfileId FROM consultSessions ORDER BY id DESC");
  console.log("남은 세션:", JSON.stringify(s,null,2));
  const [p]=await c.execute("SELECT id, label FROM sajuProfiles");
  console.log("남은 프로필:", JSON.stringify(p,null,2));

  await c.end();
})();
