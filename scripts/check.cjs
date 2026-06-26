const mysql=require("mysql2/promise");
(async()=>{
  const c=await mysql.createConnection(process.env.DATABASE_URL);
  const [r]=await c.execute("SELECT id, planType, status, sajuProfileId FROM consultSessions ORDER BY id DESC LIMIT 10");
  console.log(JSON.stringify(r,null,2));
  await c.end();
})();
