import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Share, Plus, Smartphone } from "lucide-react";
import {
  resolveInstallMode,
  detectPlatform,
  isSafari,
  type InstallMode,
} from "@shared/pwaInstall";

/**
 * '홈 화면에 추가' 설치 안내.
 *
 * - 안드로이드/PC(Chrome·Edge 등): beforeinstallprompt 이벤트를 잡아 두었다가
 *   버튼을 누르면 네이티브 설치 프롬프트를 띄운다.
 * - iOS Safari: beforeinstallprompt 미지원 → "공유 → 홈 화면에 추가" 안내 모달.
 * - 이미 설치(standalone)된 경우엔 아무것도 표시하지 않는다.
 *
 * 표시 형태:
 * - 우하단에 고정된 눈에 띄는 둥근 버튼(브랜드 그라데이션 + 광채).
 * - 누르면 네이티브 설치(또는 iOS 안내 모달).
 * - 사용자가 닫으면 일정 기간(7일) 다시 띄우지 않는다(localStorage).
 */

// 키에 버전을 붙여, 배포 시 과거에 남아 있던 '보류' 플래그를 즉시 무효화한다.
// (이전 v1 플래그 때문에 설치도 안 했는데 버튼이 영영 안 뜨는 문제 방지)
const DISMISS_KEY = "hp-install-dismissed-at-v2";
const DISMISS_DAYS = 1;

// beforeinstallprompt 이벤트 타입(표준 정의 미포함)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
}

function getIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mql = window.matchMedia?.("(display-mode: standalone)")?.matches;
  // iOS Safari 전용 플래그
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean })
    .standalone;
  return Boolean(mql || iosStandalone);
}

export default function InstallPrompt() {
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<InstallMode>("hidden");
  const [iosOpen, setIosOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  // 환경에 맞는 모드 재평가
  const evaluate = useCallback(() => {
    if (typeof navigator === "undefined") return;
    const next = resolveInstallMode({
      userAgent: navigator.userAgent,
      isStandalone: getIsStandalone(),
      hasInstallPromptEvent: promptEventRef.current !== null,
    });
    setMode(next);
  }, []);

  useEffect(() => {
    // beforeinstallprompt 가로채기
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      promptEventRef.current = e as BeforeInstallPromptEvent;
      evaluate();
    };
    const onInstalled = () => {
      promptEventRef.current = null;
      setMode("hidden");
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // 최초 평가(iOS 안내는 이벤트 없이도 떠야 함)
    evaluate();

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [evaluate]);

  // 모드/닫힘 상태에 따라 노출 결정
  useEffect(() => {
    if (mode === "hidden") {
      setVisible(false);
      return;
    }
    if (isRecentlyDismissed()) {
      setVisible(false);
      return;
    }
    // 첫 페인트 후 부드럽게 등장
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [mode]);

  const handleInstallClick = useCallback(async () => {
    if (mode === "native" && promptEventRef.current) {
      const ev = promptEventRef.current;
      try {
        await ev.prompt();
        const choice = await ev.userChoice;
        if (choice.outcome === "accepted") {
          setVisible(false);
        }
      } catch {
        /* noop */
      } finally {
        promptEventRef.current = null;
      }
      return;
    }
    if (mode === "ios-guide") {
      setIosOpen(true);
      return;
    }
    if (mode === "manual-guide") {
      setManualOpen(true);
    }
  }, [mode]);

  const handleDismiss = useCallback(() => {
    rememberDismiss();
    setVisible(false);
  }, []);

  if (mode === "hidden") return null;

  return (
    <>
      {/* 설치 안내 — 아이콘 + "홈 화면에 추가" 큰 글자 한 줄. 우하단에서 조금 안쪽·위로 올려 잘 보이게. */}
      {visible && (
        <div className="fixed bottom-7 left-1/2 z-[60] -translate-x-1/2 sm:bottom-7 sm:left-auto sm:right-7 sm:translate-x-0">
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={handleInstallClick}
              aria-label="홈 화면에 추가"
              className="group relative flex items-center gap-3 overflow-hidden rounded-full border border-cyan-300/40 bg-[#0b0d1e]/95 py-2.5 pl-2.5 pr-6 shadow-[0_0_44px_-6px_rgba(56,189,248,0.7)] backdrop-blur-md transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              {/* 광채 */}
              <span className="pointer-events-none absolute -top-10 -right-6 h-28 w-28 rounded-full bg-cyan-400/25 blur-3xl" />
              <span className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />

              <img
                src="/icon-192.png"
                alt="휴먼프리즘"
                className="relative h-14 w-14 shrink-0 rounded-full shadow-[0_0_20px_-4px_rgba(56,189,248,0.8)]"
                loading="eager"
                decoding="async"
              />
              <span className="relative whitespace-nowrap bg-gradient-to-r from-cyan-200 to-emerald-200 bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
                홈 화면에 추가
              </span>
            </button>

            {/* 닫기(작은 X) */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="설치 안내 닫기"
              className="absolute -right-2 -top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/70 text-slate-300 shadow-md transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* iOS 안내 모달 */}
      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[420px] overflow-hidden border-cyan-300/20 bg-[#0b0d1e] p-0 text-white shadow-[0_0_60px_-12px_rgba(56,189,248,0.5)]"
        >
          <DialogTitle className="sr-only">홈 화면에 추가하는 방법</DialogTitle>

          <button
            type="button"
            onClick={() => setIosOpen(false)}
            aria-label="닫기"
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white transition-all hover:bg-white/15 active:scale-95"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>

          <div className="relative px-6 pb-7 pt-8 text-center">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-transparent to-emerald-500/10" />
            <div className="relative">
              <img
                src="/icon-192.png"
                alt="휴먼프리즘"
                className="mx-auto h-16 w-16 rounded-2xl shadow-[0_0_24px_-4px_rgba(56,189,248,0.7)]"
              />
              <h2 className="mt-4 text-xl font-bold text-white">
                홈 화면에 추가하기
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Safari 하단(또는 상단)의 <b className="text-white">공유</b> 버튼을
                누른 뒤<br />
                <b className="text-white">홈 화면에 추가</b>를 선택하세요.
              </p>

              <div className="mt-5 space-y-2.5 text-left">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-200">
                    1
                  </span>
                  <Share className="h-5 w-5 shrink-0 text-cyan-300" />
                  <span className="text-sm text-slate-200">
                    하단 <b className="text-white">공유</b> 아이콘 누르기
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-200">
                    2
                  </span>
                  <Plus className="h-5 w-5 shrink-0 text-emerald-300" />
                  <span className="text-sm text-slate-200">
                    <b className="text-white">홈 화면에 추가</b> 선택
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-sm font-bold text-fuchsia-200">
                    3
                  </span>
                  <Smartphone className="h-5 w-5 shrink-0 text-fuchsia-300" />
                  <span className="text-sm text-slate-200">
                    홈 화면에서 <b className="text-white">휴먼프리즘</b> 실행
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setIosOpen(false)}
                className="mt-6 h-12 w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-base font-bold text-[#06121f] hover:from-cyan-400 hover:to-emerald-400"
              >
                확인했어요
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 수동 설치 안내 모달(안드로이드/데스크톱 등에서 native 프롬프트가 뜨지 않을 때) */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-[440px] overflow-hidden border-cyan-300/20 bg-[#0b0d1e] p-0 text-white shadow-[0_0_60px_-12px_rgba(56,189,248,0.5)]"
        >
          <DialogTitle className="sr-only">홈 화면(앱)으로 추가하는 방법</DialogTitle>

          <button
            type="button"
            onClick={() => setManualOpen(false)}
            aria-label="닫기"
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white transition-all hover:bg-white/15 active:scale-95"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>

          <div className="relative px-6 pb-7 pt-8 text-center">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-transparent to-emerald-500/10" />
            <div className="relative">
              <img
                src="/icon-192.png"
                alt="휴먼프리즘"
                className="mx-auto h-16 w-16 rounded-2xl shadow-[0_0_24px_-4px_rgba(56,189,248,0.7)]"
              />
              <h2 className="mt-4 text-xl font-bold text-white">
                휴먼프리즘 앱으로 설치하기
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                브라우저 메뉴에서 <b className="text-white">앱 설치</b>(또는
                <b className="text-white"> 홈 화면에 추가</b>)를 누르면
                <br />
                바탕화면에서 바로 실행할 수 있어요.
              </p>

              <div className="mt-5 space-y-2.5 text-left">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-200">
                    1
                  </span>
                  <Smartphone className="h-5 w-5 shrink-0 text-cyan-300" />
                  <span className="text-sm text-slate-200">
                    휴대폰: 브라우저 우측 상단 <b className="text-white">⋮ 메뉴</b> →{" "}
                    <b className="text-white">홈 화면에 추가</b>
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-200">
                    2
                  </span>
                  <Plus className="h-5 w-5 shrink-0 text-emerald-300" />
                  <span className="text-sm text-slate-200">
                    PC(크롬·엣지): 주소창 오른쪽{" "}
                    <b className="text-white">설치 아이콘</b> 클릭
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/20 text-sm font-bold text-fuchsia-200">
                    3
                  </span>
                  <Share className="h-5 w-5 shrink-0 text-fuchsia-300" />
                  <span className="text-sm text-slate-200">
                    설치 후 <b className="text-white">휴먼프리즘</b> 아이콘으로 실행
                  </span>
                </div>
              </div>

              <Button
                onClick={() => setManualOpen(false)}
                className="mt-6 h-12 w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-base font-bold text-[#06121f] hover:from-cyan-400 hover:to-emerald-400"
              >
                확인했어요
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 헤더 등에서 재사용할 수 있도록 환경 판별 유틸 재노출
export { detectPlatform, isSafari };
