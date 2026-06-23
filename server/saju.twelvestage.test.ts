import { describe, it, expect } from "vitest";
import {
  getTwelveStage,
  getStageVitality,
  getMonthlyStatus,
} from "./saju";

describe("getTwelveStage — 화토동근(火土同根) 기준 12운성", () => {
  // 화토동근: 戊는 丙과 같은 장생지(寅), 己는 丁과 같은 장생지(酉)
  it("戊의 장생지는 寅이다 (丙과 동근)", () => {
    expect(getTwelveStage("戊", "寅")).toBe("장생");
    expect(getTwelveStage("丙", "寅")).toBe("장생");
  });

  it("己의 장생지는 酉이다 (丁과 동근)", () => {
    expect(getTwelveStage("己", "酉")).toBe("장생");
    expect(getTwelveStage("丁", "酉")).toBe("장생");
  });

  // 양간(甲丙戊庚壬)은 순행
  it("양간 丙: 장생(寅)에서 순행하여 목욕은 卯, 관대는 辰", () => {
    expect(getTwelveStage("丙", "卯")).toBe("목욕");
    expect(getTwelveStage("丙", "辰")).toBe("관대");
  });

  it("양간 甲: 장생지는 亥, 제왕은 卯", () => {
    expect(getTwelveStage("甲", "亥")).toBe("장생");
    expect(getTwelveStage("甲", "卯")).toBe("제왕");
  });

  // 음간(乙丁己辛癸)은 역행
  it("음간 乙: 장생지는 午에서 역행, 제왕은 寅", () => {
    expect(getTwelveStage("乙", "午")).toBe("장생");
    // 역행: 午(장생)→巳(목욕)→辰(관대)→卯(건록)→寅(제왕)
    expect(getTwelveStage("乙", "寅")).toBe("제왕");
  });

  it("양간 庚: 장생지는 巳, 건록은 申", () => {
    expect(getTwelveStage("庚", "巳")).toBe("장생");
    expect(getTwelveStage("庚", "申")).toBe("건록");
  });

  it("양간 壬: 장생지는 申, 제왕은 子", () => {
    expect(getTwelveStage("壬", "申")).toBe("장생");
    expect(getTwelveStage("壬", "子")).toBe("제왕");
  });

  it("알 수 없는 글자는 빈 문자열", () => {
    expect(getTwelveStage("X", "子")).toBe("");
    expect(getTwelveStage("甲", "Z")).toBe("");
  });
});

describe("getStageVitality — 기세 라벨", () => {
  it("강: 장생·관대·건록·제왕", () => {
    for (const s of ["장생", "관대", "건록", "제왕"]) {
      expect(getStageVitality(s)).toBe("강");
    }
  });
  it("약: 절·태·묘·사", () => {
    for (const s of ["절", "태", "묘", "사"]) {
      expect(getStageVitality(s)).toBe("약");
    }
  });
  it("미묘: 목욕·양·쇠·병", () => {
    for (const s of ["목욕", "양", "쇠", "병"]) {
      expect(getStageVitality(s)).toBe("미묘");
    }
  });
});

describe("getMonthlyStatus — 조후/득실령", () => {
  it("丙火가 여름(午)을 만나면 득령", () => {
    const r = getMonthlyStatus("火", "午");
    expect(r.status).toBe("득령");
    expect(r.season).toBe("여름");
  });

  it("庚金이 겨울(亥)을 만나면 실령", () => {
    const r = getMonthlyStatus("金", "亥");
    expect(r.status).toBe("실령");
    expect(r.season).toBe("겨울");
  });

  it("木이 겨울(子, 水왕)을 만나면 상령(水生木)", () => {
    const r = getMonthlyStatus("木", "子");
    expect(r.status).toBe("상령");
  });

  it("土가 환절기(辰)를 만나면 득령", () => {
    const r = getMonthlyStatus("土", "辰");
    expect(r.status).toBe("득령");
  });

  it("木이 환절기(戌)를 만나면 실령", () => {
    const r = getMonthlyStatus("木", "戌");
    expect(r.status).toBe("실령");
  });
});
