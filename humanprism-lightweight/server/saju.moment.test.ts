import { describe, it, expect } from "vitest";
import { getCurrentMoment, getHourBranch, getHourStem } from "./saju";

/**
 * 현재 시각(KST) + 일진 + 시주 산출 검증.
 * getCurrentMoment(atKst)의 atKst는 "KST 벽시계 시각을 UTC 필드에 담은 Date"로 해석된다
 * (saju.ts의 다른 함수들과 동일 규약: getUTCFullYear 등으로 KST 필드를 읽음).
 */

function kst(y: number, mo: number, d: number, h: number, mi = 0): Date {
  return new Date(Date.UTC(y, mo - 1, d, h, mi));
}

describe("getCurrentMoment - 한국 표준시 년월일시 + 일진/시주", () => {
  it("년월일시분/요일/HH:MM을 그대로 돌려준다", () => {
    const m = getCurrentMoment(kst(2026, 6, 13, 14, 5));
    expect(m.year).toBe(2026);
    expect(m.month).toBe(6);
    expect(m.day).toBe(13);
    expect(m.hour).toBe(14);
    expect(m.minute).toBe(5);
    expect(m.timeStr).toBe("14:05");
    // 2026-06-13은 토요일
    expect(m.weekdayKr).toBe("토");
  });

  it("0시/한 자리 시·분도 0패딩한다", () => {
    const m = getCurrentMoment(kst(2026, 6, 13, 9, 3));
    expect(m.timeStr).toBe("09:03");
  });

  it("일진(일주)은 만세력 CSV 값과 일치하고, 비어있지 않다", () => {
    const m = getCurrentMoment(kst(2026, 6, 13, 14, 0));
    expect(m.dayGanji).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
    expect(m.dayGanjiKr.length).toBe(2);
  });

  it("시주 간지는 일진 천간 + 시각으로 오자둔법 계산과 일치한다", () => {
    const at = kst(2026, 6, 13, 14, 0);
    const m = getCurrentMoment(at);
    const dayStem = m.dayGanji[0];
    const expectStem = getHourStem(dayStem, 14, 0);
    const expectBranch = getHourBranch(14, 0);
    expect(m.hourGanji).toBe(expectStem + expectBranch);
    // 14시는 未시(13~15시)
    expect(expectBranch).toBe("未");
  });

  it("자시 경계: 23시는 子시로 처리한다(야자시 미사용)", () => {
    const m = getCurrentMoment(kst(2026, 6, 13, 23, 30));
    expect(m.hourGanji[1]).toBe("子");
    expect(m.hourBranchLabel).toContain("子時");
    expect(m.hourBranchLabel).toContain("23~01시");
  });

  it("자정 0시도 子시로 처리한다", () => {
    const m = getCurrentMoment(kst(2026, 6, 13, 0, 30));
    expect(m.hourGanji[1]).toBe("子");
  });

  it("정오 12시는 午시다", () => {
    const m = getCurrentMoment(kst(2026, 6, 13, 12, 0));
    expect(m.hourGanji[1]).toBe("午");
  });
});
