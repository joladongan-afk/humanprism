/**
 * 로고 시안 비교 페이지 (/logo-preview)
 * - 시안 3(보석 모자이크)를 바탕으로 한 "오로라 프리즘" 로고를 헤더에 얹어 확인
 * - 정지 이미지 위에 CSS로 일렁이는 오로라 광채 애니메이션을 덧입힘
 */

// 스테인드글라스 프리즘 로고 (투명 배경 PNG)
const AURORA = "/manus-storage/logo-stained-prism-cut_5542939d.png";

/**
 * 일렁이는 오로라 로고
 * - 로고 이미지를 두 겹으로 깔고, 위 겹에 hue-rotate + blur를 천천히 순환시켜
 *   "다채로움/문답식" 처럼 색이 흐르며 일렁이는 느낌을 연출
 */
function AuroraLogo({ className = "h-12 md:h-14" }: { className?: string }) {
  return (
    <span className={`hp-aurora-logo inline-block ${className}`}>
      <img src={AURORA} alt="휴먼프리즘" className="hp-aurora-logo__base" />
      <img src={AURORA} alt="" aria-hidden className="hp-aurora-logo__shimmer" />
    </span>
  );
}

function MockHeader() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-black px-6 py-3">
      <AuroraLogo className="h-10 md:h-11" />
      <nav className="hidden items-center gap-5 text-[1.05rem] text-white md:flex">
        <span className="aurora-green font-semibold">홈</span>
        <span>만세력</span>
        <span>개인 상담</span>
        <span>궁합</span>
      </nav>
      <span className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1 text-sm font-semibold text-white">
        로그인
      </span>
    </div>
  );
}

export default function LogoPreview() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container max-w-4xl py-12">
        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold tracking-[0.35em] text-purple-300/70">
            LOGO STUDY
          </p>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            스테인드글라스 프리즘 로고
          </h1>
          <p className="mt-3 text-base leading-relaxed text-white/60 md:text-lg">
            성당 스테인드글라스처럼 각진 유리 조각 + 짙은 윤곽 + 넓은 자간.
            <br className="hidden md:block" />
            그 위로 빛이 계속 흐르며 일렁입니다.
          </p>
        </div>

        <div className="space-y-10">
          {/* 큰 미리보기 (어두운 우주 배경) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="mb-2 text-lg font-bold text-white md:text-xl">
스테인드글라스 프리즘 · 큰 미리보기
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-white/60 md:text-base">
각진 유리 조각(스테인드글라스) 질감 + 짙은 윤곽선. 무지개 굴절 위로 빛이 계속 흐릅니다.
            </p>
            <div className="flex items-center justify-center rounded-xl bg-gradient-to-b from-[#0a0a1f] to-black py-12">
              <AuroraLogo className="h-24 md:h-32" />
            </div>
          </div>

          {/* 실제 헤더 적용 */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8">
            <h2 className="mb-2 text-lg font-bold text-white md:text-xl">
              실제 헤더 적용 모습
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-white/60 md:text-base">
              상단 헤더에 얹었을 때의 크기·균형을 확인해 주세요.
            </p>
            <MockHeader />
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-white/40">
          "이대로 적용", "더 크게", "초록 테두리 줄여줘", "더 일렁이게" 처럼 알려 주시면 반영하겠습니다.
        </p>
      </div>
    </div>
  );
}
