import { describe, it, expect } from "vitest";
import {
  detectPlatform,
  isSafari,
  resolveInstallMode,
} from "../shared/pwaInstall";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
};

describe("detectPlatform", () => {
  it("아이폰 UA는 ios로 판별한다", () => {
    expect(detectPlatform(UA.iphoneSafari)).toBe("ios");
    expect(detectPlatform(UA.iphoneChrome)).toBe("ios");
  });
  it("안드로이드 UA는 android로 판별한다", () => {
    expect(detectPlatform(UA.androidChrome)).toBe("android");
  });
  it("데스크톱 UA는 desktop으로 판별한다", () => {
    expect(detectPlatform(UA.desktopChrome)).toBe("desktop");
    expect(detectPlatform(UA.macSafari)).toBe("desktop");
  });
});

describe("isSafari", () => {
  it("iOS/Mac Safari는 true", () => {
    expect(isSafari(UA.iphoneSafari)).toBe(true);
    expect(isSafari(UA.macSafari)).toBe(true);
  });
  it("Chrome 계열은 false", () => {
    expect(isSafari(UA.androidChrome)).toBe(false);
    expect(isSafari(UA.desktopChrome)).toBe(false);
    expect(isSafari(UA.iphoneChrome)).toBe(false);
  });
});

describe("resolveInstallMode", () => {
  it("이미 설치(standalone)면 hidden", () => {
    expect(
      resolveInstallMode({
        userAgent: UA.androidChrome,
        isStandalone: true,
        hasInstallPromptEvent: true,
      })
    ).toBe("hidden");
  });

  it("beforeinstallprompt 수신 시 native (PC/안드로이드)", () => {
    expect(
      resolveInstallMode({
        userAgent: UA.androidChrome,
        isStandalone: false,
        hasInstallPromptEvent: true,
      })
    ).toBe("native");
    expect(
      resolveInstallMode({
        userAgent: UA.desktopChrome,
        isStandalone: false,
        hasInstallPromptEvent: true,
      })
    ).toBe("native");
  });

  it("iOS Safari는 이벤트 없어도 ios-guide", () => {
    expect(
      resolveInstallMode({
        userAgent: UA.iphoneSafari,
        isStandalone: false,
        hasInstallPromptEvent: false,
      })
    ).toBe("ios-guide");
  });

  it("iOS Chrome(CriOS)은 Safari가 아니므로 홈화면 추가 불가 → hidden", () => {
    // iOS의 비Safari 브라저는 안내를 띄워도 따라할 수 없으므로 숨긴다.
    expect(
      resolveInstallMode({
        userAgent: UA.iphoneChrome,
        isStandalone: false,
        hasInstallPromptEvent: false,
      })
    ).toBe("hidden");
  });

  it("데스크톱에서 이벤트 없으면 manual-guide(수동 설치 안내)", () => {
    expect(
      resolveInstallMode({
        userAgent: UA.desktopChrome,
        isStandalone: false,
        hasInstallPromptEvent: false,
      })
    ).toBe("manual-guide");
  });

  it("안드로이드에서 이벤트가 아직 안 왔으면 manual-guide(버튼은 항상 노출)", () => {
    expect(
      resolveInstallMode({
        userAgent: UA.androidChrome,
        isStandalone: false,
        hasInstallPromptEvent: false,
      })
    ).toBe("manual-guide");
  });

  it("설치된 상태면 이벤트 유무·플랫폼 무관하게 hidden", () => {
    expect(
      resolveInstallMode({
        userAgent: UA.desktopChrome,
        isStandalone: true,
        hasInstallPromptEvent: false,
      })
    ).toBe("hidden");
  });
});
