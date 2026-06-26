import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// 한국 도시 목록 (SajuNew와 동일)
const KOREAN_CITIES = [
  { value: "seoul", label: "서울", lon: 126.978 },
  { value: "incheon", label: "인천", lon: 126.705 },
  { value: "suwon", label: "수원", lon: 127.0286 },
  { value: "chuncheon", label: "춘천", lon: 127.7298 },
  { value: "gangneung", label: "강릉", lon: 128.8761 },
  { value: "daejeon", label: "대전", lon: 127.3845 },
  { value: "sejong", label: "세종", lon: 127.2891 },
  { value: "cheongju", label: "청주", lon: 127.4915 },
  { value: "jeonju", label: "전주", lon: 127.148 },
  { value: "gwangju", label: "광주", lon: 126.853 },
  { value: "daegu", label: "대구", lon: 128.601 },
  { value: "pohang", label: "포항", lon: 129.343 },
  { value: "busan", label: "부산", lon: 129.0756 },
  { value: "ulsan", label: "울산", lon: 129.3114 },
  { value: "changwon", label: "창원", lon: 128.6817 },
  { value: "jeju", label: "제주", lon: 126.5312 },
  { value: "average", label: "도시를 모릅니다 (평균 보정)", lon: 127.5 },
];

// 시진 목록 (SajuNew와 동일)
const HOUR_BRANCHES = [
  { value: "unknown", label: "시간을 모릅니다" },
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
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const freeReadingSchema = z.object({
  surnameKorean: z.string().min(1, "성씨를 입력해주세요"),
  surnameHanja: z.string().optional(),
  name1Korean: z.string().min(1, "가운데 글자를 입력해주세요"),
  name1Hanja: z.string().optional(),
  name2Korean: z.string().min(1, "끝 글자를 입력해주세요"),
  name2Hanja: z.string().optional(),
  birthYear: z.string().min(4, "출생년도를 입력해주세요"),
  birthMonth: z.string().min(1, "월을 입력해주세요"),
  birthDay: z.string().min(1, "일을 입력해주세요"),
  calendarType: z.enum(["solar", "lunar"]),
  gender: z.enum(["male", "female"]),
  namingConsent: z.boolean().refine(v => v === true, { message: "개인정보 수집에 동의해주세요" }),
});

type FreeReadingFormData = z.infer<typeof freeReadingSchema>;

interface HanjaCandidate {
  char: string;
  huneum: string;
  ohaeng: string;
  strokes: number;
}

interface HanjaInputProps {
  value: string;
  onChange: (val: string) => void;
  koreanChar: string;
  placeholder?: string;
}

const OHAENG_COLOR: Record<string, string> = {
  木: "text-green-600", 火: "text-red-500",
  土: "text-yellow-600", 金: "text-gray-500", 水: "text-blue-500",
};
const OHAENG_BG: Record<string, string> = {
  木: "bg-green-50 border-green-200", 火: "bg-red-50 border-red-200",
  土: "bg-yellow-50 border-yellow-200", 金: "bg-gray-50 border-gray-200", 水: "bg-blue-50 border-blue-200",
};

function HanjaInput({ value, onChange, koreanChar, placeholder }: HanjaInputProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const searchQuery = trpc.naming.searchHanja.useQuery(
    { sound: koreanChar },
    { enabled: !!koreanChar && koreanChar.length === 1 }
  );

  const candidates: HanjaCandidate[] = searchQuery.data || [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 한글 입력되면 자동으로 드롭다운 열기
  useEffect(() => {
    if (koreanChar && koreanChar.length === 1 && candidates.length > 0) {
      setOpen(true);
    }
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
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-emerald-300 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
          <div className="p-2 text-xs text-gray-500 border-b bg-emerald-50">
            &quot;{koreanChar}&quot; 독음 한자 {candidates.length}개 — 클릭하면 선택됩니다
          </div>
          <div className="grid grid-cols-4 gap-1 p-2">
            {candidates.map((c) => (
              <button key={c.char} type="button"
                onClick={() => { onChange(c.char); setOpen(false); }}
                className={`flex flex-col items-center p-2 rounded-lg border transition-all hover:shadow-md ${OHAENG_BG[c.ohaeng] || "bg-gray-50 border-gray-200"}`}>
                <span className="text-2xl font-bold text-gray-800">{c.char}</span>
                <span className="text-xs text-gray-500 truncate w-full text-center leading-tight">{c.huneum}</span>
                <span className={`text-xs font-bold mt-0.5 ${OHAENG_COLOR[c.ohaeng] || ""}`}>{c.ohaeng}({c.strokes}획)</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface FreeReadingFormProps {
  onSuccess?: (result: any) => void;
}

export function FreeReadingForm({ onSuccess }: FreeReadingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hourBranch, setHourBranch] = useState("unknown");
  const [city, setCity] = useState("seoul");

  const form = useForm<FreeReadingFormData>({
    resolver: zodResolver(freeReadingSchema),
    defaultValues: {
      surnameKorean: "", surnameHanja: "",
      name1Korean: "", name1Hanja: "",
      name2Korean: "", name2Hanja: "",
      birthYear: "", birthMonth: "", birthDay: "",
      calendarType: "solar", gender: "male", namingConsent: false,
    },
  });

  const name1Korean = form.watch("name1Korean");
  const name2Korean = form.watch("name2Korean");
  const surnameKorean = form.watch("surnameKorean");
  const calendarType = form.watch("calendarType");
  const gender = form.watch("gender");

  const freeReadingMutation = trpc.naming.freeReading.useMutation({
    onSuccess: (data) => {
      toast.success(`이름 감정 완료 — 인증번호: ${data.certificateNumber}`);
      onSuccess?.(data);
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "이름 감정 중 오류가 발생했습니다");
    },
  });

  const onSubmit = async (data: FreeReadingFormData) => {
    setIsLoading(true);
    try {
      await freeReadingMutation.mutateAsync({
        surnameKorean: data.surnameKorean,
        surnameHanja: data.surnameHanja,
        name1Korean: data.name1Korean,
        name1Hanja: data.name1Hanja,
        name2Korean: data.name2Korean,
        name2Hanja: data.name2Hanja,
        namingConsent: data.namingConsent,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sectionClass = "bg-white border border-emerald-100 rounded-2xl p-6 shadow-sm";
  const labelClass = "text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3 block";

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-emerald-900">무료 이름 감정</h2>
        <p className="text-gray-500 mt-1">성씨와 이름을 입력하면 자원오행과 수리사격을 분석해드립니다.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* 성명 입력 */}
          <div className={sectionClass}>
            <span className={labelClass}>성명 입력</span>
            <div className="grid grid-cols-4 gap-4">
              {/* 성씨 */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-600 border-b border-emerald-100 pb-1">성씨</p>
                <FormField control={form.control} name="surnameKorean"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>한글</FormLabel>
                      <FormControl><Input placeholder="성씨" maxLength={1} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>한자 <span className="text-gray-400 text-xs">(선택)</span></FormLabel>
                  <HanjaInput
                    value={form.watch("surnameHanja") || ""}
                    onChange={(v) => form.setValue("surnameHanja", v)}
                    koreanChar={surnameKorean}
                    placeholder="한자"
                  />
                </FormItem>
              </div>

              <div className="col-span-3 grid grid-cols-3 gap-4 border-l border-emerald-100 pl-4">
                {/* 가운데 글자 */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-600 border-b border-emerald-100 pb-1">가운데 글자</p>
                  <FormField control={form.control} name="name1Korean"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>한글</FormLabel>
                        <FormControl><Input placeholder="가운데" maxLength={1} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>한자 <span className="text-gray-400 text-xs">(선택)</span></FormLabel>
                    <HanjaInput
                      value={form.watch("name1Hanja") || ""}
                      onChange={(v) => form.setValue("name1Hanja", v)}
                      koreanChar={name1Korean}
                      placeholder="한자"
                    />
                  </FormItem>
                </div>

                {/* 끝 글자 */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-600 border-b border-emerald-100 pb-1">끝 글자</p>
                  <FormField control={form.control} name="name2Korean"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>한글</FormLabel>
                        <FormControl><Input placeholder="끝글자" maxLength={1} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>한자 <span className="text-gray-400 text-xs">(선택)</span></FormLabel>
                    <HanjaInput
                      value={form.watch("name2Hanja") || ""}
                      onChange={(v) => form.setValue("name2Hanja", v)}
                      koreanChar={name2Korean}
                      placeholder="한자"
                    />
                  </FormItem>
                </div>

                {/* 이름 미리보기 */}
                <div className="flex flex-col items-center justify-center bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                  <p className="text-xs text-emerald-600 font-semibold mb-2">이름 미리보기</p>
                  <p className="text-3xl font-bold text-emerald-900 tracking-widest">
                    {form.watch("surnameKorean") || "○"}
                    {form.watch("name1Korean") || "○"}
                    {form.watch("name2Korean") || "○"}
                  </p>
                  <p className="text-lg text-gray-500 mt-1 tracking-widest">
                    {form.watch("surnameHanja") || ""}
                    {form.watch("name1Hanja") || ""}
                    {form.watch("name2Hanja") || ""}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 생년월일 + 성별 */}
          <div className={sectionClass}>
            <div className="grid grid-cols-2 gap-8">
              {/* 생년월일 */}
              <div>
                <span className={labelClass}>생년월일</span>
                <div className="flex gap-2 mb-4">
                  {(["solar", "lunar"] as const).map((type) => (
                    <button key={type} type="button"
                      onClick={() => form.setValue("calendarType", type)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                        calendarType === type
                          ? "bg-emerald-700 text-white shadow"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}>
                      {type === "solar" ? "양력" : "음력"}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* 년 드롭다운 */}
                  <FormField control={form.control} name="birthYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>년</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="년도" /></SelectTrigger>
                          <SelectContent className="max-h-48">
                            {YEARS.map((y) => (
                              <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* 월 드롭다운 */}
                  <FormField control={form.control} name="birthMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>월</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="월" /></SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((m) => (
                              <SelectItem key={m} value={String(m)}>{m}월</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* 일 드롭다운 */}
                  <FormField control={form.control} name="birthDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>일</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue placeholder="일" /></SelectTrigger>
                          <SelectContent>
                            {DAYS.map((d) => (
                              <SelectItem key={d} value={String(d)}>{d}일</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 성별 */}
              <div>
                <span className={labelClass}>성별</span>
                <div className="flex gap-3 mt-1">
                  {(["male", "female"] as const).map((g) => (
                    <button key={g} type="button"
                      onClick={() => form.setValue("gender", g)}
                      className={`px-6 py-3 rounded-xl text-sm font-bold transition-all border-2 ${
                        gender === g
                          ? "bg-emerald-700 text-white border-emerald-700 shadow"
                          : "bg-white text-gray-500 border-gray-200 hover:border-emerald-300"
                      }`}>
                      {g === "male" ? "남성" : "여성"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 출생 시간 + 도시 */}
          <div className={sectionClass}>
            <span className={labelClass}>출생 시간 및 지역 <span className="text-gray-400 font-normal normal-case text-xs ml-1">(만세력 정확도 향상)</span></span>
            <div className="grid grid-cols-2 gap-6">
              {/* 시진 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">출생 시진(時辰)</label>
                <Select value={hourBranch} onValueChange={setHourBranch}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="시진 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOUR_BRANCHES.map((h) => (
                      <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 도시 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">출생 도시</label>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="도시 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {KOREAN_CITIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 개인정보 수집 동의 */}
          <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-3">개인정보 수집 동의</p>
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-4 mb-4 leading-relaxed border border-gray-100">
              <p className="font-semibold text-gray-700 mb-2">수집 항목</p>
              <p className="mb-1">이름(한글·한자), 생년월일, 성별</p>
              <p className="font-semibold text-gray-700 mb-2 mt-3">수집 목적</p>
              <p className="mb-1">이름 감정 서비스 제공</p>
              <p className="font-semibold text-gray-700 mb-2 mt-3">보유 기간</p>
              <p>서비스 이용 후 1년</p>
            </div>
            <FormField control={form.control} name="namingConsent"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="namingConsent"
                      checked={field.value}
                      onChange={field.onChange}
                      className="w-5 h-5 accent-emerald-700 cursor-pointer"
                    />
                    <label htmlFor="namingConsent" className="text-sm font-semibold text-gray-700 cursor-pointer">
                      위 개인정보 수집·이용에 동의합니다 <span className="text-red-500">(필수)</span>
                    </label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 제출 */}
          <Button
            type="submit"
            disabled={isLoading || freeReadingMutation.isPending}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-lg py-7 rounded-xl font-bold shadow-lg"
          >
            {isLoading || freeReadingMutation.isPending ? (
              <><Spinner className="mr-2 h-4 w-4" />분석 중...</>
            ) : "이름 감정하기"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
