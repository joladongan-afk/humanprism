import { describe, it, expect } from "vitest";
import { getSessionStatusView } from "../shared/sessionStatus";

/**
 * 마이룸(/me) 세션 상태 표기 매핑 검증.
 *
 * 무통장 입금 트랙 도입으로 awaiting_payment / approved 상태가 추가되었고,
 * 이를 "만료"로 잘못 표기하던 회귀를 방지한다.
 */
describe("getSessionStatusView", () => {
  it("awaiting_payment → 승인 대기 (입장 불가, 입금 확인 중)", () => {
    const v = getSessionStatusView("awaiting_payment", false);
    expect(v.label).toBe("승인 대기");
    expect(v.canEnter).toBe(false);
    expect(v.isAwaiting).toBe(true);
    expect(v.buttonLabel).toBe("입금 확인 중");
  });

  it("approved → 입장 가능 (지금 입장하기)", () => {
    const v = getSessionStatusView("approved", false);
    expect(v.label).toBe("입장 가능");
    expect(v.canEnter).toBe(true);
    expect(v.isAwaiting).toBe(false);
    expect(v.buttonLabel).toBe("지금 입장하기");
  });

  it("approved는 expired 플래그와 무관하게 입장 가능 (placeholder expiresAt 보호)", () => {
    // approved 세션은 placeholder 만료값을 쓰므로 expired=true가 오더라도
    // "입장 가능"이 유지되어야 한다(승인 후 입장 동선이 끊기면 안 됨).
    const v = getSessionStatusView("approved", true);
    expect(v.label).toBe("입장 가능");
    expect(v.canEnter).toBe(true);
  });

  it("active + 미만료 → 진행 가능 (이어가기)", () => {
    const v = getSessionStatusView("active", false);
    expect(v.label).toBe("진행 가능");
    expect(v.canEnter).toBe(true);
    expect(v.buttonLabel).toBe("이어가기");
  });

  it("active + 만료 → 만료 (기록 보기)", () => {
    const v = getSessionStatusView("active", true);
    expect(v.label).toBe("만료");
    expect(v.canEnter).toBe(false);
    expect(v.isAwaiting).toBe(false);
    expect(v.buttonLabel).toBe("기록 보기");
  });

  it("completed → 완료 (기록 보기)", () => {
    const v = getSessionStatusView("completed", false);
    expect(v.label).toBe("완료");
    expect(v.canEnter).toBe(false);
    expect(v.buttonLabel).toBe("기록 보기");
  });

  it("completed는 만료 플래그와 무관하게 완료로 표기", () => {
    const v = getSessionStatusView("completed", true);
    expect(v.label).toBe("완료");
  });

  it("expired 상태 → 만료", () => {
    const v = getSessionStatusView("expired", true);
    expect(v.label).toBe("만료");
    expect(v.canEnter).toBe(false);
  });
});
