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
        hanja?: string;
        nameKor?: string;
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
  inputName?: string;
  inputHanja?: string;
  onPdfDownload?: () => void;
  onShare?: () => void;
}

const OHAENG_COLOR: Record<string, { dot: string; text: string; bg: string; label: string }> = {
  木: { dot: "#3B6D11", text: "#3B6D11", bg: "#EAF3DE", label: "목(木)" },
  火: { dot: "#A32D2D", text: "#A32D2D", bg: "#FCEBEB", label: "화(火)" },
  土: { dot: "#854F0B", text: "#854F0B", bg: "#FAEEDA", label: "토(土)" },
  金: { dot: "#5F5E5A", text: "#444441", bg: "#F1EFE8", label: "금(金)" },
  水: { dot: "#185FA5", text: "#185FA5", bg: "#E6F1FB", label: "수(水)" },
};

const GILHYUNG_STYLE: Record<string, { bg: string; color: string }> = {
  "吉":      { bg: "#EAF3DE", color: "#3B6D11" },
  "凶":      { bg: "#FCEBEB", color: "#A32D2D" },
  "半吉半凶": { bg: "#FAEEDA", color: "#854F0B" },
};

const RESULT_STYLE: Record<string, { bg: string; color: string }> = {
  "양호":      { bg: "#E1F5EE", color: "#0F6E56" },
  "우수":      { bg: "#E1F5EE", color: "#0F6E56" },
  "상생":      { bg: "#E1F5EE", color: "#0F6E56" },
  "중립":      { bg: "#FAEEDA", color: "#854F0B" },
  "보완 필요":  { bg: "#FCEBEB", color: "#A32D2D" },
  "재검토 필요":{ bg: "#FCEBEB", color: "#A32D2D" },
  "한자 미입력":{ bg: "#F1EFE8", color: "#5F5E5A" },
};

const SURI4_META = {
  won:    { name: "원격(元格)", sub: "가운데 글자 · 어린 시절·내면", accent: "#185FA5", bg: "#E6F1FB" },
  hyeong: { name: "형격(亨格)", sub: "끝 글자 · 청장년·사회활동",  accent: "#0F6E56", bg: "#E1F5EE" },
  i:      { name: "이격(利格)", sub: "성+가운데 · 가정·대인관계", accent: "#854F0B", bg: "#FAEEDA" },
  jeong:  { name: "정격(貞格)", sub: "전체 이름 · 평생 총괄 운세", accent: "#533AB7", bg: "#EEEDFE" },
};

function Badge({ label, style }: { label: string; style?: { bg: string; color: string } }) {
  const s = style || { bg: "#F1EFE8", color: "#5F5E5A" };
  return (
    <span style={{ fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 99, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function SectionCard({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--surface-2)",
      border: `0.5px solid var(--border)`,
      borderTop: `3px solid ${accent}`,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 12 }}>
      {label}
    </div>
  );
}

export function FreeReadingResult({ data, inputName, inputHanja, onPdfDownload, onShare }: FreeReadingResultProps) {
  const { jawon, suri4, bulmyong, overall, comment } = data.analysis;
  const ohaengChars = jawon.ohaeng ? jawon.ohaeng.split("") : [];

  // 한자 + 한글 이름 분리 (예: "源석" → ["源","석"] / inputHanja="源錫" inputName="원석")
  const hanjaArr = inputHanja ? inputHanja.split("") : [];
  const nameArr = inputName ? inputName.replace(/\s/g, "").split("") : [];

  return (
    <div style={{ width: "100%" }}>

      {/* 종합 판정 */}
      <SectionCard accent="#1D9E75">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle label="종합 판정" />
          <Badge label={overall} style={RESULT_STYLE[overall] || { bg: "#F1EFE8", color: "#5F5E5A" }} />
        </div>
        <div style={{
          borderLeft: "3px solid #1D9E75", borderRadius: "0 8px 8px 0",
          padding: "12px 14px", fontSize: 15, color: "var(--text-primary)",
          lineHeight: 1.8, background: "var(--surface-1)",
        }}>
          {comment}
        </div>
      </SectionCard>

      {/* 사주 기반 필요오행 */}
      {data.analysis.requiredOhaeng && (
        <SectionCard accent="#534AB7">
          <SectionTitle label="사주 기반 필요오행" />
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <div style={{ flex: 1, background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#534AB7", marginBottom: 6 }}>1순위</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: OHAENG_COLOR[data.analysis.requiredOhaeng.primary]?.text || "var(--text-primary)" }}>
                {OHAENG_COLOR[data.analysis.requiredOhaeng.primary]?.label || data.analysis.requiredOhaeng.primary}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", color: "#AFA9EC", fontSize: 20 }}>→</div>
            <div style={{ flex: 1, background: "#EEEDFE", border: "0.5px solid #AFA9EC", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#534AB7", marginBottom: 6 }}>2순위</div>
              <div style={{ fontSize: 20, fontWeight: 500, color: OHAENG_COLOR[data.analysis.requiredOhaeng.secondary]?.text || "var(--text-primary)" }}>
                {OHAENG_COLOR[data.analysis.requiredOhaeng.secondary]?.label || data.analysis.requiredOhaeng.secondary}
              </div>
            </div>
          </div>
        </SectionCard>
      )}

      {/* 자원오행 */}
      <SectionCard accent="#BA7517">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <SectionTitle label="자원오행(字源五行)" />
          {jawon.hasHanja && <Badge label={jawon.result} style={RESULT_STYLE[jawon.result]} />}
        </div>
        {!jawon.hasHanja ? (
          <div style={{ fontSize: 14, color: "var(--text-muted)", background: "var(--surface-1)", borderRadius: 8, padding: "12px 14px" }}>
            한자를 입력하시면 자원오행을 분석합니다.
          </div>
        ) : (
          <>
            {/* 글자별 오행 표시 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              {ohaengChars.map((oh, idx) => {
                const c = OHAENG_COLOR[oh] || { dot: "#888", text: "#444", bg: "#eee", label: oh };
                const hanja = hanjaArr[idx] || "";
                const kor = nameArr[idx] || "";
                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      background: c.bg, border: `0.5px solid ${c.dot}`,
                      borderRadius: 10, padding: "10px 16px", textAlign: "center", minWidth: 80,
                    }}>
                      {hanja && (
                        <div style={{ fontSize: 22, fontWeight: 500, color: c.text, lineHeight: 1.2 }}>
                          {hanja}<span style={{ fontSize: 14, color: "var(--text-muted)", marginLeft: 3 }}>({kor})</span>
                        </div>
                      )}
                      <div style={{ fontSize: 13, color: c.text, marginTop: hanja ? 4 : 0, fontWeight: 500 }}>
                        {c.label}
                      </div>
                    </div>
                  </div>
                );
              })}
              {ohaengChars.length >= 2 && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", background: "var(--surface-1)", border: "0.5px solid var(--border)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.6 }}>
                  {jawon.detail || `${OHAENG_COLOR[ohaengChars[0]]?.label || ohaengChars[0]} ↔ ${OHAENG_COLOR[ohaengChars[1]]?.label || ohaengChars[1]}`}
                </div>
              )}
            </div>
          </>
        )}
      </SectionCard>

      {/* 수리사격 4격 */}
      <SectionCard accent="#185FA5">
        <SectionTitle label="수리사격(數理四格)" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(["won", "hyeong", "i", "jeong"] as const).map((key) => {
            const grade = suri4[key];
            const meta = SURI4_META[key];
            const gs = GILHYUNG_STYLE[grade.gilhyung] || { bg: "#F1EFE8", color: "#5F5E5A" };
            return (
              <div key={key} style={{
                background: meta.bg, border: `0.5px solid ${meta.accent}33`,
                borderRadius: 8, padding: "11px 13px",
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: meta.accent, marginBottom: 1 }}>{meta.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{meta.sub}</div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 500, color: meta.accent }}>{grade.number}</span>
                  <Badge label={grade.gilhyung} style={gs} />
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>{grade.description}</div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* 불용문자 */}
      {bulmyong.hasBulmyong && (
        <div style={{
          background: "#FCEBEB", border: "0.5px solid #F09595",
          borderLeft: "3px solid #A32D2D", borderRadius: "0 12px 12px 0",
          padding: "13px 16px", marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#A32D2D", marginBottom: 6 }}>불용문자(不用文字) 포함</div>
          <div style={{ fontSize: 14, color: "#791F1F", marginBottom: 10 }}>이름에 사용을 피해야 할 한자가 포함되어 있습니다.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {bulmyong.chars.map((char, idx) => (
              <Badge key={idx} label={char} style={{ bg: "#FCEBEB", color: "#A32D2D" }} />
            ))}
          </div>
        </div>
      )}

      {/* 인증번호 */}
      <div style={{
        background: "var(--surface-1)", border: "0.5px solid var(--border)",
        borderRadius: 10, padding: "9px 16px", marginBottom: 12,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>이름감정 인증번호</span>
        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{data.certificateNumber}</span>
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
