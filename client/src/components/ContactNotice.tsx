/**
 * 공통 문의 안내 컴포넌트.
 *
 * 상담 결제/이용이 일어나는 모든 화면에 동일하게 노출한다.
 * - "이용 관련 문의는 카카오톡으로 편하게 남겨주세요"
 * - 채팅 응대 시간 09:00 ~ 22:00
 * - 카카오 채팅방으로 바로 연결되는 버튼 (사주프리즘 채널 물꼬 트기 겸용)
 */

const KAKAO_CHAT_URL = "http://pf.kakao.com/_elcXX/chat";

export function ContactNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-3 ${className}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-amber-600 shrink-0 text-sm leading-5">💬</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-amber-900">
            이용 관련 문의는 카카오톡으로 편하게 남겨주세요
          </p>
          <p className="mt-1 text-[11px] sm:text-xs text-amber-700 leading-relaxed">
            채팅 응대 시간: 09:00 ~ 22:00
            <br />
            평일 기준 3시간 이내에 답변드리도록 노력하겠습니다.
          </p>
          <a href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
            <button
              className="px-3 py-1.5 rounded-md text-[#3C1E1E] font-semibold text-xs sm:text-sm transition-all duration-150 active:scale-[0.97] hover:brightness-95"
              style={{ background: "#FEE500" }}
            >
              카카오톡 문의하기
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}

export { KAKAO_CHAT_URL };
