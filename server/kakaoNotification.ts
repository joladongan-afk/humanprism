// Kakao Notification 유틸리티

/**
 * 카카오톡 알림톡 발송 (Kakao Business API)
 * 실제 구현은 Kakao Business Message API 사용
 */
export async function sendKakaoNotification(
  phoneNumber: string,
  templateId: string,
  variables: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // 실제 구현: Kakao Business Message API 호출
    // 현재는 시뮬레이션
    console.log(`[Kakao Notification] Sending to ${phoneNumber}`);
    console.log(`[Kakao Notification] Template: ${templateId}`);
    console.log(`[Kakao Notification] Variables:`, variables);

    // TODO: 실제 Kakao API 호출
    // const response = await fetch('https://kapi.kakao.com/v2/talk/memo/send', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.KAKAO_ADMIN_KEY}`,
    //     'Content-Type': 'application/x-www-form-urlencoded',
    //   },
    //   body: new URLSearchParams({
    //     receiver_uuid: phoneNumber,
    //     template_id: templateId,
    //     ...variables,
    //   }),
    // });

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
    };
  } catch (error) {
    console.error("[Kakao Notification] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 예약 상태 변경 시 알림 발송
 */
export async function notifyAppointmentStatusChange(
  phone: string,
  appointmentType: string,
  status: string,
  userName: string,
  preferredDate: Date
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const statusMessages: Record<string, string> = {
    confirmed: "예약이 확정되었습니다",
    payment_pending: "결제 대기 중입니다",
    paid: "결제가 완료되었습니다",
    rejected: "죄송하지만 예약이 거절되었습니다",
    completed: "상담이 완료되었습니다",
    cancelled: "예약이 취소되었습니다",
  };

  const message = statusMessages[status] || "예약 상태가 변경되었습니다";
  const dateStr = preferredDate.toLocaleDateString("ko-KR");

  return sendKakaoNotification(phone, "appointment_status", {
    user_name: userName,
    appointment_type: appointmentType,
    status_message: message,
    preferred_date: dateStr,
  });
}

/**
 * 예약 알림 (예약 예정일 24시간 전)
 */
export async function notifyAppointmentReminder(
  phone: string,
  appointmentType: string,
  userName: string,
  preferredDate: Date,
  consultType: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const dateStr = preferredDate.toLocaleDateString("ko-KR");
  const timeStr = preferredDate.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return sendKakaoNotification(phone, "appointment_reminder", {
    user_name: userName,
    appointment_type: appointmentType,
    consult_type: consultType,
    preferred_date: dateStr,
    preferred_time: timeStr,
  });
}
