import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";

export default function AppointmentNew() {
  const { isAuthenticated, loading: authLoading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const search = useSearch();
  const [, setLocation] = useLocation();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const paymentId = params.get("paymentId");
  const planFromUrl = params.get("plan");

  const isOffline = planFromUrl === "master_offline";
  const [consultType, setConsultType] = useState<"chat" | "offline">(
    isOffline ? "offline" : "chat",
  );
  // 제목/가격은 선택한 상담 유형에 따라 자연스럽게 바뀝니다.
  const typeLabel = consultType === "offline" ? "대면" : "채팅";
  const planPrice =
    consultType === "offline" ? "200,000원 / 80분" : "100,000원 / 60분";
  const planTitle = `마스터와 직접 ${typeLabel} 상담`;
  const [realName, setRealName] = useState("");
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [preferredDate, setPreferredDate] = useState("");
  const [alternativeDate, setAlternativeDate] = useState("");
  const [notes, setNotes] = useState("");

  const createMutation = trpc.appointment.create.useMutation({
    onSuccess: () => {
      toast.success("예약 요청이 전송되었습니다. 빠른 확정을 위해 010-4448-8064로 문자를 남겨주세요.", { duration: 6000 });
      setLocation("/me");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    if (!realName || !phone || !preferredDate) {
      toast.error("실명, 연락처, 희망 일시는 필수입니다.");
      return;
    }
    const pref = new Date(preferredDate);
    if (isNaN(pref.getTime())) {
      toast.error("희망 일시 형식이 올바르지 않습니다.");
      return;
    }
    createMutation.mutate({
      paymentId: paymentId ? parseInt(paymentId) : undefined,
      consultType,
      realName,
      nickname: nickname || undefined,
      phone,
      preferredDate: pref,
      alternativeDate: alternativeDate ? new Date(alternativeDate) : undefined,
      notes: notes || undefined,
    });
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container py-20 text-center text-muted-foreground">자리를 마련하는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
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
          <span className="text-base md:text-lg tracking-[0.4em] text-cyan-200/90 font-semibold leading-tight h-6 flex items-center justify-center">APPOINTMENT</span>
          <h1 className="hanja-display text-6xl md:text-7xl mt-6 text-white leading-[1.3] font-bold">
            마스터와 직접 상담 예약
          </h1>
          <div className="gold-divider w-40 mx-auto mt-8" />
          <p className="text-cyan-50/90 mt-8 leading-relaxed max-w-2xl mx-auto text-xl md:text-2xl">
            30년 경험의 마스터와 함께 깊이 있는 인생 상담을 나누세요.
            <br />
            원하시는 일정을 남기시면 마스터가 확인 후 연락드립니다.
          </p>
        </div>
      </div>
      
      <div className="container py-12 max-w-4xl">
        <div className="mb-10 fade-up">
          <span className="text-base tracking-[0.4em] text-muted-foreground">APPOINTMENT</span>
          <h1 className="hanja-display text-4xl mt-3">{planTitle} 예약</h1>
          <div className="gold-divider w-32 mt-6" />
          <p className="text-lg md:text-xl text-muted-foreground mt-6 leading-relaxed">
            마스터가 직접 응대하는 상담입니다. 아래 <span className="text-foreground font-semibold">상담 유형 및 상담료</span>에서
            채팅 또는 대면 중 원하시는 방식을 선택하실 수 있습니다.
          </p>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="hanji-card rounded-md px-5 py-4">
              <div className="text-lg font-semibold text-foreground">채팅 상담</div>
              <div className="text-2xl font-bold text-gold-deep mt-1">100,000원 · 60분</div>
            </div>
            <div className="hanji-card rounded-md px-5 py-4">
              <div className="text-lg font-semibold text-foreground">대면 상담</div>
              <div className="text-2xl font-bold text-gold-deep mt-1">200,000원 · 80분</div>
            </div>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground mt-4 leading-relaxed">
            먼저 예약을 신청하시면 마스터가 일정을 확정한 뒤, 그때 입금만 안내드립니다. 지금 결제하시지 않으셔도 됩니다.
          </p>
        </div>

        {/* 예약 진행 3단계 안내 */}
        <div className="grid grid-cols-3 gap-3 mb-8 fade-up">
          {[
            { n: "01", t: "예약 신청", d: "희망 일시와 주제를 남깁니다" },
            { n: "02", t: "확정 대기", d: "마스터가 일정을 검토·확정합니다" },
            { n: "03", t: "입금 안내", d: "확정 후 결제 안내를 받습니다" },
          ].map((s) => (
            <div key={s.n} className="hanji-card rounded-md p-5 text-center">
              <div className="hanja-display text-3xl text-gold-deep">{s.n}</div>
              <div className="text-xl font-semibold mt-2">{s.t}</div>
              <div className="text-base text-muted-foreground mt-2 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>

        <Card className="hanji-card">
          <CardHeader>
            <CardTitle className="text-2xl">예약 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-2 block text-base font-semibold">상담 유형 및 상담료</Label>
              <Select value={consultType} onValueChange={(v) => setConsultType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">채팅 상담 · 100,000원 / 60분 (AI 자료 병행)</SelectItem>
                  <SelectItem value="offline">대면 상담 · 200,000원 / 80분</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block text-base font-semibold">실명 *</Label>
                <Input value={realName} onChange={(e) => setRealName(e.target.value)} className="text-lg" />
              </div>
              <div>
                <Label className="mb-2 block text-base font-semibold">닉네임 (선택)</Label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} className="text-lg" />
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-base font-semibold">연락처 *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className="text-lg" />
            </div>

            <div>
              <Label className="mb-2 block text-base font-semibold">희망 일시 *</Label>
              <Input
                type="datetime-local"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="text-lg"
              />
            </div>

            <div>
              <Label className="mb-2 block text-base font-semibold">차순위 일시 (선택)</Label>
              <Input
                type="datetime-local"
                value={alternativeDate}
                onChange={(e) => setAlternativeDate(e.target.value)}
                className="text-lg"
              />
            </div>

            <div>
              <Label className="mb-2 block text-base font-semibold">마스터에게 전하고 싶은 말 / 상담 주제</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="가장 무겁게 걸리는 한 가지를 미리 적어 주시면 결을 더 빨리 잡을 수 있습니다."
                className="text-lg"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="w-full bg-primary hover:bg-jusa-deep text-primary-foreground"
            >
              {createMutation.isPending ? "전송 중..." : "예약 요청 보내기"}
            </Button>
            <p className="text-lg text-muted-foreground text-center">
              아직 결제를 하지 않습니다. 마스터가 일정을 확정한 뒤, 그때 입금·결제 안내를 드립니다.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded-lg border border-amber-300 bg-amber-50">
              <div className="flex items-start gap-3">
                <span className="text-amber-700 text-lg mt-0.5 shrink-0">📞</span>
                <div>
                  <p className="font-semibold text-amber-900">이용 관련 문의는 문자로 접수해 주세요</p>
                  <p className="text-sm text-amber-900/80 mt-0.5 leading-relaxed">
                    빠른 일정 조율, 결제 오류, 접속 지연 등 문제가 있으면 아래 번호로 문자를 남겨주세요. <span className="font-semibold">문자 응대 09:00~21:00</span>
                  </p>
                </div>
              </div>
              <a href="sms:01044488064" className="shrink-0">
                <button className="px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-mono text-base transition-colors">
                  010-4448-8064
                </button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
