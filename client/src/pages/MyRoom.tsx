import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SajuDownloadButton } from "@/components/SajuDownloadButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, LayoutDashboard } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isOperatorEmail } from "@shared/const";
import { getSessionStatusView } from "@shared/sessionStatus";
import Admin from "./Admin";

const AdminPanel = Admin;
const KAKAO_CHAT_URL = "http://pf.kakao.com/_elcXX/chat";

function formatKst(d: Date | string | null | undefined) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

const PLAN_LABEL: Record<string, string> = {
  free: "원픽 무료 · 3회",
  taste: "알뜰 · 20회",
  event: "이벤트 · 10회",
  deep: "심층 · 30회",
  master_chat: "마스터 채팅 · 60분",
  master_offline: "마스터 대면 · 80분",
};

const APPT_STATUS_KR: Record<string, string> = {
  requested: "예약 신청 · 확정 대기",
  confirmed: "일정 확정",
  payment_pending: "입금 안내 받음",
  paid: "입금 완료",
  completed: "상담 완료",
  rejected: "거절",
  cancelled: "취소",
};

export default function MyRoom() {
  const { isAuthenticated, loading: authLoading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const [sajuSortBy, setSajuSortBy] = useState<"createdAt" | "label">("createdAt");
  const profilesQuery = trpc.saju.list.useQuery({ sortBy: sajuSortBy }, { enabled: isAuthenticated });
  const sessionsQuery = trpc.session.list.useQuery(undefined, { enabled: isAuthenticated });
  const paymentsQuery = trpc.payment.list.useQuery(undefined, { enabled: isAuthenticated });
  const apptsQuery = trpc.appointment.listMine.useQuery(undefined, { enabled: isAuthenticated });
  const deleteSessionMutation = trpc.consult.deleteSession.useMutation({
    onSuccess: () => {
      sessionsQuery.refetch();
      toast.success("상담 기록이 삭제되었습니다.");
    },
    onError: (e: any) => {
      toast.error(e?.message || "상담 기록 삭제에 실패했습니다.");
    },
  });
  const deleteSajuMutation = trpc.saju.delete.useMutation({
    onSuccess: () => {
      profilesQuery.refetch();
      toast.success("사주가 삭제되었습니다.");
    },
    onError: (e: any) => {
      toast.error(e?.message || "사주 삭제에 실패했습니다.");
    },
  });
  // 상담 제목 인라인 수정 상태
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [activeTab, setActiveTab] = useState("profiles");
  const [editSajuId, setEditSajuId] = useState<number | null>(null);
  const [editSajuLabel, setEditSajuLabel] = useState("");
  // 정보수정 모달 상태
  const [editProfileModal, setEditProfileModal] = useState<null | {
    id: number; label: string; gender: "male" | "female";
    birthYear: number; birthMonth: number; birthDay: number;
    birthHour: number | null; birthMinute: number | null;
    calendarType: "solar" | "lunar"; birthplace: string | null;
  }>(null);
  const updateSajuMutation = trpc.saju.update.useMutation({
    onSuccess: () => {
      setEditSajuId(null);
      profilesQuery.refetch();
      toast.success("이름이 수정되었습니다.");
    },
    onError: (e: any) => {
      toast.error(e?.message || "수정에 실패했습니다.");
    },
  });
  const renameSessionMutation = trpc.consult.renameSession.useMutation({
    onSuccess: () => {
      setEditingId(null);
      sessionsQuery.refetch();
      toast.success("제목을 변경했습니다.");
    },
    onError: (e: any) => {
      toast.error(e?.message || "제목 변경에 실패했습니다.");
    },
  });
  const setRetainMutation = trpc.consult.setRetain.useMutation({
    onSuccess: (res) => {
      sessionsQuery.refetch();
      toast.success(res.retain ? "이 기록을 영구 보관합니다." : "보관을 해제했습니다. 종료 후 7일이 지나면 자동 삭제됩니다.");
    },
    onError: (e: any) => {
      toast.error(e?.message || "보관 설정 변경에 실패했습니다.");
    },
  });
  const startEdit = (id: number, current: string | null | undefined) => {
    setEditingId(id);
    setEditTitle(current || "");
  };
  const submitEdit = (id: number) => {
    const title = editTitle.trim();
    if (!title) {
      toast.error("제목을 입력해 주세요.");
      return;
    }
    renameSessionMutation.mutate({ sessionId: id, title });
  };
  const [, setLocation] = useLocation();
  const confirm = useConfirm();

  // 만세력 보기 모달
  const [viewProfileId, setViewProfileId] = useState<number | null>(null);

  // 운영자 판정 및 사주 프로필 다중 선택 상태
  // 운영자 판정: 백엔드가 부여한 role(가장 신뢰도 높음) 또는 운영자 이메일 둘 중 하나라도 해당하면 표시.
  const isOperator = (user as { role?: string } | null)?.role === "admin" || isOperatorEmail(user?.email);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<number>>(new Set());
  const profileList = profilesQuery.data ?? [];
  const viewProfile = profileList.find((p) => p.id === viewProfileId) ?? null;
  const allSelected = profileList.length > 0 && selectedProfiles.size === profileList.length;
  const toggleSelectAll = (checked: boolean) => {
    setSelectedProfiles(checked ? new Set(profileList.map((p) => p.id)) : new Set());
  };
  const toggleProfile = (id: number) => {
    setSelectedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const bulkDeleteProfiles = async () => {
    if (selectedProfiles.size === 0) return;
    const ok = await confirm({
      title: "선택 사주 일괄 삭제",
      description: `선택한 ${selectedProfiles.size}개의 사주를 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.`,
      confirmText: "삭제",
      destructive: true,
    });
    if (!ok) return;
    // 궁합 기록 여부 확인
    let totalCompatCount = 0;
    for (const id of Array.from(selectedProfiles)) {
      const r = await deleteSajuMutation.mutateAsync({ id, force: false });
      if (!r.success && r.compatCount > 0) totalCompatCount += r.compatCount;
    }
    if (totalCompatCount > 0) {
      const forceOk = await confirm({
        title: "궁합 기록 존재",
        description: `선택한 사주와 연결된 궁합 기록이 ${totalCompatCount}개 있습니다.\n삭제하면 궁합 기록도 함께 사라집니다.\n그래도 삭제하시겠습니까?`,
        confirmText: "모두 삭제",
        destructive: true,
      });
      if (forceOk) {
        for (const id of Array.from(selectedProfiles)) {
          await deleteSajuMutation.mutateAsync({ id, force: true });
        }
      }
    }
    setSelectedProfiles(new Set());
  };

  // 상담 세션 다중 선택 상태 (운영자 전용)
  const [selectedSessions, setSelectedSessions] = useState<Set<number>>(new Set());
  const sessionList = sessionsQuery.data ?? [];
  const allSessionsSelected = sessionList.length > 0 && selectedSessions.size === sessionList.length;
  const toggleSelectAllSessions = (checked: boolean) => {
    setSelectedSessions(checked ? new Set(sessionList.map((s) => s.id)) : new Set());
  };
  const toggleSession = (id: number) => {
    setSelectedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const bulkDeleteSessions = async () => {
    if (selectedSessions.size === 0) return;
    const ok = await confirm({
      title: "선택 상담 기록 일괄 삭제",
      description: `선택한 ${selectedSessions.size}개의 상담 기록을 삭제하시겠습니까? 삭제 후에는 되돌릴 수 없습니다.`,
      confirmText: "삭제",
      destructive: true,
    });
    if (!ok) return;
    for (const id of Array.from(selectedSessions)) {
      await deleteSessionMutation.mutateAsync({ sessionId: id });
    }
    setSelectedSessions(new Set());
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col overflow-x-hidden">
        <SiteHeader />
        <div className="container py-20 text-center text-muted-foreground">자리를 마련하는 중입니다...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <SiteHeader />

      {/* 히어로 영역 - 보라색 계열 */}
      <div className="page-hero relative w-full h-[360px] flex items-center bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900 overflow-hidden">
        {/* 우주 배경 그라디언트 - 보라 톤 */}
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-700/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/25 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl" />
        </div>
        {/* 별자리 효과 */}
        <div className="absolute inset-0">
          {[...Array(35)].map((_, i) => {
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
                  boxShadow: `0 0 ${size * 2}px rgba(255,255,255,0.9), 0 0 ${size * 4}px rgba(200,150,255,0.6)`,
                }}
              />
            );
          })}
        </div>
        {/* 콘텐츠 */}
        <div className="relative z-10 container max-w-6xl mx-auto text-center">
          <span className="text-base md:text-lg tracking-[0.4em] text-purple-300/80 font-semibold leading-tight h-6 flex items-center justify-center">MY ROOM</span>
          <h1 className="hanja-display text-6xl md:text-7xl mt-6 text-white leading-[1.3] font-bold">
            내 상담실
          </h1>
          <div className="gold-divider w-40 mx-auto mt-8" />
          <p className="text-purple-100/85 mt-8 leading-relaxed max-w-3xl mx-auto text-xl md:text-2xl">
            {user?.nickname || user?.name || "고객님"}님, 고객님의 상담 기록을 한데 모아두었습니다.
            <br />
            언제든 다운로드, 수정, 삭제가 가능합니다.
          </p>
        </div>
      </div>

      <div className="container py-12 max-w-5xl">

        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          {/* 탭 네비게이션: 사주 프로필 / 상담 세션 / 마스터와 상담 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full ${isOperator ? "grid-cols-4" : "grid-cols-3"} h-auto`}>
              <TabsTrigger value="profiles" className="text-base py-3">사주 프로필</TabsTrigger>
              <TabsTrigger value="sessions" className="text-base py-3">상담 세션</TabsTrigger>
              <TabsTrigger value="appointments" className="text-base py-3">상담예약현황</TabsTrigger>
              {isOperator && <TabsTrigger value="admin" className="text-base py-3">운영실</TabsTrigger>}
            </TabsList>

          {/* 탭 1: 사주 프로필 */}
          <TabsContent value="profiles" className="mt-6">
          <Card className="hanji-card">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-xl hanja-display">사주 프로필</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant={sajuSortBy === "createdAt" ? "default" : "outline"}
                  onClick={() => setSajuSortBy("createdAt")}>입력순</Button>
                <Button size="sm" variant={sajuSortBy === "label" ? "default" : "outline"}
                  onClick={() => setSajuSortBy("label")}>이름순</Button>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/compatibility">
                  <Button size="sm" variant="outline" className="bg-card">
                    궁합 보기
                  </Button>
                </Link>
                <Link href="/saju/new">
                  <Button size="sm" variant="outline" className="bg-card">
                    새로 추가
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 운영자 전용: 전체 선택 + 일괄 삭제 */}
              {isOperator && profileList.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-2 border-primary/40 rounded-lg bg-primary/10">
                  <label htmlFor="select-all-profiles" className="flex items-center gap-3 cursor-pointer select-none">
                    <Checkbox
                      id="select-all-profiles"
                      checked={allSelected}
                      onCheckedChange={(v) => toggleSelectAll(!!v)}
                      className="size-5 border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-base font-semibold">
                      전체 선택 <span className="text-primary">({selectedProfiles.size}/{profileList.length})</span>
                    </span>
                  </label>
                  {selectedProfiles.size > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={bulkDeleteProfiles}
                      disabled={deleteSajuMutation.isPending}
                    >
                      {deleteSajuMutation.isPending ? "삭제 중..." : `선택 삭제 (${selectedProfiles.size})`}
                    </Button>
                  )}
                </div>
              )}
              {(profilesQuery.data ?? []).length === 0 && (
                <p className="text-lg text-muted-foreground">아직 등록된 사주가 없습니다.</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(profilesQuery.data ?? []).map((p) => (
                <div
                  key={p.id}
                  className={`flex flex-col gap-3 p-4 border rounded-lg ${
                    isOperator && selectedProfiles.has(p.id)
                      ? "border-primary/60 bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {isOperator && (
                      <Checkbox
                        checked={selectedProfiles.has(p.id)}
                        onCheckedChange={() => toggleProfile(p.id)}
                        className="size-5 border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0 mt-0.5"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {p.birthYear}-{String(p.birthMonth).padStart(2, "0")}-
                        {String(p.birthDay).padStart(2, "0")}{" "}
                        {p.birthHour !== null ? `${String(p.birthHour).padStart(2, "0")}:${String(p.birthMinute ?? 0).padStart(2, "0")}` : "(시 모름)"}{" "}
                        · {p.gender === "male" ? "남" : "여"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full" onClick={() => setViewProfileId(p.id)}>
                      만세력 보기
                    </Button>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white w-full"
                      onClick={() => setEditProfileModal({
                        id: p.id,
                        label: p.label ?? "",
                        gender: p.gender as "male" | "female",
                        birthYear: p.birthYear,
                        birthMonth: p.birthMonth,
                        birthDay: p.birthDay,
                        birthHour: p.birthHour ?? null,
                        birthMinute: p.birthMinute ?? null,
                        calendarType: p.calendarType as "solar" | "lunar",
                        birthplace: p.birthplace ?? null,
                      })}>
                      <Pencil className="w-3 h-3 mr-1" /> 정보 수정
                    </Button>
                    <Button size="sm" variant="default" className="w-full"
                      onClick={() => {
                        const sessions = sessionsQuery.data;
                        const resumable = (sessions ?? []).find(
                          (s) => s.status === "active"
                            && s.sajuProfileId === p.id
                            && new Date(s.expiresAt).getTime() >= Date.now()
                        );
                        if (resumable) {
                          setLocation(`/consult/${resumable.id}`);
                        } else {
                          setLocation(`/plans?profile=${p.id}`);
                        }
                      }}>
                      새 상담 시작
                    </Button>
                    <Button size="sm" variant="outline"
                      className="w-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "사주 삭제",
                          description: "이 사주를 삭제하시겠습니까?",
                          confirmText: "삭제",
                          destructive: true,
                        });
                        if (!ok) return;
                        const result = await deleteSajuMutation.mutateAsync({ id: p.id, force: false });
                        if (!result.success && result.compatCount > 0) {
                          const forceOk = await confirm({
                            title: "궁합 기록 존재",
                            description: `이 사주로 본 궁합 기록이 ${result.compatCount}개 있습니다. 함께 삭제하시겠습니까?`,
                            confirmText: "모두 삭제",
                            destructive: true,
                          });
                          if (forceOk) deleteSajuMutation.mutate({ id: p.id, force: true });
                        }
                      }}
                      disabled={deleteSajuMutation.isPending}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              ))}
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          {/* 탭 2: 상담 세션 (일반 사용자는 결제 기록 포함) */}
          <TabsContent value="sessions" className="mt-6 flex flex-col gap-6">
          {/* 결제 기록 (운영자는 숨김 — 본인 상담은 모두 무료이므로 불필요) */}
          {!isOperator && (
          <Card className="hanji-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl hanja-display">결제 기록</CardTitle>
              <Link href="/plans">
                <Button size="sm" variant="outline" className="bg-card">
                  새 상담 시작
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {(paymentsQuery.data ?? []).length === 0 && (
                <p className="text-lg text-muted-foreground">결제 기록이 없습니다.</p>
              )}
              {(paymentsQuery.data ?? []).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                  <div>
                    <div className="font-medium">{PLAN_LABEL[p.planType] ?? p.planType}</div>
                    <div className="text-base text-muted-foreground">
                      {formatKst(p.paidAt ?? p.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-semibold">{p.amount.toLocaleString()}원</div>
                      <Badge variant={p.status === "paid" ? "default" : "outline"} className="mt-1">
                        {p.status}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "결제 기록 삭제",
                          description: "이 결제 기록을 삭제하시겠습니까?",
                          confirmText: "삭제",
                          destructive: true,
                        });
                        if (ok) toast.info("결제 기록 삭제 기능은 준비 중입니다.");
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
              ))}

            </CardContent>
          </Card>
          )}

          {/* 상담 세션 */}
          <Card className="hanji-card">
            <CardHeader>
              <CardTitle className="text-xl hanja-display">상담 세션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 운영자 전용: 상담 기록 전체 선택 + 일괄 삭제 */}
              {isOperator && sessionList.length > 0 && (
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-2 border-primary/40 rounded-lg bg-primary/10">
                  <label htmlFor="select-all-sessions" className="flex items-center gap-3 cursor-pointer select-none">
                    <Checkbox
                      id="select-all-sessions"
                      checked={allSessionsSelected}
                      onCheckedChange={(v) => toggleSelectAllSessions(!!v)}
                      className="size-5 border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-base font-semibold">
                      전체 선택 <span className="text-primary">({selectedSessions.size}/{sessionList.length})</span>
                    </span>
                  </label>
                  {selectedSessions.size > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={bulkDeleteSessions}
                      disabled={deleteSessionMutation.isPending}
                    >
                      {deleteSessionMutation.isPending ? "삭제 중..." : `선택 삭제 (${selectedSessions.size})`}
                    </Button>
                  )}
                </div>
              )}
              {(sessionsQuery.data ?? []).length === 0 && (
                <p className="text-lg text-muted-foreground">진행된 상담이 없습니다.</p>
              )}
              {(sessionsQuery.data ?? []).map((s) => {
                const expired = new Date(s.expiresAt).getTime() < Date.now();
                const { label: statusKr, canEnter, isAwaiting, buttonLabel: enterLabel } =
                  getSessionStatusView(s.status, expired);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 p-3 border rounded-md ${
                      isOperator && selectedSessions.has(s.id)
                        ? "border-primary/60 bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    {isOperator && (
                      <Checkbox
                        checked={selectedSessions.has(s.id)}
                        onCheckedChange={() => toggleSession(s.id)}
                        className="size-5 border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      {editingId === s.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            maxLength={60}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitEdit(s.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-8 max-w-[260px]"
                            placeholder="상담 제목"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => submitEdit(s.id)}
                            disabled={renameSessionMutation.isPending}
                            aria-label="제목 저장"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => setEditingId(null)}
                            aria-label="취소"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium truncate">{s.title || "상담"} {s.profileLabel ? `· ${s.profileLabel}` : ""}</span>
                          <button
                            type="button"
                            onClick={() => startEdit(s.id, s.title)}
                            className="text-muted-foreground hover:text-foreground shrink-0"
                            aria-label="제목 수정"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="text-base text-muted-foreground">
                        {PLAN_LABEL[s.planType]} · 시작 {formatKst(s.startedAt)}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Switch
                          id={`retain-${s.id}`}
                          checked={!!s.retain}
                          onCheckedChange={(v) => setRetainMutation.mutate({ sessionId: s.id, retain: v })}
                          disabled={setRetainMutation.isPending}
                        />
                        <label htmlFor={`retain-${s.id}`} className="text-sm text-muted-foreground cursor-pointer select-none">
                          {s.retain
                            ? "보관 중 (자동 삭제 안 됨)"
                            : s.purgeAfter
                              ? `미보관 · ${formatKst(s.purgeAfter)} 자동 삭제 예정`
                              : "미보관 · 종료 7일 후 자동 삭제"}
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={canEnter ? "default" : "outline"}
                        className={
                          statusKr === "입장 가능"
                            ? "bg-amber-500 text-white border-transparent"
                            : isAwaiting
                              ? "border-amber-400 text-amber-600"
                              : undefined
                        }
                      >
                        {statusKr}
                      </Badge>
                      {isAwaiting ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="border-amber-300 text-amber-600"
                        >
                          {enterLabel}
                        </Button>
                      ) : (
                        <Link href={`/consult/${s.id}`}>
                          <Button
                            size="sm"
                            className={
                              statusKr === "입장 가능"
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : statusKr === "진행 가능"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-slate-600 hover:bg-slate-700 text-white"
                            }
                          >
                            {enterLabel}
                          </Button>
                        </Link>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "상담 기록 삭제",
                            description: "이 상담 기록을 삭제하시겠습니까?\n삭제 후에는 되돌릴 수 없습니다.",
                            confirmText: "삭제",
                            destructive: true,
                          });
                          if (ok) deleteSessionMutation.mutate({ sessionId: s.id });
                        }}
                        disabled={deleteSessionMutation.isPending}
                      >
                        {deleteSessionMutation.isPending ? "삭제 중..." : "삭제"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          </TabsContent>

          {/* 탭 3: 마스터와 상담 (예약 기록) */}
          <TabsContent value="appointments" className="mt-6">
          <Card className="hanji-card">
            <CardHeader>
              <CardTitle className="text-xl hanja-display">마스터와 직접 상담 예약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(apptsQuery.data ?? []).length === 0 && (
                <p className="text-lg text-muted-foreground">예약 내역이 없습니다.</p>
              )}
              {(apptsQuery.data ?? []).map((a) => (
                <div key={a.id} className="p-4 border-2 border-amber-300/60 rounded-lg bg-amber-50/30 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {a.consultType === "chat" ? "채팅" : "대면"}{" "}
                        · {formatKst(a.preferredDate)}
                      </div>
                      {a.notes && (
                        <div className="text-base text-muted-foreground mt-1 line-clamp-1">{a.notes}</div>
                      )}
                    </div>
                    <Badge variant={a.status === "confirmed" || a.status === "paid" ? "default" : "outline"}>
                      {APPT_STATUS_KR[a.status] ?? a.status}
                    </Badge>
                  </div>
                  {(a.status === "confirmed" || a.status === "payment_pending") && (
                    <div className="mt-3 rounded-md bg-amber-50 border border-amber-300 p-4">
                      <p className="font-semibold text-amber-900">입금 안내</p>
                      <p className="text-base text-amber-900/90 mt-1 leading-relaxed">
                        일정이 확정되었습니다. 아래 계좌로 입금해 주시면 마스터가 확인 후 예약을 최종 확정합니다.
                      </p>
                      <div className="mt-2 rounded bg-white/70 px-3 py-2 font-mono text-lg text-amber-950">
                        국민은행 652301-01-809536 (예금주: 전원석)
                      </div>
                      <p className="text-sm text-amber-800 mt-2">
                        입금 후{" "}
                        <a
                          href={KAKAO_CHAT_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-amber-900 underline"
                        >
                          카카오톡으로 남겨주시면
                        </a>{" "}
                        더 빠르게 확인됩니다.
                      </p>
                    </div>
                  )}
                  {a.status === "paid" && (
                    <div className="mt-3 rounded-md bg-emerald-50 border border-emerald-300 p-3 text-base text-emerald-900">
                      입금이 확인되어 예약이 확정되었습니다. 약속된 시간에 만나뵙겠습니다.
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          </TabsContent>

          {/* 탭 4: 운영실 (마스터님 전용) */}
          {isOperator && (
            <TabsContent value="admin" className="mt-6">
              <AdminPanel embedded />
            </TabsContent>
          )}
          </Tabs>
        </div>

      </div>

      {/* ===== 만세력 보기 모달 ===== */}
      <Dialog open={!!viewProfileId} onOpenChange={(open) => { if (!open) setViewProfileId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl hanja-display">
              {viewProfile?.label ?? ""}의 사주
            </DialogTitle>
          </DialogHeader>
          {viewProfile && (() => {
            const data = viewProfile.sajuData as any;
            if (!data?.pillars) {
              return <p className="text-muted-foreground text-base py-4">저장된 사주 데이터가 없습니다.</p>;
            }
            const pillars = data.pillars;
            const daeun = data.daeun;
            const LABELS: Record<string, string> = { year: "年", month: "月", day: "日", hour: "時" };
            return (
              <div className="space-y-6 pt-2">
                {/* 사주팔자 */}
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {viewProfile.birthYear}-{String(viewProfile.birthMonth).padStart(2, "0")}-{String(viewProfile.birthDay).padStart(2, "0")}{" "}
                    {viewProfile.birthHour !== null ? `${String(viewProfile.birthHour).padStart(2, "0")}:${String(viewProfile.birthMinute ?? 0).padStart(2, "0")}` : "(시 모름)"}{" "}
                    · {viewProfile.gender === "male" ? "남" : "여"}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["hour", "day", "month", "year"] as const).map((k) => {
                      const p = pillars[k];
                      return (
                        <div key={k} className="ganji-cell text-center rounded-lg border border-amber-600/40 bg-amber-950/30 p-3">
                          <div className="text-xs text-muted-foreground mb-1">{LABELS[k]}</div>
                          {p ? (
                            <>
                              <div className="text-xl font-bold text-amber-400">{p.stem}</div>
                              <div className="text-xl font-bold text-amber-300">{p.branch}</div>
                              {p.shinsal && <div className="text-[0.65rem] mt-1 text-amber-600/80">{p.shinsal}</div>}
                            </>
                          ) : (
                            <>
                              <div className="text-xl text-muted-foreground">?</div>
                              <div className="text-xl text-muted-foreground">?</div>
                              <div className="text-[0.65rem] mt-1 text-muted-foreground">시 모름</div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 대운수 + 대운 */}
                {daeun && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-3">
                      대운수: <span className="text-amber-400">{daeun.daeunNumber}세 시작</span>{" "}
                      · {daeun.forward ? "순행" : "역행"}
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(daeun.pillars as string[]).slice(0, 10).map((p: string, i: number) => (
                        <div key={i} className="text-center p-2 rounded border border-border bg-card">
                          <div className="text-[0.7rem] text-muted-foreground">{daeun.daeunNumber + i * 10}세</div>
                          <div className="text-base font-bold hanja-display">{p}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* 정보수정 모달 */}
      {editProfileModal && (
        <Dialog open={!!editProfileModal} onOpenChange={(open) => { if (!open) setEditProfileModal(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>사주 정보 수정</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium block mb-1">이름 / 식별자</label>
                <Input value={editProfileModal.label} onChange={(e) => setEditProfileModal(m => m ? { ...m, label: e.target.value } : m)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">성별</label>
                  <select className="w-full border rounded px-2 py-1.5 text-sm bg-background" value={editProfileModal.gender}
                    onChange={(e) => setEditProfileModal(m => m ? { ...m, gender: e.target.value as "male" | "female" } : m)}>
                    <option value="male">남</option>
                    <option value="female">여</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">양력/음력</label>
                  <select className="w-full border rounded px-2 py-1.5 text-sm bg-background" value={editProfileModal.calendarType}
                    onChange={(e) => setEditProfileModal(m => m ? { ...m, calendarType: e.target.value as "solar" | "lunar" } : m)}>
                    <option value="solar">양력</option>
                    <option value="lunar">음력</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-sm font-medium block mb-1">년</label>
                  <Input type="number" value={editProfileModal.birthYear} onChange={(e) => setEditProfileModal(m => m ? { ...m, birthYear: parseInt(e.target.value) || m.birthYear } : m)} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">월</label>
                  <Input type="number" min={1} max={12} value={editProfileModal.birthMonth} onChange={(e) => setEditProfileModal(m => m ? { ...m, birthMonth: parseInt(e.target.value) || m.birthMonth } : m)} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">일</label>
                  <Input type="number" min={1} max={31} value={editProfileModal.birthDay} onChange={(e) => setEditProfileModal(m => m ? { ...m, birthDay: parseInt(e.target.value) || m.birthDay } : m)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium block mb-1">시 (0~23, 빈칸=시 모름)</label>
                  <Input type="number" min={0} max={23} placeholder="모름"
                    value={editProfileModal.birthHour !== null ? editProfileModal.birthHour : ""}
                    onChange={(e) => setEditProfileModal(m => m ? { ...m, birthHour: e.target.value === "" ? null : parseInt(e.target.value) } : m)} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">분</label>
                  <Input type="number" min={0} max={59} placeholder="0"
                    value={editProfileModal.birthMinute !== null ? editProfileModal.birthMinute : ""}
                    onChange={(e) => setEditProfileModal(m => m ? { ...m, birthMinute: e.target.value === "" ? null : parseInt(e.target.value) } : m)} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">출생지</label>
                <Input placeholder="서울" value={editProfileModal.birthplace ?? ""}
                  onChange={(e) => setEditProfileModal(m => m ? { ...m, birthplace: e.target.value || null } : m)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setEditProfileModal(null)}>취소</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={updateSajuMutation.isPending}
                onClick={() => {
                  if (!editProfileModal) return;
                  const { id, ...patch } = editProfileModal;
                  updateSajuMutation.mutate({ id, ...patch }, {
                    onSuccess: () => { setEditProfileModal(null); profilesQuery.refetch(); toast.success("정보가 수정되었습니다."); }
                  });
                }}>
                {updateSajuMutation.isPending ? "저장 중..." : "저장"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
