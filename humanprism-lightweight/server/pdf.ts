import puppeteer, { type Browser } from "puppeteer";
import type { SajuResult } from "./saju";
import { STEMS, BRANCHES } from "./saju";

let browserInstance: Browser | null = null;

/**
 * Get or create a singleton browser instance for PDF generation
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
}

/**
 * Close the browser instance (call on server shutdown)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Generate a professional Saju card HTML
 */
function generateSajuCardHTML(
  label: string,
  birthDate: string,
  gender: string,
  sajuData: SajuResult
): string {
  const { pillars, daeun } = sajuData;
  const { year, month, day, hour } = pillars;
  
  // Helper to get stem/branch indices
  const stemToIndex = (s: string): number => STEMS.indexOf(s as any);
  const branchToIndex = (b: string): number => BRANCHES.indexOf(b as any);
  
  const yearStem = stemToIndex(year.stem);
  const yearBranch = branchToIndex(year.branch);
  const monthStem = stemToIndex(month.stem);
  const monthBranch = branchToIndex(month.branch);
  const dayStem = stemToIndex(day.stem);
  const dayBranch = branchToIndex(day.branch);
  const hourStem = hour ? stemToIndex(hour.stem) : null;
  const hourBranch = hour ? branchToIndex(hour.branch) : null;
  const dayunStart = daeun.daeunNumber;
  const dayunStemBranch = daeun.pillars[0] ?? "";

  // Map stems and branches to Hanja
  const stemMap: Record<string, string> = {
    "0": "甲", "1": "乙", "2": "丙", "3": "丁", "4": "戊",
    "5": "己", "6": "庚", "7": "辛", "8": "壬", "9": "癸",
  };

  const branchMap: Record<string, string> = {
    "0": "子", "1": "丑", "2": "寅", "3": "卯", "4": "辰",
    "5": "巳", "6": "午", "7": "未", "8": "申", "9": "酉",
    "10": "戌", "11": "亥",
  };

  const sigunMap: Record<string, string> = {
    "0": "長生", "1": "沐浴", "2": "冠帶", "3": "臨官", "4": "帝旺",
    "5": "衰", "6": "病", "7": "死", "8": "墓", "9": "絶",
    "10": "胎", "11": "養",
  };

  const ganji = (stem: number, branch: number): string => {
    return stemMap[stem.toString()] + branchMap[branch.toString()];
  };

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>사주 명식 - ${label}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Serif KR', 'Gowun Batang', serif;
      background: linear-gradient(135deg, #f5f1e8 0%, #e8dcc8 100%);
      padding: 40px;
      color: #2c2416;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border: 3px solid #8b7355;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #d4af37;
      padding-bottom: 20px;
    }
    
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #2c2416;
      margin-bottom: 10px;
      letter-spacing: 2px;
    }
    
    .subtitle {
      font-size: 14px;
      color: #666;
      letter-spacing: 1px;
    }
    
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .info-item {
      padding: 15px;
      background: #faf8f3;
      border-left: 4px solid #d4af37;
      border-radius: 4px;
    }
    
    .info-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      color: #2c2416;
      font-weight: 500;
    }
    
    .ganji-section {
      margin: 30px 0;
      padding: 25px;
      background: linear-gradient(135deg, #faf8f3 0%, #f5f1e8 100%);
      border-radius: 8px;
      border: 2px solid #d4af37;
    }
    
    .ganji-title {
      font-size: 14px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 15px;
      text-align: center;
    }
    
    .ganji-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .ganji-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: white;
      border: 2px solid #d4af37;
      border-radius: 6px;
      min-height: 100px;
    }
    
    .ganji-hanja {
      font-size: 32px;
      font-weight: bold;
      color: #8b0000;
      margin-bottom: 8px;
      font-family: 'Noto Serif CJK KR';
    }
    
    .ganji-label {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .ganji-sigun {
      font-size: 12px;
      color: #666;
      margin-top: 6px;
      font-weight: 500;
    }
    
    .dayun-section {
      margin: 20px 0;
      padding: 15px;
      background: #faf8f3;
      border-left: 4px solid #d4af37;
      border-radius: 4px;
    }
    
    .dayun-label {
      font-size: 12px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .dayun-value {
      font-size: 16px;
      color: #2c2416;
      font-weight: 500;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #d4af37;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    
    .timestamp {
      color: #bbb;
      font-size: 11px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">사주 명식</div>
      <div class="subtitle">휴먼프리즘 · 마스터</div>
    </div>
    
    <div class="info-section">
      <div class="info-item">
        <div class="info-label">이름</div>
        <div class="info-value">${label}</div>
      </div>
      <div class="info-item">
        <div class="info-label">성별</div>
        <div class="info-value">${gender === "male" ? "남" : "여"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">출생일</div>
        <div class="info-value">${birthDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">시간</div>
        <div class="info-value">${hourStem !== null && hourBranch !== null ? "기재" : "미상"}</div>
      </div>
    </div>
    
    <div class="ganji-section">
      <div class="ganji-title">四柱八字</div>
      <div class="ganji-grid">
        <div class="ganji-cell">
          <div class="ganji-hanja">${ganji(yearStem, yearBranch)}</div>
          <div class="ganji-label">年</div>
          <div class="ganji-sigun">${sigunMap[(yearBranch * 2) % 12]}</div>
        </div>
        <div class="ganji-cell">
          <div class="ganji-hanja">${ganji(monthStem, monthBranch)}</div>
          <div class="ganji-label">月</div>
          <div class="ganji-sigun">${sigunMap[(monthBranch * 2) % 12]}</div>
        </div>
        <div class="ganji-cell">
          <div class="ganji-hanja">${ganji(dayStem, dayBranch)}</div>
          <div class="ganji-label">日</div>
          <div class="ganji-sigun">${sigunMap[(dayBranch * 2) % 12]}</div>
        </div>
        <div class="ganji-cell">
          <div class="ganji-hanja">${hourStem !== null && hourBranch !== null ? ganji(hourStem, hourBranch) : "미상"}</div>
          <div class="ganji-label">時</div>
          <div class="ganji-sigun">${hourStem !== null && hourBranch !== null ? sigunMap[(hourBranch * 2) % 12] : "—"}</div>
        </div>
      </div>
    </div>
    
    <div class="dayun-section">
      <div class="dayun-label">大運 시작</div>
      <div class="dayun-value">${dayunStart}세 · ${dayunStemBranch}</div>
    </div>
    
    <div class="dayun-section">
      <div class="dayun-label">十二支運</div>
      <div class="dayun-value">${daeun.pillars.slice(0, 12).join(" · ")}</div>
    </div>
    
    <div class="footer">
      <div>이 사주 명식은 만세력 기준으로 생성되었습니다.</div>
      <div class="timestamp">생성일: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate PDF from Saju data
 */
export async function generateSajuPDF(
  label: string,
  birthDate: string,
  gender: string,
  sajuData: SajuResult
): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const html = generateSajuCardHTML(label, birthDate, gender, sajuData);
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    // Generate PDF with A4 size
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "0.4in", right: "0.4in", bottom: "0.4in", left: "0.4in" },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}
