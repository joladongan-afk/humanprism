import { describe, expect, it } from "vitest";

/**
 * 원픽 무료 상담 1회 제한 로직 검증.
 * 실제 DB 연동 없이, listPaymentsByUser 결과에서 "free" planType 존재 여부로
 * 무료 사용 여부를 판정하는 정책을 테스트한다.
 */
function isFreeUsed(payments: Array<{ planType: string }>): boolean {
  return payments.some((p) => p.planType === "free");
}

describe("원픽 무료 상담 사용 여부 판정", () => {
  it("결제 이력이 비어있으면 사용하지 않은 상태", () => {
    expect(isFreeUsed([])).toBe(false);
  });

  it("free 플랜 결제가 있으면 사용한 상태", () => {
    expect(isFreeUsed([{ planType: "free" }])).toBe(true);
  });

  it("유료 플랜만 있고 free가 없으면 미사용", () => {
    expect(
      isFreeUsed([{ planType: "deep" }, { planType: "entry" }]),
    ).toBe(false);
  });

  it("유료 플랜과 free가 섞여 있으면 사용한 상태", () => {
    expect(
      isFreeUsed([{ planType: "deep" }, { planType: "free" }]),
    ).toBe(true);
  });
});

/**
 * 출생 도시/섬머타임 자동 보정 로직 (클라이언트 측 적용)을
 * 서버에서 동일하게 검증할 수 있도록 정책 함수만 별도로 둔다.
 */
function applyTimeAdjustments(
  h: number,
  m: number,
  cityCorrectionMin: number,
  inDst: boolean,
): { hour: number; minute: number } {
  let total = h * 60 + m;
  total -= cityCorrectionMin;
  if (inDst) total -= 60;
  while (total < 0) total += 24 * 60;
  total = total % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

describe("출생 도시/섬머타임 보정", () => {
  it("서울(126.978E)은 약 32분 보정 (135-126.978)*4 ≈ 32분", () => {
    const seoulCorrection = Math.round((135 - 126.978) * 4);
    expect(seoulCorrection).toBe(32);
    const r = applyTimeAdjustments(12, 0, seoulCorrection, false);
    expect(r.hour).toBe(11);
    expect(r.minute).toBe(28);
  });

  it("부산(129.0756E)은 약 24분 보정", () => {
    const busanCorrection = Math.round((135 - 129.0756) * 4);
    expect(busanCorrection).toBe(24);
    const r = applyTimeAdjustments(12, 0, busanCorrection, false);
    expect(r.hour).toBe(11);
    expect(r.minute).toBe(36);
  });

  it("섬머타임 적용 시 1시간 추가 보정", () => {
    const seoulCorrection = 32;
    const r = applyTimeAdjustments(12, 0, seoulCorrection, true);
    // 12:00 - 0:32 - 1:00 = 10:28
    expect(r.hour).toBe(10);
    expect(r.minute).toBe(28);
  });

  it("자정 직전 시각이 음수가 되면 다음 날의 23시대로 래핑", () => {
    // 0시 10분에서 32분 빼면 -22분 → 23:38
    const r = applyTimeAdjustments(0, 10, 32, false);
    expect(r.hour).toBe(23);
    expect(r.minute).toBe(38);
  });

  it("정확한 KST 기준점(135E)은 0분 보정", () => {
    const baseCorrection = Math.round((135 - 135) * 4);
    expect(baseCorrection).toBe(0);
    const r = applyTimeAdjustments(8, 30, baseCorrection, false);
    expect(r.hour).toBe(8);
    expect(r.minute).toBe(30);
  });
});

/**
 * 원픽 무료 상담 세션 생성 시, 선택한 사주 프로필을 세션에 연결하는 정책을 검증한다.
 * - 선택한 프로필이 본인 소유면 연결
 * - 타인 소유이거나 존재하지 않으면 null (채팅창에서 만세력 입력 유도)
 */
function resolveLinkedSajuProfileId(
  inputSajuProfileId: number | undefined,
  profile: { id: number; userId: number } | undefined,
  currentUserId: number,
): number | null {
  if (!inputSajuProfileId) return null;
  if (profile && profile.userId === currentUserId) return inputSajuProfileId;
  return null;
}

describe("무료 상담 사주 프로필 연결 정책", () => {
  it("선택한 프로필이 본인 소유면 세션에 연결", () => {
    const result = resolveLinkedSajuProfileId(
      10,
      { id: 10, userId: 1 },
      1,
    );
    expect(result).toBe(10);
  });

  it("프로필을 선택하지 않으면 null (만세력 입력 유도)", () => {
    expect(resolveLinkedSajuProfileId(undefined, undefined, 1)).toBeNull();
  });

  it("타인 소유 프로필은 연결하지 않고 null", () => {
    const result = resolveLinkedSajuProfileId(
      10,
      { id: 10, userId: 999 },
      1,
    );
    expect(result).toBeNull();
  });

  it("존재하지 않는 프로필은 null", () => {
    expect(resolveLinkedSajuProfileId(10, undefined, 1)).toBeNull();
  });
});
