import { Badge } from "@/components/ui/badge";
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
  onPdfDownload?: () => void;
  onShare?: () => void;
}

const OHAENG_COLOR: Record<string, { dot: string; text: string; label: string }> = {
  木: { dot: "#3B6D11", text: "#3B6D11", label: "목(木)" },
  火: { dot: "#A32D2D", text: "#A32D2D", label: "화(火)" },
  土: { dot: "#854F0B", text: "#854F0B", label: "토(土)" },
  金: { dot: "#5F5E5A", text: "#5F5E5A", label: "금(金)" },
  水: { dot: "#185FA5", text: "#185FA5", label: "수(水)" },
};

const GILHYUNG_STYLE: Record<string, { bg: string; color: string }> = {
  "吉":     { bg: "#EAF3DE", color: "#3B6D11" },
  "凶":     { bg: "#FCEBEB", color: "#A32D2D" },
  "半吉半凶": { bg: "#FAEEDA", color: "#854F0B" },
};

const RESULT_STYLE: Record<string, { bg: string; color: string }> = {
  "양호":     { bg: "#E1F5EE", color: "#0F6E56" },
  "우수":     { bg: "#E1F5EE", color: "#0F6E56" },
  "상생":     { bg: "#E1F5EE", color: "#0F6E56" },
  "중립":     { bg: "#FAEEDA", color: "#854F0B" },
  "보완 필요": { bg: "#FCEBEB", color: "#A32D2D" },
  "재검토 필요":{ bg: "#FCEBEB", color: "#A32D2D" },
  "한자 미입력":{ bg: "#F1EFE8", color: "#5F5E5A" },
};

const OVERALL_STYLE: Record<string, { bg: string; color: string }> = {
  "최상": { bg: "#EAF3DE", color: "#3B6D11" },
  "양호": { bg: "#E1F5EE", color: "#0F6E56" },
  "보통": { bg: "#FAEEDA", color: "#854F0B" },
  "보완필요": { bg: "#FCEBEB", color: "#A32D2D" },
};

const SURI4_META = {
  won:    { name: "원격(元格)", sub: "가운데 글자 · 어린 시절·내면" },
  hyeong: { name: "형격(亨格)", sub: "끝 글자 · 청장년·사회활동" },
  i:      { name: "이격(利格)", sub: "성+가운데 · 가정·대인관계" },
  jeong:  { name: "정격(貞格)", sub: "전체 이름 · 평생 총괄 운세" },
};

const card: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "0.5px solid var(--border)",
  borderRadius: 12,
  padding: "14px 16px",
  marginBottom: 10,
};

const cardTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  marginBottom: 10,
};

function SmallBadge({ label, style }: { label: string; style?: { bg: string; color: string } }) {
  const s = style || { bg: "#F1EFE8", color: "#5F5E5A" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, padding: "2px 8px",
      borderRadius: 99, background: s.bg, color: s.color,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function OhaengChip({ oh }: { oh: string }) {
  const c = OHAENG_COLOR[oh];
  if (!c) return <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{oh}</span>;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6,
      background: "var(--surface-1)", border: "0.5px solid var(--border)",
      borderRadius: 8, padding: "7px 12px" }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{c.label}</span>
    </span>
  );
}

export function FreeReadingResult({ data, onPdfDownload, onShare }: FreeReadingResultProps) {
  const { jawon, suri4, bulmyong, overall, comment } = data.analysis;
  const ohaengChars = jawon.ohaeng ? jawon.ohaeng.split("") : [];
  const overallStyle = OVERALL_STYLE[overall] || RESULT_STYLE[overall] || { bg: "#F1EFE8", color: "#5F5E5A" };

  return (
    <div style={{ width: "100%" }}>

      {/* 종합 판정 */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={cardTitle}>종합 판정</span>
          <SmallBadge label={overall} style={overallStyle} />
        </div>
        <div style={{
          borderLeft: "3px solid #1D9E75", borderRadius: "0 8px 8px 0",
          padding: "11px 13px", fontSize: 14, color: "var(--text-primary)",
          lineHeight: 1.75, background: "var(--surface-1)",
        }}>
          {comment}
        </div>
      </div>

      {/* 사주 기반 필요오행 */}
      {data.analysis.requiredOhaeng && (
        <div style={card}>
          <div style={cardTitle}>사주 기반 필요오행</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, background: "var(--surface-1)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "9px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>1순위</div>
              <div style={{ fontSize: 17, fontWeight: 500, color: OHAENG_COLOR[data.analysis.requiredOhaeng.primary]?.text || "var(--text-primary)" }}>
                {OHAENG_COLOR[data.analysis.requiredOhaeng.primary]?.label || data.analysis.requiredOhaeng.primary}
              </div>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 16 }}>→</span>
            <div style={{ flex: 1, background: "var(--surface-1)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "9px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>2순위</div>
              <div style={{ fontSize: 17, fontWeight: 500, color: OHAENG_COLOR[data.analysis.requiredOhaeng.secondary]?.text || "var(--text-primary)" }}>
                {OHAENG_COLOR[data.analysis.requiredOhaeng.secondary]?.label || data.analysis.requiredOhaeng.secondary}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 자원오행 */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={cardTitle}>자원오행(字源五行)</span>
          {jawon.hasHanja && <SmallBadge label={jawon.result} style={RESULT_STYLE[jawon.result]} />}
        </div>
        {!jawon.hasHanja ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", background: "var(--surface-1)", borderRadius: 8, padding: "10px 12px" }}>
            한자를 입력하시면 자원오행을 분석합니다.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {ohaengChars.map((oh, idx) => (
                <OhaengChip key={idx} oh={oh} />
              ))}
            </div>
            {jawon.detail && (
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, padding: "9px 12px", background: "var(--surface-1)", borderRadius: 8, lineHeight: 1.6 }}>
                {jawon.detail}
              </div>
            )}
          </>
        )}
      </div>

      {/* 수리사격 4격 */}
      <div style={card}>
        <div style={cardTitle}>수리사격(數理四格)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(["won", "hyeong", "i", "jeong"] as const).map((key) => {
            const grade = suri4[key];
            const meta = SURI4_META[key];
            const gs = GILHYUNG_STYLE[grade.gilhyung] || { bg: "#F1EFE8", color: "#5F5E5A" };
            return (
              <div key={key} style={{
                background: "var(--surface-1)", border: "0.5px solid var(--border)",
                borderRadius: 8, padding: "10px 12px",
              }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{meta.name}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6 }}>{meta.sub}</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 500, color: "var(--text-primary)" }}>{grade.number}</span>
                  <SmallBadge label={grade.gilhyung} style={gs} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>{grade.description}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 불용문자 */}
      {bulmyong.hasBulmyong && (
        <div style={{ ...card, borderLeft: "3px solid #A32D2D", borderRadius: "0 12px 12px 0" }}>
          <div style={{ ...cardTitle, color: "#A32D2D" }}>불용문자(不用文字) 포함</div>
          <div style={{ fontSize: 13, color: "#A32D2D", marginBottom: 8 }}>이름에 사용을 피해야 할 한자가 포함되어 있습니다.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {bulmyong.chars.map((char, idx) => (
              <SmallBadge key={idx} label={char} style={{ bg: "#FCEBEB", color: "#A32D2D" }} />
            ))}
          </div>
        </div>
      )}

      {/* 인증번호 */}
      <div style={{ ...card, padding: "9px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>이름감정 인증번호</span>
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{data.certificateNumber}</span>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 10 }}>
        <Button onClick={onPdfDownload} style={{ flex: 1, background: "#0F6E56", color: "#fff", border: "none" }}>
          PDF 저장
        </Button>
        <Button onClick={onShare} variant="outline" style={{ flex: 1 }}>
          공유하기
        </Button>
      </div>

    </div>
  );
}
