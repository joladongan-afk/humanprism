import { describe, expect, it } from "vitest";
import { pickUnconsumedPayment, canAnalyze } from "./compatibilityEntitlement";

describe("compatibility entitlement (결제 1건 = 분석 1회)", () => {
  it("결제가 전혀 없으면 분석 불가", () => {
    expect(canAnalyze([], [])).toBe(false);
    expect(pickUnconsumedPayment([], [])).toBeUndefined();
  });

  it("paid 결제 1건 + 소비 이력 없음 → 그 결제건으로 분석 가능", () => {
    const paid = [{ id: 10 }];
    expect(canAnalyze(paid, [])).toBe(true);
    expect(pickUnconsumedPayment(paid, [])?.id).toBe(10);
  });

  it("결제건이 이미 분석에 소비되었으면 → 분석 불가", () => {
    const paid = [{ id: 10 }];
    // 10번 결제는 이미 어떤 궁합 분석에 연결됨
    expect(canAnalyze(paid, [10])).toBe(false);
    expect(pickUnconsumedPayment(paid, [10])).toBeUndefined();
  });

  it("여러 결제 중 아직 소비되지 않은 첫 건을 고른다 (최신순 입력 가정)", () => {
    const paid = [{ id: 30 }, { id: 20 }, { id: 10 }]; // 최신순
    // 30, 20은 이미 소비됨 → 10이 남음
    expect(pickUnconsumedPayment(paid, [20, 30])?.id).toBe(10);
    expect(canAnalyze(paid, [20, 30])).toBe(true);
  });

  it("모든 결제가 소비되면 분석 불가", () => {
    const paid = [{ id: 30 }, { id: 20 }, { id: 10 }];
    expect(canAnalyze(paid, [10, 20, 30])).toBe(false);
  });

  it("소비 목록의 null/undefined는 무시한다", () => {
    const paid = [{ id: 10 }];
    expect(pickUnconsumedPayment(paid, [null, undefined])?.id).toBe(10);
    expect(canAnalyze(paid, [null, undefined])).toBe(true);
  });

  it("2건 결제 → 2회 분석 후 추가 불가 (소비 누적 시나리오)", () => {
    const paid = [{ id: 2 }, { id: 1 }]; // 최신순
    // 1회차: 아무것도 소비 안 됨 → id 2 선택
    const first = pickUnconsumedPayment(paid, []);
    expect(first?.id).toBe(2);
    // 2회차: 2 소비됨 → id 1 선택
    const second = pickUnconsumedPayment(paid, [2]);
    expect(second?.id).toBe(1);
    // 3회차: 둘 다 소비됨 → 불가
    expect(canAnalyze(paid, [2, 1])).toBe(false);
  });
});
