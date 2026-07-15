import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SiteHeader from "@/components/SiteHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/_core/hooks/useAuth";
import LoginDialog from "@/components/LoginDialog";
import { trpc } from "@/lib/trpc";
import ShareButton from "@/components/ShareButton";
import { buildSajuShareText, buildSajuShareTitle } from "@shared/share";
import { useMemo, useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { toast } from "sonner";
import { usePortonePayment, PortonePaymentError } from "@/hooks/usePortonePayment";

/**
 * 한국 주요 도시별 경도(°E) — 한국표준시(KST=UTC+9, 기준 경도 135°E) 대비
 * 4분/도 만큼 평균태양시가 늦는다. 따라서 보정량(분) = (135 - lon) * 4.
 * 양수면 시계가 빨라야 하고(=태어난 시각에서 분을 빼야 함), 음수면 그 반대.
 */
const KOREAN_CITIES: { value: string; label: string; lon: number }[] = [
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
  { value: "average", label: "도시를 모릅니다 (평균 30분 보정)", lon: 127.5 }, // 약 30분
];

const HOUR_BRANCHES = [
  { value: "any", label: "정확히 모릅니다 (시진 비교 안내)" },
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

/**
 * 한국 섬머타임 적용 기간 판정 (1948-1951, 1955-1960, 1987-1988).
 * 해당 기간에 출생자라면 시간을 1시간 빼야 자연시 기준이 된다.
 */
function isInKoreanDst(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  const ranges: Array<[Date, Date]> = [
    [new Date(1948, 4, 31), new Date(1948, 8, 12)],
    [new Date(1949, 3, 2), new Date(1949, 8, 10)],
    [new Date(1950, 3, 1), new Date(1950, 8, 9)],
    [new Date(1951, 4, 6), new Date(1951, 8, 8)],
    [new Date(1955, 4, 5), new Date(1955, 8, 8)],
    [new Date(1956, 4, 20), new Date(1956, 8, 29)],
    [new Date(1957, 4, 5), new Date(1957, 8, 21)],
    [new Date(1958, 4, 4), new Date(1958, 8, 20)],
    [new Date(1959, 4, 3), new Date(1959, 8, 19)],
    [new Date(1960, 4, 1), new Date(1960, 8, 17)],
    [new Date(1987, 4, 10), new Date(1987, 9, 10)],
    [new Date(1988, 4, 8), new Date(1988, 9, 8)],
  ];
  return ranges.some(([s, e]) => d >= s && d <= e);
}

export default function SajuNew() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const [year, setYear] = useState<string>("1990");
  const [month, setMonth] = useState<string>("1");
  const [day, setDay] = useState<string>("1");
  const [hour, setHour] = useState<string>("12");
  const [minute, setMinute] = useState<string>("0");
  const [hourBranchOnly, setHourBranchOnly] = useState<string>(""); // 빈문자열 = 시·분으로 입력
  const [unknownHour, setUnknownHour] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [city, setCity] = useState("seoul");
  const [autoDst, setAutoDst] = useState(true);
  const [realName, setRealName] = useState("");
  const [memberId, setMemberId] = useState(user?.nickname || user?.name || "");
  const [label, setLabel] = useState("본인");
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [showManselyeokModal, setShowManselyeokModal] = useState(false);

  const yearN = parseInt(year) || 1990;
  const monthN = parseInt(month) || 1;
  const dayN = parseInt(day) || 1;
  const cityInfo = KOREAN_CITIES.find((c) => c.value === city) || KOREAN_CITIES[0];
  const cityCorrectionMin = Math.round((135 - cityInfo.lon) * 4);
  const inDst = isInKoreanDst(yearN, monthN, dayN);

  function applyTimeAdjustments(h: number, m: number): { hour: number; minute: number } {
    let adjMin = m - cityCorrectionMin;
    let adjHour = h;
    if (adjMin < 0) {
      adjHour -= 1;
      adjMin += 60;
    } else if (adjMin >= 60) {
      adjHour += 1;
      adjMin -= 60;
    }
    if (adjHour < 0) adjHour += 24;
    if (adjHour >= 24) adjHour -= 24;
    if (autoDst && inDst) {
      adjHour -= 1;
      if (adjHour < 0) adjHour += 24;
    }
    return { hour: adjHour, minute: adjMin };
  }

  const updateSessionMutation = trpc.consult.linkSaju.useMutation();
  const startPayment = usePortonePayment();

  const previewMutation = trpc.saju.preview.useQuery(
    {
      year: yearN,
      month: monthN,
      day: dayN,
      hour: unknownHour ? undefined : (hourBranchOnly && hourBranchOnly !== "any" ? parseInt(hourBranchOnly) : parseInt(hour)),
      minute: unknownHour ? undefined : (hourBranchOnly && hourBranchOnly !== "any" ? 0 : parseInt(minute)),
      gender,
      calendarType,
      isLeapMonth: calendarType === "lunar" ? isLeapMonth : false,
    },
    { enabled: false }
  );

  const createMutation = trpc.saju.create.useMutation({
    onSuccess: async (data: any) => {
      toast.success("사주 정보가 저장되었습니다.");
      const id = data.id;
      const sessionIdStr = params.get('sessionId');
      const returnTo = params.get('returnTo');
      const isModal = params.get('modal') === 'true';
      const planParam = params.get('plan');
      const isAdditional = params.get('isAdditional') === 'true';

      // plan=free 인 경우: freeMockPay 호출 후 채팅창으로 이동
      if (planParam === 'free') {
        try {
          const result = await startPayment.startPayment({
            planType: 'free',
            sajuProfileId: id,
          });
          if (result.sessionId) {
            try {
              await updateSessionMutation.mutateAsync({ 
                sessionId: result.sessionId, 
                sajuProfileId: id 
              });
            } catch (err) {
              console.error("사주 연결 실패:", err);
            }
            setLocation(`/consult/${result.sessionId}`);
          }
        } catch (err) {
          if (err instanceof PortonePaymentError) {
            toast.error(err.message);
          } else {
            toast.error("상담 시작 중 오류가 발생했습니다.");
          }
        }
        return;
      }

      // 세션 ID가 있으면 사주를 세션에 연결
      if (sessionIdStr) {
        try {
          const sessionId = parseInt(sessionIdStr);
          await updateSessionMutation.mutateAsync({ 
            sessionId, 
            sajuProfileId: id,
            isAdditional
          });
        } catch (err) {
          console.error("사주 연결 실패:", err);
        }
      }

      // sessionId가 있으면 (결제 후 만세력 진입) → 채팅창으로 자동 이동
      if (sessionIdStr) {
        setLocation(`/consult/${sessionIdStr}`);
      } else if (returnTo) {
        // returnTo로 돌아갈 때 newSajuId 추가
        const separator = returnTo.includes('?') ? '&' : '?';
        setLocation(`${returnTo}${separator}newSajuId=${id}`);
      } else if (isModal) {
        window.history.back();
      } else {
        toast.success("사주가 저장되었습니다. 내 상담실에서 확인하세요.");
        setLocation(`/me`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  function validateRequired(): boolean {
    if (!realName.trim()) {
      toast.error("실명을 입력해 주세요.");
      return false;
    }

    return true;
  }

  async function handlePreview() {
    if (yearN < 1900 || yearN > 2100) {
      toast.error("연도는 1900 ~ 2100 범위로 입력해 주세요.");
      return;
    }
    setPreviewing(true);
    try {
      const result = await previewMutation.refetch();
      if (result.data) {
        setPreviewResult(result.data);
        setTimeout(() => {
          const resultSection = document.getElementById("saju-preview-result");
          if (resultSection) {
            resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      }
    } catch (err) {
      toast.error("사주 계산 중 오류가 발생했습니다.");
      console.error("Preview error:", err);
    } finally {
      setPreviewing(false);
    }
  }

  function handleSave() {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }
    if (!validateRequired()) return;

    let hourN: number | null = null;
    let minuteN: number | null = null;

    if (hourBranchOnly && hourBranchOnly !== "any") {
      // 시진만 선택: 해당 시진 중앙시각으로 저장하고 보정은 적용하지 않음
      hourN = parseInt(hourBranchOnly);
      minuteN = 0;
    } else if (hourBranchOnly === "any") {
      hourN = null;
      minuteN = null;
    } else if (!unknownHour) {
      const adj = applyTimeAdjustments(parseInt(hour), parseInt(minute));
      hourN = adj.hour;
      minuteN = adj.minute;
    }

    createMutation.mutate({
      year: yearN,
      month: monthN,
      day: dayN,
      hour: hourN,
      minute: minuteN,
      gender,
      label: realName.trim() || label,
      realName: realName.trim() || undefined,
      birthplace: cityInfo.label,
      isDst: !!(autoDst && inDst),
      calendarType,
      isLeapMonth: calendarType === "lunar" ? isLeapMonth : false,
    });
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container py-20 text-center text-muted-foreground">잠시만요...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      {/* 우주 배경 (따뜻한 갈색/분홍색 톤) */}
      <div className="page-hero relative w-full h-[360px] flex items-center bg-gradient-to-br from-slate-950 via-amber-900 to-rose-950 overflow-hidden">
        {/* 우주 배경 그라디언트 - 갈색/분홍색 + 그라데이션 */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-500/25 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
        </div>
        
        {/* 별자리 효과 (천체) */}
        <div className="absolute inset-0">
          {[...Array(35)].map((_, i) => {
            const size = Math.random() > 0.7 ? 2.5 : 1.5;
            const duration = 3 + Math.random() * 4;
            return (
              <div
                key={i}
                className="absolute bg-white rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `constellation ${duration}s ease-in-out infinite`,
                  boxShadow: `0 0 ${size * 2}px rgba(255, 255, 255, 0.9), 0 0 ${size * 4}px rgba(255, 180, 100, 0.5)`,
                }}
              />
            );
          })}
          {/* 별 연결선 효과 (별자리) */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.2 }} preserveAspectRatio="none">
            <line x1="5%" y1="15%" x2="20%" y2="30%" stroke="white" strokeWidth="0.5" />
            <line x1="20%" y1="30%" x2="35%" y2="20%" stroke="white" strokeWidth="0.5" />
            <line x1="35%" y1="20%" x2="50%" y2="35%" stroke="white" strokeWidth="0.5" />
            <line x1="55%" y1="10%" x2="70%" y2="25%" stroke="white" strokeWidth="0.5" />
            <line x1="70%" y1="25%" x2="85%" y2="15%" stroke="white" strokeWidth="0.5" />
            <line x1="10%" y1="65%" x2="25%" y2="75%" stroke="white" strokeWidth="0.5" />
            <line x1="25%" y1="75%" x2="40%" y2="70%" stroke="white" strokeWidth="0.5" />
            <line x1="60%" y1="70%" x2="75%" y2="80%" stroke="white" strokeWidth="0.5" />
            <line x1="75%" y1="80%" x2="85%" y2="75%" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
        
        {/* 콘텐츠 */}
        <div className="relative z-10 container max-w-6xl mx-auto text-center">
          <span className="text-base md:text-lg tracking-[0.4em] text-amber-100/90 font-semibold leading-tight h-6 flex items-center justify-center">SAJU&nbsp;INPUT</span>
          <h1 className="hanja-display text-6xl md:text-7xl mt-6 text-white leading-[1.3] font-bold">
            사주 정보 입력
          </h1>
          <div className="gold-divider w-40 mx-auto mt-8" />
          <p className="text-amber-50/90 mt-8 leading-relaxed max-w-3xl mx-auto text-xl md:text-2xl">
            정확한 풀이를 위해 양력 생년월일시를 입력해 주십시오.
            <br />
            섬머타임·윤달·출생지 위도 보정까지 — 정밀 만세력을 제공합니다.
          </p>
        </div>
      </div>
      
      <div className="container py-12 max-w-4xl">
        <div className="mb-10 fade-up"></div>

        <Card
          className="hanji-card relative"
          style={{
            border: "3px solid var(--gold)",
            boxShadow: "0 0 0 1px rgba(212,160,23,0.25), 0 20px 50px -12px rgba(59,42,13,0.25), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-0.5 rounded-full text-[11px] font-bold tracking-widest text-white z-10" style={{ background: "var(--gold)" }}>
            MANSAERYEOK
          </div>
          <CardHeader className="border-b-2 border-amber-600/20 pb-4">
            <CardTitle className="text-2xl font-bold text-amber-900">기본 정보</CardTitle>
            <p className="text-sm text-emerald-700 mt-1">📁 실명·성별·생년월일시는 필수입니다. 아이디는 선택사항입니다.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-3 block text-base font-semibold text-gray-700">
                  실명 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={realName}
                  onChange={(e) => setRealName(e.target.value)}
                  placeholder="공개되지 않습니다"
                  className="border-2 border-amber-400/50 focus:border-amber-600 focus:ring-amber-500/20 text-lg"
                />
              </div>
              <div>
                <Label className="mb-3 block text-base font-semibold text-gray-700">
                  회원 아이디 <span className="text-gray-400 text-sm font-normal">(선택)</span>
                </Label>
                <Input
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder={user?.nickname || user?.name || "아이디"}
                  className="border-2 border-amber-400/50 focus:border-amber-600 focus:ring-amber-500/20 text-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-3 block text-base font-semibold text-gray-700">관계</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="본인 / 배우자 / 자녀" className="border-2 border-amber-400/50 focus:border-amber-600 focus:ring-amber-500/20 text-lg" />
              </div>
              <div>
                <Label className="mb-3 block text-base font-semibold text-gray-700">성별 <span className="text-red-500">*</span></Label>
                <Select value={gender} onValueChange={(v) => setGender(v as "male" | "female")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">남성</SelectItem>
                    <SelectItem value="female">여성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border-2 border-amber-400/50 p-4 space-y-4 bg-amber-50/30">
              <div>
                <Label className="text-lg font-semibold text-gray-700">양력 / 음력 선택 <span className="text-red-500">*</span></Label>
                <p className="text-base text-muted-foreground mt-1 mb-3">
                  주민등록번호·양력 생일을 아시면 <strong>양력</strong>을, 음력(음력생일)만 아시면
                  <strong>음력</strong>을 고르세요. 사주 계산은 만세력 기준으로 자동 환산됩니다.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={calendarType === "solar" ? "default" : "outline"}
                    className={calendarType === "solar" ? "bg-primary text-primary-foreground" : "bg-card"}
                    onClick={() => {
                      setCalendarType("solar");
                      setIsLeapMonth(false);
                    }}
                  >
                    양력
                  </Button>
                  <Button
                    type="button"
                    variant={calendarType === "lunar" ? "default" : "outline"}
                    className={calendarType === "lunar" ? "bg-primary text-primary-foreground" : "bg-card"}
                    onClick={() => setCalendarType("lunar")}
                  >
                    음력
                  </Button>
                </div>
              </div>

              {calendarType === "lunar" && (
                <div className="flex items-start gap-3 pt-3 border-t border-border">
                  <Switch checked={isLeapMonth} onCheckedChange={setIsLeapMonth} className="mt-1" />
                  <div className="text-base flex-1">
                    <Label className="font-semibold">윤달(閏月)입니다</Label>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      음력 윤달에 태어나셨다면 체크해 주세요. 사주 계산에 반영됩니다.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
                <div>
                  <Label className="text-base font-semibold text-gray-700">년 ({calendarType === "solar" ? "양력" : "음력"})</Label>
                  <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    min="1900"
                    max="2100"
                    className="border-2 border-amber-400/50 focus:border-amber-600 focus:ring-amber-500/20 text-lg"
                  />
                </div>
                <div>
                  <Label className="text-base font-semibold text-gray-700">월</Label>
                  <Input
                    type="number"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    min="1"
                    max="12"
                    className="border-2 border-amber-400/50 focus:border-amber-600 focus:ring-amber-500/20 text-lg"
                  />
                </div>
                <div>
                  <Label className="text-base font-semibold text-gray-700">일</Label>
                  <Input
                    type="number"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    min="1"
                    max="31"
                    className="border-2 border-amber-400/50 focus:border-amber-600 focus:ring-amber-500/20 text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border-2 border-amber-400/50 p-4 space-y-4 bg-amber-50/30">
              <div>
                <Label className="text-lg">시간을 정확히 아십니까?</Label>
                <p className="text-base text-muted-foreground mt-1 mb-3">
                  시:분으로 입력하시거나, 시진(時辰)만 선택하실 수 있습니다.
                </p>
              </div>

              {!unknownHour && hourBranchOnly === "" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-base">시 (0~23)</Label>
                      <Input
                        type="number"
                        value={hour}
                        onChange={(e) => setHour(e.target.value)}
                        min="0"
                        max="23"
                      />
                    </div>
                    <div>
                      <Label className="text-base">분</Label>
                      <Input
                        type="number"
                        value={minute}
                        onChange={(e) => setMinute(e.target.value)}
                        min="0"
                        max="59"
                      />
                    </div>
                  </div>
                </>
              )}

              {!unknownHour && hourBranchOnly === "" && (
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <span className="text-base text-muted-foreground">또는</span>
                </div>
              )}

              {hourBranchOnly !== "any" && (
                <div>
                  <Label className="text-base">시진(時辰)만 선택</Label>
                  <Select value={hourBranchOnly} onValueChange={setHourBranchOnly}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_BRANCHES.map((b) => (
                        <SelectItem key={b.value} value={b.value}>
                          {b.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {hourBranchOnly !== "any" && (
                <div className="flex items-start gap-3 pt-2 border-t border-border">
                  <input
                    type="checkbox"
                    id="unknownHourCheckbox"
                    checked={unknownHour}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setHourBranchOnly("any");
                      } else {
                        setHourBranchOnly("");
                      }
                    }}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <Label htmlFor="unknownHourCheckbox" className="cursor-pointer flex-1 mb-0">
                    정확히 모릅니다
                  </Label>
                </div>
              )}
              {hourBranchOnly === "any" && (
                <p className="text-base text-jusa-deep mt-2">
                  시진을 모르시면 상담 중에 후보 시진을 비교해 드립니다.
                </p>
              )}
            </div>

            <div className="rounded-md border-2 border-amber-400/50 p-4 space-y-4 bg-amber-50/30">
              <div>
                <Label className="text-lg">출생 도시</Label>
                <p className="text-base text-muted-foreground mt-1 mb-2">
                  도시별 평균태양시(longitude)에 맞춰 시각을 자동 보정합니다.
                  위도 차에 따라 같은 시각이라도 일출·일몰이 15분 이상 달라질 수 있으나,
                  사주 시지(時支) 판정에는 보통 영향이 없습니다.
                </p>
                <Select value={city} onValueChange={setCity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KOREAN_CITIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-base text-muted-foreground mt-2">
                  현재 보정량 ≈ <strong>{cityCorrectionMin}분</strong> (시계 시각에서 빼고 계산)
                </p>
              </div>

              <div className="flex items-start gap-3 pt-3 border-t border-border">
                <Switch checked={autoDst} onCheckedChange={setAutoDst} className="mt-1" />
                <div className="text-base flex-1">
                  <Label className="font-semibold">한국 섬머타임 자동 보정</Label>
                  <p className="text-muted-foreground mt-1 leading-relaxed">
                    1948–1951, 1955–1960, 1987–1988 기간 출생자에게 자동으로 1시간을 빼서
                    적용합니다. 섬머타임이 무엇인지 모르셔도, 켜 두시면 알아서 처리합니다.
                  </p>
                  {inDst && (
                    <p className="text-jusa-deep mt-2 font-medium">
                      ※ 입력하신 날짜는 한국 섬머타임 적용 기간입니다. 자동으로 1시간 보정됩니다.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handlePreview} disabled={previewing} variant="outline" className="bg-card flex-1">
                {previewing ? "계산 중..." : "사주 확인"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMutation.isPending}
                className="bg-primary hover:bg-jusa-deep text-primary-foreground flex-1"
              >
                {createMutation.isPending ? "저장 중..." : "사주 저장"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 미리보기 */}
        {previewResult && (
          <Card className="hanji-card mt-8 fade-up" id="saju-preview-result">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-2xl">사주 미리보기</CardTitle>
                {/* 스크롤 도우미 화살표 */}
                <div className="flex flex-col items-center gap-1 text-muted-foreground/60 select-none">
                  <button
                    className="hover:text-amber-600 transition-colors p-1"
                    onClick={() => window.scrollBy({ top: -200, behavior: 'smooth' })}
                    title="위로"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 4l7 8H3l7-8z"/></svg>
                  </button>
                  <span className="text-xs">스크롤</span>
                  <button
                    className="hover:text-amber-600 transition-colors p-1"
                    onClick={() => window.scrollBy({ top: 200, behavior: 'smooth' })}
                    title="아래로"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 16l-7-8h14l-7 8z"/></svg>
                  </button>
                </div>
                <ShareButton
                  className="bg-card"
                  title={buildSajuShareTitle(realName || label)}
                  description={buildSajuShareText({
                    name: realName || label,
                    year: yearN,
                    pillars: previewResult!.pillars,
                    daeunNumber: previewResult!.daeun.daeunNumber,
                  })}
                  url={`${window.location.origin}/saju`}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {(["hour", "day", "month", "year"] as const).map((k) => {
                  const p = previewResult!.pillars[k];
                  const labels: Record<string, string> = { year: "年", month: "月", day: "日", hour: "時" };
                  return (
                    <div key={k} className="ganji-cell text-center">
                      <div className="label text-center">{labels[k]}</div>
                      {p ? (
                        <>
                          <div className="stem text-center font-bold text-jusa-deep">{p.stem}</div>
                          <div className="branch text-center font-bold text-jusa-deep">{p.branch}</div>
                          <div className="shinsal text-center text-[0.7rem] mt-2 text-celadon-deep">
                            {p.shinsal}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="stem">?</div>
                          <div className="branch">?</div>
                          <div className="shinsal">시 모름</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="gold-divider my-6" />
              <p className="text-base text-foreground/80">
                <strong className="text-foreground">대운수: {previewResult.daeun.daeunNumber}세 시작</strong> ·{" "}
                {previewResult.daeun.forward ? "순행" : "역행"}
              </p>
              <div className="grid grid-cols-5 gap-2 mt-4">
                {previewResult.daeun.pillars.slice(0, 10).map((p: any, i: number) => (
                  <div key={i} className="text-center p-2 border border-border rounded text-base">
                    <div className="text-base text-muted-foreground">
                      {previewResult!.daeun.daeunNumber + i * 10}세
                    </div>
                    <div className="hanja-display text-lg">{p}</div>
                  </div>
                ))}
              </div>

            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== 상담 서비스 안내 섹션 ===== */}
      <div className="mt-16 mb-8">
        <div className="text-center mb-10">
          <p className="text-sm tracking-widest text-amber-600 font-semibold uppercase mb-2">HUMAN PRISM CONSULTING</p>
          <h2 className="text-3xl font-bold text-foreground mb-3">사주를 넘어, 삶을 읽다</h2>
          <p className="text-muted-foreground text-base max-w-xl mx-auto">
            30년 내공의 마스터와 함께, 당신의 사주가 전하는 진짜 이야기를 들어보세요.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 카드 1: 개인 AI 상담 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-950 via-amber-900 to-stone-900 p-6 border border-amber-800/40 shadow-xl group hover:scale-[1.02] transition-transform duration-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-xl font-bold text-amber-300 mb-2">AI 개인 상담</h3>
              <p className="text-amber-100/70 text-sm mb-1">원픽 무료 · 알뜰 · 심층 상담</p>
              <p className="text-amber-100/50 text-xs mb-5 leading-relaxed">
                사주 원리에 정통한 AI가 당신의 사주를 깊이 분석합니다. 원픽 무료 상담으로 먼저 경험해 보세요.
              </p>
              <Link href="/plans">
                <button className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold text-sm transition-colors duration-150 active:scale-95">
                  상담 시작하기 →
                </button>
              </Link>
            </div>
          </div>

          {/* 카드 2: 궁합 분석 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-950 via-rose-900 to-stone-900 p-6 border border-rose-800/40 shadow-xl group hover:scale-[1.02] transition-transform duration-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10">
              <div className="text-3xl mb-3">💞</div>
              <h3 className="text-xl font-bold text-rose-300 mb-2">궁합 분석</h3>
              <p className="text-rose-100/70 text-sm mb-1">두 사람의 사주로 보는 인연</p>
              <p className="text-rose-100/50 text-xs mb-5 leading-relaxed">
                연인, 배우자, 동업자 — 두 사람의 사주를 함께 분석하여 관계의 결을 깊이 읽어드립니다.
              </p>
              <Link href="/compatibility">
                <button className="w-full py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-stone-900 font-bold text-sm transition-colors duration-150 active:scale-95">
                  궁합 보러 가기 →
                </button>
              </Link>
            </div>
          </div>

          {/* 카드 3: 마스터와 직접 상담 */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-stone-900 p-6 border border-slate-600/40 shadow-xl group hover:scale-[1.02] transition-transform duration-200">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10">
              <div className="text-3xl mb-3">🧿</div>
              <h3 className="text-xl font-bold text-slate-200 mb-2">마스터와 직접 상담</h3>
              <p className="text-slate-300/70 text-sm mb-1">채팅 · 대면 예약 상담</p>
              <p className="text-slate-300/50 text-xs mb-5 leading-relaxed">
                30년 내공의 마스터가 직접 응대합니다. 하루 세 분만 예약을 받는 프리미엄 상담입니다.
              </p>
              <Link href="/appointments/new">
                <button className="w-full py-2.5 rounded-xl bg-slate-400 hover:bg-slate-300 text-stone-900 font-bold text-sm transition-colors duration-150 active:scale-95">
                  예약 신청하기 →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        description="로그인 후 사주를 저장하고 상담 서비스를 이용할 수 있습니다."
      />
    </div>
  );
}

