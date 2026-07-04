import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import LoginDialog from "@/components/LoginDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

// ─── 상수 ──────────────────────────────────────────────────

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const MODE_OPTIONS: { value: "A" | "B" | "C"; label: string; desc: string }[] = [
  { value: "A", label: "완전 자동", desc: "이름 두 글자 모두 알아서 지어드립니다" },
  { value: "B", label: "앞글자 지정", desc: "이름 첫 글자를 정하면 둘째 글자를 찾아드립니다" },
  { value: "C", label: "뒷글자 지정", desc: "이름 둘째 글자를 정하면 첫 글자를 찾아드립니다" },
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
  大吉: "bg-[color-mix(in_oklch,var(--gold)_20%,transparent)] text-[var(--gold)] font-bold border-[var(--gold)]",
  吉: "bg-emerald-50 text-emerald-700 border-emerald-300",
  半吉半凶: "bg-gray-100 text-gray-500 border-gray-300",
};

// ─── 한자 선택 입력 (기존 셀프작명/이름감정 화면과 동일한 방식) ───

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
          className="flex-1"
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
    <div className={`hanji-card p-5 relative ${isTop ? "ring-1 ring-[var(--gold)]" : ""}`}>
      {isTop && (
        <span className="absolute -top-2.5 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gold)] text-white tracking-wide">
          최상위 매칭
        </span>
      )}
      <div className="text-center mb-3">
        <div className="text-2xl font-bold text-gray-800">
          {surnameKorean}{candidate.name1Korean}{candidate.name2Korean}
        </div>
        <div className="hanja-display text-lg mt-0.5">
          {surnameHanja}{candidate.name1Hanja}{candidate.name2Hanja}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {gyeokList.map((g) => (
          <div key={g.label} className={`text-center rounded-lg border px-1 py-1.5 ${GILHYUNG_STYLE[g.judgment] || "bg-gray-50 border-gray-200"}`}>
            <div className="text-[10px] opacity-70">{g.label}</div>
            <div className="text-xs font-semibold">{g.strokes}획</div>
            <div className="text-[10px]">{g.judgment}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {candidate.jawonOhaeng.map((o, i) => (
          <span key={i} className={`text-xs font-bold px-2 py-0.5 rounded-full border ${OHAENG_BG[o] || ""} ${OHAENG_COLOR[o] || ""}`}>
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

  const [surnameKorean, setSurnameKorean] = useState("");
  const [surnameHanja, setSurnameHanja] = useState("");
  const [mode, setMode] = useState<"A" | "B" | "C">("A");
  const [specifiedKorean, setSpecifiedKorean] = useState("");
  const [specifiedHanja, setSpecifiedHanja] = useState("");
  const [birthYear, setBirthYear] = useState<string>("");
  const [birthMonth, setBirthMonth] = useState<string>("");
  const [birthDay, setBirthDay] = useState<string>("");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");

  const [page, setPage] = useState(1);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const mutation = trpc.naming.selfNaming.useMutation();

  const canSubmit =
    surnameKorean.trim().length > 0 &&
    surnameHanja.trim().length > 0 &&
    birthYear && birthMonth && birthDay &&
    (mode === "A" || specifiedHanja.trim().length > 0);

  function runSearch(targetPage: number, append: boolean) {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    if (!canSubmit) {
      toast.error("성씨 한자, 생년월일" + (mode !== "A" ? ", 지정 글자" : "") + "를 모두 입력해주세요");
      return;
    }

    mutation.mutate(
      {
        surnameKorean: surnameKorean.trim(),
        surnameHanja: surnameHanja.trim(),
        mode,
        specifiedHanja: mode === "A" ? undefined : specifiedHanja.trim(),
        birthYear: Number(birthYear),
        birthMonth: Number(birthMonth),
        birthDay: Number(birthDay),
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
    <div className="max-w-3xl mx-auto space-y-8">
      {/* 입력 폼 */}
      <div className="hanji-card p-6 md:p-8 space-y-7">
        <div className="text-center">
          <h2 className="hanja-display text-2xl">셀프 작명</h2>
          <div className="gold-divider w-24 mx-auto mt-3" />
          <p className="text-sm text-muted-foreground mt-3">
            성씨와 생년월일시만 입력하시면, 수리사격·복덕오행에 맞는 이름을 찾아드립니다.
          </p>
        </div>

        {/* 성씨 */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">성씨</label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={surnameKorean}
              onChange={(e) => setSurnameKorean(e.target.value.slice(0, 2))}
              placeholder="예: 김"
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
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">이름 작명 방식</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  mode === opt.value
                    ? "border-[var(--gold)] bg-[color-mix(in_oklch,var(--gold)_10%,transparent)]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold text-sm">{opt.label}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-snug">{opt.desc}</div>
              </button>
            ))}
          </div>

          {mode !== "A" && (
            <div className="mt-3">
              <label className="text-xs text-muted-foreground mb-1.5 block">
                {mode === "B" ? "이름 첫 글자" : "이름 둘째 글자"}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={specifiedKorean}
                  onChange={(e) => setSpecifiedKorean(e.target.value.slice(0, 1))}
                  placeholder="한글 입력"
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
        </div>

        {/* 생년월일시 */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">생년월일</label>
          <div className="grid grid-cols-3 gap-3">
            <Select value={birthYear} onValueChange={setBirthYear}>
              <SelectTrigger><SelectValue placeholder="년" /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={birthMonth} onValueChange={setBirthMonth}>
              <SelectTrigger><SelectValue placeholder="월" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => <SelectItem key={m} value={String(m)}>{m}월</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={birthDay} onValueChange={setBirthDay}>
              <SelectTrigger><SelectValue placeholder="일" /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => <SelectItem key={d} value={String(d)}>{d}일</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4 mt-3">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" checked={calendarType === "solar"} onChange={() => setCalendarType("solar")} />
              양력
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" checked={calendarType === "lunar"} onChange={() => setCalendarType("lunar")} />
              음력
            </label>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={mutation.isPending}
          onClick={() => runSearch(1, false)}
        >
          {mutation.isPending ? <Spinner className="mr-2" /> : null}
          이름 만들기
        </Button>
      </div>

      {/* 결과 */}
      {hasSearched && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">
              총 <span className="text-[var(--gold)] font-bold">{totalCount.toLocaleString()}</span>개 중 상위 {results.length}개
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((c, i) => (
              <ResultCard key={i} surnameKorean={surnameKorean} surnameHanja={surnameHanja} candidate={c} />
            ))}
          </div>
          {hasMore && (
            <div className="text-center mt-6">
              <Button variant="outline" disabled={mutation.isPending} onClick={() => runSearch(page + 1, true)}>
                {mutation.isPending ? <Spinner className="mr-2" /> : null}
                더 보기
              </Button>
            </div>
          )}
        </div>
      )}

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
