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

/**
 * 상담 메시지 목록을 독립 HTML 파일(문자열)로 생성
 * PDF(Puppeteer) 대신 사용 - 서버 부담 없음, 실패 가능성 거의 없음
 * 다운로드 후 더블클릭하면 브라우저에서 바로 예쁘게 열린다.
 */
export async function generateConsultationHtmlFile(
  userName: string,
  messages: ConsultMessage[],
  sessionTitle: string,
  createdAt: Date
): Promise<string> {
  const formattedDate = createdAt.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });

  const messagesHtml = messages
    .map((msg) => {
      const isUser = msg.role === "user";
      const bubbleBg = isUser ? "#fef3c7" : "#f3f0fa";
      const bubbleColor = isUser ? "#78350f" : "#3c3489";
      const justify = isUser ? "flex-end" : "flex-start";
      const radius = isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px";
      const label = isUser ? "당신" : "마스터";
      const safeContent = msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      return (
        '<div style="display:flex; justify-content:' + justify + '; margin-bottom:1rem;">' +
          '<div style="max-width:80%;">' +
            '<div style="font-size:11px; color:#999; margin-bottom:4px; padding:0 4px;">' + label + '</div>' +
            '<div style="background:' + bubbleBg + '; color:' + bubbleColor + '; padding:10px 14px; border-radius:' + radius + '; font-size:14px; line-height:1.7; white-space:pre-wrap; word-break:break-word;">' +
              safeContent +
            '</div>' +
          '</div>' +
        '</div>'
      );
    })
    .join("");

  return (
    '<!DOCTYPE html>' +
    '<html lang="ko">' +
    '<head>' +
      '<meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<title>휴먼프리즘 상담 기록</title>' +
      '<style>' +
        '* { margin:0; padding:0; box-sizing:border-box; }' +
        'body { font-family: "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; background:#f5f1e8; padding:24px 12px; color:#333; }' +
        '.container { max-width:560px; margin:0 auto; background:#fff; padding:1.75rem; border-radius:16px; }' +
        '.guide { background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:14px 16px; margin-bottom:1.5rem; text-align:center; }' +
        '.guide-title { font-size:15px; font-weight:700; color:#9a3412; }' +
        '.guide-body { font-size:13px; color:#9a3412; margin-top:4px; line-height:1.5; }' +
        '.header { text-align:center; margin-bottom:1.5rem; }' +
        '.header h1 { font-size:18px; font-weight:700; color:#3a2f1f; }' +
        '.header .meta { font-size:13px; color:#999; margin-top:4px; }' +
        '.divider { border-top:0.5px solid #eee; margin-bottom:1.25rem; }' +
        '.footer { border-top:0.5px solid #eee; margin-top:1.5rem; padding-top:1rem; text-align:center; font-size:12px; color:#bbb; }' +
      '</style>' +
    '</head>' +
    '<body>' +
      '<div class="container">' +
        '<div class="guide">' +
          '<div class="guide-title">이 파일은 이렇게 보관하세요</div>' +
          '<div class="guide-body">다운로드 후 폴더에 저장만 해두면 끝!<br>다시 보고 싶을 때 더블클릭하세요.</div>' +
        '</div>' +
        '<div class="header">' +
          '<h1>휴먼프리즘</h1>' +
          '<div class="meta">' + sessionTitle + ' · ' + userName + ' · ' + formattedDate + '</div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div>' + messagesHtml + '</div>' +
        '<div class="footer">' +
          '<p>이 상담 기록은 개인의 성찰과 참고를 위한 것입니다.</p>' +
          '<p>human-prism.com</p>' +
        '</div>' +
      '</div>' +
    '</body>' +
    '</html>'
  );
}
