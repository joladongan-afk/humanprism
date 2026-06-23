/**
 * PWA 설치 안내 표시 여부를 결정하는 순수 로직.
 * 브라우저 API에 직접 의존하지 않도록 입력값을 받아 판단만 한다(테스트 용이).
 */

export type Platform = "ios" | "android" | "desktop" | "other";

export interface InstallEnvInput {
  userAgent: string;
  /** display-mode: standalone 또는 iOS navigator.standalone */
  isStandalone: boolean;
  /** beforeinstallprompt 이벤트를 받았는지(=네이티브 설치 가능) */
  hasInstallPromptEvent: boolean;
}

/** UA 기반 플랫폼 추정 */
export function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    // iPadOS 13+는 데스크톱 UA로 위장하므로 터치 + Mac 조합도 iOS로 본다
    (/macintosh/.test(ua) && /mobile/.test(ua));
  if (isIOS) return "ios";
  if (/android/.test(ua)) return "android";
  if (/windows|macintosh|linux|cros/.test(ua)) return "desktop";
  return "other";
}

/** Safari(설치 가능하지만 beforeinstallprompt 미지원) 여부 */
export function isSafari(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return /safari/.test(ua) && !/chrome|crios|chromium|fxios|edg|opr/.test(ua);
}

/**
 * 설치 안내 모드.
 * - hidden: 이미 설치됨(standalone) → 아무것도 안 띄움
 * - native: beforeinstallprompt 수신 → 버튼 누르면 네이티브 설치 프롬프트
 * - ios-guide: iOS Safari → 공유 → 홈 화면에 추가 안내
 * - manual-guide: 그 외(안드로이드/데스크톱 등에서 이벤트 미수신) → 브라우저 메뉴를 통한 수동 설치 안내
 */
export type InstallMode = "hidden" | "native" | "ios-guide" | "manual-guide";

/**
 * 설치 안내 모드 결정:
 * - 이미 설치(standalone): hidden
 * - beforeinstallprompt 수신: native
 * - iOS Safari: ios-guide
 * - iOS의 비(非)Safari 브라우저(Chrome/Firefox 등): 홈 화면 추가가 사실상 불가 → hidden
 *   (Safari로 열어야 가능하므로 버튼을 띄워도 따라할 수 없음)
 * - 그 외(안드로이드/데스크톱 등 이벤트 미수신): manual-guide
 *   beforeinstallprompt가 끝내 오지 않아도 사용자가 수동으로 설치할 수 있도록 안내한다.
 */
export function resolveInstallMode(env: InstallEnvInput): InstallMode {
  if (env.isStandalone) return "hidden";
  if (env.hasInstallPromptEvent) return "native";
  const platform = detectPlatform(env.userAgent);
  if (platform === "ios") {
    return isSafari(env.userAgent) ? "ios-guide" : "hidden";
  }
  // 안드로이드/데스크톱/기타: 이벤트가 없어도 수동 설치 안내를 노출
  return "manual-guide";
}
