import { describe, it, expect } from "vitest";
import { FIRST_VISIT_POPUP_CTA_PATH } from "../shared/firstVisitPopup";

describe("home entry popup", () => {
  // 정책: 홈 진입/새로고침마다 매번 노출(1회 제한 제거). CTA 경로만 검증한다.
  it("CTA routes to the free-trial auto-start path on /plans", () => {
    expect(FIRST_VISIT_POPUP_CTA_PATH).toBe("/plans?start=free");
  });
});
