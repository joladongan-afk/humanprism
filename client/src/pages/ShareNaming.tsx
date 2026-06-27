import { useParams } from "wouter";
import { trpc } from "@/_core/trpc";

const OHAENG_COLOR: Record<string, { bg: string; text: string; border: string; label: string }> = {
  木: { bg: "#dceeff", text: "#0d3d6e", border: "#8ec5f7", label: "목(木)" },
  火: { bg: "#FCEBEB", text: "#791F1F", border: "#F7C1C1", label: "화(火)" },
  土: { bg: "#fff3c0", text: "#5a4000", border: "#f0c93a", label: "토(土)" },
  金: { bg: "#e8e8e0", text: "#333330", border: "#aaaaaa", label: "금(金)" },
  水: { bg: "#0a0a1a", text: "#ffffff", border: "#334488", label: "수(水)" },
};

const GILHYUNG_STYLE: Record<string, { bg: string; color: string }> = {
  "吉":       { bg: "#EAF3DE", color: "#27500A" },
  "凶":       { bg: "#FCEBEB", color: "#791F1F" },
  "半吉半凶": { bg: "#FAEEDA", color: "#633806" },
};

const SURI4_META = {
  won:    { name: "원격(元格)", bg: "#e8faf5", border: "#b2e8d6", accent: "#1a7a5e" },
  hyeong: { name: "형격(亨格)", bg: "#c8f0e0", border: "#7dd4b4", accent: "#159070" },
  i:      { name: "이격(利格)", bg: "#8edec0", border: "#4db896", accent: "#0d7a5a" },
  jeong:  { name: "정격(貞格)", bg: "#0d6b4a", border: "#0a5038", accent: "#ffffff" },
};

export default function SharePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const { data, isLoading, error } = trpc.naming.getShareResult.useQuery(
    { certificateNumber: token },
    { enabled: !!token }
  );

  if (isLoading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8f4" }}>
      <p style={{ color: "#666", fontSize: 16 }}>결과를 불러오는 중...</p>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#faf8f4", gap: 16 }}>
      <p style={{ color: "#991f1f", fontSize: 16 }}>결과를 찾을 수 없습니다.</p>
      <p style={{ color: "#888", fontSize: 14 }}>링크가 만료됐거나 잘못된 주소입니다. (30일 후 자동 삭제)</p>
      <a href="/naming/new" style={{ marginTop: 8, padding: "10px 24px", background: "#0F6E56", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
        내 이름도 감정받기
      </a>
    </div>
  );

  const fullName = `${data.surnameKorean || ""}${data.name1Korean || ""}${data.name2Korean || ""}`;
  const fullHanja = `${data.surnameHanja || ""}${data.name1Hanja || ""}${data.name2Hanja || ""}`;
  const { analysis } = data;
  const ohaengChars = analysis.jawon.ohaeng ? analysis.jawon.ohaeng.split("") : [];

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f4", padding: "0 0 40px" }}>
      {/* 상단 헤더 */}
      <div style={{ background: "linear-gradient(135deg, #0d0d1f 0%, #0f3460 100%)", padding: "24px 20px 28px", textAlign: "center" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontSize: 13, color: "#c9a84c", letterSpacing: "0.3em", marginBottom: 8 }}>HUMAN PRISM</div>
        </a>
        <div style={{ fontSize: 36, fontWeight: 700, color: "#f0d080", letterSpacing: "0.2em", textShadow: "0 0 16px rgba(240,208,128,0.5)" }}>
          {fullName}
        </div>
        {fullHanja && (
          <div style={{ fontSize: 18, color: "#c9a84c", letterSpacing: "0.25em", marginTop: 6 }}>{fullHanja}</div>
        )}
        <div style={{ fontSize: 12, color: "#6688aa", marginTop: 12, letterSpacing: "0.1em" }}>
          이름감정 인증번호 · {data.certificateNumber}
        </div>
      </div>

      {/* 결과 본문 */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* 종합 판정 */}
        <div style={{ background: "#fff", border: "0.5px solid #e0ddd6", borderTop: "3px solid #1D9E75", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0d6b4a", marginBottom: 10 }}>종합 판정</div>
          <div style={{ borderLeft: "3px solid #1D9E75", padding: "10px 14px", fontSize: 15, color: "#1a1714", lineHeight: 1.8, background: "#f7faf8", borderRadius: "0 8px 8px 0" }}>
            {analysis.comment}
          </div>
        </div>

        {/* 필요오행 */}
        {analysis.requiredOhaeng?.primary && (
          <div style={{ background: "#fff", border: "0.5px solid #e0ddd6", borderTop: "3px solid #534AB7", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0d6b4a", marginBottom: 10 }}>사주 기반 필요오행</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ rank: "1순위", oh: analysis.requiredOhaeng.primary }, { rank: "2순위", oh: analysis.requiredOhaeng.secondary }].map((item, idx) => {
                const c = OHAENG_COLOR[item.oh];
                if (!c) return null;
                return (
                  <div key={idx} style={{ flex: 1, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: c.text, marginBottom: 4, opacity: 0.7 }}>{item.rank}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: c.text }}>{c.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 자원오행 */}
        {analysis.jawon.hasHanja && ohaengChars.length >= 2 && (
          <div style={{ background: "#fff", border: "0.5px solid #e0ddd6", borderTop: "3px solid #BA7517", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0d6b4a", marginBottom: 10 }}>자원오행(字源五行)</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[
                { char: `${data.name1Hanja || data.name1Korean}(${data.name1Korean})`, oh: ohaengChars[0] },
                { char: `${data.name2Hanja || data.name2Korean}(${data.name2Korean})`, oh: ohaengChars[1] },
              ].map((item, idx) => {
                const c = OHAENG_COLOR[item.oh];
                if (!c) return null;
                return (
                  <div key={idx} style={{ flex: 1, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "10px 16px", textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: c.text, marginBottom: 4 }}>{item.char}</div>
                    <div style={{ fontSize: 13, color: c.text, fontWeight: 600 }}>{c.label}</div>
                  </div>
                );
              })}
            </div>
            {analysis.jawon.detail && (
              <div style={{ fontSize: 14, color: "#2C2C2A", background: "#fdfcf8", border: "0.5px solid #e0ddd6", borderRadius: 8, padding: "10px 14px", lineHeight: 1.7 }}>
                {analysis.jawon.detail}
              </div>
            )}
          </div>
        )}

        {/* 수리사격 */}
        {analysis.suri4 && (
          <div style={{ background: "#fff", border: "0.5px solid #e0ddd6", borderTop: "3px solid #185FA5", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#0d6b4a", marginBottom: 12 }}>수리사격(數理四格)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["won", "hyeong", "i", "jeong"] as const).map((key) => {
                const grade = (analysis.suri4 as any)[key];
                const meta = SURI4_META[key];
                const gs = GILHYUNG_STYLE[grade?.gilhyung] || { bg: "#F1EFE8", color: "#444441" };
                const isDeep = key === "jeong";
                if (!grade) return null;
                return (
                  <div key={key} style={{ background: meta.bg, border: `1px solid ${meta.border}`, borderRadius: 8, padding: "11px 13px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: meta.accent, marginBottom: 6 }}>{meta.name}</div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 26, fontWeight: 600, color: meta.accent }}>{grade.number}</span>
                      <span style={{ fontSize: 12, fontWeight: 500, padding: "3px 8px", borderRadius: 99, background: gs.bg, color: gs.color }}>{grade.gilhyung}</span>
                    </div>
                    <div style={{ fontSize: 13, color: isDeep ? "#e0f5ec" : "#1a1a18", lineHeight: 1.65 }}>{grade.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 하단 CTA */}
        <div style={{ background: "linear-gradient(135deg, #0d0d1f 0%, #0f3460 100%)", borderRadius: 16, padding: "24px 20px", textAlign: "center", border: "2px solid #c9a84c" }}>
          <div style={{ fontSize: 14, color: "#c9a84c", marginBottom: 8, letterSpacing: "0.1em" }}>30년 명리학 전문가의 AI 사주상담</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f0d080", marginBottom: 16 }}>내 이름도 감정받기</div>
          <a href="/naming/new" style={{ display: "inline-block", padding: "12px 32px", background: "#c9a84c", color: "#0d0d1f", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 16 }}>
            무료 이름감정 받기
          </a>
          <div style={{ fontSize: 12, color: "#6688aa", marginTop: 12 }}>human-prism.com</div>
        </div>
      </div>
    </div>
  );
}
