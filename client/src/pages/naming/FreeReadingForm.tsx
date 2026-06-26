import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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

function HanjaInput({ value, onChange, koreanChar, placeholder }: HanjaInputProps) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<HanjaCandidate[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const searchQuery = trpc.naming.searchHanja.useQuery(
    { sound: koreanChar },
    { enabled: !!koreanChar && koreanChar.length === 1 }
  );

  useEffect(() => {
    if (searchQuery.data) {
      setCandidates(searchQuery.data);
    }
  }, [searchQuery.data]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const ohaengColor: Record<string, string> = {
    木: "text-green-600",
    火: "text-red-500",
    土: "text-yellow-600",
    金: "text-gray-500",
    水: "text-blue-500",
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "한자"}
          className="flex-1"
          onFocus={() => koreanChar && setOpen(true)}
        />
        {koreanChar && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={() => setOpen((v) => !v)}
          >
            후보 보기
          </Button>
        )}
      </div>

      {open && candidates.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-emerald-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          <div className="p-2 text-xs text-gray-400 border-b border-gray-100">
            "{koreanChar}" 독음 한자 {candidates.length}개
          </div>
          <div className="grid grid-cols-3 gap-1 p-2">
            {candidates.map((c) => (
              <button
                key={c.char}
                type="button"
                onClick={() => {
                  onChange(c.char);
                  setOpen(false);
                }}
                className="flex flex-col items-center p-2 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all"
              >
                <span className="text-2xl font-bold text-gray-800">{c.char}</span>
                <span className="text-xs text-gray-500 truncate w-full text-center">{c.huneum}</span>
                <span className={`text-xs font-semibold ${ohaengColor[c.ohaeng] || ""}`}>{c.ohaeng}</span>
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

  const form = useForm<FreeReadingFormData>({
    resolver: zodResolver(freeReadingSchema),
    defaultValues: {
      surnameKorean: "",
      surnameHanja: "",
      name1Korean: "",
      name1Hanja: "",
      name2Korean: "",
      name2Hanja: "",
      birthYear: "",
      birthMonth: "",
      birthDay: "",
      calendarType: "solar",
      gender: "male",
    },
  });

  const name1Korean = form.watch("name1Korean");
  const name2Korean = form.watch("name2Korean");
  const surnameKorean = form.watch("surnameKorean");

  const freeReadingMutation = trpc.naming.freeReading.useMutation({
    onSuccess: (data) => {
      toast.success(`이름 감정 완료 - 인증번호: ${data.certificateNumber}`);
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
      const nameKorean = data.name1Korean + data.name2Korean;
      const nameHanja = (data.name1Hanja || "") + (data.name2Hanja || "");
      await freeReadingMutation.mutateAsync({
        surnameKorean: data.surnameKorean,
        surnameHanja: data.surnameHanja,
        nameKorean,
        nameHanja: nameHanja || nameKorean,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calendarType = form.watch("calendarType");
  const gender = form.watch("gender");

  return (
    <Card className="w-full max-w-3xl border-emerald-100 shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl text-emerald-900">무료 이름 감정</CardTitle>
        <CardDescription className="text-base">
          성씨와 이름, 생년월일을 입력하면 자원오행·발음오행·수리사격을 분석해드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* 성씨 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">성씨</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="surnameKorean"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>한글</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 전" maxLength={1} {...field} />
                      </FormControl>
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
                    placeholder="예: 全"
                  />
                </FormItem>
              </div>
            </div>

            {/* 이름 — 글자 분리 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">이름</p>
              <div className="grid grid-cols-2 gap-6">
                {/* 가운데 글자 */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium">가운데 글자</p>
                  <FormField control={form.control} name="name1Korean"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>한글</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 원" maxLength={1} {...field} />
                        </FormControl>
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
                      placeholder="예: 源"
                    />
                  </FormItem>
                </div>

                {/* 끝 글자 */}
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 font-medium">끝 글자</p>
                  <FormField control={form.control} name="name2Korean"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>한글</FormLabel>
                        <FormControl>
                          <Input placeholder="예: 석" maxLength={1} {...field} />
                        </FormControl>
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
                      placeholder="예: 錫"
                    />
                  </FormItem>
                </div>
              </div>
            </div>

            {/* 생년월일 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">생년월일</p>

              {/* 양력/음력 선택 */}
              <div className="flex gap-2 mb-4">
                {(["solar", "lunar"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => form.setValue("calendarType", type)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                      calendarType === type
                        ? "bg-emerald-700 text-white shadow"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {type === "solar" ? "양력" : "음력"}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="birthYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>년</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 1977" maxLength={4} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="birthMonth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>월</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 5" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="birthDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>일</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 17" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* 성별 */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">성별</p>
              <div className="flex gap-2">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => form.setValue("gender", g)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                      gender === g
                        ? "bg-emerald-700 text-white shadow"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {g === "male" ? "남성" : "여성"}
                  </button>
                ))}
              </div>
            </div>

            {/* 제출 버튼 */}
            <Button
              type="submit"
              disabled={isLoading || freeReadingMutation.isPending}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-base py-6 rounded-xl font-bold"
            >
              {isLoading || freeReadingMutation.isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  분석 중...
                </>
              ) : (
                "이름 감정하기"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
