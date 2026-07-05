import { Button } from "@/components/ui/button";

const KAKAO_CHAT_URL = "http://pf.kakao.com/_elcXX/chat";

const steps = [
  { number: "01", title: "마스터 사주 분석", desc: "태어난 계절과 일간으로 기운의 지도를 그립니다" },
  { number: "02", title: "핵심 오행 도출", desc: "30년 안목으로 당신에게 꼭 필요한 기운을 찾습니다" },
  { number: "03", title: "한자 후보 선별", desc: "자원오행이 맞는 한자만 엄격하게 추립니다" },
  { number: "04", title: "수리사격(四格) 검증", desc: "원형이정 4격이 모두 길한 수리인지 확인합니다" },
  { number: "05", title: "의뢰인 전달 및 확인", desc: "마음에 드는 이름이 나올 때까지 1회차 3~5개 제안" },
  { number: "06", title: "최종 작명 완성", desc: "사주와 이름이 하나가 되는 이름을 선물합니다" },
];

// 01(밝음) -> 06(짙은 고동) 순으로 점점 짙어지는 그라데이션
const STEP_STYLES = [
  { bg: "#FBF6EA", border: "rgba(212,160,23,0.35)", text: "#3b2a0d", desc: "#5c5240", badge: "var(--gold)", badgeText: "#1c1608" },
  { bg: "#F2E6C8", border: "rgba(212,160,23,0.4)", text: "#3b2a0d", desc: "#5c5240", badge: "var(--gold)", badgeText: "#1c1608" },
  { bg: "#E8D5A0", border: "rgba(212,160,23,0.45)", text: "#33240c", desc: "#4a3a1c", badge: "var(--gold)", badgeText: "#1c1608" },
  { bg: "#D9BC72", border: "rgba(212,160,23,0.5)", text: "#2b1e0a", desc: "#3d2f14", badge: "#2b1e0a", badgeText: "#F4D98A" },
  { bg: "#B8934A", border: "rgba(59,42,13,0.4)", text: "#F4D98A", desc: "#F2E6C8", badge: "#1c1608", badgeText: "#F4D98A" },
  { bg: "#5c3f16", border: "rgba(59,42,13,0.6)", text: "#F4D98A", desc: "#E8D5A0", badge: "var(--gold)", badgeText: "#1c1608" },
];

export function MasterNamingTab() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div
        className="relative rounded-2xl p-8 md:p-10"
        style={{
          background: "linear-gradient(160deg, #FBF6EA 0%, #F4EDDB 100%)",
          border: "3px solid var(--gold)",
          boxShadow: "0 0 0 1px rgba(212,160,23,0.25), 0 20px 50px -12px rgba(59,42,13,0.25), inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[11px] font-bold tracking-widest text-white" style={{ background: "var(--gold)" }}>
          MASTER SERVICE
        </div>

        <div className="text-center">
          <h2 className="hanja-display text-3xl md:text-4xl font-extrabold text-amber-900">
            명의 본질에 가장 부합하는 이름 짓기
          </h2>
          <div className="gold-divider w-28 mx-auto mt-4" />
          <p className="text-amber-800 mt-4 text-base md:text-lg font-medium">
            30년 사주쟁이의 안목으로, 당신을 빛내줄 이름을 선물합니다.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
            <span className="text-sm font-bold px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
              ✓ 30년 안목 직접 작명
            </span>
            <span className="text-sm font-bold px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
              ✓ 원형이정 4격 정밀 검증
            </span>
            <span className="text-sm font-bold px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
              ✓ 만족할 때까지 제안
            </span>
          </div>

          <p className="text-lg font-bold mt-6 text-amber-900">
            사주는 몸이고, 이름이 옷입니다.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-8">
          <div className="flex-1 h-px bg-amber-300" />
          <span className="text-sm font-bold tracking-widest text-amber-700">작명 6단계</span>
          <div className="flex-1 h-px bg-amber-300" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {steps.map((step, idx) => {
            const s = STEP_STYLES[idx];
            return (
              <div
                key={idx}
                className="relative rounded-xl p-5 flex flex-col gap-3 transition-transform"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-full text-sm font-extrabold flex items-center justify-center flex-shrink-0"
                    style={{ background: s.badge, color: s.badgeText }}
                  >
                    {step.number}
                  </span>
                  <p className="text-base font-bold leading-tight" style={{ color: s.text }}>{step.title}</p>
                </div>
                <p className="text-sm leading-relaxed pl-12" style={{ color: s.desc }}>{step.desc}</p>
                {idx % 2 === 0 && idx < steps.length - 1 && (
                  <span className="absolute -right-3 top-1/2 -translate-y-1/2 text-xl z-10 hidden sm:block" style={{ color: "var(--gold)" }}>▶</span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-sm text-center font-semibold mt-6 text-amber-700">
          사주에 꼭 맞는 자원오행 감정 + 정통 수리사격(원형이정 작명법)
        </p>

        <p className="text-3xl md:text-4xl font-extrabold text-center mt-6 text-amber-900">
          300,000원
        </p>

        {/* 결제 전 마스터와 먼저 상의 */}
        <a href={KAKAO_CHAT_URL} target="_blank" rel="noopener noreferrer" className="block mt-4">
          <button
            className="w-full text-base font-bold py-4 rounded-md transition-all hover:brightness-95"
            style={{ background: "#FEE500", color: "#3C1E1E" }}
          >
            💬 신청 전, 마스터와 카카오톡으로 먼저 상의하기
          </button>
        </a>
        <p className="text-xs text-center text-amber-700/70 mt-1.5">
          카톡으로 상의하신 후, 이 화면으로 돌아와 결제를 진행해 주세요.
        </p>

        <Button className="w-full text-lg font-bold py-7 mt-3 bg-amber-700 hover:bg-amber-800 text-white">
          마스터 작명 상담 신청
        </Button>
      </div>
    </div>
  );
}
