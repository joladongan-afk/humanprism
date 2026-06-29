import SiteHeader, { consultActiveTab } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Copy, Download, Loader2, ArrowLeft, X, ChevronDown, ChevronUp } from "lucide-react";
import { SajuBox } from "@/components/SajuBox";
import ShareButton from "@/components/ShareButton";
import { buildConsultShareText } from "@shared/share";
import { USAGE_WINDOW_MS } from "@shared/const";
import { ConsultationAccessToggle } from "@/components/ConsultationAccessToggle";
import { ConsultationEmailShareButton } from "@/components/ConsultationEmailShareButton";
import {
  CHAT_FONT_MIN,
  CHAT_FONT_MAX,
  CHAT_FONT_STEP,
  CHAT_FONT_DEFAULT,
  nextChatFontSize,
  normalizeStoredFontSize,
} from "@shared/chatFont";


function formatRemain(ms: number) {
  if (ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// 횟수제 이용 기한 카운트다운: 남은 ms를 "D일 HH:MM:SS" 형태로.
function formatRemainLong(ms: number) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const hms = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return d > 0 ? `${d}일 ${hms}` : hms;
}

function ConsultationPdfDownloadButton({ sessionId }: { sessionId: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const downloadMutation = trpc.consult.downloadPdf.useMutation();

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const result = await downloadMutation.mutateAsync({ sessionId });
      if (result.base64) {
        const binaryString = atob(result.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("상담 기록이 다운로드되었습니다.");
      }
    } catch (error) {
      console.error("상담 기록 다운로드 실패:", error);
      toast.error("상담 기록 다운로드에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
      className="bg-card"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span className="hidden sm:inline ml-1">상담 기록 PDF</span>
    </Button>
  );
}

function SajuPdfDownloadButton({ sajuId }: { sajuId: number }) {
  const [isLoading, setIsLoading] = useState(false);
  const downloadQuery = trpc.saju.downloadPdf.useQuery(
    { id: sajuId },
    { enabled: false }
  );

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const result = await downloadQuery.refetch();
      if (result.data) {
        const { data, filename } = result.data;
        if (!data) {
          toast.error("PDF 데이터를 찾을 수 없습니다.");
          return;
        }
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${filename} 다운로드 완료!`);
      }
    } catch (error) {
      console.error("다운로드 실패:", error);
      toast.error("PDF 다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
      className="bg-card"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      <span className="hidden sm:inline ml-1">사주 PDF</span>
    </Button>
  );
}

function Consult() {
  const [, params] = useRoute<{ id: string }>("/consult/:id");
  const sessionId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(Date.now());
  const [showManselyeokModal, setShowManselyeokModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 채팅 글자 크기 조절 (50대+ 가독성). localStorage에 영속화.
  const [chatFontSize, setChatFontSize] = useState<number>(() => {
    if (typeof window === "undefined") return CHAT_FONT_DEFAULT;
    return normalizeStoredFontSize(window.localStorage.getItem("hp-chat-font-size"));
  });
  const changeFontSize = (delta: number) => {
    setChatFontSize((prev) => {
      const next = nextChatFontSize(prev, delta);
      try {
        window.localStorage.setItem("hp-chat-font-size", String(next));
      } catch {
        /* localStorage 비활성 환경 무시 */
      }
      return next;
    });
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const sessionQuery = trpc.session.get.useQuery(
    { id: sessionId },
    { enabled: isAuthenticated && sessionId > 0 },
  );
  const messagesQuery = trpc.consult.messages.useQuery(
    { sessionId },
    { enabled: isAuthenticated && sessionId > 0 },
  );

  const utils = trpc.useUtils();

  const primeMutation = trpc.consult.primeGreeting.useMutation({
    onSuccess: () => utils.consult.messages.invalidate({ sessionId }),
  });

  // 채팅방 첫 입장 → 카운트 시작(enterSession). approved 상태에서 1회만 호출.
  const [enterError, setEnterError] = useState<string | null>(null);
  const [enterAttempted, setEnterAttempted] = useState(false);
  const enterMutation = trpc.payment.enterSession.useMutation({
    onSuccess: () => {
      utils.session.get.invalidate({ id: sessionId });
    },
    onError: (e) => {
      setEnterError(e.message || "입장할 수 없는 상태입니다.");
    },
  });
  const sendMutation = trpc.consult.sendMessage.useMutation({
    onSuccess: () => {
      utils.consult.messages.invalidate({ sessionId });
      // 질문 차감 후 남은 질문 수를 즉시 갱신
      utils.session.get.invalidate({ id: sessionId });
      setDraft("");
    },
    onError: (e) => {
      const message = e.message;
      let koreanMessage = message;
      if (message.includes("too_big") || message.includes("<=4000")) {
        koreanMessage = "질문이 너무 깁니다. 4000자 이하로 입력해주세요.";
      } else if (message.includes("String")) {
        koreanMessage = "입력 형식이 올바르지 않습니다.";
      }
      toast.error(koreanMessage);
    },
  });
  const createSajuMutation = trpc.saju.create.useMutation({
    onSuccess: (data) => {
      toast.success("사주가 저장되었습니다. 상담을 계속하세요.");
      setShowManselyeokModal(false);
      utils.session.get.invalidate({ id: sessionId });
      utils.consult.messages.invalidate({ sessionId });
    },
    onError: (e) => {
      const message = e.message;
      let koreanMessage = message;
      if (message.includes("too_big") || message.includes("<=4000")) {
        koreanMessage = "질문이 너무 깁니다. 4000자 이하로 입력해주세요.";
      } else if (message.includes("String")) {
        koreanMessage = "입력 형식이 올바르지 않습니다.";
      }
      toast.error(koreanMessage);
    },
  });
  const endMutation = trpc.session.end.useMutation({
    onSuccess: () => {
      toast.success("상담을 마쳤습니다.");
      setLocation("/me");
    },
  });
  const setRetainMutation = trpc.consult.setRetain.useMutation();
  const [showEndDialog, setShowEndDialog] = useState(false);
  const isEnding = endMutation.isPending || setRetainMutation.isPending;

  // 상담을 종료한다. save=true면 7일 보관, save=false면 비보관(종료 7일 뒤 자동 삭제).
  async function handleEndConsult(save: boolean) {
    try {
      await setRetainMutation.mutateAsync({ sessionId, retain: save });
      await endMutation.mutateAsync({ id: sessionId });
    } catch (e) {
      toast.error("상담 종료 처리 중 문제가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setShowEndDialog(false);
    }
  }

  // 첫 진입 시: 승인된 세션(approved)이면 자동 입장 처리 → 카운트 시작(active 전환)
  useEffect(() => {
    const s = sessionQuery.data;
    if (!s) return;
    if (s.status === "approved" && !enterAttempted && !enterMutation.isPending) {
      setEnterAttempted(true);
      enterMutation.mutate({ sessionId });
    }
  }, [sessionQuery.data, enterAttempted, enterMutation, sessionId]);

  // 첫 진입 시 인사 메시지 확보 (활성 세션에서만)
  useEffect(() => {
    if (!sessionQuery.data || !messagesQuery.data) return;
    if (sessionQuery.data.status === "awaiting_payment" || sessionQuery.data.status === "approved") return;
    if (messagesQuery.data.length === 0 && !primeMutation.isPending) {
      primeMutation.mutate({ sessionId });
    }
  }, [sessionQuery.data, messagesQuery.data, primeMutation, sessionId]);

  // 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesQuery.data, sendMutation.isPending]);

  const remainMs = useMemo(() => {
    if (!sessionQuery.data) return 0;
    return new Date(sessionQuery.data.expiresAt).getTime() - now;
  }, [sessionQuery.data, now]);

  // 질문 횟수제: maxTurns가 있으면 횟수제 세션, 없으면 시간제(마스터 직접 상담).
  const isCountBased = sessionQuery.data?.maxTurns != null;
  const remainTurns = useMemo(() => {
    if (!sessionQuery.data || sessionQuery.data.maxTurns == null) return null;
    return Math.max(0, sessionQuery.data.maxTurns - (sessionQuery.data.usedTurns ?? 0));
  }, [sessionQuery.data]);

  // 횟수제 이용 기한: 첫 입장(firstEnteredAt) + 72시간. 아직 입장 전이면 null(카운트 시작 전).
  const usageDeadline = useMemo(() => {
    const fe = sessionQuery.data?.firstEnteredAt;
    if (!isCountBased || !fe) return null;
    return new Date(fe).getTime() + USAGE_WINDOW_MS;
  }, [isCountBased, sessionQuery.data]);
  // 이용 기한까지 남은 ms (입장 전이면 null).
  const usageRemainMs = usageDeadline != null ? usageDeadline - now : null;
  // 이용 기한 만료 여부.
  const usageExpired = usageRemainMs != null && usageRemainMs <= 0;
  // 경과 안내 단계: 만료 24h 이내면 'urgent', 48h 이내면 'soon', 그 외 'normal'.
  const usageNoticeLevel: "urgent" | "soon" | "normal" | null =
    usageRemainMs == null || usageExpired
      ? null
      : usageRemainMs <= 24 * 60 * 60 * 1000
        ? "urgent"
        : usageRemainMs <= 48 * 60 * 60 * 1000
          ? "soon"
          : "normal";

  function handleSajuSave(sajuData: any) {
    createSajuMutation.mutate(sajuData);
  }

  // 횟수제: 남은 질문이 0이거나 이용 기한(첫 입장+72h)이 지나면 종료. 시간제: 기존 expiresAt 기준.
  // status가 completed/expired이면(상담 마침 포함) 항상 종료로 취급 → 종료 후 안내/배너 미노출 보장.
  const isExpired =
    sessionQuery.data?.status === "completed" ||
    sessionQuery.data?.status === "expired" ||
    (isCountBased ? ((remainTurns ?? 0) <= 0 || usageExpired) : remainMs <= 0);
  const hasSajuData = sessionQuery.data?.sajuProfileId;

  function handleSend() {
    if (!hasSajuData) {
      setShowManselyeokModal(true);
      return;
    }
    const text = draft.trim();
    if (!text) return;
    if (isExpired) {
      toast.error("세션이 종료되었습니다.");
      return;
    }
    sendMutation.mutate({ sessionId, content: text });
  }

  if (authLoading || sessionQuery.isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container py-20 text-center text-muted-foreground">자리를 마련하는 중입니다...</div>
      </div>
    );
  }
  if (!sessionQuery.data) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container py-20 text-center text-muted-foreground">상담 세션을 찾을 수 없습니다.</div>
      </div>
    );
  }

  const session = sessionQuery.data;

  // 입금 신청 후 마스터 승인 대기 중
  if (session.status === "awaiting_payment") {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container max-w-xl py-16">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-8 text-center space-y-4">
            <div className="text-4xl">⏳</div>
            <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100">입금 확인을 기다리고 있습니다</h2>
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              입금이 확인되면 마스터가 승인해 드립니다. <strong>보통 6시간 이내</strong>에 처리되며,
              승인되는 즉시 신청하신 휴대폰 번호로 안내 문자를 보내드립니다.
              <br />승인 후 이 화면을 다시 열면 상담이 바로 시작됩니다.
            </p>
            <Button onClick={() => setLocation("/me")} className="mt-2">내 상담실로 돌아가기</Button>
          </div>
        </div>
      </div>
    );
  }

  // 승인됐으나 입장 유효기간(72시간) 경과로 입장이 막힌 경우
  if (session.status === "approved" && enterError) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container max-w-xl py-16">
          <div className="rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 p-8 text-center space-y-4">
            <div className="text-4xl">🕊️</div>
            <h2 className="text-xl font-bold text-rose-900 dark:text-rose-100">입장 기한이 지났습니다</h2>
            <p className="text-sm leading-relaxed text-rose-800 dark:text-rose-200">{enterError}</p>
            <Button onClick={() => setLocation("/me")} className="mt-2">내 상담실로 돌아가기</Button>
          </div>
        </div>
      </div>
    );
  }

  // approved 상태에서 입장 처리 중(아주 짧은 순간)
  if (session.status === "approved") {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container py-20 text-center text-muted-foreground">상담방을 여는 중입니다...</div>
      </div>
    );
  }

  const planLabel: Record<string, string> = {
    free: "원픽 무료 상담 · 3회",
    taste: "알뜰 상담 · 20회",
    event: "이벤트 상담 · 10회",
    deep: "심층 상담 · 30회",
    master_chat: "마스터 채팅 상담 · 60분",
    master_offline: "마스터 대면 상담 · 80분",
    compatibility_chat: "궁합 채팅 상담 · 10회",
  };

  const headerActiveOverride = consultActiveTab(session.planType);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader activeOverride={headerActiveOverride} />
      {/* 우주 배경 (파란색/바다색 톤) */}
      <div className="page-hero relative w-full h-[360px] flex items-center bg-gradient-to-br from-slate-950 via-cyan-900 to-blue-950 overflow-hidden">
        {/* 우주 배경 그라디언트 - 파란색/바다색 */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-700/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/25 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl" />
        </div>
        
        {/* 별자리 효과 (천체) */}
        <div className="absolute inset-0">
          {[...Array(40)].map((_, i) => {
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
                  boxShadow: `0 0 ${size * 2}px rgba(255, 255, 255, 0.9), 0 0 ${size * 4}px rgba(100, 200, 255, 0.6)`,
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
          <span className="text-base md:text-lg tracking-[0.4em] text-cyan-200/90 font-semibold leading-tight h-6 flex items-center justify-center">
            {session?.planType === 'master_chat' || session?.planType === 'master_offline' ? 'DIRECT CONSULTATION' : 'AI CONSULTATION'}
          </span>
          <h1 className="hanja-display text-6xl md:text-7xl mt-6 text-white leading-[1.3] font-bold">
            {session?.planType === 'master_chat' || session?.planType === 'master_offline'
              ? '마스터와 직접 상담'
              : planLabel[session?.planType ?? ''] ?? 'AI 사주 상담'}
          </h1>
          <div className="gold-divider w-40 mx-auto mt-8" />
          <p className="text-cyan-50/90 mt-8 leading-relaxed max-w-2xl mx-auto text-xl md:text-2xl">
            {session?.planType === 'master_chat' || session?.planType === 'master_offline'
              ? <>30년 경험의 마스터와 함께 깊이 있는 인생 상담을 나누세요.<br />당신의 이야기에 귀 기울이고, 진정한 변화를 함께 만들어갑니다.</>
              : <>AI와 30년 명리 지식이 결합된 깊이 있는 사주 상담입니다.<br />당신의 사주를 바탕으로 인생의 흐름을 함께 읽어드립니다.</>
            }
          </p>
        </div>
      </div>
      
      <div className="container py-8 max-w-7xl flex-1 flex flex-col">
        {/* 뒤로 가기 버튼 */}
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/plans")}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            돌아가기
          </Button>
        </div>
        
        {/* 상단 정보 */}
        <Card className="hanji-card mb-4">
          <CardHeader className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base hanja-display">
                  {session.title || "상담"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {planLabel[session.planType] ?? session.planType}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {isCountBased ? "남은 질문" : "남은 시간"}
                  </div>
                  <div className={`hanja-display text-2xl ${isExpired ? "text-destructive" : "text-gold"}`}>
                    {isCountBased ? `${remainTurns ?? 0}회` : formatRemain(remainMs)}
                  </div>
                  {isCountBased ? (
                    <div className="text-xs text-muted-foreground mt-2 whitespace-nowrap">질문을 사용할 때마다 개수가 차감됩니다</div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-2 whitespace-nowrap">⏱️ 시간 분할 불가</div>
                  )}
                  {/* 횟수제 이용 기한 카운트다운 (첫 입장 후 72시간). 종료된 세션에서는 표시 안 함. */}
                  {isCountBased && !isExpired && usageRemainMs != null && (
                    <div className="mt-2 border-t border-border/60 pt-2">
                      <div className="text-xs text-muted-foreground">이용 기한</div>
                      <div
                        className={`hanja-display text-lg tabular-nums ${
                          usageNoticeLevel === "urgent" ? "text-destructive" : usageNoticeLevel === "soon" ? "text-amber-600" : "text-foreground"
                        }`}
                      >
                        {formatRemainLong(usageRemainMs)}
                      </div>
                    </div>
                  )}
                </div>
  
                {session.sajuProfileId && (
                  <SajuPdfDownloadButton sajuId={session.sajuProfileId} />
                )}
                <ConsultationPdfDownloadButton sessionId={sessionId} />
                <ConsultationEmailShareButton sessionId={sessionId} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEndDialog(true)}
                  disabled={isEnding || session.status === "completed"}
                  className="bg-card"
                >
                  상담 마치기
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 이용 기한 임박 경고 배너 (만료 48h 이내: 안내 / 24h 이내: 강조). 종료된 세션에서는 절대 노출 안 됨. */}
        {isCountBased && !isExpired && (usageNoticeLevel === "soon" || usageNoticeLevel === "urgent") && usageRemainMs != null && (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${
              usageNoticeLevel === "urgent"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-amber-300 bg-amber-50 text-amber-800"
            }`}
          >
            <span className="font-semibold">
              {usageNoticeLevel === "urgent" ? "이용 종료까지 24시간 이내" : "이용 종료까지 48시간 이내"}
            </span>
            {" — 남은 질문은 지금 편하게 이어가셔도 됩니다. 기한이 지나면 남은 질문이 있어도 상담이 종료됩니다."}
            <span className="ml-1 whitespace-nowrap font-medium">(남은 이용 시간 {formatRemainLong(usageRemainMs)})</span>
          </div>
        )}

        {/* 동의 설정 */}
        <div className="mb-4">
          <ConsultationAccessToggle
            sessionId={sessionId}
            initialAllow={session.allowMasterAccess ?? false}
          />
        </div>

        {/* 메시지 영역 (입력창은 대화 흐름 맨 끝으로 이동) */}
        <div className="flex gap-2 lg:gap-4 flex-1 min-h-[75vh] flex-col lg:flex-row w-full">
          <Card className="hanji-card flex-1 flex flex-col lg:flex-[1_1_auto]">
            <CardContent className="flex-1 overflow-hidden p-0">
              <div ref={scrollRef} className="h-[75vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
                <div className="p-4 lg:p-8 space-y-4 lg:space-y-8">
                {(messagesQuery.data ?? []).map((m) => (
                  <MessageBubble key={m.id} role={m.role} content={m.content} sessionId={sessionId} fontSize={chatFontSize} />
                ))}
                {sendMutation.isPending && (
                  <div className="flex gap-3 items-end">
                    <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base bg-gradient-to-br from-[#1A1A6E] to-[#6B35B8]">
                      A
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-xs font-semibold tracking-wide text-[#6B35B8]">마스터</div>
                      <div className="inline-block text-left px-5 py-4 rounded-2xl shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50 text-[#1A1A6E] border border-[#6B35B8]/30">
                        <div className="flex gap-2 items-center py-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse [animation-delay:200ms]" />
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse [animation-delay:400ms]" />
                          <span className="text-sm text-slate-600 ml-2">생각 중...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!hasSajuData && (messagesQuery.data ?? []).length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <h3 className="font-bold text-lg mb-3 text-blue-900">정확한 사주 정보가 필요합니다</h3>
                    <p className="text-sm text-blue-800 mb-4">대화창에 직접 생년월일을 입력하면 AI의 오류로 인해 정확한 사주가 잘못 계산될 수 있습니다.</p>
                    <p className="text-sm text-blue-800 mb-6">만세력을 이용하여 정확한 사주를 뽑은 후 상담을 시작해 주세요.</p>
                    <Button
                      onClick={() => setShowManselyeokModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      만세력으로 사주 입력하기
                    </Button>
                  </div>
                )}
                {(messagesQuery.data ?? []).length === 0 && hasSajuData && (
                  <div className="py-6 space-y-4">
                    {/* 입장 안내 (횟수제 세션에서만 강조) — 7대 사주명가 알고리즘 AI 상담 */}
                    {isCountBased && (
                      <div className="mx-auto max-w-md rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-5 text-center shadow-md">
                        <p className="text-white text-base font-extrabold leading-snug">
                          휴먼 프리즘 AI 상담에 오신 것을 환영합니다.
                        </p>
                        <p className="text-indigo-100 text-sm mt-2 leading-relaxed">
                          7대 사주명가의 알고리즘을 담은 휴먼 프리즘이
                          이번 상담에서 <span className="font-bold text-white">총 {remainTurns ?? sessionQuery.data?.maxTurns}회</span>의 질문을 함께합니다.
                        </p>
                        <p className="text-indigo-100 text-sm mt-2 leading-relaxed">
                          정해진 질문 개수 안에서는 본인·가족·연인·친구 누구의 사주든
                          몇 명이든 제한 없이 물어보실 수 있습니다.
                        </p>
                        <p className="text-amber-200 text-xs mt-3 leading-relaxed">
                          💡 여러 궁금증을 한 번에 묶어 질문하시면 더 깊고 풍성한 답변을 받으실 수 있습니다.
                        </p>
                      </div>
                    )}
                    <p className="text-center text-muted-foreground">
                      잠시 호흡을 가다듬는 중입니다...
                    </p>
                  </div>
                )}

                {/* 질문 입력창 — 대화 흐름 맨 끝에 붙어 마지막 답변 바로 아래에 위치 (분리된 박스) */}
                {hasSajuData && !isExpired && (
                  <div className="pt-2">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-2 border-blue-300 rounded-xl p-3 lg:p-4 flex flex-col gap-2 lg:gap-3 shadow-md">
                      <div className="flex items-center gap-2 text-blue-800">
                        <span className="text-xl lg:text-2xl">✍️</span>
                        <span className="text-lg lg:text-xl font-extrabold tracking-tight">질문 입력창</span>
                        <span className="text-xs lg:text-sm text-blue-600 font-medium ml-1">— 마스터의 답변 바로 여기서 이어서 물어보세요</span>
                      </div>
                      {/* 가벼운 질문도 1회가 차감되므로 신중하게. 횟수제 세션에서만 강조. */}
                      {isCountBased && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                          <span className="text-base leading-none mt-0.5">⚠️</span>
                          <p className="text-xs lg:text-sm text-amber-900 leading-relaxed">
                            <span className="font-bold">가벼운 인사·단답도 질문 1회로 차감됩니다.</span>{" "}
                            한 문장씩 끊어서 보내기보다, 궁금한 점을 차분히 정리해 <span className="font-semibold">한 번에 정성스럽게</span> 물어보세요. 의미 없는 차감을 막고 더 깊은 답을 받으실 수 있습니다.
                          </p>
                        </div>
                      )}
                      <Textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing || (e as any).keyCode === 229) {
                            return;
                          }
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="질문을 입력하세요"
                        rows={3}
                        className="resize-none border border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent bg-white rounded-md px-3 lg:px-4 py-2 lg:py-3 text-sm lg:text-base"
                        disabled={sendMutation.isPending}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs lg:text-sm text-blue-700 font-medium px-2 flex-1 truncate">
                          {sendMutation.isPending ? "생각 중..." : "Enter 전송 · Shift+Enter 줄바꿈"}
                        </span>
                        <Button
                          onClick={handleSend}
                          disabled={!draft.trim() || sendMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 lg:px-6 py-2 text-sm lg:text-base whitespace-nowrap"
                        >
                          보내기
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-200/70 pt-2">
                        <p className="text-xs text-blue-700/80 leading-relaxed">
                          이 상담은 종료 후 <span className="font-semibold">7일간 저장</span>되며 ‘내 상담실’에서 다시 확인하실 수 있습니다. 원하시면 저장하지 않게 종료하실 수도 있습니다.
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEndDialog(true)}
                          disabled={isEnding}
                          className="h-auto px-2 py-1 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 whitespace-nowrap"
                        >
                          상담 종료 · 저장 설정
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 세션 종료 시 안내 (대화 흐름 끝) */}
                {isExpired && (
                  <div className="pt-2">
                    <div className="hanji-card p-6 text-center">
                      <p className="text-muted-foreground mb-3">
                        {isCountBased
                          ? "이번 상담의 질문을 모두 사용하셨습니다. 한 결을 마칩니다."
                          : "상담 시간이 모두 흘렀습니다. 한 결을 마칩니다."}
                      </p>
                      <Button onClick={() => setLocation("/plans")} className="bg-primary text-primary-foreground">
                        새로운 상담 시작
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          </Card>
          
          {/* 우측 여백: 추가 사주 입력 (PC 마담) */}
          <div className="w-full lg:w-80 lg:flex flex-col gap-3 hidden lg:flex mt-4 lg:mt-0">
            {/* 사주 입력 버튼 */}
            <Card className="hanji-card p-3">
              <Button
                onClick={() => setShowManselyeokModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold py-4"
              >
                추가인원 사주 입력
              </Button>
              
              {/* 글자 크기 콘트롤 */}
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="글자 작게"
                    onClick={() => changeFontSize(-CHAT_FONT_STEP)}
                    disabled={chatFontSize <= CHAT_FONT_MIN}
                    className="flex-1 h-11 rounded-lg flex items-center justify-center text-base font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-[0.95]"
                  >
                    글자 작게
                  </button>
                  <button
                    type="button"
                    aria-label="글자 크게"
                    onClick={() => changeFontSize(CHAT_FONT_STEP)}
                    disabled={chatFontSize >= CHAT_FONT_MAX}
                    className="flex-1 h-11 rounded-lg flex items-center justify-center text-base font-bold bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-[0.95]"
                  >
                    글자 크게
                  </button>
                </div>
              </div>
            </Card>
            
            {/* 사주 박스 */}
            {(session.sajuProfileId || (session.additionalSajus as any)?.length > 0 || (session as any).sajuProfileBId) && (
              <Card className="hanji-card p-4">
                <div className="space-y-2">
                  {/* 궁합 채팅: 두 사람 사주 나란히 표시 */}
                  {session.planType === "compatibility_chat" && (session as any).sajuProfileBId ? (
                    <>
                      {session.sajuProfileId && (
                        <SajuBoxToggle profileId={session.sajuProfileId} label="첫 번째" tone="self" />
                      )}
                      <SajuBoxToggle profileId={(session as any).sajuProfileBId} label="두 번째" tone="other" />
                    </>
                  ) : (
                    <>
                      {session.sajuProfileId && (
                        <SajuBoxToggle profileId={session.sajuProfileId} label="본인" tone="self" />
                      )}
                      {(session.additionalSajus as any)?.map((saju: any, idx: number) => (
                        saju.sajuProfileId ? (
                          <SajuBoxToggle key={idx} profileId={saju.sajuProfileId} label={saju.label || `상대 ${idx + 1}`} tone="other" />
                        ) : (
                          <div key={idx} className="text-xs bg-blue-50 rounded p-2 border border-blue-200">
                            <div className="font-medium text-blue-900">{saju.label}</div>
                          </div>
                        )
                      ))}
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* 이용 문의 안내 - 대화 영역 아래 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/70 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 shrink-0 text-sm">📞</span>
            <p className="text-xs font-medium text-amber-800">이용 관련 문의는 문자로 접수해 주세요 <span className="text-amber-600">(09:00~21:00)</span></p>
          </div>
          <a href="sms:01044488064" className="shrink-0">
            <button className="px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs transition-colors">
              010-4448-8064
            </button>
          </a>
        </div>
      </div>

      {/* 만세력 모달 */}
      {showManselyeokModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">사주 정보 입력</CardTitle>
              <button
                onClick={() => setShowManselyeokModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-muted-foreground mb-4">
                상담을 계속하기 위해 사주 정보를 입력해주세요. 입력 후 저장하면 자동으로 상담이 계속됩니다.
              </p>
            <Button
              onClick={() => setLocation(`/saju/new?modal=true&returnTo=/consult/${sessionId}&sessionId=${sessionId}&isAdditional=true`)}
              className="w-full bg-primary text-primary-foreground text-lg py-6"
            >
              만세력 입력하기
            </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 상담 종료 확인 다이얼로그: 저장(7일 보관) / 저장하지 않고 종료 */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-xl hanja-display">상담을 종료할까요?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                상담을 종료하면 사용하지 않은 질문은 소멸되며 다시 이어갈 수 없습니다. 저장 방식을 선택해 주세요.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={() => handleEndConsult(true)}
                  disabled={isEnding}
                  className="w-full bg-primary text-primary-foreground py-5 text-base"
                >
                  {isEnding ? "처리 중..." : "저장하고 종료 (7일간 보관)"}
                </Button>
                <p className="text-xs text-muted-foreground text-center px-2">
                  종료 후 7일간 ‘내 상담실’에서 다시 볼 수 있습니다.
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => handleEndConsult(false)}
                  disabled={isEnding}
                  className="w-full py-5 text-base bg-card text-destructive border-destructive/40 hover:bg-destructive/5"
                >
                  {isEnding ? "처리 중..." : "저장하지 않고 종료"}
                </Button>
                <p className="text-xs text-muted-foreground text-center px-2">
                  이 상담 기록은 종료 7일 뒤 자동 삭제되며 이후 복구할 수 없습니다.
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowEndDialog(false)}
                disabled={isEnding}
                className="w-full text-muted-foreground"
              >
                계속 상담하기
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/** 입력된 사주 항목 - 클릭 시 검증된 사주 박스를 펼친다. */
function SajuBoxToggle({ profileId, label, tone }: { profileId: number; label: string; tone: "self" | "other" }) {
  const [open, setOpen] = useState(true);
  const profileQuery = trpc.saju.get.useQuery({ id: profileId }, { enabled: open });
  const sajuData = (profileQuery.data as any)?.sajuData;
  const profile = profileQuery.data as any;
  const headerColor = tone === "self" ? "text-amber-800" : "text-blue-900";
  const headerBg = tone === "self" ? "bg-amber-50/70 border-amber-200" : "bg-blue-50 border-blue-200";

  // 이름/성별/나이 계산
  const displayName = profile?.realName || profile?.label || label;
  const genderLabel = profile?.gender === "male" ? "남" : profile?.gender === "female" ? "여" : "";
  const age = profile?.birthYear ? `${new Date().getFullYear() - profile.birthYear + 1}세` : "";

  return (
    <div className={`rounded-lg border ${headerBg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-3 text-left transition-colors hover:bg-black/[0.03] active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <span className={`text-lg font-semibold ${headerColor}`}>{displayName}</span>
          {(genderLabel || age) && (
            <span className="text-sm text-slate-500 font-medium">
              {[genderLabel, age].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && (
        <div className="px-2 pb-2">
          {profileQuery.isLoading ? (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> 사주를 불러오는 중...
            </div>
          ) : sajuData ? (
            <SajuBox data={sajuData} />
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">사주 정보를 불러올 수 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  role,
  content,
  pending,
  sessionId,
  fontSize = 16,
}: {
  role: string;
  content: string;
  pending?: boolean;
  sessionId?: number;
  fontSize?: number;
}) {
  const isUser = role === "user";
  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => toast.success("복사했습니다."));
  };
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center hanja-display text-base font-bold ${
          isUser
            ? "text-[#3D2000] bg-gradient-to-br from-[#F5A623] to-[#F9C784]"
            : "text-white bg-gradient-to-br from-[#1A1A6E] to-[#6B35B8]"
        }`}
      >
        {isUser ? "Q" : "A"}
      </div>
      <div className={`flex flex-col gap-1 ${isUser ? "items-end" : ""}`}>
        <div className={`text-xs font-semibold tracking-wide ${isUser ? "text-[#9a6a1a]" : "text-[#6B35B8]"}`}>
          {isUser ? "고객님" : "마스터"}
        </div>
        <div
          className={`inline-block text-left px-4 lg:px-6 py-3 lg:py-4 rounded-2xl shadow-sm max-w-[85%] lg:max-w-2xl ${
            isUser
              ? "text-[#3D2000] bg-gradient-to-br from-[#F5A623] to-[#F9C784] border border-[#F5A623]/40"
              : "text-[#1A1A6E] bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-transparent [background-clip:padding-box,border-box] [background-origin:padding-box,border-box] [background-image:linear-gradient(to_bottom_right,#f5f3ff,#faf5ff),linear-gradient(to_bottom_right,#1A1A6E,#6B35B8)]"
          }`}
        >
          {pending ? (
            <div className="flex gap-1.5 items-center py-2">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:200ms]" />
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse [animation-delay:400ms]" />
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap leading-relaxed" style={{ fontSize: `${fontSize}px` }}>{content}</div>
          ) : (
            <div className="prose max-w-none leading-[1.85] text-[#1A1A6E] prose-headings:text-[#1A1A6E] prose-strong:text-[#6B35B8] prose-p:text-[#1A1A6E] prose-li:text-[#1A1A6E]" style={{ fontSize: `${fontSize}px` }}>
              <Streamdown>{content}</Streamdown>
            </div>
          )}
        </div>
        {!pending && !isUser && content.length > 80 && (
          <div className="mt-1 flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> 복사
            </button>
            <ShareButton
              variant="ghost"
              title="휴먼프리즘 상담 기록"
              description={buildConsultShareText(content)}
              label="공유"
              className="h-auto px-1 py-0 text-xs text-muted-foreground hover:text-foreground"
              enableEmailShare={true}
              sessionId={sessionId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
export default Consult;
