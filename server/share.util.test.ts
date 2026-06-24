import { describe, it, expect } from "vitest";
import {
  buildSajuShareText,
  buildSajuShareTitle,
  buildConsultShareText,
  buildXIntentUrl,
} from "../shared/share";

describe("buildSajuShareTitle", () => {
  it("이름이 있으면 '{이름} 사주 명식' 형태로 만든다", () => {
    expect(buildSajuShareTitle("홍길동")).toBe("홍길동 사주 명식");
  });
  it("이름이 비어 있으면 '내'로 폴백한다", () => {
    expect(buildSajuShareTitle("")).toBe("내 사주 명식");
    expect(buildSajuShareTitle("   ")).toBe("내 사주 명식");
  });
});

describe("buildSajuShareText", () => {
  const base = {
    name: "홍길동",
    year: 1990,
    pillars: {
      year: { stem: "庚", branch: "午" },
      month: { stem: "戊", branch: "寅" },
      day: { stem: "丙", branch: "子" },
      hour: { stem: "甲", branch: "午" },
    },
    daeunNumber: 9,
  };

  it("연도/사주/대운수를 포함한 3줄 요약을 만든다", () => {
    const text = buildSajuShareText(base);
    expect(text).toContain("1990년");
    expect(text).toContain("年 庚午");
    expect(text).toContain("月 戊寅");
    expect(text).toContain("日 丙子");
    expect(text).toContain("時 甲午");
    expect(text).toContain("대운수 9세 시작");
    expect(text.split("\n")).toHaveLength(3);
  });

  it("시주가 없으면(시간 모름) ??로 표기한다", () => {
    const text = buildSajuShareText({ ...base, pillars: { ...base.pillars, hour: null } });
    expect(text).toContain("時 ??");
  });
});

describe("buildConsultShareText", () => {
  it("짧은 내용은 그대로 둔다", () => {
    expect(buildConsultShareText("안녕하세요")).toBe("안녕하세요");
  });
  it("긴 내용은 자르고 말줄임표를 붙인다", () => {
    const long = "가".repeat(300);
    const out = buildConsultShareText(long, 180);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBe(181); // 180 + 말줄임표
  });
  it("앞뒤 공백을 정리한다", () => {
    expect(buildConsultShareText("  여백  ")).toBe("여백");
  });
});

describe("buildXIntentUrl", () => {
  it("text와 url 쿼리를 포함한 트위터 intent URL을 만든다", () => {
    const url = buildXIntentUrl("제목입니다", "https://example.com/saju");
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://twitter.com");
    expect(parsed.pathname).toBe("/intent/tweet");
    expect(parsed.searchParams.get("text")).toBe("제목입니다");
    expect(parsed.searchParams.get("url")).toBe("https://example.com/saju");
  });
});
