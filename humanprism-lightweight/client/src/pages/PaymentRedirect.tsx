import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

/**
 * 모바일 결제(리다이렉트 방식) 복귀 페이지.
 *
 * 포트원은 모바일에서 결제 완료 후 redirectUrl로 다음 쿼리를 붙여 돌려보낸다:
 *   - paymentId        : 우리가 prepare에서 만든 merchantPaymentId
 *   - code / message   : 실패·취소 시
 *   - transactionType  : (참고용)
 *
 * 이 페이지는 merchantPaymentId로부터 우리 내부 paymentId를 복원해 verify를 호출한다.
 * 내부 paymentId는 merchantPaymentId 형식 "hp-{userId}-{paymentId}-{ts}" 에서 추출한다.
 */
export default function PaymentRedirect() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"verifying" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const verifyMutation = trpc.payment.verify.useMutation();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const message = params.get("message");
    const merchantPaymentId = params.get("paymentId");

    // 결제창에서 실패/취소된 경우
    if (code) {
      setStatus("error");
      setErrorMsg(message || "결제가 취소되었습니다.");
      return;
    }

    if (!merchantPaymentId) {
      setStatus("error");
      setErrorMsg("결제 정보를 확인할 수 없습니다.");
      return;
    }

    // merchantPaymentId: "hp-{userId}-{paymentId}-{ts}"
    const segs = merchantPaymentId.split("-");
    const internalPaymentId = segs.length >= 4 ? parseInt(segs[2], 10) : NaN;
    if (!Number.isFinite(internalPaymentId)) {
      setStatus("error");
      setErrorMsg("결제 식별자 형식이 올바르지 않습니다.");
      return;
    }

    verifyMutation
      .mutateAsync({ paymentId: internalPaymentId, merchantPaymentId })
      .then((res) => {
        if (res.requiresAppointment) {
          setLocation(`/appointments/new?paymentId=${res.paymentId}`);
        } else if (res.sessionId) {
          setLocation(`/consult/${res.sessionId}`);
        } else {
          setLocation("/me");
        }
      })
      .catch((e) => {
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "결제 검증에 실패했습니다.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="hanji-card max-w-md w-full p-10 text-center space-y-6">
        {status === "verifying" ? (
          <>
            <Spinner className="mx-auto h-8 w-8 text-primary" />
            <div>
              <h1 className="hanja-display text-2xl mb-2">결제 확인 중</h1>
              <p className="text-sm text-muted-foreground">
                결제 결과를 확인하고 있습니다. 잠시만 기다려 주세요.
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <h1 className="hanja-display text-2xl mb-2">결제를 완료하지 못했습니다</h1>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                className="bg-card"
                onClick={() => setLocation("/")}
              >
                홈으로
              </Button>
              <Button
                className="bg-primary text-primary-foreground"
                onClick={() => setLocation("/plans")}
              >
                다시 시도
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
