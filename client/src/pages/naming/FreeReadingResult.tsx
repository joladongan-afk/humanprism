import { Button } from "@/components/ui/button";

interface SuriGrade {
  number: number;
  gilhyung: string;
  description: string;
}

interface FreeReadingResultProps {
  data: {
    certificateNumber: string;
    analysis: {
      jawon: {
        ohaeng: string;
        result: string;
        detail?: string;
        hasHanja?: boolean;
      };
      suri4: {
        won: SuriGrade;
        hyeong: SuriGrade;
        i: SuriGrade;
        jeong: SuriGrade;
      };
      bulmyong: {
        hasBulmyong: boolean;
        chars: string[];
      };
      overall: string;
      comment: string;
      requiredOhaeng?: { primary: string; secondary: string } | null;
    };
  };
  inputData?: {
    name1Korean: string;
    name1Hanja?: string;
    name2Korean: string;
    name2Hanja?: string;
  };
  onPdfDownload?: () => void;
  onShare?: () => void;
}

const OHAENG_COLOR: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  木: { dot: "#1a5fa8", text: "#0d3d6e", bg: "#dceeff", border: "#8ec5f7", label: "목(木)" },
  火: { dot: "#A32D2D", text: "#791F1F", bg: "#FCEBEB", border: "#F7C1C1", label: "화(火)" },
  土: { dot: "#8a6200", text: "#5a4000", bg: "#fff3c0", border: "#f0c93a", label: "토(土)" },
  金: { dot: "#555550", text: "#333330", bg: "#e8e8e0", border: "#aaaaaa", label: "금(金)" },
  水: { dot: "#90d0ff", text: "#ffffff", bg: "#0a0a1a", border: "#334488", label: "수(水)" },
};

const GILHYUNG_STYLE: Record<string, { bg: string; color: string }> = {
  "吉":      { bg: "#EAF3DE", color: "#27500A" },
  "凶":      { bg: "#FCEBEB", color: "#791F1F" },
  "半吉半凶": { bg: "#FAEEDA", color: "#633806" },
};

const RESULT_STYLE: Record<string, { bg: string; color: string }> = {
  "양호":      { bg: "#E1F5EE", color: "#085041" },
  "우수":      { bg: "#E1F5EE", color: "#085041" },
  "상생":      { bg: "#E1F5EE", color: "#085041" },
  "중립":      { bg: "#FAEEDA", color: "#633806" },
  "보완 필요":  { bg: "#FCEBEB", color: "#791F1F" },
  "재검토 필요":{ bg: "#FCEBEB", color: "#791F1F" },
  "한자 미입력":{ bg: "#F1EFE8", color: "#444441" },
};

// 에메랄드 그라데이션: 원격(연) → 형격 → 이격 → 정격(짙)
const SURI4_META = {
  won:    { name: "원격(元格)", sub: "가운데 글자 · 어린 시절·내면",  accent: "#1a7a5e", bg: "#e8faf5", border: "#b2e8d6" },
  hyeong: { name: "형격(亨格)", sub: "끝 글자 · 청장년·사회활동",    accent: "#159070", bg: "#c8f0e0", border: "#7dd4b4" },
  i:      { name: "이격(利格)", sub: "성+가운데 · 가정·대인관계",    accent: "#0d7a5a", bg: "#8edec0", border: "#4db896" },
  jeong:  { name: "정격(貞格)", sub: "전체 이름 · 평생 총괄 운세",   accent: "#ffffff", bg: "#0d6b4a", border: "#0a5038" },
};

function Badge({ label, style }: { label: string; style?: { bg: string; color: string } }) {
  const s = style || { bg: "#F1EFE8", color: "#444441" };
  return (
    <span style={{ fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 99, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

const card = (accentColor: string): React.CSSProperties => ({
  background: "#ffffff",
  border: `0.5px solid #e0ddd6`,
  borderTop: `3px solid ${accentColor}`,
  borderRadius: 12,
  padding: "14px 16px",
  marginBottom: 10,
});

function SectionTitle({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 16, fontWeight: 700, color: "#0d6b4a", marginBottom: 12, letterSpacing: "0.01em" }}>
      {label}
    </div>
  );
}

export function FreeReadingResult({ data, inputData, onPdfDownload, onShare }: FreeReadingResultProps) {
  const { jawon, suri4, bulmyong, overall, comment } = data.analysis;
  const ohaengChars = jawon.ohaeng ? jawon.ohaeng.split("") : [];

  const n1Kor = inputData?.name1Korean || "";
  const n1Han = inputData?.name1Hanja || "";
  const n2Kor = inputData?.name2Korean || "";
  const n2Han = inputData?.name2Hanja || "";

  const buildJawonDesc = () => {
    if (!jawon.hasHanja || ohaengChars.length < 2) return null;
    const c0 = OHAENG_COLOR[ohaengChars[0]];
    const c1 = OHAENG_COLOR[ohaengChars[1]];
    if (!c0 || !c1) return null;
    const label0 = c0.label;
    const label1 = c1.label;
    const char0 = n1Han ? `${n1Han}(${n1Kor})` : n1Kor;
    const char1 = n2Han ? `${n2Han}(${n2Kor})` : n2Kor;
    return { char0, label0, char1, label1 };
  };

  const jawonDesc = buildJawonDesc();

  return (
    <div style={{ width: "100%" }}>

      {/* 종합 판정 */}
      <div style={card("#1D9E75")}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle label="종합 판정" />
          <Badge label={overall} style={RESULT_STYLE[overall] || { bg: "#F1EFE8", color: "#444441" }} />
        </div>
        <div style={{
          borderLeft: "3px solid #1D9E75", borderRadius: "0 8px 8px 0",
          padding: "12px 14px", fontSize: 15, color: "#1a1714",
          lineHeight: 1.8, background: "#f7faf8",
        }}>
          {comment}
        </div>
      </div>

      {/* 사주 기반 필요오행 */}
      {data.analysis.requiredOhaeng && (
        <div style={card("#534AB7")}>
          <SectionTitle label="사주 기반 필요오행" />
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            {[
              { rank: "1순위", oh: data.analysis.requiredOhaeng.primary },
              { rank: "2순위", oh: data.analysis.requiredOhaeng.secondary },
            ].map((item, idx) => {
              const c = OHAENG_COLOR[item.oh];
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  {idx === 1 && <span style={{ color: "#AFA9EC", fontSize: 18, flex: "0 0 auto" }}>→</span>}
                  <div style={{ flex: 1, background: c?.bg || "#EEEDFE", border: `1px solid ${c?.border || "#AFA9EC"}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: c?.text || "#534AB7", marginBottom: 5, fontWeight: 600, opacity: 0.75 }}>{item.rank}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: c?.text || "#2C2C2A" }}>
                      {c?.label || item.oh}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 자원오행 */}
      <div style={card("#BA7517")}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle label="자원오행(字源五行)" />
          {jawon.hasHanja && <Badge label={jawon.result} style={RESULT_STYLE[jawon.result]} />}
        </div>
        {!jawon.hasHanja ? (
          <div style={{ fontSize: 14, color: "#888780", background: "#faf9f6", borderRadius: 8, padding: "12px 14px" }}>
            한자를 입력하시면 자원오행을 분석합니다.
          </div>
        ) : jawonDesc ? (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {[
                { char: jawonDesc.char0, oh: ohaengChars[0] },
                { char: jawonDesc.char1, oh: ohaengChars[1] },
              ].map((item, idx) => {
                const c = OHAENG_COLOR[item.oh];
                if (!c) return null;
                return (
                  <div key={idx} style={{
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 10, padding: "10px 18px", textAlign: "center", minWidth: 90, flex: 1,
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 600, color: c.text, marginBottom: 6 }}>
                      {item.char}
                    </div>
                    <div style={{ fontSize: 14, color: c.text, fontWeight: 600 }}>{c.label}</div>
                  </div>
                );
              })}
            </div>
            <div style={{
              fontSize: 14, color: "#2C2C2A", background: "#fdfcf8",
              border: "0.5px solid #e0ddd6", borderRadius: 8, padding: "10px 14px", lineHeight: 1.7,
            }}>
              {jawon.detail}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 14, color: "#2C2C2A", background: "#fdfcf8", borderRadius: 8, padding: "10px 14px" }}>
            {jawon.detail}
          </div>
        )}
      </div>

      {/* 수리사격 4격 — 에메랄드 그라데이션 */}
      <div style={card("#185FA5")}>
        <SectionTitle label="수리사격(數理四格)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(["won", "hyeong", "i", "jeong"] as const).map((key) => {
            const grade = suri4[key];
            const meta = SURI4_META[key];
            const gs = GILHYUNG_STYLE[grade.gilhyung] || { bg: "#F1EFE8", color: "#444441" };
            const isDeep = key === "jeong";
            return (
              <div key={key} style={{
                background: meta.bg, border: `1px solid ${meta.border}`,
                borderRadius: 8, padding: "11px 13px",
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: meta.accent, marginBottom: 2 }}>{meta.name}</div>
                <div style={{ fontSize: 12, color: isDeep ? "#a8e8d0" : "#666660", marginBottom: 8 }}>{meta.sub}</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 500, color: meta.accent }}>{grade.number}</span>
                  <Badge label={grade.gilhyung} style={gs} />
                </div>
                <div style={{ fontSize: 14, color: isDeep ? "#e0f5ec" : "#1a1a18", lineHeight: 1.7 }}>{grade.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 불용문자 */}
      {bulmyong.hasBulmyong && (
        <div style={{
          background: "#FCEBEB", border: "1px solid #F7C1C1",
          borderLeft: "3px solid #A32D2D", borderRadius: "0 12px 12px 0",
          padding: "13px 16px", marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#791F1F", marginBottom: 6 }}>불용문자(不用文字) 포함</div>
          <div style={{ fontSize: 14, color: "#501313", marginBottom: 10 }}>이름에 사용을 피해야 할 한자가 포함되어 있습니다.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {bulmyong.chars.map((char, idx) => (
              <Badge key={idx} label={char} style={{ bg: "#F7C1C1", color: "#791F1F" }} />
            ))}
          </div>
        </div>
      )}

      {/* 인증번호 */}
      <div style={{
        background: "#EEEDFE", border: "0.5px solid #AFA9EC",
        borderRadius: 10, padding: "10px 16px", marginBottom: 12,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, color: "#3C3489", fontWeight: 500 }}>이름감정 인증번호</span>
        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#26215C", fontWeight: 500 }}>{data.certificateNumber}</span>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onPdfDownload}
          style={{ flex: 1, background: "#0F6E56", color: "#ffffff", border: "none", borderRadius: 8, padding: "14px 0", fontSize: 17, fontWeight: 700, cursor: "pointer" }}
        >
          PDF 저장
        </button>
        <button
          onClick={onShare}
          style={{ flex: 1, background: "#FEE500", color: "#3A1D1D", border: "none", borderRadius: 8, padding: "14px 0", fontSize: 17, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="12" cy="11" rx="10" ry="8.5" fill="#3A1D1D" opacity="0.85"/>
            <path d="M8 10.5C8 9.67 8.67 9 9.5 9S11 9.67 11 10.5 10.33 12 9.5 12 8 11.33 8 10.5z" fill="#FEE500"/>
            <path d="M13 10.5C13 9.67 13.67 9 14.5 9S16 9.67 16 10.5 15.33 12 14.5 12 13 11.33 13 10.5z" fill="#FEE500"/>
            <path d="M9 14c.8.8 2 1.2 3 1.2s2.2-.4 3-1.2" stroke="#FEE500" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M7 17.5c-.5 1.5-1.2 2.5-1.2 2.5l3.5-1.5" stroke="#3A1D1D" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
          </svg>
          공유하기
        </button>
      </div>

    </div>
  );
}
