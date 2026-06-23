import { readFileSync } from "fs";

const d = JSON.parse(readFileSync("./server/rag-db.json", "utf-8"));
let chunks = [];
for (const key of d.sections) {
  const sec = d[key];
  if (!sec) continue;
  if (Array.isArray(sec.chunks)) {
    for (const c of sec.chunks) chunks.push(String(c.content || ""));
  }
  if (Array.isArray(sec.sub_sections)) {
    for (const ss of sec.sub_sections) {
      if (Array.isArray(ss.rules)) {
        for (const r of ss.rules) chunks.push(String(r.content || ""));
      }
    }
  }
}
const lens = chunks.map((t) => t.length);
const total = lens.reduce((a, b) => a + b, 0);
const avg = total / lens.length;
console.log("총 chunk 수:", chunks.length);
console.log("전체 합:", total, "자");
console.log("평균 chunk:", Math.round(avg), "자 | 최대:", Math.max(...lens), "자");
console.log("top-k=3 주입 시 대략:", Math.round(avg * 3), "자 (+태그/헤더 오버헤드)");
