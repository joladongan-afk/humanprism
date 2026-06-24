import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PaymentNotice } from "@/components/PaymentNotice";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

/**
 * 무통장 입금 신청 3단계 다이얼로그.
 *
 *  화면1) 결제 방법 선택: [간편결제 (준비 중)] 비활성 / [통장 입금] 활성
 *  화면2) 입금 안내 + 신청 폼: 입금자명(필수) · 회원 아이디(자동 표시) · 휴대폰 번호(필수, 크게 강조)
 *  화면3) 신청 완료 → 승인 대기 안내
 *
 * requestDeposit 호출은 trpc.payment.requestDeposit 으로 노출되어 있다.
 */

export type DepositPlanType = "taste" | "deep" | "compatibility_chat";

const PLAN_LABEL: Record<DepositPlanType, { label: string; amount: number; duration: string }> = {
  taste: { label: "알뜰 상담", amount: 9900, duration: "질문 20회" },
  deep: { label: "심층 상담", amount: 14900, duration: "질문 30회" },
  compatibility_chat: { label: "궁합 채팅 상담", amount: 7900, duration: "질문 10회" },
};

type Step = "method" | "form" | "done";

export default function DepositRequestDialog({
  open,
  onOpenChange,
  planType,
  sajuProfileId,
  sajuProfileBId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planType: DepositPlanType | null;
  sajuProfileId?: number;
  sajuProfileBId?: number;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("method");
  const [depositorName, setDepositorName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const utils = trpc.useUtils();

  const requestDeposit = trpc.payment.requestDeposit.useMutation();

  // 다이얼로그 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setStep("method");
      setDepositorName(user?.name ?? "");
      setPhone("");
      setAgreed(false);
    }
  }, [open, user?.name]);

  if (!planType) return null;
  const plan = PLAN_LABEL[planType];

  // 휴대폰 번호 유효성 (010-1234-5678 / 01012345678 모두 허용)
  const phoneDigits = phone.replace(/[^0-9]/g, "");
  const phoneValid = /^01[0-9]{8,9}$/.test(phoneDigits);
  const nameValid = depositorName.trim().length >= 1;

  const handleSubmit = async () => {
    if (!nameValid) {
      toast.error("입금자명을 입력해 주세요.");
      return;
    }
    if (!phoneValid) {
      toast.error("승인 알림을 받을 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    if (!agreed) {
      toast.error("환불·소멸 안내에 동의해 주세요.");
      return;
    }
    try {
      // 하이픈 보기 좋게 정규화하여 전송
      const normalized =
        phoneDigits.length === 11
          ? `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 7)}-${phoneDigits.slice(7)}`
          : `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
      await requestDeposit.mutateAsync({
        planType,
        sajuProfileId,
        sajuProfileBId,
        depositorName: depositorName.trim(),
        depositorPhone: normalized,
      });
      await utils.session.list.invalidate().catch(() => {});
      setStep("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "입금 신청 중 오류가 발생했습니다.";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {plan.label} · {plan.amount.toLocaleString()}원
          </DialogTitle>
          <DialogDescription>
            {step === "method" && "결제 방법을 선택해 주세요."}
            {step === "form" && "아래 계좌로 입금하신 뒤, 신청 정보를 남겨 주세요."}
            {step === "done" && "입금 신청이 접수되었습니다."}
          </DialogDescription>
        </DialogHeader>

        {/* ───────── 화면 1: 결제 방법 선택 ───────── */}
        {step === "method" && (
          <div className="space-y-3 py-1">
            {/* 시간제·인원 무제한 강조 배너 */}
            <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-center shadow-sm">
              <p className="text-white text-base font-extrabold leading-snug">
                질문 개수만 제한 · 상담 인원은 무제한!
              </p>
              <p className="text-indigo-100 text-sm mt-1 leading-relaxed">
                정해진 질문 개수 안에서는 본인·가족·연인·친구 누구의 사주든,
                <br />몇 명이든 제한 없이 물어보실 수 있습니다.
              </p>
            </div>

            {/* 간편결제 (준비 중) - 비활성 */}
            <button
              type="button"
              onClick={() => toast.info("간편결제(카드)는 현재 준비 중입니다. 통장 입금을 이용해 주세요.")}
              className="w-full flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-left cursor-not-allowed"
            >
              <div>
                <p className="text-base font-semibold text-slate-400">간편결제 (카드)</p>
                <p className="text-sm text-slate-400 mt-0.5">신용·체크카드, 간편결제</p>
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-slate-200 px-2.5 py-1 rounded-full">
                준비 중
              </span>
            </button>

            {/* 통장 입금 - 활성 */}
            <button
              type="button"
              onClick={() => setStep("form")}
              className="w-full flex items-center justify-between rounded-xl border-2 border-indigo-500 bg-indigo-50 px-4 py-4 text-left transition-all duration-150 hover:bg-indigo-100 active:scale-[0.98]"
            >
              <div>
                <p className="text-base font-bold text-indigo-900">통장 입금 (무통장 입금)</p>
                <p className="text-sm text-indigo-700 mt-0.5">국민은행 계좌로 직접 입금</p>
              </div>
              <span className="text-xl text-indigo-500">→</span>
            </button>

            <p className="text-xs text-center text-muted-foreground pt-1">
              지금은 통장 입금으로만 결제하실 수 있습니다.
            </p>
          </div>
        )}

        {/* ───────── 화면 2: 입금 안내 + 신청 폼 ───────── */}
        {step === "form" && (
          <div className="space-y-4 py-1">
            {/* 입금 안내 (카드 준비중 문구는 화면1에서 안내했으므로 숨김) */}
            <PaymentNotice amount={plan.amount} planLabel={plan.label} hideCardNotice />

            {/* 로그인 자동 확인 - 안심 표시 (날것의 회원번호는 노출하지 않음) */}
            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3.5">
              <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-sm font-bold">✓</span>
              <div className="min-w-0">
                <p className="text-base font-bold text-emerald-800">로그인 정보로 자동 신청됩니다</p>
                <p className="text-sm text-emerald-700 mt-1 leading-relaxed">
                  회원 아이디를 따로 적거나 외우실 필요가 없습니다.<br />
                  아래 <span className="font-semibold">입금자명</span>과 <span className="font-semibold">휴대폰 번호</span>만 적어 주세요.
                </p>
              </div>
            </div>

            {/* 입금자명 - 필수 강조 */}
            <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4 space-y-2">
              <label className="flex items-center gap-2 text-lg font-extrabold text-indigo-900">
                <span className="text-2xl">💳</span>
                입금자명 <span className="text-rose-600">(필수)</span>
              </label>
              <p className="text-sm font-semibold text-indigo-700 leading-relaxed">
                통장에 찍히는 이름으로 입금을 확인합니다.
              </p>
              <input
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="예: 홍길동"
                className="w-full px-4 py-3.5 border-2 border-indigo-300 rounded-lg bg-white text-slate-900 text-xl font-bold tracking-wide text-center placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* 휴대폰 번호 - 크고 강하게 강조 (60대 어르신도 놓치지 않도록) */}
            <div className="rounded-xl border-2 border-rose-300 bg-rose-50 p-4 space-y-2">
              <label className="flex items-center gap-2 text-lg font-extrabold text-rose-700">
                <span className="text-2xl">📱</span>
                휴대폰 번호 <span className="text-rose-600">(필수)</span>
              </label>
              <p className="text-sm font-semibold text-rose-700 leading-relaxed">
                이 번호로 <span className="underline">상담 승인 알림 문자</span>를 보내 드립니다.
                <br />
                번호를 적지 않으시면 <span className="bg-rose-200 px-1 rounded">승인 안내를 받지 못합니다.</span>
              </p>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-4 py-3.5 border-2 border-rose-300 rounded-lg bg-white text-slate-900 text-xl font-bold tracking-wide text-center placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              {phone.length > 0 && !phoneValid && (
                <p className="text-sm font-semibold text-rose-600">
                  번호를 다시 확인해 주세요. (예: 010-1234-5678)
                </p>
              )}
            </div>

            {/* 결제 동의 체크박스 (환불·소멸 고지) */}
            <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-4 space-y-2.5">
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                아래 내용을 확인하신 후 동의해 주시면 결제가 진행됩니다.
              </p>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-slate-400 accent-indigo-600 cursor-pointer"
                />
                <span className="text-sm text-slate-800 leading-relaxed">
                  채팅방 첫 입장(첫 질문) 후{" "}
                  <span className="font-extrabold text-indigo-700">72시간(3일) 이내</span>에 남은 질문을 사용해야 하며,
                  기간이 지나면 남은 질문이 있어도 상담이 종료됩니다. 구매하신 질문 횟수는 사용 여부와 관계없이{" "}
                  <span className="font-extrabold text-rose-600">환불되지 않으며</span>, 미사용 질문은{" "}
                  <span className="font-extrabold text-rose-600">소멸됩니다</span>. 종료 임박 안내(1일·2일 경과 시)는 앱 화면으로 안내되는 점을 포함하여 확인하였습니다.
                </span>
              </label>
            </div>

            {/* 버튼 비활성 사유 안내 (입력 전에만 노출) */}
            {(!nameValid || !phoneValid || !agreed) && (
              <p className="text-sm font-semibold text-slate-700 text-center bg-slate-100 rounded-lg py-2.5 leading-relaxed">
                입금자명·휴대폰 번호를 적으시고 위 안내에 동의하시면<br />아래 <span className="text-indigo-700 font-bold">「입금 신청하기」</span> 버튼이 켜집니다.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep("method")}>
                이전
              </Button>
              <Button
                className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white text-base py-5 disabled:opacity-60"
                onClick={handleSubmit}
                disabled={requestDeposit.isPending || !nameValid || !phoneValid || !agreed}
              >
                {requestDeposit.isPending ? "신청 중..." : "입금 신청하기"}
              </Button>
            </div>
          </div>
        )}

        {/* ───────── 화면 3: 신청 완료 / 승인 대기 ───────── */}
        {step === "done" && (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-3xl text-emerald-600">✓</span>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-slate-800">입금 신청이 접수되었습니다</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                위 계좌로 <span className="font-bold text-indigo-700">{plan.amount.toLocaleString()}원</span>을
                입금해 주세요.
                <br />
                입금이 확인되면 <span className="font-semibold">6시간 이내</span>에 승인해 드리고,
                <br />
                남겨 주신 번호 <span className="font-semibold text-rose-600">{phone}</span> 로
                <br />
                승인 알림 문자를 보내 드립니다.
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-left">
              <p className="text-sm text-amber-800 leading-relaxed">
                · 승인 후 <span className="font-bold">72시간(3일)</span> 이내에 채팅방에 입장해 주세요.
                <br />
                · 기한이 지나면 상담은 자동 소멸되며 환불되지 않습니다.
                <br />· 진행 상태는 <span className="font-semibold">[내 상담실]</span>에서 확인하실 수 있습니다.
              </p>
            </div>
            <Button
              className="w-full bg-slate-800 hover:bg-slate-900 text-white"
              onClick={() => onOpenChange(false)}
            >
              확인
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
