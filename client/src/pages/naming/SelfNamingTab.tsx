import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import LoginDialog from "@/components/LoginDialog";
import DepositRequestDialog from "@/components/DepositRequestDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Lock } from "lucide-react";

// ─── 상수 ──────────────────────────────────────────────────

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const HOUR_BRANCHES = [
  { value: "0", label: "자시 (23:00 ~ 00:59)" },
  { value: "2", label: "축시 (01:00 ~ 02:59)" },
  { value: "4", label: "인시 (03:00 ~ 04:59)" },
  { value: "6", label: "묘시 (05:00 ~ 06:59)" },
  { value: "8", label: "진시 (07:00 ~ 08:59)" },
  { value: "10", label: "사시 (09:00 ~ 10:59)" },
  { value: "12", label: "오시 (11:00 ~ 12:59)" },
  { value: "14", label: "미시 (13:00 ~ 14:59)" },
  { value: "16", label: "신시 (15:00 ~ 16:59)" },
  { value: "18", label: "유시 (17:00 ~ 18:59)" },
  { value: "20", label: "술시 (19:00 ~ 20:59)" },
  { value: "22", label: "해시 (21:00 ~ 22:59)" },
  { value: "unknown", label: "시간을 모릅니다" },
];

const MODE_OPTIONS: { value: "A" | "B" | "C" | "D"; label: string; desc: string; bg: string; selectedBg: string }[] = [
  {
    value: "A", label: "완전 자동", desc: "이름 두 글자 모두 알아서 지어드립니다",
    bg: "linear-gradient(160deg, #FBF6EA 0%, #F4EDDB 100%)",
    selectedBg: "linear-gradient(160deg, #F4EDDB 0%, #E9DCB8 100%)",
  },
  {
    value: "B", label: "앞글자 지정", desc: "이름 첫 글자를 정하면 둘째 글자를 찾아드립니다",
    bg: "linear-gradient(160deg, #F6EED8 0%, #EBDCB0 100%)",
    selectedBg: "linear-gradient(160deg, #EBDCB0 0%, #DCC788 100%)",
  },
  {
    value: "C", label: "뒷글자 지정", desc: "이름 둘째 글자를 정하면 첫 글자를 찾아드립니다",
    bg: "linear-gradient(160deg, #EFDDAF 0%, #DFC585 100%)",
    selectedBg: "linear-gradient(160deg, #DFC585 0%, #CBA95C 100%)",
  },
  {
    value: "D", label: "셀프 한글이름 >>> 한자 추천", desc: "원하시는 한글 이름에 맞는 한자를 찾아드립니다",
    bg: "linear-gradient(160deg, #241a08 0%, #3b2a0d 100%)",
    selectedBg: "linear-gradient(160deg, #3b2a0d 0%, #4f3810 100%)",
  },
];

const OHAENG_COLOR: Record<string, string> = {
  木: "text-green-600", 火: "text-red-500",
  土: "text-yellow-600", 金: "text-gray-500", 水: "text-blue-500",
};
const OHAENG_BG: Record<string, string> = {
  木: "bg-green-50 border-green-200", 火: "bg-red-50 border-red-200",
  土: "bg-yellow-50 border-yellow-200", 金: "bg-gray-50 border-gray-200", 水: "bg-blue-50 border-blue-200",
};
const GILHYUNG_STYLE: Record<string, string> = {
  大吉: "bg-[color-mix(in_oklch,var(--gold)_22%,transparent)] text-[var(--gold)] font-bold border-[var(--gold)]",
  吉: "bg-emerald-50 text-emerald-700 border-emerald-300",
  半吉半凶: "bg-gray-100 text-gray-500 border-gray-300",
};

// ─── 한자 선택 입력 ─────────────────────────────────────────

interface HanjaCandidate {
  char: string;
  huneum: string;
  ohaeng: string;
  strokes: number;
}

function HanjaInput({
  value, onChange, koreanChar, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  koreanChar: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const searchQuery = trpc.naming.searchHanja.useQuery(
    { sound: koreanChar },
    { enabled: !!koreanChar && koreanChar.length === 1 }
  );
  const candidates: HanjaCandidate[] = searchQuery.data || [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (koreanChar && koreanChar.length === 1 && candidates.length > 0) setOpen(true);
  }, [koreanChar, candidates.length]);

  return (
    <div className="relative" ref={ref}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "한자"}
          className="flex-1 text-lg font-semibold h-12"
        />
        {koreanChar && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all ${
              open
                ? "bg-emerald-700 text-white border-emerald-700"
                : "bg-emerald-50 text-emerald-700 border-emerald-400 hover:bg-emerald-100 animate-pulse"
            }`}
          >
            한자 후보 {candidates.length > 0 ? `(${candidates.length})` : ""}
          </button>
        )}
      </div>
      {open && candidates.length > 0 && (
        <div
          className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 bg-white border-2 border-emerald-300 rounded-2xl shadow-2xl overflow-y-auto"
          style={{ width: "min(92vw, 480px)", maxHeight: "26rem" }}
        >
          <div className="p-3 text-sm text-gray-600 border-b bg-emerald-50 sticky top-0">
            &quot;{koreanChar}&quot; 독음 한자 {candidates.length}개 — 클릭하면 선택됩니다
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {candidates.map((c) => (
              <button key={c.char} type="button"
                onClick={() => { onChange(c.char); setOpen(false); }}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all hover:shadow-lg hover:scale-105 ${OHAENG_BG[c.ohaeng] || "bg-gray-50 border-gray-200"}`}>
                <span className="text-5xl font-bold text-gray-800 leading-tight">{c.char}</span>
                <span className="text-sm text-gray-500 truncate w-full text-center leading-tight mt-1.5">{c.huneum}</span>
                <span className={`text-sm font-bold mt-1 ${OHAENG_COLOR[c.ohaeng] || ""}`}>{c.ohaeng}({c.strokes}획)</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 결과 카드 ────────────────────────────────────────────

interface CandidateResult {
  name1Hanja: string;
  name2Hanja: string;
  name1Korean: string;
  name2Korean: string;
  suri4: { won: number; hyeong: number; i: number; jeong: number };
  suri4Judgment: { won: string; hyeong: string; i: string; jeong: string };
  jawonOhaeng: string[];
  matchingScore: number;
}

function ResultCard({ surnameKorean, surnameHanja, candidate }: {
  surnameKorean: string; surnameHanja: string; candidate: CandidateResult;
}) {
  const isTop = candidate.matchingScore >= 100;
  const gyeokList: { label: string; strokes: number; judgment: string }[] = [
    { label: "원격", strokes: candidate.suri4.won, judgment: candidate.suri4Judgment.won },
    { label: "형격", strokes: candidate.suri4.hyeong, judgment: candidate.suri4Judgment.hyeong },
    { label: "이격", strokes: candidate.suri4.i, judgment: candidate.suri4Judgment.i },
    { label: "정격", strokes: candidate.suri4.jeong, judgment: candidate.suri4Judgment.jeong },
  ];

  return (
    <div className={`hanji-card p-6 relative ${isTop ? "ring-2 ring-[var(--gold)]" : ""}`}>
      {isTop && (
        <span className="absolute -top-3 right-5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--gold)] text-white tracking-wide shadow-md">
          최상위 매칭
        </span>
      )}
      <div className="text-center mb-4">
        <div className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {surnameKorean}{candidate.name1Korean}{candidate.name2Korean}
        </div>
        <div className="hanja-display text-2xl mt-1 font-bold">
          {surnameHanja}{candidate.name1Hanja}{candidate.name2Hanja}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {gyeokList.map((g) => (
          <div key={g.label} className={`text-center rounded-lg border-2 px-1.5 py-2 ${GILHYUNG_STYLE[g.judgment] || "bg-gray-50 border-gray-200"}`}>
            <div className="text-[11px] font-semibold opacity-70">{g.label}</div>
            <div className="text-sm font-extrabold">{g.strokes}획</div>
            <div className="text-[11px] font-bold">{g.judgment}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        {candidate.jawonOhaeng.map((o, i) => (
          <span key={i} className={`text-sm font-extrabold px-2.5 py-1 rounded-full border-2 ${OHAENG_BG[o] || ""} ${OHAENG_COLOR[o] || ""}`}>
            {o}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────

export function SelfNamingTab() {
  const { isAuthenticated } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [paid, setPaid] = useState(false);

  const [surnameKorean, setSurnameKorean] = useState("");
  const [surnameHanja, setSurnameHanja] = useState("");
  const [mode, setMode] = useState<"A" | "B" | "C" | "D">("A");
  const [specifiedKorean, setSpecifiedKorean] = useState("");
  const [specifiedHanja, setSpecifiedHanja] = useState("");
  const [koreanNameCandidatesText, setKoreanNameCandidatesText] = useState("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [birthMonth, setBirthMonth] = useState<string>("");
  const [birthDay, setBirthDay] = useState<string>("");
  const [birthHour, setBirthHour] = useState<string>("");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");

  const [page, setPage] = useState(1);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const mutation = trpc.naming.selfNaming.useMutation();

  const koreanNameCandidates = koreanNameCandidatesText
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length === 2);

  const canSubmit =
    surnameKorean.trim().length > 0 &&
    surnameHanja.trim().length > 0 &&
    birthYear && birthMonth && birthDay &&
    (mode === "A" || (mode === "D" && koreanNameCandidates.length > 0) || ((mode === "B" || mode === "C") && specifiedHanja.trim().length > 0));

  function runSearch(targetPage: number, append: boolean) {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    if (!paid) {
      setDepositOpen(true);
      return;
    }
    if (!canSubmit) {
      const extra = mode === "D" ? ", 원하시는 한글 이름" : (mode !== "A" ? ", 지정 글자" : "");
      toast.error("성씨 한자, 생년월일" + extra + "를 모두 입력해주세요");
      return;
    }

    mutation.mutate(
      {
        surnameKorean: surnameKorean.trim(),
        surnameHanja: surnameHanja.trim(),
        mode,
        specifiedHanja: (mode === "B" || mode === "C") ? specifiedHanja.trim() : undefined,
        koreanNameCandidates: mode === "D" ? koreanNameCandidates : undefined,
        birthYear: Number(birthYear),
        birthMonth: Number(birthMonth),
        birthDay: Number(birthDay),
        birthHour: birthHour && birthHour !== "unknown" ? Number(birthHour) : undefined,
        calendarType,
        page: targetPage,
      },
      {
        onSuccess: (data) => {
          setResults((prev) => (append ? [...prev, ...data.candidates] : data.candidates));
          setTotalCount(data.totalCount);
          setHasMore(data.hasMore);
          setPage(targetPage);
          setHasSearched(true);
          if (data.candidates.length === 0 && !append) {
            toast.error("조건에 맞는 이름을 찾지 못했습니다. 다른 글자로 다시 시도해보세요.");
          }
        },
        onError: (err) => {
          toast.error(err.message || "이름을 만드는 중 오류가 발생했습니다");
        },
      }
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      {/* 입력 폼 */}
      <div
        className="hanji-card p-8 md:p-10 space-y-9 relative"
        style={{
          border: "3px solid var(--gold)",
          boxShadow: "0 0 0 1px rgba(212,160,23,0.25), 0 20px 50px -12px rgba(59,42,13,0.35), inset 0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[11px] font-bold tracking-widest text-white" style={{ background: "var(--gold)" }}>
          PREMIUM SERVICE
        </div>
        <div className="text-center">
          <h2 className="hanja-display text-4xl md:text-5xl font-extrabold">셀프 작명</h2>
          <div className="gold-divider w-32 mx-auto mt-4" />
          <p className="text-base md:text-lg text-muted-foreground mt-4 font-medium">
            성씨와 생년월일시만 입력하시면, 수리사격·복덕오행에 맞는 이름을 찾아드립니다.
          </p>
          <p className="text-sm font-bold text-[var(--gold)] mt-2">1회 이용권 50,000원</p>
        </div>

        {!paid && (
          <div className="flex flex-col items-center justify-center gap-3 py-6 border-2 border-dashed border-[var(--gold)]/50 rounded-xl bg-[color-mix(in_oklch,var(--gold)_6%,transparent)]">
            <Lock className="w-7 h-7 text-[var(--gold)]" />
            <p className="text-base font-semibold text-gray-700 text-center px-4">
              결제 후 조건을 입력하시면, 바로 이름을 만들어드립니다.
            </p>
            <Button size="lg" className="h-12 px-8 text-base font-bold" onClick={() => (isAuthenticated ? setDepositOpen(true) : setLoginOpen(true))}>
              50,000원 결제하고 시작하기
            </Button>
          </div>
        )}

        <div className={!paid ? "opacity-40 pointer-events-none select-none" : ""}>
          {/* 성씨 */}
          <div>
            <label className="text-base font-bold text-gray-800 mb-2.5 block">성씨</label>
            <div className="grid grid-cols-2 gap-4">
              <Input
                value={surnameKorean}
                onChange={(e) => setSurnameKorean(e.target.value.slice(0, 2))}
                placeholder="예: 김"
                className="text-lg font-semibold h-12"
              />
              <HanjaInput
                value={surnameHanja}
                onChange={setSurnameHanja}
                koreanChar={surnameKorean.slice(0, 1)}
                placeholder="한자 선택"
              />
            </div>
          </div>

          {/* 모드 선택 */}
          <div className="mt-7">
            <label className="text-base font-bold text-gray-800 mb-2.5 block">셀프 작명 방식</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MODE_OPTIONS.map((opt) => {
                const isDark = opt.value === "D";
                const isSelected = mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMode(opt.value)}
                    style={{
                      background: isSelected ? opt.selectedBg : opt.bg,
                      borderColor: isSelected ? "var(--gold)" : "transparent",
                    }}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected ? "shadow-lg scale-[1.02]" : "hover:shadow-md"
                    }`}
                  >
                    <div className={`font-extrabold text-base ${isDark ? "text-[var(--gold-soft,#F4D98A)]" : "text-gray-900"}`}>
                      {opt.label}
                    </div>
                    <div className={`text-sm mt-1 leading-snug ${isDark ? "text-amber-50/75" : "text-gray-600"}`}>
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {(mode === "B" || mode === "C") && (
              <div className="mt-4">
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  {mode === "B" ? "이름 첫 글자" : "이름 둘째 글자"}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    value={specifiedKorean}
                    onChange={(e) => setSpecifiedKorean(e.target.value.slice(0, 1))}
                    placeholder="한글 입력"
                    className="text-lg font-semibold h-12"
                  />
                  <HanjaInput
                    value={specifiedHanja}
                    onChange={setSpecifiedHanja}
                    koreanChar={specifiedKorean}
                    placeholder="한자 선택"
                  />
                </div>
              </div>
            )}

            {mode === "D" && (
              <div className="mt-4">
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  원하시는 한글 이름 (2글자씩, 여러 개는 줄바꿈이나 쉼표로 구분)
                </label>
                <Textarea
                  value={koreanNameCandidatesText}
                  onChange={(e) => setKoreanNameCandidatesText(e.target.value)}
                  placeholder={"예: 하윤\n서연, 지호"}
                  className="text-lg font-semibold min-h-[100px]"
                />
                <p className="text-sm font-semibold text-amber-700 mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  ⚠ 이 작명방식은 나올 수 있는 이름의 수가 상대적으로 제한적입니다.
                </p>
              </div>
            )}
          </div>

          {/* 생년월일시 */}
          <div className="mt-7">
            <label className="text-base font-bold text-gray-800 mb-2.5 block">생년월일시</label>
            <div className="grid grid-cols-3 gap-4">
              <Select value={birthYear} onValueChange={setBirthYear}>
                <SelectTrigger className="h-12 text-base font-semibold"><SelectValue placeholder="년" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={birthMonth} onValueChange={setBirthMonth}>
                <SelectTrigger className="h-12 text-base font-semibold"><SelectValue placeholder="월" /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => <SelectItem key={m} value={String(m)}>{m}월</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={birthDay} onValueChange={setBirthDay}>
                <SelectTrigger className="h-12 text-base font-semibold"><SelectValue placeholder="일" /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d} value={String(d)}>{d}일</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Select value={birthHour} onValueChange={setBirthHour}>
                <SelectTrigger className="h-12 text-base font-semibold"><SelectValue placeholder="출생시간입력" /></SelectTrigger>
                <SelectContent>
                  {HOUR_BRANCHES.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-5">
                <label className="flex items-center gap-2 text-base font-semibold cursor-pointer">
                  <input type="radio" className="w-4 h-4" checked={calendarType === "solar"} onChange={() => setCalendarType("solar")} />
                  양력
                </label>
                <label className="flex items-center gap-2 text-base font-semibold cursor-pointer">
                  <input type="radio" className="w-4 h-4" checked={calendarType === "lunar"} onChange={() => setCalendarType("lunar")} />
                  음력
                </label>
              </div>
            </div>
            <p className="text-sm md:text-base font-semibold text-gray-600 mt-3">
              자정(23시~1시) 근처 출생은 일주가 달라질 수 있어, 시간을 알면 더 정확합니다.
            </p>
          </div>

          <Button
            className="w-full h-14 text-lg font-bold mt-8"
            size="lg"
            disabled={mutation.isPending}
            onClick={() => runSearch(1, false)}
          >
            {mutation.isPending ? <Spinner className="mr-2" /> : null}
            이름 만들기
          </Button>
        </div>
      </div>

      {/* 결과 */}
      {hasSearched && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg text-gray-800">
              총 <span className="text-[var(--gold)] font-extrabold">{totalCount.toLocaleString()}</span>개 중 상위 {results.length}개
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {results.map((c, i) => (
              <ResultCard key={i} surnameKorean={surnameKorean} surnameHanja={surnameHanja} candidate={c} />
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-8">
              <Button variant="outline" size="lg" className="font-bold text-base h-12 px-8" disabled={mutation.isPending} onClick={() => runSearch(page + 1, true)}>
                {mutation.isPending ? <Spinner className="mr-2" /> : null}
                더 보기
              </Button>
            </div>
          )}
        </div>
      )}

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      <DepositRequestDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        planType="self_naming"
        onDepositSuccess={() => setPaid(true)}
      />
    </div>
  );
}
