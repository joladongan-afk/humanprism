import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import * as db from "./db";

/**
 * 상담 세션의 전체 메시지를 조회하고 이메일로 발송한다.
 * 서버에서 메시지를 조합하므로 클라이언트 입력에 의존하지 않는다.
 */
export async function sendConsultationEmailShare(
  sessionId: number,
  userId: number,
  recipientEmail: string
): Promise<{ success: true }> {
  // 세션 권한 검증
  const s = await db.getConsultSessionById(sessionId);
  if (!s || s.userId !== userId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "상담 세션을 찾을 수 없습니다.",
    });
  }

  // 전체 상담 메시지 조회
  const messages = await db.listConsultMessages(sessionId);
  if (messages.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "공유할 상담 기록이 없습니다.",
    });
  }

  // 상담 기록 본문 생성
  const messageLines = messages
    .map((m) => {
      const role = m.role === "user" ? "회원님" : "마스터";
      return `[${role}]\n${m.content}`;
    })
    .join("\n\n");

  const planLabel: Record<string, string> = {
    entry: "입구 플랜 · 30분",
    deep: "심화 플랜 · 60분",
    master_chat: "마스터 채팅 · 60분",
    master_offline: "마스터 대면 · 80분",
  };

  // 이메일 본문 생성
  const emailContent = `
안녕하세요,

휴먼프리즘의 상담 기록을 공유합니다.

[상담 정보]
플랜: ${planLabel[s.planType] ?? s.planType}
날짜: ${s.createdAt.toLocaleDateString("ko-KR")}
메시지 수: ${messages.length}개

[상담 기록]
${messageLines}

더 자세한 내용은 휴먼프리즘 웹사이트에서 확인하실 수 있습니다.

감사합니다.
마스터 드림
  `.trim();

  // 이메일 발송 (Manus 내장 API 사용)
  try {
    const response = await fetch(
      `${ENV.forgeApiUrl}/webdevtoken.v1.WebDevService/SendEmail`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${ENV.forgeApiKey}`,
          "content-type": "application/json",
          "connect-protocol-version": "1",
        },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `휴먼프리즘 상담 기록 (${s.createdAt.toLocaleDateString("ko-KR")})`,
          body: emailContent,
        }),
      }
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[sendConsultationEmailShare] Email send failed (${response.status})`,
        detail
      );
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "이메일 발송에 실패했습니다.",
      });
    }

    return { success: true } as const;
  } catch (err) {
    if (err instanceof TRPCError) throw err;
    console.error("[sendConsultationEmailShare] Error:", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "이메일 발송 중 오류가 발생했습니다.",
    });
  }
}
