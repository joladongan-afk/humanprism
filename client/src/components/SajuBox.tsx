/**
 * SajuBox — 채팅/상담 화면용 사주 박스.
 *
 * 표시 데이터는 만세력 엔진(saju.ts)이 계산해 DB에 저장한 SajuResult(sajuData)만 사용한다.
 * 즉 검증된 값(사주팔자 4기둥 · 지장간 · 12신살 · 대운)만 그린다.
 * 도화살/괴강살/12운성 등 미검증 신살은 의도적으로 표시하지 않는다(오정보 방지, B단계 예정).
 */

// 오행 → 색상/배경 매핑 (가독성 강화: 텍스트 색을 더 진하게)
const ELEMENT_STYLE: Record<string, { text: string; bg: string; ring: string; label: string }> = {
  木: { text: "#064e3b", bg: "rgba(52,211,153,0.22)", ring: "rgba(52,211,153,0.5)", label: "목" },
  火: { text: "#7f1d1d", bg: "rgba(248,113,113,0.22)", ring: "rgba(248,113,113,0.5)", label: "화" },
  土: { text: "#78350f", bg: "rgba(251,191,36,0.28)", ring: "rgba(251,191,36,0.55)", label: "토" },
  金: { text: "#1e293b", bg: "rgba(148,163,184,0.30)", ring: "rgba(148,163,184,0.55)", label: "금" },
  水: { text: "#1e3a8a", bg: "rgba(96,165,250,0.22)", ring: "rgba(96,165,250,0.5)", label: "수" },
};

function elStyle(el?: string) {
  return (el && ELEMENT_STYLE[el]) || { text: "#111827", bg: "rgba(148,163,184,0.20)", ring: "rgba(148,163,184,0.45)", label: "" };
}

type Pillar = {
  stem: string;
  branch: string;
  stemKr: string;
  branchKr: string;
  stemElement: string;
  branchElement: string;
  hiddenStems: string[];
  shinsal: string;
};

type SajuData = {
  unknownHour?: boolean;
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null;
  };
  daeun: {
    daeunNumber: number;
    forward: boolean;
    pillars: string[];
  };
};

const POSITION_LABELS: { key: "hour" | "day" | "month" | "year"; label: string; color: string }[] = [
  { key: "hour", label: "시", color: "#6b7280" },
  { key: "day", label: "일", color: "#b45309" },
  { key: "month", label: "월", color: "#6b7280" },
  { key: "year", label: "연", color: "#6b7280" },
];

function PillarColumn({ pillar, label, labelColor, isDay }: { pillar: Pillar | null; label: string; labelColor: string; isDay: boolean }) {
  if (!pillar) {
    // 시주 모름
    return (
      <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
        <span className="text-base font-black" style={{ color: labelColor }}>{label}</span>
        <div className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-1 py-4 flex flex-col items-center justify-center gap-0.5">
          <span className="text-2xl font-bold text-slate-300 leading-none">?</span>
          <span className="text-xs text-slate-400 mt-1">시간 모름</span>
        </div>
      </div>
    );
  }

  const sEl = elStyle(pillar.stemElement);
  const bEl = elStyle(pillar.branchElement);

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span className="text-base font-black" style={{ color: labelColor }}>
        {label}
        {isDay && <span className="ml-0.5 text-xs" style={{ color: labelColor }}>▼</span>}
      </span>

      {/* 간지 셀 */}
      <div
        className="w-full rounded-lg border px-1 py-1.5 flex flex-col items-center gap-1"
        style={{
          borderColor: isDay ? "rgba(180,131,30,0.7)" : "rgba(148,163,184,0.9)",
          boxShadow: isDay ? "0 0 0 2px rgba(180,131,30,0.28)" : undefined,
          background: isDay ? "rgba(251,191,36,0.08)" : undefined,
        }}
      >
        {/* 천간 */}
        <div className="w-full rounded-md flex flex-col items-center py-2" style={{ background: sEl.bg }}>
          <span className="hanja-display text-3xl font-black leading-none drop-shadow-sm" style={{ color: sEl.text, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
            {pillar.stem}
          </span>
          <span className="text-xs font-bold mt-1" style={{ color: sEl.text }}>
            {pillar.stemKr} · {sEl.label}
          </span>
        </div>
        {/* 지지 */}
        <div className="w-full rounded-md flex flex-col items-center py-2" style={{ background: bEl.bg }}>
          <span className="hanja-display text-3xl font-black leading-none drop-shadow-sm" style={{ color: bEl.text, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>
            {pillar.branch}
          </span>
          <span className="text-xs font-bold mt-1" style={{ color: bEl.text }}>
            {pillar.branchKr} · {bEl.label}
          </span>
        </div>
      </div>

      {/* 지장간 */}
      {pillar.hiddenStems?.length > 0 && (
        <div className="text-xs text-slate-600 text-center leading-tight">
          <span className="text-slate-500">지장간</span>
          <br />
          <span className="font-semibold">{pillar.hiddenStems.join(" ")}</span>
        </div>
      )}

      {/* 12신살 */}
      {pillar.shinsal && (
        <span className="text-xs font-bold text-purple-900 bg-purple-100 border border-purple-400 rounded-md px-1.5 py-1 mt-0.5 shadow-sm text-center w-full block leading-tight">
          {pillar.shinsal}
        </span>
      )}
    </div>
  );
}

export function SajuBox({ data, name }: { data: SajuData; name?: string }) {
  if (!data?.pillars) return null;
  const { pillars, daeun } = data;

  return (
    <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/40 to-white p-3 shadow-sm">
      {/* 헤더: 이름만 표시 (사주 명식 텍스트 제거) */}
      {name && (
        <div className="mb-2">
          <span className="hanja-display text-lg font-bold text-slate-900">{name}</span>
        </div>
      )}

      {/* 4기둥 (시·일·월·연 순서) */}
      <div className="flex items-stretch gap-1.5">
        {POSITION_LABELS.map(({ key, label, color }) => (
          <PillarColumn key={key} pillar={pillars[key]} label={label} labelColor={color} isDay={key === "day"} />
        ))}
      </div>

      {/* 대운 */}
      {daeun?.pillars?.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-amber-200/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-black text-slate-800">대운</span>
            <span className="text-sm text-slate-600 font-bold">
              {daeun.daeunNumber}세 시작 · {daeun.forward ? "순행" : "역행"}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {daeun.pillars.map((gz, i) => {
              const age = daeun.daeunNumber + i * 10;
              return (
                <div
                  key={i}
                  className="flex flex-col items-center shrink-0 rounded-md border border-slate-400 bg-white px-2.5 py-2 min-w-[48px] shadow-sm"
                >
                  <span className="hanja-display text-xl font-black text-slate-900 leading-none">{gz}</span>
                  <span className="text-sm text-slate-600 mt-1 font-bold">{age}세</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SajuBox;
