import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import LoginDialog from "@/components/LoginDialog";
import { trpc } from "@/lib/trpc";
import { usePortonePayment, PortonePaymentError } from "@/hooks/usePortonePayment";
import DepositRequestDialog, { DepositPlanType } from "@/components/DepositRequestDialog";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Link } from "wouter";

type PlanKey = "free" | "taste" | "event" | "deep" | "master_kakao_15" | "master_kakao_30" | "master_kakao_60";

// 화면에 노출할 플랜과 순서 (event는 프로모션 재사용을 위해 코드에는 남겨두되 평소엔 숨김)
const VISIBLE_PLANS: PlanKey[] = ["free", "taste", "deep", "master_kakao_15", "master_kakao_30", "master_kakao_60"];

const PLAN_DETAIL: Record<
  PlanKey,
  {
    no: string;
    title: string;
    badge?: string;
    price: string;
    duration: string;
    body: string;
    accent?: boolean;
    primary?: boolean;
  }
> = {
  free: {
    no: "01",
    title: "원픽 무료 상담",
    badge: "1 아이디 최초 1회 무료",
    price: "무료",
    duration: "질문 3회",
    body:
      "무료가 목적이 아닙니다. 휴먼프리즘이 어떤 시스템인지, 그 놀라운 경험을 선물해 드리는 것이 목적입니다.",
  },
  taste: {
    no: "02",
    title: "알뜰 상담 · 핵심 위주",
    price: "9,900원",
    duration: "질문 20회",
    body:
      "**마스터와 7대 사주명가의 비기를 탑재한 AI와 문답할 수 있습니다.**\n\n질문은 20회로 넉넉히 제공합니다. 5만원짜리 상담, 그 이상의 퀄리티를 느껴보세요.",
  },
  deep: {
    no: "03",
    title: "심층 상담 · 삶 전체를 깊이",
    price: "14,900원",
    duration: "질문 30회",
    body:
      "**마스터와 7대 사주명가의 비기를 탑재한 AI와 문답할 수 있습니다.**\n\n질문은 30회로 좀 더 많은 문답을 주고받으실 수 있습니다. 10만원짜리 상담, 그 이상의 퀄리티를 느껴보세요.",
    accent: true,
    primary: true,
  },
  event: {
    no: "04",
    title: "이벤트 상담",
    badge: "1 아이디 최초 1회 무료",
    price: "무료",
    duration: "질문 10회",
    body:
      "이벤트 상담의 퀄리티는 심층 상담과 차이가 없습니다. 그 차이를 누려보세요!",
  },
  master_kakao_15: {
    no: "04",
    title: "마스터 직접 채팅 · 15분",
    price: "30,000원",
    duration: "15분",
    body: "실속파를 위한 핵심 상담 플랜\n\n**미리 준비하면 가성비 좋은 상담이 됩니다.**\n\n1인 상담 입니다.",
  },
  master_kakao_30: {
    no: "05",
    title: "마스터 직접 채팅 · 30분",
    badge: "추천",
    price: "50,000원",
    duration: "30분",
    body: "궁금한 점이 많을 때.\n\n**30분간 무제한 질문 가능**\n\n1인 상담 입니다.",
    accent: true,
  },
  master_kakao_60: {
    no: "06",
    title: "마스터 직접 채팅 · 60분",
    badge: "인원무제한",
    price: "100,000원",
    duration: "60분",
    body: "나와 주변의 모든 사람에 대한 상담 가능\n\n**가성비 끝판왕.**\n\n60분, 휴식 없이 쭉 갑니다.",
  },
};

export default function Plans() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<PlanKey | null>(null);
  const profilesQuery = trpc.saju.list.useQuery(undefined, { enabled: isAuthenticated });
  const freeStatusQuery = trpc.payment.freeStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const eventStatusQuery = trpc.payment.eventStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [profileId, setProfileId] = useState<string>("");
  const [eventCode, setEventCode] = useState<string>("");
  const [loginOpen, setLoginOpen] = useState(false);
  // 무통장 입금 신청 다이얼로그 상태
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositPlan, setDepositPlan] = useState<DepositPlanType | null>(null);
  const [depositProfileId, setDepositProfileId] = useState<number | undefined>(undefined);

  // 쿼리 파라미터에서 profile ID 자동 선택
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const profileParam = params.get("profile");
    if (profileParam && profilesQuery.data) {
      setProfileId(profileParam);
    }
  }, [location, profilesQuery.data]);

  // 첫 방문 팝업의 "무료 체험 시작"(/plans?start=free)에서 진입한 경우
  // 무료 상담 흐름을 한 번만 자동으로 트리거한다.
  const [autoFreeTriggered, setAutoFreeTriggered] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    if (params.get("start") !== "free" || autoFreeTriggered) return;
    // 비로그인 사용자는 로그인 다이얼로그가 뜨도록 handleStart가 처리한다.
    // 로그인 사용자는 프로필 조회/무료 사용여부가 로드된 뒤 실행한다.
    if (isAuthenticated && (profilesQuery.isLoading || freeStatusQuery.isLoading)) return;
    setAutoFreeTriggered(true);
    // 쿼리스트링 정리(새로고침 시 재트리거 방지)
    window.history.replaceState({}, "", "/plans");
    handleStart("free");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isAuthenticated, profilesQuery.isLoading, freeStatusQuery.isLoading, autoFreeTriggered]);

  const startPayment = usePortonePayment();

  const handleStart = async (plan: PlanKey) => {
    if (!isAuthenticated) {
      setLoginOpen(true);
      return;
    }

    // free 플랜은 이미 사용했으면 불가
    if (plan === "free" && freeStatusQuery.data?.used) {
      toast.error("원픽 무료 상담은 이미 사용하셨습니다.");
      return;
    }

    // event 플랜은 이미 사용했으면 불가
    if (plan === "event" && eventStatusQuery.data?.used) {
      toast.error("이벤트 상담은 이미 사용하셨습니다.");
      return;
    }

    // free 플랜: 저장된 프로필이 있으면 선택 다이얼로그, 없으면 만세력 입력
    if (plan === "free") {
      const profiles = profilesQuery.data ?? [];
      if (profiles.length > 0) {
        setSelected("free");
      } else {
        setLocation("/saju/new?plan=free");
      }
      return;
    }

    // event 플랜: 무료 + 시크릿 코드 필요 → 결제 확인 모달(심층 상담 14,900원)을 거치지 않고
    // 곳바로 시크릿 코드 + 프로필 선택 다이얼로그를 열어 잘못 표시되던 버그를 막는다.
    if (plan === "event") {
      setSelected("event");
      return;
    }

    // 유료 AI 상담 플랜 (taste, deep) 및 마스터 직접 채팅 3종 - 사주 선택 없이 바로 무통장 입금 신청 다이얼로그를 열다.
    // 상담할 사주는 결제가 아니라 채팅방 입장 후 대화로 받는다(시간제·인원 무제한 가치 보존).
    if (plan === "taste" || plan === "deep" || plan === "master_kakao_15" || plan === "master_kakao_30" || plan === "master_kakao_60") {
      setDepositPlan(plan);
      setDepositProfileId(undefined);
      setDepositOpen(true);
      return;
    }
  };

  const confirmPayWithPlan = async (plan: PlanKey, pId: string) => {
    if (!pId) {
      toast.error("사주 프로필을 선택해주세요.");
      return;
    }

    // event 플랜은 시크릿 코드 필수
    if (plan === "event" && !eventCode.trim()) {
      toast.error("시크릿 코드를 입력해주세요.");
      return;
    }

    try {
      const result = await startPayment.startPayment({
        planType: plan,
        sajuProfileId: parseInt(pId),
        eventCode: plan === "event" ? eventCode : undefined,
      });

      if (result.requiresAppointment) {
        setLocation(`/appointments/new?paymentId=${result.paymentId}`);
      } else if (result.sessionId) {
        setLocation(`/consult/${result.sessionId}`);
      }
    } catch (e) {
      if (e instanceof PortonePaymentError) {
        toast.error(e.message);
      } else {
        toast.error("결제 중 오류가 발생했습니다.");
      }
    } finally {
      setSelected(null);
      setEventCode("");
    }
  };

  const confirmPay = async () => {
    if (!selected) {
      toast.error("플랜을 선택해주세요.");
      return;
    }
    
    // profileId가 있으면 사용, 없으면 첫 번째 프로필 사용
    const pId = profileId || (profilesQuery.data?.[0]?.id.toString());
    if (!pId) {
      toast.error("사주 프로필을 선택해주세요.");
      return;
    }

    // free 플랜: 선택된 프로필로 freeMockPay 호출
    if (selected === "free") {
      try {
        const result = await startPayment.startPayment({
          planType: "free",
          sajuProfileId: parseInt(pId),
        });
        if (result.sessionId) {
          setSelected(null);
          setLocation(`/consult/${result.sessionId}`);
        }
      } catch (e) {
        if (e instanceof PortonePaymentError) {
          toast.error(e.message);
        } else {
          toast.error("상담 시작 중 오류가 발생했습니다.");
        }
      }
      return;
    }

    await confirmPayWithPlan(selected, pId);
  };



  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      {/* 히어로 배경 섹션 */}
        <div className="page-hero relative w-full min-h-[360px] md:h-[360px] flex items-center bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900 overflow-visible py-10 md:py-0">
        {/* 우주 배경 그라디언트 - 네이비 톤 */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-700/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />
        </div>
        
        {/* 별자리 효과 (천체) */}
        <div className="absolute inset-0">
          {[...Array(45)].map((_, i) => {
            const size = Math.random() > 0.75 ? 2.5 : 1.5;
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
                  boxShadow: `0 0 ${size * 2}px rgba(255, 255, 255, 0.9), 0 0 ${size * 4}px rgba(150, 200, 255, 0.6)`,
                }}
              />
            );
          })}
          {/* 별 연결선 효과 (별자리) */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.25 }} preserveAspectRatio="none">
            <line x1="5%" y1="15%" x2="20%" y2="30%" stroke="white" strokeWidth="0.5" />
            <line x1="20%" y1="30%" x2="35%" y2="20%" stroke="white" strokeWidth="0.5" />
            <line x1="35%" y1="20%" x2="50%" y2="35%" stroke="white" strokeWidth="0.5" />
            <line x1="55%" y1="10%" x2="70%" y2="25%" stroke="white" strokeWidth="0.5" />
            <line x1="70%" y1="25%" x2="85%" y2="15%" stroke="white" strokeWidth="0.5" />
            <line x1="10%" y1="65%" x2="25%" y2="75%" stroke="white" strokeWidth="0.5" />
            <line x1="25%" y1="75%" x2="40%" y2="70%" stroke="white" strokeWidth="0.5" />
            <line x1="60%" y1="70%" x2="75%" y2="80%" stroke="white" strokeWidth="0.5" />
            <line x1="75%" y1="80%" x2="85%" y2="75%" stroke="white" strokeWidth="0.5" />
            <line x1="15%" y1="40%" x2="30%" y2="50%" stroke="white" strokeWidth="0.5" />
            <line x1="65%" y1="35%" x2="80%" y2="50%" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>
        
        {/* 콘텐츠 */}
        <div className="relative z-10 container max-w-6xl mx-auto text-center">
          <span className="text-base md:text-lg tracking-[0.4em] text-cyan-300/80 font-semibold leading-tight h-6 flex items-center justify-center mt-4">CONSULTATION PLANS</span>
          <h1 className="hanja-display text-6xl md:text-7xl mt-6 text-white leading-[1.3] font-bold">
            상담 안내
          </h1>
          <div className="gold-divider w-40 mx-auto mt-8" />
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <span className="font-bold text-amber-300 text-xl">01-03</span>
            <span className="text-white text-xl font-semibold">대화형 AI 문답 사주</span>
            <span className="text-white/50 text-xl mx-1">/</span>
            <span className="font-bold text-amber-300 text-xl">04-06</span>
            <span className="text-white text-xl font-semibold">마스터 직접 채팅</span>
          </div>
        </div>
      </div>

      {/* 플랜 카드 섹션 */}
      <div className="container py-16 max-w-7xl">
        {/* 플랜 카드 그리드 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {VISIBLE_PLANS.map((key) => {
            const plan = PLAN_DETAIL[key];
            const isFreePlanUsed = key === "free" && freeStatusQuery.data?.used;
            const isEventPlanUsed = key === "event" && eventStatusQuery.data?.used;
            const isDisabled = isFreePlanUsed || isEventPlanUsed;

            return (
              <Card
                key={key}
                className={`hanji-card flex flex-col ${plan.accent ? "border-gold" : ""} ${
                  plan.primary ? "ring-2 ring-gold" : ""
                } ${isDisabled ? "opacity-50" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className="flex items-center justify-center rounded-full font-extrabold shrink-0"
                      style={{
                        width: "42px",
                        height: "42px",
                        fontSize: "18px",
                        background: "rgba(212,160,23,0.12)",
                        border: "2px solid rgba(212,160,23,0.55)",
                        color: "#D4A017",
                      }}
                    >
                      {plan.no}
                    </span>
                    {plan.badge && (
                      <span
                        className="font-bold tracking-wide rounded-full"
                        style={{
                          fontSize: "13px",
                          padding: "6px 14px",
                          background: "linear-gradient(135deg, #D4A017, #F4D98A)",
                          color: "#241a08",
                          boxShadow: "0 2px 10px rgba(212,160,23,0.45)",
                        }}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl">{plan.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <div>
                    <p className="text-2xl font-bold text-gold">{plan.price}</p>
                    <p className="text-base text-muted-foreground mt-1">{plan.duration}</p>
                  </div>
                  <p className="text-lg text-muted-foreground flex-1 whitespace-pre-wrap leading-relaxed">
                    {(() => {
                      const paragraphs = plan.body.split('\n\n');
                      return paragraphs.map((paragraph, idx) => {
                        const isEmphasis = paragraph.startsWith('**') && paragraph.endsWith('**');
                        const text = isEmphasis ? paragraph.slice(2, -2) : paragraph;
                        return (
                          <span key={idx}>
                            {isEmphasis ? (
                              <span className="block text-base font-bold text-orange-500 mt-2">{text}</span>
                            ) : (
                              <span>{text}</span>
                            )}
                            {idx < paragraphs.length - 1 && <br />}
                          </span>
                        );
                      });
                    })()}
                  </p>
                  <Button
                    onClick={() => handleStart(key)}
                    disabled={isDisabled || startPayment.isProcessing}
                    className={`w-full ${
                      plan.primary
                        ? "bg-primary hover:bg-jusa-deep text-primary-foreground"
                        : "bg-black hover:bg-gray-800 text-white"
                    }`}
                  >
                    {isFreePlanUsed || isEventPlanUsed ? "이미 사용함" : "선택하기"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 이용 문의 안내 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded-lg border border-amber-300 bg-amber-50 mt-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-700 text-lg mt-0.5 shrink-0">📞</span>
            <div>
              <p className="font-semibold text-amber-900">이용 관련 문의는 문자로 접수해 주세요</p>
              <p className="text-sm text-amber-900/80 mt-0.5 leading-relaxed">
                결제 오류, 접속 지연, 사이트 오작동 등 문제가 있으면 아래 번호로 문자를 남겨주세요. <span className="font-semibold">문자 응대 09:00~21:00</span>
              </p>
            </div>
          </div>
          <a href="sms:01044488064" className="shrink-0">
            <button className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-mono text-base transition-colors">
              010-4448-8064
            </button>
          </a>
        </div>
      </div>

      {/* 프로필 선택 다이얼로그 */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected === "event" ? "이벤트 상담" : selected === "free" ? "원픽 무료 상담" : "사주 프로필 선택"}
            </DialogTitle>
            <DialogDescription>
              {selected === "event"
                ? "시크릿 코드를 입력하고 사주 프로필을 선택해주세요."
                : selected === "free"
                ? "저장된 사주 중 상담할 프로필을 선택하거나, 새로 입력하세요."
                : "상담에 사용할 사주 프로필을 선택해주세요."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* event 플랜: 시크릿 코드 입력 */}
            {selected === "event" && (
              <div className="space-y-2">
                <label className="text-base font-medium">시크릿 코드</label>
                <input
                  type="text"
                  placeholder="HUMAN로 시작하는 코드를 입력하세요"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-sm text-muted-foreground">
                  예: HUMAN847, HUMAN312
                </p>
              </div>
            )}
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="프로필 선택" />
              </SelectTrigger>
              <SelectContent>
                {(profilesQuery.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.label || `${p.birthYear}년 ${p.birthMonth}월 ${p.birthDay}일`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href={selected === "free" ? "/saju/new?plan=free" : "/saju/new"}>
              <Button variant="outline" className="w-full" onClick={() => setSelected(null)}>
                {selected === "free" ? "새로 사주 입력하기" : "새 프로필 추가"}
              </Button>
            </Link>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              취소
            </Button>
            <Button onClick={confirmPay} disabled={!profileId || startPayment.isProcessing}>
              {startPayment.isProcessing ? "처리 중..." : "진행"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 무통장 입금 신청 다이얼로그 (유료 플랜 결제 입구) */}
      <DepositRequestDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        planType={depositPlan}
        sajuProfileId={depositProfileId}
      />



      {/* 로그인 다이얼로그 */}
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}
