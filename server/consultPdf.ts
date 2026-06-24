import puppeteer, { Browser } from "puppeteer";
import type { ConsultMessage } from "../drizzle/schema";

let browserInstance: Browser | null = null;

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
 * 상담 메시지 목록을 HTML로 변환
 */
function formatConsultationHtml(
  userName: string,
  messages: ConsultMessage[],
  sessionTitle: string,
  createdAt: Date
): string {
  const formattedDate = createdAt.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const messagesHtml = messages
    .map((msg) => {
      const isUser = msg.role === "user";
      const bgColor = isUser ? "#f5f5f5" : "#ffffff";
      const borderLeft = isUser ? "4px solid #999" : "4px solid #d4af37";
      const textAlign = isUser ? "left" : "left";

      return `
        <div style="margin-bottom: 20px; padding: 12px 16px; background-color: ${bgColor}; border-left: ${borderLeft}; border-radius: 4px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px; font-weight: bold;">
            ${isUser ? "당신" : "마스터"}
          </div>
          <div style="font-size: 14px; line-height: 1.6; color: #333; white-space: pre-wrap; word-break: break-word;">
            ${msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
          <div style="font-size: 11px; color: #999; margin-top: 8px;">
            ${new Date(msg.createdAt).toLocaleTimeString("ko-KR")}
          </div>
        </div>
      `;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>상담 기록</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Noto Serif KR', serif;
          background: linear-gradient(135deg, #f5f1e8 0%, #e8e0d5 100%);
          padding: 40px 20px;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: #fefdf8;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border: 1px solid #e0d5c7;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid #d4af37;
          padding-bottom: 20px;
        }
        .header h1 {
          font-size: 28px;
          color: #2c2416;
          margin-bottom: 8px;
          letter-spacing: 2px;
        }
        .header .subtitle {
          font-size: 14px;
          color: #999;
          margin-bottom: 12px;
        }
        .header .meta {
          font-size: 12px;
          color: #666;
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .messages {
          margin-top: 30px;
          min-height: 200px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0d5c7;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        .footer p {
          margin: 4px 0;
        }
        @media print {
          body {
            background: white;
            padding: 0;
          }
          .container {
            box-shadow: none;
            border: none;
            max-width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>휴먼프리즘</h1>
          <div class="subtitle">${sessionTitle}</div>
          <div class="meta">
            <div class="meta-item">
              <span>상담자:</span>
              <span>${userName}</span>
            </div>
            <div class="meta-item">
              <span>날짜:</span>
              <span>${formattedDate}</span>
            </div>
            <div class="meta-item">
              <span>메시지:</span>
              <span>${messages.length}개</span>
            </div>
          </div>
        </div>

        <div class="messages">
          ${messagesHtml}
        </div>

        <div class="footer">
          <p>이 상담 기록은 개인의 성찰과 참고를 위한 것입니다.</p>
          <p>© 2026 Human Prism. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 상담 메시지 목록을 PDF로 생성
 */
export async function generateConsultationPDF(
  userName: string,
  messages: ConsultMessage[],
  sessionTitle: string,
  createdAt: Date
): Promise<Buffer | Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const html = formatConsultationHtml(userName, messages, sessionTitle, createdAt);
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdf = await page.pdf({
      format: "A4",
      margin: {
        top: "20mm",
        bottom: "20mm",
        left: "15mm",
        right: "15mm",
      },
      printBackground: true,
    });

    return pdf;
  } finally {
    await page.close();
  }
}

/**
 * PDF 생성 후 정리
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
