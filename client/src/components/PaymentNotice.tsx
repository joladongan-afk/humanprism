import { useState } from "react";
import { toast } from "sonner";

/**
 * 공통 입금(무통장) 안내 컴포넌트.
 *
 * 카드·간편결제(토스페이먼츠)가 활성화되기 전까지의 임시 결제 안내.
 * 결제를 맞닥뜨리는 모든 화면에 동일하게 노출한다.
 *
 * 디자인 원칙(중요):
 *  - 회색 작은 글자 금지. 모든 핵심 안내는 진한 먹색(slate-800/900) + 14px 이상.
 *  - 간결하되 불친절하지 않게: 긴 줄글 대신 "굵은 핵심 + 한 줄 설명" 구조.
 *
 * 담는 내용:
 *  - 국민은행 계좌(652301-01-809536 / 전원석) + 복사 버튼
 *  - 입금자명 확인 안내
 *  - 이용 안내(순서 중요): ① 6시간 내 승인 → ② 승인 후 72시간 내 입장 → ③ 질문 사용 시 차감 → ④ 미사용 질문 환불 불가
 */

const BANK_NAME = "국민은행";
const BANK_ACCOUNT = "652301-01-809536";
const BANK_HOLDER = "전원석";

export function PaymentNotice({
  amount,
  planLabel,
  className = "",
  hideCardNotice = false,
}: {
  amount?: number;
  planLabel?: string;
  className?: string;
  hideCardNotice?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyAccount = async () => {
    try {
      await navigator.clipboard.writeText(BANK_ACCOUNT.replace(/-/g, ""));
      setCopied(true);
      toast.success("계좌번호가 복사되었습니다.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("복사에 실패했습니다. 직접 입력해 주세요.");
    }
  };

  return (
    <div className={`rounded-xl border border-slate-300 bg-white p-4 space-y-4 ${className}`}>
      {/* 카드 준비중 안내 (다이얼로그 화면1에서 이미 안내하면 숨김) */}
      {!hideCardNotice && (
        <div className="rounded-lg bg-slate-100 border border-slate-200 px-3.5 py-3">
          <p className="text-sm text-slate-800 leading-relaxed">
            카드·간편결제는 현재 <span className="font-bold">준비 중</span>입니다. 지금은 아래 계좌로 입금해 주세요.
          </p>
        </div>
      )}

      {/* 계좌 안내 */}
      <div className="space-y-2">
        <p className="text-base font-bold text-slate-900">입금 계좌</p>
        <div className="rounded-lg bg-indigo-50 border-2 border-indigo-200 px-4 py-3.5 space-y-3">
          <div>
            <p className="text-lg font-extrabold text-indigo-900 tabular-nums leading-tight">
              {BANK_NAME} {BANK_ACCOUNT}
            </p>
            <p className="text-sm font-semibold text-indigo-700 mt-1">예금주 {BANK_HOLDER}</p>
          </div>
          <button
            onClick={copyAccount}
            className="w-full px-3 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-base font-bold transition-all duration-150"
          >
            {copied ? "복사됨 ✓" : "계좌번호 복사하기"}
          </button>
        </div>
        {typeof amount === "number" && (
          <p className="text-base text-slate-900">
            입금 금액: <span className="font-extrabold text-indigo-700">{amount.toLocaleString()}원</span>
            {planLabel ? <span className="text-slate-500 text-sm"> · {planLabel}</span> : null}
          </p>
        )}
      </div>

      {/* 입금자 정보 안내 */}
      <div className="rounded-lg bg-amber-50 border-2 border-amber-200 px-4 py-3.5">
        <p className="text-base font-bold text-amber-900">입금자명을 꼭 정확히 적어 주세요</p>
        <p className="mt-1.5 text-sm font-medium text-amber-900 leading-relaxed">
          통장에 찍히는 이름으로 입금을 확인합니다. 신청 상품은 입금하신 금액으로 확인되니,
          별도로 문자를 보내지 않으셔도 됩니다.
        </p>
      </div>

      {/* 이용 안내 (순서 중요: 승인 → 유효기간 → 연속소진 → 카운트 시점) */}
      <div className="rounded-lg bg-rose-50 border-2 border-rose-200 px-4 py-3.5 space-y-3">
        <p className="text-base font-bold text-rose-900">상담 이용 시 꼭 확인해 주세요</p>

        <div className="space-y-2.5">
          <div>
            <p className="text-[15px] font-bold text-rose-900">① 6시간 이내 승인 <span className="text-[13px] font-semibold text-rose-700">(평일 오전 6시~오후 6시 기준)</span></p>
            <p className="text-sm font-medium text-slate-800 leading-relaxed mt-0.5">
              이 시간에 입금하시면 6시간 안에 확인·승인해 드립니다. 그 외 시간(심야·새벽)이나 주말·공휴일은 6시간을 약속드리기는 어렵지만, 확인되는 대로 가급적 빨리 승인해 드립니다.
            </p>
          </div>
          <div>
            <p className="text-[15px] font-bold text-rose-900">② 승인 후 3일(72시간) 이내 입장</p>
            <p className="text-sm font-medium text-slate-800 leading-relaxed mt-0.5">
              기한 안에 채팅방에 입장하셔야 합니다. 기한이 지나면 자동 소멸되며 환불되지 않습니다.
            </p>
          </div>
          <div>
            <p className="text-[15px] font-bold text-rose-900">③ 질문은 사용한 만큼 차감됩니다 <span className="text-[13px] font-semibold text-rose-700">(가벼운 단답도 1회 차감)</span></p>
            <p className="text-sm font-medium text-slate-800 leading-relaxed mt-0.5">
              질문을 한 번 보낼 때마다 개수가 차감됩니다. 가벼운 인사·단답도 1회로 계산되니, 궁금한 점을 차분히 정리해 한 번에 정성스럽게 물어보세요. 중간에 나갔다 다시 들어와도 남은 질문은 그대로 이어갑니다.
            </p>
          </div>
          <div>
            <p className="text-[15px] font-bold text-rose-900">④ 입장 후 3일(72시간) 이내 사용 · 미사용분 환불 불가</p>
            <p className="text-sm font-medium text-slate-800 leading-relaxed mt-0.5">
              채팅방 첫 입장(첫 질문) 후 72시간 안에 남은 질문을 사용해 주세요. 기간이 지나면 남은 질문이 있어도 상담이 종료되며, 사용하지 않은 질문은 환불되지 않습니다. 종료가 가까워지면(1일·2일 경과 시) 앱 화면으로 미리 알려드립니다.
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold text-rose-800 leading-relaxed border-t border-rose-200 pt-2.5">
          ※ 승인 알림 문자를 놓치지 않도록 주의해 주세요.
        </p>
      </div>
    </div>
  );
}

export { BANK_NAME, BANK_ACCOUNT, BANK_HOLDER };
