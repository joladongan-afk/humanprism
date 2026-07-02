import SiteHeader from "@/components/SiteHeader";

const KAKAO_CHAT_URL = "http://pf.kakao.com/_elcXX/chat";

function KakaoButton({ label = "카카오로 상담 신청하기" }: { label?: string }) {
  return (
    <a
      href={KAKAO_CHAT_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        width: "100%",
        padding: "14px 0",
        borderRadius: "10px",
        background: "#FEE500",
        color: "#3C1E1E",
        fontWeight: 700,
        fontSize: "17px",
        textDecoration: "none",
        marginTop: "20px",
        transition: "filter 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.filter = "brightness(0.93)")}
      onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
    >
      {/* 자체 제작 말풍선 아이콘 */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <ellipse cx="12" cy="11" rx="9" ry="7" fill="#3C1E1E" />
        <path d="M9 15.5 Q12 19 15 15.5" fill="#3C1E1E" />
        <circle cx="9" cy="11" r="1.2" fill="#FEE500" />
        <circle cx="12" cy="11" r="1.2" fill="#FEE500" />
        <circle cx="15" cy="11" r="1.2" fill="#FEE500" />
      </svg>
      {label}
    </a>
  );
}

export default function AppointmentNew() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* 히어로 배경 */}
      <div className="page-hero relative w-full h-[360px] flex items-center bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-950 overflow-hidden">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-700/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/25 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl" />
        </div>
        <div className="absolute inset-0">
          {[...Array(40)].map((_, i) => {
            const size = Math.random() > 0.75 ? 2.5 : 1.5;
            const duration = 3 + Math.random() * 4;
            return (
              <div
                key={i}
                className="absolute bg-white rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `constellation ${duration}s ease-in-out infinite`,
                  boxShadow: `0 0 ${size * 2}px rgba(255,255,255,0.9), 0 0 ${size * 4}px rgba(100,200,255,0.6)`,
                }}
              />
            );
          })}
        </div>
        <div className="relative z-10 container max-w-6xl mx-auto text-center">
          <span className="text-base md:text-lg tracking-[0.4em] text-cyan-200/90 font-semibold">MASTER CONSULTATION</span>
          <h1 className="hanja-display text-5xl md:text-6xl mt-6 text-white leading-[1.3] font-bold">
            마스터와 직접 상담
          </h1>
          <div className="gold-divider w-40 mx-auto mt-8" />
          <p className="text-cyan-50/90 mt-6 leading-relaxed max-w-2xl mx-auto text-lg md:text-xl">
            30년 경험의 마스터와 함께 깊이 있는 인생 상담을 나누세요.
            <br />
            <span className="text-amber-300 font-semibold">하루 최대 3분만 받습니다.</span> 지금 자리가 있을 때 연결하세요.
          </p>
        </div>
      </div>

      {/* 본문 */}
      <div className="container py-14 max-w-4xl">

        {/* 2개 카드 */}
        <div className="grid md:grid-cols-2 gap-6 fade-up">

          {/* 05 카카오 채팅 상담 */}
          <div className="hanji-card rounded-xl p-8 flex flex-col">
            <div className="text-sm tracking-[0.3em] text-muted-foreground mb-2">05</div>
            <h2 className="hanja-display text-2xl font-bold mb-1">카카오 채팅 상담</h2>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              30년 내공이 담긴 채팅 상담.<br />
              결제 후 카카오 채팅방에서 바로 시작합니다.
            </p>

            {/* 가격표 */}
            <div className="space-y-3 mb-2">
              {[
                { time: "15분", price: "30,000원", badge: null, note: "1인 상담" },
                { time: "30분", price: "50,000원", badge: "추천", note: "1인 심층 상담" },
                { time: "60분", price: "100,000원", badge: "인원무제한", note: "인원 무제한 상담" },
              ].map(({ time, price, badge, note }) => (
                <div
                  key={time}
                  className="flex items-center justify-between px-4 py-3 rounded-lg"
                  style={{
                    background: badge ? "rgba(212,160,23,0.12)" : "var(--surface-1, rgba(0,0,0,0.03))",
                    border: badge ? "1px solid rgba(212,160,23,0.4)" : "1px solid transparent",
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-base">{time}</span>
                    <span className="text-xs text-muted-foreground">{note}</span>
                  </div>
                  {badge && (
                    <span style={{
                      fontSize: "11px",
                      background: "#D4A017",
                      color: "#fff",
                      borderRadius: "4px",
                      padding: "2px 7px",
                      fontWeight: 700,
                    }}>{badge}</span>
                  )}
                  <span className="font-bold text-lg text-gold-deep">{price}</span>
                </div>
              ))}
            </div>

            {/* 이용 순서 */}
            <div className="flex items-center gap-2 mt-5 mb-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">① 결제</span>
              <span>→</span>
              <span className="font-semibold text-foreground">② 채팅방 입장</span>
              <span>→</span>
              <span className="font-semibold text-foreground">③ 상담 시작</span>
            </div>

            <div className="mt-auto">
              <KakaoButton label="카카오로 상담 신청하기" />
            </div>
          </div>

          {/* 06 대면 상담 */}
          <div className="hanji-card rounded-xl p-8 flex flex-col">
            <div className="text-sm tracking-[0.3em] text-muted-foreground mb-2">06</div>
            <h2 className="hanja-display text-2xl font-bold mb-1">마스터 대면 상담</h2>
            <p className="text-muted-foreforeground text-sm mb-6 leading-relaxed text-muted-foreground">
              마스터가 있는 장소로 직접 오시는 프리미엄 상담.<br />
              일정·장소는 채팅으로 안내드립니다.
            </p>

            {/* 가격 */}
            <div className="px-4 py-5 rounded-lg text-center mb-4"
              style={{ background: "rgba(212,160,23,0.08)", border: "1px solid rgba(212,160,23,0.25)" }}>
              <div className="text-3xl font-bold text-gold-deep">200,000원</div>
              <div className="text-muted-foreground text-sm mt-1">80분 · 완전 집중 1:1</div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
              하루 최대 세 분까지만 예약을 받습니다.<br />
              카카오 채팅으로 일정을 먼저 확인해 주세요.
            </p>

            <div className="mt-auto">
              <KakaoButton label="카카오로 일정 문의하기" />
            </div>
          </div>

        </div>

        {/* 하단 공통 안내 */}
        <div className="mt-10 px-5 py-4 rounded-xl text-center fade-up"
          style={{ background: "rgba(254,229,0,0.08)", border: "1px solid rgba(254,229,0,0.25)" }}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            카카오 채팅방 입장 후 <strong className="text-foreground">공지사항을 먼저 확인</strong>해 주세요.
            결제 방법·상담 규정·환불 정책이 안내되어 있습니다.
          </p>
        </div>

        {/* 문자 문의 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 mt-6 rounded-lg border border-amber-300 bg-amber-50 fade-up">
          <div className="flex items-start gap-3">
            <span className="text-amber-700 text-lg mt-0.5 shrink-0">📞</span>
            <div>
              <p className="font-semibold text-amber-900">이용 관련 문의는 문자로 접수해 주세요</p>
              <p className="text-sm text-amber-900/80 mt-0.5 leading-relaxed">
                결제 오류, 접속 지연 등 문제가 있으면 아래 번호로 문자를 남겨주세요.{" "}
                <span className="font-semibold">문자 응대 09:00~21:00</span>
              </p>
            </div>
          </div>
          <a href="sms:01044488064" className="shrink-0">
            <button className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-mono text-base transition-colors">
              010-4448-8064
            </button>
          </a>
        </div>

      </div>
    </div>
  );
}
