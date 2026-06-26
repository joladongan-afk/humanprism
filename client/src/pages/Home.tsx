import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { ZODIAC_12, OHAENG, SAMPLE_CHART } from "@/lib/sajuHeroData";
import { STEM_ICONS, BRANCH_ICONS } from "@/lib/glyphIcons";
import LoginDialog from "@/components/LoginDialog";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import MosaicTextReveal from "@/components/MosaicTextReveal";
import FirstVisitPopup from "@/components/FirstVisitPopup";
import { AuroraLogo } from "@/components/AuroraLogo";

// 새로 생성한 히어로 배경 (우주 + 유리 프리즘 + 빛 굴절 + 인물 실루엣)
const HERO_BG = "/img/hero-bg-ear-v4_db317d86.png";

// 별빛이 여자의 귀로 시냇물처럼 흘러드는 SVG 경로 기반 애니메이션
// 귀 위치: 화면 가로 약 55%, 세로 약 42% (스크린샷 실측)
// 별자리 출발: 오른쪽 65~95% 영역
function StarWhisper() {
  // SVG viewBox: 100x100 (퍼센트 좌표계)
  // 귀 목적지: (55, 42)
  // 각 스트림: 출발점 → 중간 곡선 제어점 → 귀 도착
  // 시냇물처럼 여러 갈래가 합류하는 느낌
  // 귀구멍 목적지: 51% 가로, 44% 세로 (확정, 절대 변경 금지)
  // 속도: 20~32초 (은하가 유유자적하게 흐르는 느낌)
  // 모양: 4각 별 (polygon)
  //
  // 배경 이미지 실제 별 위치 매핑 (2560xd71440 원본 기준 → 화면 % 변환)
  // 이미지에 transform: scale(1.35) translate(-22%, -14%) 적용됨
  // 실제 별 위치 (CelestialRing 한자 아님, 배경 이미지 속 실제 별들):
  //   오른쪽 상단 별자리: (91%,8%), (96%,12%), (84%,6%), (99%,18%)
  //   프리즘 위쪽 별들: (78%,14%), (82%,20%), (86%,10%)
  //   여자 머리 주변 빛나는 별들: (72%,28%), (68%,33%), (74%,38%), (76%,22%)
  //   오른쪽 중단 별들: (94%,35%), (98%,42%), (92%,50%)
  //   아래쪽 별들: (88%,58%), (82%,62%), (90%,65%)
  const streams = useMemo(() => [
    // 오른쪽 상단 별자리 그룹
    // 별 크기 통일: 가장 큰 별(0.80) 기준 20% = 0.16 → 전체 0.15~0.18 (미세 반짝이 가루)
    { id: 1,  path: "M 91  8 Q 74 22 51 44", size: 0.34, delay: 0,    dur: 26, op: 0.95, color: "220,238,255" },
    { id: 2,  path: "M 96 12 Q 77 25 51 44", size: 0.32, delay: 5.0,  dur: 30, op: 0.85, color: "200,225,255" },
    { id: 3,  path: "M 84  6 Q 70 20 51 44", size: 0.30, delay: 11.0, dur: 28, op: 0.75, color: "180,212,255" },
    { id: 4,  path: "M 99 18 Q 78 28 51 44", size: 0.32, delay: 18.0, dur: 32, op: 0.65, color: "165,200,255" },
    // 프리즘 위쪽 별들
    { id: 5,  path: "M 78 14 Q 67 26 51 44", size: 0.36, delay: 2.0,  dur: 22, op: 1.00, color: "215,235,255" },
    { id: 6,  path: "M 82 20 Q 69 30 51 44", size: 0.34, delay: 8.0,  dur: 25, op: 0.90, color: "205,228,255" },
    { id: 7,  path: "M 86 10 Q 71 24 51 44", size: 0.30, delay: 14.0, dur: 29, op: 0.70, color: "175,210,255" },
    // 여자 머리 주변 빛나는 별들 (가장 가까운 별들 — 속삭임 효과 핵심)
    { id: 8,  path: "M 72 28 Q 63 34 51 44", size: 0.36, delay: 0.5,  dur: 20, op: 1.00, color: "230,245,255" },
    { id: 9,  path: "M 68 33 Q 61 37 51 44", size: 0.34, delay: 6.5,  dur: 23, op: 0.92, color: "218,238,255" },
    { id: 10, path: "M 74 38 Q 64 40 51 44", size: 0.36, delay: 3.0,  dur: 21, op: 0.97, color: "225,242,255" },
    { id: 11, path: "M 76 22 Q 65 31 51 44", size: 0.32, delay: 10.0, dur: 24, op: 0.85, color: "210,232,255" },
    // 오른쪽 중단 별들
    { id: 12, path: "M 94 35 Q 75 38 51 44", size: 0.34, delay: 1.5,  dur: 27, op: 0.80, color: "195,222,255" },
    { id: 13, path: "M 98 42 Q 77 43 51 44", size: 0.32, delay: 9.0,  dur: 24, op: 0.90, color: "208,230,255" },
    { id: 14, path: "M 92 50 Q 74 48 51 44", size: 0.30, delay: 16.0, dur: 28, op: 0.72, color: "185,215,255" },
    // 아래쪽 별들
    { id: 15, path: "M 88 58 Q 72 52 51 44", size: 0.32, delay: 4.0,  dur: 30, op: 0.60, color: "160,198,255" },
    { id: 16, path: "M 82 62 Q 69 54 51 44", size: 0.30, delay: 20.0, dur: 32, op: 0.55, color: "152,192,255" },
    { id: 17, path: "M 90 65 Q 73 56 51 44", size: 0.32, delay: 12.0, dur: 29, op: 0.62, color: "168,205,255" },
    // 극세 소수 점액센트 (이미지 속 작은 별들)
    { id: 18, path: "M 80 17 Q 67 28 51 44", size: 0.30, delay: 7.0,  dur: 26, op: 0.78, color: "200,228,255" },
    { id: 19, path: "M 95 26 Q 76 33 51 44", size: 0.32, delay: 15.0, dur: 27, op: 0.68, color: "190,220,255" },
    { id: 20, path: "M 70 45 Q 62 44 51 44", size: 0.34, delay: 2.5,  dur: 22, op: 0.88, color: "222,240,255" },
    { id: 21, path: "M 97 55 Q 76 51 51 44", size: 0.30, delay: 22.0, dur: 31, op: 0.58, color: "158,196,255" },
    { id: 22, path: "M 85 30 Q 70 35 51 44", size: 0.32, delay: 13.0, dur: 25, op: 0.80, color: "205,230,255" },
  ], []);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 5 }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <style>{`
          @keyframes streamFlow {
            0%   { opacity: 0; offset-distance: 0%; }
            8%   { opacity: 1; }
            88%  { opacity: 0.9; }
            100% { opacity: 0; offset-distance: 100%; }
          }
          .stream-dot {
            animation: streamFlow var(--dur) cubic-bezier(0.4, 0, 0.2, 1) var(--delay) infinite;
            offset-rotate: 0deg;
          }
          @media (prefers-reduced-motion: reduce) {
            .stream-dot { animation: none !important; opacity: 0 !important; }
          }
        `}</style>
      </defs>
      {streams.map((s) => {
        // 4각 별 (plus 모양): 중심 0,0 기준, 반지름 r
        const r = s.size * 0.6;  // 외곽 반지름
        const ri = r * 0.22;     // 내곽 반지름 (더 날카롭게)
        // 4각 별 좌표: 0도(위), 90도(우), 180도(아래), 270도(왼)
        const pts = [
          `0,${-r}`, `${ri},${-ri}`,
          `${r},0`,  `${ri},${ri}`,
          `0,${r}`,  `${-ri},${ri}`,
          `${-r},0`, `${-ri},${-ri}`,
        ].join(' ');
        return (
          <polygon
            key={s.id}
            className="stream-dot"
            points={pts}
            fill={`rgba(${s.color},${s.op})`}
            style={{
              offsetPath: `path('${s.path}')`,
              filter: `drop-shadow(0 0 ${r * 2}px rgba(${s.color},1)) drop-shadow(0 0 ${r * 4}px rgba(${s.color},0.5))`,
              '--dur': `${s.dur}s`,
              '--delay': `${s.delay}s`,
            } as React.CSSProperties}
          />
        );
      })}
    </svg>
  );
}

const PHILOSOPHY = [
  {
    no: "01",
    title: "당신만의 스토리",
    body: "당신의 고유한 인생 서사를 존중합니다. 그 흐름을 놓치지 않고, 다양한 인문과학에 기반하여 한 편의 짧은 수필처럼 풀어 드립니다.",
  },
  {
    no: "02",
    title: "대화형 상담",
    body: "일방적으로 답을 토해내지 않습니다. 먼저 깊이 듣고, 능동적으로 질문하며, 당신이 할 수 있는 최선의 선택을 돕습니다.",
  },
  {
    no: "03",
    title: "독보적 인생 설계 알고리즘",
    body: "고금의 사주 명인, 철학자, 심리학자, 경제학자가 한 데 모여 오직 한 사람을 위해 모든 지성을 쏟아내는 듯한 통찰을 보여줍니다.",
  },
  {
    no: "04",
    title: "당신의 특장점 발견",
    body: "당신은 지금보다 나아질 수 있습니다. 저는 당신의 강점을 찾아, 보다 나은 선택과 보다 나은 결과로 나아가도록 전력을 다하겠습니다.",
  },
];


const SHARE_URL = "https://human-prism.com";
const SHARE_TEXT = "당신의 다채로움을 듣다 — 휴먼프리즘";
const SHARE_FULL = `${SHARE_TEXT}\n${SHARE_URL}`;

async function handleShare() {
  // 터치 기기(모바일/태블릿): 카톡 등으로 바로 가는 시스템 공유창 사용
  const isTouch =
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(pointer: coarse)").matches &&
    ((navigator as any).maxTouchPoints > 0 || "ontouchstart" in window);

  if (isTouch && typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ title: "휴먼프리즘", text: SHARE_TEXT, url: SHARE_URL });
      return;
    } catch {
      // 사용자가 공유창을 닫은 경우 — 그대로 종료
      return;
    }
  }

  // PC(비터치): 버튼 한 번으로 즉시 복사 + 상단 중앙에 크게 안내
  const showCopied = () =>
    toast.success("링크가 복사됐어요. 카톡·메일 등에 붙여넣기(Ctrl+V) 하세요.", {
      position: "top-center",
      duration: 4000,
      className: "text-base md:text-lg py-4 px-6",
    });
  try {
    await navigator.clipboard.writeText(SHARE_FULL);
    showCopied();
  } catch {
    // clipboard API 미지원 환경 폴백
    const ta = document.createElement("textarea");
    ta.value = SHARE_FULL;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); showCopied(); }
    catch {
      toast.error("복사에 실패했어요. 주소를 직접 복사해 주세요.", { position: "top-center", duration: 4000 });
    }
    document.body.removeChild(ta);
  }
}

export default function Home() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const login = params.get("login");
    if (login === "cancelled") {
      toast.info("로그인이 취소되었습니다.");
    } else if (login === "error") {
      toast.error("로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (login) {
      params.delete("login");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <FirstVisitPopup />
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden flex items-start lg:items-center lg:min-h-[calc(100vh-4rem)]">
        {/* 별빛 귀속삭임 애니메이션 */}
        <StarWhisper />

        {/* 배경 이미지 */}
        <div className="absolute inset-0">
          {/* 데스크탑 배경: 기존 구도 유지 */}
          <img
            src={HERO_BG}
            alt=""
            aria-hidden
            className="hidden lg:block w-full h-full object-cover"
            style={{
              objectPosition: "100% center",
              transform: "scale(1.35) translate(-22%, -14%)",
              transformOrigin: "center",
            }}
          />
          {/* 모바일 배경: 프리즘·여신이 상단에 보이도록 상단 중앙 기준, 살짝 확대 */}
          <img
            src={HERO_BG}
            alt=""
            aria-hidden
            className="lg:hidden w-full h-full object-cover"
            style={{
              objectPosition: "72% 30%",
              transform: "scale(1.15)",
              transformOrigin: "center",
            }}
          />
          {/* 왼쪽 가독성 확보용 그라데이션 오버레이 (데스크탑) */}
          <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
          {/* 모바일 가독성: 상단 카피 영역을 조금 어둡게 */}
          <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-black/85 via-black/35 to-black/80" />
          {/* 유리 프리즘 광학 효과: 선명한 청자주 빛 굴절 + 실사 유리 질감 */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/12 via-transparent to-purple-600/12 pointer-events-none" style={{ mixBlendMode: 'screen' }} />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-cyan-400/10 to-blue-500/8 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-gradient-to-tl from-purple-400/8 to-transparent rounded-full blur-xl pointer-events-none" />
          {/* 유리 반사 하이라이트 */}
          <div className="absolute top-1/4 left-1/2 w-80 h-96 bg-gradient-to-r from-white/8 via-transparent to-transparent pointer-events-none" style={{ mixBlendMode: 'overlay' }} />
        </div>

        {/* 텍스트 박스: 섹션 기준 절대 위치, 화면 왼쪽 끝에서 50% 위치 */}
        <div className="hidden lg:block absolute left-[160px] top-[46%] translate-y-[-50%] z-10 max-w-2xl fade-up">
          <div className="flex flex-col justify-between h-full">
            <p className="hanja-display text-2xl md:text-4xl lg:text-[2.6rem] leading-relaxed font-bold bg-gradient-to-r from-yellow-200 via-pink-200 to-blue-200 bg-clip-text text-transparent">
              AI와 30년 사주 장인의 합작
            </p>
            <h1 className="hanja-display text-4xl md:text-6xl lg:text-7xl leading-[1.25] mt-4 mb-4 font-bold">
              <span className="word-first text-white">당신의</span><br />
              <MosaicTextReveal text="다채로움" fontSize={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 80 : typeof window !== 'undefined' && window.innerWidth >= 768 ? 60 : 44} colorPalette={['#f0abfc', '#e879f9', '#d946ef', '#c084fc', '#a855f7', '#f472b6', '#ec4899', '#d8b4fe']} />
              <span className="word-last text-white">을 듣다</span>
            </h1>
            <p className="text-3xl md:text-4xl font-bold max-w-2xl leading-[1.5] mb-4">
              <span className="text-white">AI를 초월한 궁극의</span><br />
              <span className="inline-flex items-center gap-3 flex-wrap mt-2">
                <MosaicTextReveal
                  text="문답식"
                  fontSize={typeof window !== 'undefined' && window.innerWidth >= 1024 ? 72 : typeof window !== 'undefined' && window.innerWidth >= 768 ? 56 : 40}
                  colorPalette={['#38bdf8', '#0ea5e9', '#0284c7', '#22d3ee', '#06b6d4', '#3b82f6', '#60a5fa', '#7dd3fc']}
                  startDelay={150}
                />
                <span className="text-5xl md:text-6xl lg:text-7xl font-bold text-white">사주풀이</span>
              </span>
            </p>
            <p className="text-xl md:text-2xl lg:text-[1.7rem] font-semibold text-white max-w-2xl leading-[1.55] mt-1">
              근현대 <span className="aurora-green font-bold">7대 사주 명가의 비전(秘傳)</span>을,<br />
              30년 장인이 AI 알고리즘으로 <span className="text-white font-extrabold">벼려내다.</span>
            </p>
            <div className="mt-7 flex items-center gap-3 flex-wrap">
              <Link href="/plans">
                <Button
                  size="lg"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-amber-400 via-rose-400 to-fuchsia-400 hover:from-amber-500 hover:via-rose-500 hover:to-fuchsia-500 text-black font-bold px-9 h-14 text-lg leading-none group transition-all active:scale-[0.97]"
                >
                  <span>전체 상담 플랜 보기</span>
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 명조 모듈: 섹션 기준 절대 위치, 컨테이너 밖에서 오른쪽 가장자리에 고정
             여자 얼굴(화면 55~80% 영역)과 겹치지 않도록 right-0으로 화면 끝에 붙임 */}
        <div className="hidden lg:flex absolute right-[5.6%] top-0 bottom-0 flex-col items-center justify-center gap-0 z-10 pr-2">
          <CelestialRing />
          <div className="h-14" />
          <CrystalPillarChart />
        </div>

        {/* 데스크탑 스페이서 (카피·명조는 위에서 절대위치 처리) */}
        <div className="hidden lg:flex container relative z-10 py-16 md:py-20 items-center min-h-[600px]" />

        {/* ━━ 모바일 히어로: 카피 → 천체 모빌 → 사주박스 → 버튼 ━━ */}
        <div className="lg:hidden container relative z-10 px-5 pt-20 pb-12 flex flex-col items-center text-center">
          {/* 메인 카피 */}
          <div className="fade-up w-full max-w-md">
            <p className="hanja-display text-lg sm:text-xl font-bold bg-gradient-to-r from-yellow-200 via-pink-200 to-blue-200 bg-clip-text text-transparent">
              AI와 30년 사주 장인의 합작
            </p>
            <h1 className="hanja-display mt-3 text-[2.6rem] leading-[1.18] font-bold">
              <span className="text-white">당신의</span>{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">다채로움</span>
              <span className="text-white">을 듣다</span>
            </h1>
            <p className="mt-4 text-2xl font-bold leading-snug">
              <span className="text-white">AI를 초월한 궁극의</span><br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-blue-300 bg-clip-text text-transparent">문답식</span>{" "}
              <span className="text-white">사주풀이</span>
            </p>
            <p className="mt-4 text-base sm:text-lg font-semibold text-white/90 leading-relaxed">
              근현대 <span className="aurora-green font-bold">7대 사주 명가의 비전(秘傳)</span>을,<br />
              30년 장인이 AI 알고리즘으로 <span className="text-white font-extrabold">벼려내다.</span>
            </p>
          </div>

          {/* 플랜 버튼 (카피 바로 아래, 손에 잘 닿는 위치) */}
          <div className="mt-7 w-full max-w-md flex flex-col gap-3">
            <Link href="/plans">
              <Button
                size="lg"
                className="w-full inline-flex items-center justify-center bg-gradient-to-r from-amber-400 via-rose-400 to-fuchsia-400 hover:from-amber-500 hover:via-rose-500 hover:to-fuchsia-500 text-black font-bold h-14 text-lg leading-none group transition-all active:scale-[0.97]"
              >
                <span>전체 상담 플랜 보기</span>
                <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </Link>
          </div>

          {/* 천체 모빌 */}
          <div className="mt-10 flex flex-col items-center">
            <CelestialRing />
          </div>

          {/* 사주박스 */}
          <div className="mt-2 w-full max-w-sm">
            <CrystalPillarChart />
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-black via-purple-950/20 to-black border-t border-white/5">
        <div className="container">
          <h2 className="hanja-display text-center text-4xl md:text-5xl font-bold text-white mb-4">
            마스터의 철학
          </h2>
          <p className="text-center text-lg text-white/70 mb-12 max-w-2xl mx-auto">
            30년의 경험과 현대 심리학, 경제학이 만난 사주 상담의 새로운 패러다임
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PHILOSOPHY.map((item) => (
              <div
                key={item.no}
                className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-8 backdrop-blur-sm hover:border-white/20 hover:bg-white/[0.08] transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/0 via-transparent to-pink-500/0 group-hover:from-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300" />
                <div className="relative">
                  <span className="inline-block text-sm font-bold text-white/40 mb-3">{item.no}</span>
                  <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-base leading-relaxed text-white/70">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-black/50 py-8 md:py-12 mt-auto">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="hanja-display text-2xl font-bold text-white mb-2">휴먼프리즘</h3>
              <p className="text-white/60">AI와 30년 경험의 만남</p>
            </div>
            <div className="flex gap-6 text-sm text-white/60">
              <a href="/legal#terms" className="hover:text-white transition-colors">
                이용약관
              </a>
              <a href="/legal#privacy" className="hover:text-white transition-colors">
                개인정보처리방침
              </a>
              <a href="/legal#business" className="hover:text-white transition-colors">
                사업자정보
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-white/40 space-y-1">
            <p>
              무한상담소 (휴먼프리즘) · 운영자 마스터 전원석 · 사업자등록번호 212-34-92530
            </p>
            <p>
              통신판매업 제2025-세종아름-0541호 · 세종특별자치시 달빛로 80 (종촌동) · 010-4448-8064
            </p>
            <p className="pt-2">&copy; 2026 Human Prism. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spinSlowRev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
    </div>
  );
}

/** 우측 상단 천체 모듈 — 12지지 회전 링 + 오행 역회전 */
function CelestialRing() {
  return (
    <div className="pointer-events-none relative w-52 h-52 sm:w-60 sm:h-60 md:w-80 md:h-80 opacity-95 z-[5] mb-3 md:mb-5 drop-shadow-[0_0_22px_rgba(180,170,255,0.6)]">
      <div className="absolute inset-0" style={{ animation: "spinSlow 90s linear infinite" }}>
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {ZODIAC_12.map((ch, i) => {
            const angle = (i * 360) / 12 - 90;
            const rad = (angle * Math.PI) / 180;
            const r = 132;
            const x = 150 + Math.cos(rad) * r;
            const y = 150 + Math.sin(rad) * r;
            return (
              <text
                key={ch}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(255,255,255,0.92)"
                fontSize="20"
                fontWeight="700"
                style={{ fontFamily: "'Noto Sans KR', sans-serif", filter: "drop-shadow(0 0 4px rgba(180,170,255,0.7))" }}
              >
                {ch}
              </text>
            );
          })}
        </svg>
      </div>
      {/* 안쪽 오행 링 (반시계) */}
      <div className="absolute inset-[26%]" style={{ animation: "spinSlowRev 70s linear infinite" }}>
        <svg viewBox="0 0 160 160" className="w-full h-full">
          {OHAENG.map((el, i) => {
            const angle = (i * 360) / OHAENG.length - 90;
            const rad = (angle * Math.PI) / 180;
            const r = 66;
            const x = 80 + Math.cos(rad) * r;
            const y = 80 + Math.sin(rad) * r;
            return (
              <text
                key={el.char}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={el.color}
                fontSize="24"
                fontWeight="800"
                style={{ fontFamily: "'Noto Sans KR', sans-serif", filter: "drop-shadow(0 0 5px rgba(255,255,255,0.5))" }}
              >
                {el.char}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/** 글자 옆 물상/동물 입체 아이콘 */
function GlyphIcon({ icon }: { icon?: { url?: string; hint: string } }) {
  if (!icon?.url) return null;
  return (
    <img
      src={icon.url}
      alt={icon.hint}
      title={icon.hint}
      className="w-8 h-8 md:w-10 md:h-10 object-contain"
      style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5)) contrast(1.15) brightness(1.05) saturate(1.1)", imageRendering: "crisp-edges" }}
    />
  );
}

/** 크리스탈 유리 기둥 명조 (참고 이미지 ② 스타일) */
function CrystalPillarChart() {
  const { name, pillars } = SAMPLE_CHART;
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.05] backdrop-blur-md p-4 md:p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-2.5">
        <span className="hanja-display text-base md:text-lg font-bold text-white">{name}</span>
        <span className="text-[10px] md:text-xs text-white/45 tracking-wider">SAMPLE 명조</span>
      </div>

      <div className="flex items-end gap-2 md:gap-2.5">
        {pillars.map((p, i) => (
          <div key={p.position} className="flex flex-col items-center">
            {/* 천간 물상 아이콘 (기둥 위) */}
            <div className="h-9 md:h-11 flex items-end justify-center mb-1">
              <GlyphIcon icon={STEM_ICONS[p.stemKey]} />
            </div>
            {/* 유리 기둥 */}
            <div
              className="relative rounded-xl border border-white/35 px-2.5 md:px-3.5 py-2.5 md:py-3.5 flex flex-col items-center gap-1 overflow-hidden"
              style={{
                background:
                  "linear-gradient(160deg, rgba(255,255,255,0.24), rgba(180,200,255,0.16) 40%, rgba(140,110,220,0.18))",
                boxShadow:
                  "inset 0 1px 2px rgba(255,255,255,0.65), inset 0 -12px 32px rgba(140,110,220,0.28), inset -2px 0 8px rgba(100,150,255,0.18), 0 12px 32px rgba(0,0,0,0.55), 0 0 24px rgba(100,150,255,0.25)",
                animation: `floaty ${4 + i * 0.4}s ease-in-out ${i * 0.2}s infinite`,
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* 강화된 빛 반사 하이라이트 - 크리스탈 굴절 효과 */}
              <div className="absolute top-0 left-1/4 w-1/3 h-full bg-gradient-to-b from-white/25 to-transparent blur-md -skew-x-12" />
              {/* 우측 가장자리 빛 반사 */}
              <div className="absolute top-1/4 right-0 w-1/4 h-1/2 bg-gradient-to-l from-white/18 to-transparent blur-lg" />
              <span className="hanja-display relative text-2xl md:text-3xl font-bold text-white leading-none">
                {p.stem}
              </span>
              <span className="hanja-display relative text-2xl md:text-3xl font-bold text-white/95 leading-none">
                {p.branch}
              </span>
            </div>
            {/* 기둥 아래 지지 동물 아이콘 */}
            <div className="h-10 md:h-12 flex items-start justify-center mt-1">
              <GlyphIcon icon={BRANCH_ICONS[p.branchKey]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 헤더 공개 통계 — 로고 옆, 사회적 증거(실데이터). 큰 글자로 눈에 띄게. */
function HeaderStats({ stats }: { stats?: { totalUsers: number; totalSessions: number; totalLogins: number } }) {
  if (!stats || stats.totalLogins <= 0) return null;
  const fmt = (n: number) => n.toLocaleString("ko-KR");
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-fuchsia-300 font-extrabold tabular-nums text-base sm:text-[1.6rem] leading-none">{fmt(stats.totalLogins)}</span>
      <span className="text-white/80 font-semibold text-[0.7rem] sm:text-[1.05rem]">번<span className="hidden sm:inline"> 방문</span></span>
    </div>
  );
}

/** 사이트 헤더 — 2단 구조 (로고 바 + 탭 바) */
function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();
  const { data: headerStats } = trpc.publicStats.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const utils = trpc.useUtils();
  const [location, navigate] = useLocation();
  const isActive = (href: string) => href === "/" ? location === "/" : (location === href || location.startsWith(href + "/"));

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (e) {
      console.error('Logout error:', e);
    }
    await utils.auth.me.invalidate();
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  // '내 상담실'은 항상 표시 (미로그인 시 클릭→로그인 다이얼로그)
  const NAV: { href: string; label: string; protected?: boolean }[] = [
    { href: "/", label: "홈" },
    { href: "/saju/new", label: "만세력" },
    { href: "/plans", label: "개인 상담" },
    { href: "/compatibility", label: "궁합" },
    { href: "/naming/new", label: "작명 (준비 중)" },
    { href: "/appointments/new", label: "마스터 상담" },
    { href: "/me", label: "내 상담실", protected: true },
  ];

  const handleNavClick = (item: (typeof NAV)[0]) => {
    if (item.protected && !isAuthenticated) {
      setLoginOpen(true);
    } else {
      navigate(item.href);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50">
      {/* ── 1단: 로고 바 ── */}
      <div className="bg-black/90 backdrop-blur-md border-b border-white/[0.07]">
        <div className="container flex items-center justify-between px-4 md:px-0" style={{ height: "4.5rem" }}>
          <div className="flex items-center gap-2 sm:gap-5">
            <Link href="/">
              <div className="flex items-center cursor-pointer leading-none">
                <span className="sm:hidden"><AuroraLogo height={34} /></span>
                <span className="hidden sm:flex"><AuroraLogo height={40} /></span>
              </div>
            </Link>
            {/* 공개 통계 — 로고 옆 (데스크톱) */}
            <HeaderStats stats={headerStats} />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 친구에게 공유 — 헤더 우상단 */}
            <Button
              onClick={handleShare}
              size="sm"
              className="hidden sm:inline-flex items-center gap-2 bg-white/10 hover:bg-fuchsia-400/20 text-white border border-fuchsia-300/40 hover:border-fuchsia-300/70 rounded-full px-5 transition-all active:scale-[0.97] whitespace-nowrap"
              style={{ fontSize: "1.1rem" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              공유 · 링크 복사
            </Button>
            {user?.role === 'admin' && (
              <Link href="/admin">
                <Button variant="outline" size="sm"
                  className="text-white border-white/30 hover:bg-white/10 rounded-full px-4 whitespace-nowrap"
                  style={{ fontSize: "1.1rem" }}
                >
                  관리자
                </Button>
              </Link>
            )}
            {user ? (
              <Button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                size="sm"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full px-5 transition-transform active:scale-[0.97] whitespace-nowrap"
                style={{ fontSize: "1.1rem" }}
              >
                로그아웃
              </Button>
            ) : (
              <Button
                onClick={() => setLoginOpen(true)}
                size="sm"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full px-3.5 sm:px-5 text-base sm:text-[1.1rem] transition-transform active:scale-[0.97] whitespace-nowrap"
              >
                <span className="sm:hidden">로그인</span>
                <span className="hidden sm:inline">로그인 / 회원가입</span>
              </Button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center gap-0.5 text-white/85 hover:text-white transition-colors"
              aria-label="메뉴 열기"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
              <span className="font-semibold" style={{ fontSize: "0.95rem" }}>메뉴</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2단: 탭 바 (데스크톱) ── */}
      <div className="hidden md:block bg-black/75 backdrop-blur-sm border-b border-white/[0.10]">
        <div className="container flex items-center justify-center gap-0 px-4 md:px-0" style={{ height: "3.2rem" }}>
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item)}
                className={`relative h-full px-5 font-bold whitespace-nowrap transition-colors duration-150 ${
                  active ? "aurora-green" : "text-white hover:text-white/80"
                }`}
                style={{ fontSize: "1.3rem" }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-sm"
                    style={{ background: "linear-gradient(90deg, #ef4444, #f97316)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 모바일 드롭다운 ── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-b border-white/10">
          <div className="container py-3 flex flex-col gap-1 px-4">
            {NAV.map((item) => (
              <button
                key={item.href}
                onClick={() => handleNavClick(item)}
                className="w-full text-left py-3 px-3 rounded-lg text-base font-medium text-white/75 hover:text-white hover:bg-white/5 transition-colors"
              >
                {item.label}
              </button>
            ))}
            {user?.role === 'admin' && (
              <button
                onClick={() => { navigate("/admin"); setMobileMenuOpen(false); }}
                className="w-full text-left py-3 px-3 rounded-lg text-base font-medium text-white/75 hover:text-white hover:bg-white/5 transition-colors"
              >
                관리자
              </button>
            )}
            <button
              onClick={() => { setMobileMenuOpen(false); handleShare(); }}
              className="w-full text-left py-3 px-3 rounded-lg text-base font-semibold text-fuchsia-200 hover:text-white hover:bg-white/5 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              친구에게 공유
            </button>
          </div>
        </div>
      )}

      {loginOpen && <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />}
    </header>
  );
}


