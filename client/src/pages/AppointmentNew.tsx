import SiteHeader from "@/components/SiteHeader";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import LoginDialog from "@/components/LoginDialog";
import DepositRequestDialog from "@/components/DepositRequestDialog";

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
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);

  function handlePayClick() {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    setDepositOpen(true);
  }

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
          <span className="text-base md:text-lg tracking-[0.4em] text-cyan-200/90 font-semibold">FACE-TO-FACE CONSULTATION</span>
          <h1 className="hanja-display text-5xl md:text-6xl mt-6 text-white leading-[1.3] font-bold">
            마스터를 직접 만나는 시간
          </h1>
          <div className="gold-divider w-40 mx-auto mt-8" />
          <p className="text-cyan-50/90 mt-6 leading-relaxed max-w-2xl mx-auto text-lg md:text-xl">
            30년 경험의 마스터와 마주 앉아 나누는 완전 집중 1:1 대면 상담입니다.
            <br />
            <span className="text-amber-300 font-semibold">하루 최대 세 분만 받습니다.</span> 지금 자리가 있을 때 연결하세요.
          </p>
        </div>
      </div>

      {/* 본문 */}
      <div className="container py-14 max-w-4xl">

        {/* 대면 상담 - 프리미엄 강조 카드 (단독) */}
        <div
          className="rounded-2xl p-10 md:p-12 fade-up relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1c1608 0%, #3b2a0d 55%, #241a08 100%)",
            border: "1px solid rgba(212,160,23,0.5)",
            boxShadow: "0 0 60px rgba(212,160,23,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* 은은한 빛 장식 */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(212,160,23,0.35), transparent 70%)" }} />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-xs font-bold tracking-[0.2em] px-3 py-1 rounded-full"
                  style={{ background: "#D4A017", color: "#1c1608" }}
                >
                  PREMIUM · 예약제
                </span>
                <span className="text-xs font-semibold tracking-[0.15em] text-amber-300/90">
                  하루 최대 3명 한정
                </span>
              </div>
              <h2 className="hanja-display text-3xl md:text-4xl font-bold mb-3" style={{ color: "#F4D98A" }}>
                마스터 대면 상담
              </h2>
              <p className="text-amber-50/80 text-base leading-relaxed mb-2">
                마스터가 있는 장소로 직접 오셔서, 완전히 집중된 1:1 대면 상담을 받으실 수 있습니다.
                <br />
                일정·장소는 채팅으로 먼저 안내드립니다.
              </p>
            </div>

            <div className="flex flex-col items-center md:min-w-[220px]">
              <div
                className="w-full text-center px-6 py-6 rounded-xl mb-4"
                style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(212,160,23,0.4)" }}
              >
                <div className="text-4xl font-extrabold" style={{ color: "#F4D98A" }}>200,000원</div>
                <div className="text-amber-200/70 text-sm mt-1">80분 · 완전 집중 1:1</div>
              </div>
              <KakaoButton label="카카오로 일정 문의하기" />
              <button
                onClick={handlePayClick}
                className="w-full mt-3 py-3.5 rounded-lg font-bold text-base transition-all hover:brightness-110"
                style={{ background: "#8b1a1a", color: "#fff" }}
              >
                마스터 대면 상담 결제하기
              </button>
            </div>
          </div>
        </div>

        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
        <DepositRequestDialog
          open={depositOpen}
          onOpenChange={setDepositOpen}
          planType="master_offline"
        />

        {/* 하단 공통 안내 */}
        <div className="mt-10 px-5 py-4 rounded-xl text-center fade-up"
          style={{ background: "rgba(254,229,0,0.08)", border: "1px solid rgba(254,229,0,0.25)" }}>
          <p className="text-sm text-muted-foreground leading-relaxed">
            카카오 채팅방 입장 후 <strong className="text-foreground">공지사항을 먼저 확인</strong>해 주세요.
            결제 방법·상담 규정·환불 정책이 안내되어 있습니다.
          </p>
        </div>

        {/* 카카오톡 문의 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 mt-6 rounded-lg border border-amber-300 bg-amber-50 fade-up">
          <div className="flex items-start gap-3">
            <span className="text-amber-700 text-lg mt-0.5 shrink-0">💬</span>
            <div>
              <p className="font-semibold text-amber-900">이용 관련 문의는 카카오톡으로 편하게 남겨주세요</p>
              <p className="text-sm text-amber-900/80 mt-0.5 leading-relaxed">
                결제 오류, 접속 지연 등 문제가 있으면 카카오 채팅방으로 남겨주세요.{" "}
                <span className="font-semibold">채팅 응대 09:00~22:00</span>
              </p>
            </div>
          </div>
          <a href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <button
              className="px-4 py-2 rounded-md text-[#3C1E1E] font-semibold text-base transition-all hover:brightness-95"
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
