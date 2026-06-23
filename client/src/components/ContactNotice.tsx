/**
 * 공통 문의 안내 컴포넌트.
 *
 * 상담 결제/이용이 일어나는 모든 화면에 동일하게 노출한다.
 * - "이용 관련 문의는 문자로 접수해 주세요"
 * - 문자 응대 시간 09:00 ~ 21:00 (줄바꿈)
 * - "평일 기준 3시간 이내 답변드리도록 노력하겠습니다" 멘트
 * - 마스터 휴대폰(010-4448-8064) 문자 버튼
 */

const MASTER_PHONE = "010-4448-8064";
const MASTER_PHONE_SMS = "01044488064";

export function ContactNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-3 ${className}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-amber-600 shrink-0 text-sm leading-5">📞</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-amber-900">
            이용 관련 문의는 문자로 접수해 주세요
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-amber-700 leading-relaxed">
            문자 응대 시간: 09:00 ~ 21:00
            <br />
            평일 기준 3시간 이내에 답변드리도록 노력하겠습니다.
          </p>
          <a href={`sms:${MASTER_PHONE_SMS}`} className="inline-block mt-2">
            <button className="px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 active:scale-[0.97] text-white font-mono text-xs sm:text-sm transition-all duration-150">
              {MASTER_PHONE} 문자하기
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

export { MASTER_PHONE, MASTER_PHONE_SMS };
