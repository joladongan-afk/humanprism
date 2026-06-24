/**
 * 공유 기능에서 사용하는 순수 헬퍼들.
 * 프론트(ShareButton)와 테스트에서 공통으로 사용한다.
 */

export interface PillarLite {
  stem: string;
  branch: string;
}

export interface SajuShareInput {
  name: string;
  year: number;
  pillars: {
    year: PillarLite | null;
    month: PillarLite | null;
    day: PillarLite | null;
    hour: PillarLite | null;
  };
  daeunNumber: number;
}

function fmtPillar(p: PillarLite | null): string {
  return p ? `${p.stem}${p.branch}` : "??";
}

/** 사주 명식 공유용 요약 텍스트를 만든다. */
export function buildSajuShareText(input: SajuShareInput): string {
  const { year, pillars, daeunNumber } = input;
  const lines = [
    `${year}년 · 휴먼프리즘 사주 명식`,
    `年 ${fmtPillar(pillars.year)} · 月 ${fmtPillar(pillars.month)} · 日 ${fmtPillar(
      pillars.day,
    )} · 時 ${fmtPillar(pillars.hour)}`,
    `대운수 ${daeunNumber}세 시작`,
  ];
  return lines.join("\n");
}

/** 공유 제목을 만든다(빈 이름일 때 "내"로 폴백). */
export function buildSajuShareTitle(name: string): string {
  const trimmed = (name ?? "").trim();
  return `${trimmed || "내"} 사주 명식`;
}

/** 상담 메시지 공유용 요약(너무 길면 자르고 말줄임표). */
export function buildConsultShareText(content: string, maxLen = 180): string {
  const text = (content ?? "").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}

/** X(트위터) intent URL 생성. */
export function buildXIntentUrl(title: string, url: string): string {
  const u = new URL("https://twitter.com/intent/tweet");
  u.searchParams.set("text", title);
  u.searchParams.set("url", url);
  return u.toString();
}
