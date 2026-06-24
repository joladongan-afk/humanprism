import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { FIRST_VISIT_POPUP_CTA_PATH } from "@shared/firstVisitPopup";

/**
 * 홈 진입 마케팅 팝업.
 *
 * - 홈에 들어오거나 새로고침할 때마다 매번 노출된다(세션/1회 제한 없음).
 * - 닫거나 CTA를 누르면 그 화면에서만 닫히고, 다음 방문/새로고침 때 다시 뜬다.
 * - AI 호출/네트워크 요청 없음(크레딧 0).
 * - 우주 다크 톤·핑크/보라 브랜드색에 맞춘 자체 모달.
 */
export default function FirstVisitPopup() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // 진입할 때마다 노출. 첫 페인트 직후 살짝 늦게 띄워 인상을 부드럽게.
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => {
    setOpen(false);
    navigate(FIRST_VISIT_POPUP_CTA_PATH);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[460px] overflow-hidden border-white/10 bg-[#0b0a18] p-0 text-white shadow-[0_0_60px_-12px_rgba(168,85,247,0.55)]"
      >
        {/* 접근성용 숨김 타이틀 */}
        <DialogTitle className="sr-only">
          AI가 찍어내는 똑같은 사주풀이는 그만
        </DialogTitle>

        {/* 우측 상단 닫기(X) — 크고 눈에 띄게 */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="팝업 닫기"
          className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-lg backdrop-blur transition-all hover:bg-white/15 hover:scale-105 active:scale-95"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>

        {/* 우주 그라데이션 배경 + 광채 */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-600/25 via-transparent to-pink-500/20" />
          <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl" />

          <div className="relative px-7 pb-7 pt-9 text-center">
            <p className="mb-4 inline-block rounded-full border border-emerald-300/40 bg-emerald-400/10 px-3.5 py-1.5 text-sm font-semibold tracking-wide text-emerald-200">
              지금, 무료 체험
            </p>

            <h2 className="hanja-display text-[1.75rem] font-bold leading-snug text-white sm:text-[2rem]">
              AI가 찍어내는
              <br />
              <span className="bg-gradient-to-r from-pink-300 via-fuchsia-300 to-purple-300 bg-clip-text text-transparent">
                똑같은 사주풀이는 그만
              </span>
            </h2>

            {/* 핵심 메시지 — 네온 테두리 박스로 시선 집중 */}
            <div className="relative mx-auto mt-5 max-w-[24rem] rounded-2xl border border-emerald-400/45 bg-white/[0.03] px-5 py-4 shadow-[0_0_24px_-4px_rgba(34,197,94,0.55),inset_0_0_18px_-8px_rgba(134,239,172,0.45)]">
              <p className="text-lg font-bold leading-snug text-white sm:text-xl">
                7대 사주명가의 비기
              </p>
              <p className="popup-neon-line mt-1.5 text-xl font-extrabold leading-snug sm:text-2xl">
                3개의 질문! 압도적 차이를 경험!
              </p>
            </div>

            <Button
              onClick={handleStart}
              size="lg"
              className="mt-7 h-14 w-full bg-gradient-to-r from-pink-500 to-purple-500 text-lg font-bold text-white transition-transform hover:from-pink-400 hover:to-purple-400 active:scale-[0.98]"
            >
              무료 체험 시작 →
            </Button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 text-base text-slate-400 underline-offset-4 transition-colors hover:text-slate-200 hover:underline"
            >
              다음에 볼게요
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
