import { getPaymentById, getUserById } from "./db";
import { ENV } from "./_core/env";
import { getRefundMessage } from "../shared/refundMessages";
import { planLabelOf } from "../shared/revenue";

/**
 * 환불 안내 고객 이메일 발송.
 * 결제수단(계좌입금 / 카드)에 따라 적절한 안내 문구가 자동 선택된다.
 */
async function sendRefundEmail(
  userEmail: string,
  userName: string,
  planType: string,
  refundAmount: number,
  paymentMethod: string | null | undefined,
  kind: "requested" | "completed" | "rejected"
): Promise<boolean> {
  try {
    const planLabel = planLabelOf(planType);
    const guideMessage = getRefundMessage(paymentMethod);

    const headlineByKind: Record<typeof kind, string> = {
      requested: "환불 요청이 접수되었습니다",
      completed: "환불 처리가 완료되었습니다",
      rejected: "환불 요청 처리 결과 안내",
    } as const;

    let emailBody = `${userName}님께,

안녕하세요. 휴먼프리즘입니다.

${headlineByKind[kind]}.

【 상품 】
${planLabel}

【 환불 금액 】
${refundAmount.toLocaleString()}원

`;

    if (kind === "requested") {
      emailBody += `【 환불 안내 】
${guideMessage}

`;
    } else if (kind === "completed") {
      emailBody += `【 환불 안내 】
요청하신 환불이 정상적으로 처리되었습니다.
${guideMessage}

`;
    } else {
      emailBody += `【 안내 】
검토 결과 환불이 어려운 점 양해 부탁드립니다. 자세한 사유가 궁금하시면 언제든지 문의해 주세요.

`;
    }

    emailBody += `감사합니다.
휴먼프리즘 드림`;

    const subjectByKind: Record<typeof kind, string> = {
      requested: "[휴먼프리즘] 환불 요청 접수 안내",
      completed: "[휴먼프리즘] 환불 처리 완료 안내",
      rejected: "[휴먼프리즘] 환불 요청 처리 결과 안내",
    } as const;

    const response = await fetch(`${ENV.forgeApiUrl}/webdevtoken.v1.WebDevService/SendEmail`, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({
        to: userEmail,
        subject: subjectByKind[kind],
        body: emailBody,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[refundNotification] Email send failed (${response.status}):`, detail);
      return false;
    }

    console.log(`[refundNotification] Email sent to ${userEmail} - kind: ${kind}`);
    return true;
  } catch (error) {
    console.error("[refundNotification] Error sending email:", error);
    return false;
  }
}

/**
 * 결제 ID 기준으로 고객에게 환불 안내 이메일을 발송한다.
 * 알림 실패는 비차단(non-blocking): 환불 처리 자체는 이미 DB에 반영됨.
 */
export async function notifyRefundToCustomer(
  paymentId: number,
  kind: "requested" | "completed" | "rejected"
): Promise<boolean> {
  try {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      console.error(`[refundNotification] Payment not found: ${paymentId}`);
      return false;
    }

    const user = await getUserById(payment.userId);
    if (!user || !user.email) {
      console.warn(`[refundNotification] User/email not found for payment ${paymentId}`);
      return false;
    }

    const userName = user.name || user.nickname || "회원님";
    const refundAmount = payment.refundAmount ?? payment.amount;

    return await sendRefundEmail(
      user.email,
      userName,
      payment.planType,
      refundAmount,
      payment.paymentMethod,
      kind
    );
  } catch (error) {
    console.error("[refundNotification] Error:", error);
    return false;
  }
}
