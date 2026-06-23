import {
  getAppointmentById,
  listAllAppointments,
  updateAppointment,
  getUserById,
} from "./db";
import { notifyAppointmentStatusChange, notifyAppointmentReminder } from "./kakaoNotification";
import { ENV } from "./_core/env";

/**
 * 예약 상태 변경 시 고객 이메일 알림
 */
async function sendAppointmentStatusEmail(
  userEmail: string,
  userName: string,
  status: string,
  consultType: string,
  preferredDate: Date,
  depositAmount?: number
): Promise<boolean> {
  try {
    const statusMessages: Record<string, string> = {
      confirmed: "예약이 확정되었습니다",
      payment_pending: "입금 안내가 발송되었습니다",
      paid: "입금이 확인되었습니다",
      rejected: "죄송하지만 예약이 거절되었습니다",
      completed: "상담이 완료되었습니다",
      cancelled: "예약이 취소되었습니다",
    };

    const consultTypeLabel = consultType === "chat" ? "채팅" : consultType === "phone" ? "전화" : "대면";
    const dateStr = preferredDate.toLocaleDateString("ko-KR");
    const timeStr = preferredDate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

    let emailBody = `${userName}님께,

안녕하세요. 휴먼프리즘입니다.

예약 상태가 변경되었습니다.

【 예약 상태 】
${statusMessages[status] || "예약 상태가 변경되었습니다"}

【 상담 유형 】
${consultTypeLabel} 상담

【 예약 일시 】
${dateStr} ${timeStr}

`;

    // paid 상태일 때 입금 정보 추가
    if (status === "paid" && depositAmount) {
      emailBody += `【 입금 확인 】
입금액: ${depositAmount.toLocaleString()}원

입금이 확인되었습니다. 예약이 최종 확정되었습니다.

`;
    }

    emailBody += `더 자세한 내용은 휴먼프리즘 웹사이트에서 확인하실 수 있습니다.

감사합니다.
휴먼프리즘 드림`;

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
        subject: `[휴먼프리즘] 예약 상태 변경 안내 - ${statusMessages[status] || "상태 변경"}`,
        body: emailBody,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[appointmentNotification] Email send failed (${response.status}):`, detail);
      return false;
    }

    console.log(`[appointmentNotification] Email sent to ${userEmail} - Status: ${status}`);
    return true;
  } catch (error) {
    console.error("[appointmentNotification] Error sending email:", error);
    return false;
  }
}

/**
 * 예약 상태 변경 시 알림 발송 (이메일 + 카카오톡)
 */
export async function handleAppointmentStatusNotification(
  appointmentId: number,
  newStatus: string,
  depositAmount?: number
): Promise<void> {
  try {
    // 예약 정보 조회
    const appointment = await getAppointmentById(appointmentId);

    if (!appointment) {
      console.error(`[appointmentNotification] Appointment not found: ${appointmentId}`);
      return;
    }

    // 사용자 정보 조회
    const user = await getUserById(appointment.userId);

    if (!user) {
      console.error(`[appointmentNotification] User not found`);
      return;
    }

    // 특정 상태에서만 알림 발송
    const notifiableStatuses = ["confirmed", "payment_pending", "paid", "rejected", "completed", "cancelled"];
    if (!notifiableStatuses.includes(newStatus)) {
      return;
    }

    const userName = user.name || user.nickname || "회원님";

    // 이메일 알림 발송
    if (user.email) {
      await sendAppointmentStatusEmail(
        user.email,
        userName,
        newStatus,
        appointment.consultType,
        appointment.preferredDate,
        depositAmount
      );
    }

    // 카카오톡 알림 발송 (현재는 mock)
    if (appointment.phone) {
      const result = await notifyAppointmentStatusChange(
        appointment.phone,
        appointment.consultType,
        newStatus,
        userName,
        appointment.preferredDate
      );

      if (result.success) {
        console.log(`[appointmentNotification] Kakao sent to ${appointment.phone} - Status: ${newStatus}`);
      } else {
        console.error(`[appointmentNotification] Kakao failed: ${result.error}`);
      }
    }
  } catch (error) {
    console.error("[appointmentNotification] Error:", error);
  }
}

/**
 * 예약 상태 업데이트 및 알림 발송
 */
export async function updateAppointmentWithNotification(
  appointmentId: number,
  newStatus: string,
  masterNote?: string,
  depositAmount?: number
): Promise<void> {
  try {
    // 상태 업데이트
    await updateAppointment(appointmentId, {
      status: newStatus as any,
      masterNote: masterNote || null,
      confirmedAt: newStatus === "confirmed" || newStatus === "payment_pending" ? new Date() : undefined,
      depositAmount: depositAmount ?? null,
      paidAt: newStatus === "paid" ? new Date() : undefined,
    });

    // 알림 발송
    await handleAppointmentStatusNotification(appointmentId, newStatus, depositAmount);
  } catch (error) {
    console.error("[appointmentNotification] Error updating appointment:", error);
  }
}

/**
 * 예약 24시간 전 알림 발송 (Heartbeat 작업)
 */
export async function sendAppointmentReminders(): Promise<void> {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 모든 예약 조회
    const allAppointments = await listAllAppointments();

    let sentCount = 0;
    for (const apt of allAppointments) {
      // 24시간 이내 예정되고, 결제 완료 상태인 예약만 처리
      if (apt.status === "paid" && apt.preferredDate <= in24Hours && apt.preferredDate > now) {
        const user = await getUserById(apt.userId);

        if (user && apt.phone) {
          const result = await notifyAppointmentReminder(
            apt.phone,
            apt.consultType,
            user.name || user.nickname || "회원님",
            apt.preferredDate,
            apt.consultType
          );

          if (result.success) {
            sentCount++;
          }
        }
      }
    }

    console.log(`[appointmentNotification] Sent ${sentCount} reminder notifications`);
  } catch (error) {
    console.error("[appointmentNotification] Error sending reminders:", error);
  }
}
