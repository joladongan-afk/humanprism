import { calculateSaju } from "../server/saju.ts";

// 목표: 연주 丁巳, 월주 乙巳, 일주 甲戌, 시주 甲子 (남)
// 1977년(정사년) 5월 전후, 자시(0시) 기준으로 일주 甲戌 찾기
const target = { year: "丁巳", month: "乙巳", day: "甲戌", hour: "甲子" };
const results = [];
for (let m = 4; m <= 6; m++) {
  for (let d = 1; d <= 30; d++) {
    try {
      const r = calculateSaju({ year: 1977, month: m, day: d, hour: 0, minute: 30, gender: "male", calendar: "solar" });
      const p = r.pillars; // [year, month, day, hour] 추정
      const gz = p.map((x) => `${x.stem}${x.branch}`);
      if (gz[2] === "甲戌") {
        results.push({ m, d, gz });
      }
    } catch (e) {}
  }
}
console.log("일주 甲戌 후보:");
results.forEach((x) => console.log(`  1977-${x.m}-${x.d}  →  ${x.gz.join(" ")}`));
