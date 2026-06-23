import { useState, useCallback } from "react";
import * as PortOne from "@portone/browser-sdk/v2";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type PlanType = "free" | "taste" | "event" | "deep" | "master_chat" | "master_offline" | "compatibility" | "compatibility_chat";

export interface PortonePaymentResult {
  paymentId: number;
  sessionId?: number;
  requiresAppointment: boolean;
}

interface StartArgs {
  planType: PlanType;
  sajuProfileId?: number;
  sajuProfileBId?: number;
  eventCode?: string;
}

/**
 * 포트원 V2 인증 결제 흐름을 캡슐화한 훅.
 *
 *  1) prepare 호출 → pending 결제 + 결제창 파라미터 수신
 *  2) PortOne.requestPayment 로 결제창 호출
 *  3) 성공 시 verify 호출 → 서버 검증 후 세션/예약 결과 반환
 *
 * 결제창은 모바일 호환을 위해 redirectUrl을 함께 넘기되,
 * forceRedirect는 주지 않아 PC는 반환값 방식, 모바일은 리다이렉트 방식으로 자동 분기된다.
 */
export function usePortonePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  // 운영자(마스터 본인)는 모든 유료 플랜을 결제창 없이 무료로 이용한다.
  // 백엔드 mockPay가 admin에게 시간 무제한·무료 제한 해제를 이미 적용한다.
  const isOperator = user?.role === "admin";
  const prepareMutation = trpc.payment.prepare.useMutation();
  const verifyMutation = trpc.payment.verify.useMutation();
  const mockPayMutation = trpc.payment.mockPay.useMutation();
  const freeMockPayMutation = trpc.payment.freeMockPay.useMutation();

  const startPayment = useCallback(
    async (args: StartArgs): Promise<PortonePaymentResult> => {
      setIsProcessing(true);
      try {
        // free 플랜은 freeMockPay 호출 (선택한 사주 프로필 연결)
        if (args.planType === "free") {
          const result = await freeMockPayMutation.mutateAsync(
            args.sajuProfileId ? { sajuProfileId: args.sajuProfileId } : undefined,
          );
          return {
            sessionId: result.sessionId,
            paymentId: result.paymentId,
            requiresAppointment: false,
          };
        }

        // event 플랜은 mockPay 호출
        if (args.planType === "event") {
          const result = await mockPayMutation.mutateAsync({
            planType: args.planType,
            sajuProfileId: args.sajuProfileId,
            eventCode: args.eventCode,
          });
          return result;
        }

        // compatibility_chat (admin): mockPay로 즉시 채팅 세션 생성
        if (args.planType === "compatibility_chat") {
          if (isOperator) {
            const result = await mockPayMutation.mutateAsync({
              planType: "compatibility_chat",
              sajuProfileId: args.sajuProfileId,
              sajuProfileBId: args.sajuProfileBId,
            });
            return result;
          }
          // 일반 사용자: 포트원 결제 후 verify
          const prep = await prepareMutation.mutateAsync({
            planType: "compatibility_chat",
            sajuProfileId: args.sajuProfileId,
          });
          const response = await PortOne.requestPayment({
            storeId: prep.storeId,
            channelKey: prep.channelKey ?? undefined,
            paymentId: prep.merchantPaymentId,
            orderName: prep.orderName,
            totalAmount: prep.amount,
            currency: "CURRENCY_KRW",
            payMethod: "CARD",
            customer: { fullName: prep.customer.fullName, email: prep.customer.email, phoneNumber: prep.customer.phoneNumber },
            redirectUrl: `${window.location.origin}/payment/redirect`,
          });
          if (response?.code !== undefined) {
            throw new PortonePaymentError(response.message ?? "결제가 취소되었습니다.", response.code);
          }
          const result = await verifyMutation.mutateAsync({
            paymentId: prep.paymentId,
            merchantPaymentId: prep.merchantPaymentId,
            sajuProfileId: args.sajuProfileId,
            sajuProfileBId: args.sajuProfileBId,
          });
          return result;
        }

        // 운영자(admin): 유료 플랜을 결제창 없이 mockPay로 즉시 처리.
        // (궁합 compatibility는 mockPay 경로가 아니르로 제외 — Compatibility 페이지에서 운영자는 결제를 건너뛰고 바로 분석한다.)
        if (isOperator && args.planType !== "compatibility") {
          const result = await mockPayMutation.mutateAsync({
            planType: args.planType,
            sajuProfileId: args.sajuProfileId,
            eventCode: args.eventCode,
          });
          return result;
        }

        // 1) 서버에서 결제 준비 (유료 플랜)
        const prep = await prepareMutation.mutateAsync({
          planType: args.planType,
          sajuProfileId: args.sajuProfileId,
          eventCode: args.eventCode,
        });

        // 2) 포트원 결제창 호출
        const response = await PortOne.requestPayment({
          storeId: prep.storeId,
          channelKey: prep.channelKey ?? undefined,
          paymentId: prep.merchantPaymentId,
          orderName: prep.orderName,
          totalAmount: prep.amount,
          currency: "CURRENCY_KRW",
          payMethod: "CARD",
          customer: {
            fullName: prep.customer.fullName,
            email: prep.customer.email,
            phoneNumber: prep.customer.phoneNumber,
          },
          redirectUrl: `${window.location.origin}/payment/redirect`,
        });

        // 결제창에서 오류(취소 포함)가 발생한 경우 code가 채워진다.
        if (response?.code !== undefined) {
          throw new PortonePaymentError(response.message ?? "결제가 취소되었습니다.", response.code);
        }

        // 3) 서버 검증
        const result = await verifyMutation.mutateAsync({
          paymentId: prep.paymentId,
          merchantPaymentId: prep.merchantPaymentId,
          sajuProfileId: args.sajuProfileId,
        });

        return result;
      } finally {
        setIsProcessing(false);
      }
    },
    [prepareMutation, verifyMutation, mockPayMutation, freeMockPayMutation, isOperator],
  );

  return { startPayment, isProcessing };
}

/**
 * 포트원 결제창 단계에서 발생한 오류(사용자 취소 포함).
 */
export class PortonePaymentError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "PortonePaymentError";
    this.code = code;
  }
}
