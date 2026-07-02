import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import DepositRequestDialog from "@/components/DepositRequestDialog";
import { useConfirm } from "@/components/ConfirmDialog";
import { Trash2, FileDown, Share2, Mail } from "lucide-react";
import { resolveCompatAction } from "@shared/compatAction";

const RELATION_OPTIONS: { value: string; label: string }[] = [
  { value: "couple", label: "연인 · 부부" },
  { value: "parent", label: "부모" },
  { value: "child", label: "자녀" },
  { value: "family", label: "가족(형제·자매)" },
  { value: "work", label: "직장(상사·동료·부하)" },
  { value: "friend", label: "친구" },
  { value: "other", label: "기타 관계" },
];

const RELATION_LABEL: Record<string, string> = Object.fromEntries(
  RELATION_OPTIONS.map((o) => [o.value, o.label]),
);

function formatKst(d: Date | string | null | undefined) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function Compatibility() {
  const confirm = useConfirm();
  const { isAuthenticated, loading: authLoading, user } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const profilesQuery = trpc.saju.list.useQuery(undefined, { enabled: isAuthenticated });
  const historyQuery = trpc.compatibility.list.useQuery(undefined, { enabled: isAuthenticated });

  const [profileAId, setProfileAId] = useState<string>("");
  const [compatTab, setCompatTab] = useState<"saved" | "new">("saved");
  const [profileBId, setProfileBId] = useState<string>("");
  const [relationType, setRelationType] = useState<string>("couple");
  const [question, setQuestion] = useState<string>("");
  const [targetSlot, setTargetSlot] = useState<"A" | "B" | null>(null);
  // 무통장 입금 신청 다이얼로그 상태
  const [depositOpen, setDepositOpen] = useState(false);
  const [result, setResult] = useState<{
    labelA: string;
    labelB: string;
    relationType: string;
    result: string;
  } | null>(null);

  const analyzeMutation = trpc.compatibility.analyze.useMutation({
    onSuccess: (data) => {
      setResult({
        labelA: data.labelA,
        labelB: data.labelB,
        relationType: data.relationType,
        result: data.result,
      });
      historyQuery.refetch();
      toast.success("궁합 분석이 완성되었습니다.");
      setTimeout(() => {
        document.getElementById("compat-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    onError: (e: any) => {
      toast.error(e?.message || "궁합 분석에 실패했습니다.");
    },
  });

  const deleteMutation = trpc.compatibility.delete.useMutation({
    onSuccess: () => {
      historyQuery.refetch();
      toast.success("기록을 삭제했습니다.");
    },
    onError: (e: any) => toast.error(e?.message || "삭제에 실패했습니다."),
  });

  const scrollToPicker = () => {
    const el = document.getElementById("compat-picker");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleAnalyze = () => {
    // 신규 방문자 배려: 사주가 부족해도 결제를 막지 않고 입력 단계로 자연스럽게 안내한다.
    const action = resolveCompatAction({
      profileCount: profiles.length,
      profileAId,
      profileBId,
    });
    switch (action.kind) {
      case "need_profiles":
        toast.info("먼저 두 사람의 사주를 등록해 주세요. 만세력에서 간단히 등록할 수 있습니다.");
        scrollToPicker();
        return;
      case "need_selection":
        toast.error("두 사람의 사주를 모두 선택해 주세요.");
        scrollToPicker();
        return;
      case "same_profile":
        toast.error("서로 다른 두 사주를 선택해 주세요.");
        return;
      case "proceed":
        // 무통장 입금 신청 다이얼로그를 열다. requestDeposit(compatibility_chat)는 두 사주를 요구한다.
        setDepositOpen(true);
        return;
    }
  };


  const profiles = profilesQuery.data ?? [];
  const hasEnoughProfiles = profiles.length >= 2;

  // URL 쿼리 파라미터에서 새로 생성된 사주 ID 감지 후 자동 매칭
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newSajuId = params.get("newSajuId");
    if (newSajuId && targetSlot) {
      if (targetSlot === "A") {
        setProfileAId(newSajuId);
      } else {
        setProfileBId(newSajuId);
      }
      setTargetSlot(null);
      // URL 정리
      window.history.replaceState({}, "", "/compatibility");
    }
  }, [targetSlot]);

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

      {/* 히어로 */}
      <div className="page-hero relative w-full h-[360px] flex items-center bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-50">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-700/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-600/25 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl" />
        </div>
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
        <div className="relative z-10 container max-w-6xl mx-auto text-center px-4">
          <span className="text-base md:text-lg tracking-[0.4em] text-purple-300/80 font-semibold leading-tight h-6 flex items-center justify-center">
            COMPATIBILITY
          </span>
          <h1 className="hanja-display text-5xl md:text-7xl mt-6 text-white leading-[1.3] font-bold">
            두 사람의 사주
          </h1>
          <div className="gold-divider w-40 mx-auto mt-8" />
          <p className="text-purple-100/85 mt-8 leading-relaxed max-w-3xl mx-auto text-xl md:text-2xl">
            연인, 가족, 직장, 친구.
            <br />
            두 사주가 서로에게 어떤 의미가 있는지, 숨겨진 가치를 찾아드립니다.
          </p>
        </div>
      </div>

      <div className="container py-12 max-w-4xl">
        {/* 안내 */}
        <p className="text-base md:text-lg text-stone-700 mb-6 leading-relaxed">
          궁합은 좋고 나쁨을 점수로 단정하지 않습니다. 두 사람의 기운이 만나 어디서 잘 맞고 어디서 부딪히는지,
          그리고 그 관계를 어떻게 가꾸면 좋을지를 풀어내는 데 뜻이 있습니다. 격이 다른 초 격차 궁합을 만나보세요.
        </p>

        {/* 입력 카드 */}
        <Card className="hanji-card">
          <CardHeader>
            <CardTitle className="text-xl hanja-display">궁합 볼 두 사람 선택/입력 하기</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5" id="compat-picker">
            {/* 탭: 저장된 사주 프로필 사용 vs 새로 등록 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setCompatTab("saved")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${compatTab === "saved" ? "bg-amber-300 text-amber-900 border-amber-400" : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"}`}
              >
                저장된 사주 프로필 ({profiles.length}개)
              </button>
              <button
                onClick={() => setCompatTab("new")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${compatTab === "new" ? "bg-amber-300 text-amber-900 border-amber-400" : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20"}`}
              >
                새 사주 등록하기
              </button>
            </div>
            {compatTab === "new" && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4">
                <p className="text-base text-amber-900 leading-relaxed mb-3">
                  만세력에서 사주를 등록하면 이곳에서 바로 선택할 수 있습니다.
                  <br />
                  <span className="text-sm text-amber-900/80">현재 저장된 사주: {profiles.length}개 (최소 2명 필요)</span>
                </p>
                <Link href="/saju/new?return=/compatibility">
                  <Button variant="default">만세력에서 사주 등록하기</Button>
                </Link>
              </div>
            )}
            {compatTab === "saved" && !hasEnoughProfiles && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-4">
                <p className="text-base text-amber-900 leading-relaxed mb-3">
                  저장된 사주가 2개 이상 필요합니다. 만세력에서 먼저 사주를 등록해 주세요.
                  <br />
                  <span className="text-sm text-amber-900/80">현재 저장된 사주: {profiles.length}개 (최소 2명 필요)</span>
                </p>
                <Link href="/saju/new?return=/compatibility">
                  <Button variant="default">만세력에서 사주 등록하기</Button>
                </Link>
              </div>
            )}
            {hasEnoughProfiles && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-medium mb-2 flex items-center gap-2">
                      첫 번째 사람
                      {profileAId && <span className="text-green-500 text-lg">✓</span>}
                    </label>
                    <div className="flex gap-2">
                      <Select value={profileAId} onValueChange={setProfileAId}>
                        <SelectTrigger className="bg-card flex-1">
                          <SelectValue placeholder="사주 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.label} ({p.birthYear}.{String(p.birthMonth).padStart(2, "0")}.
                              {String(p.birthDay).padStart(2, "0")} · {p.gender === "male" ? "남" : "여"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Link href={`/saju/new?return=/compatibility&slot=A`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-card whitespace-nowrap"
                          onClick={() => setTargetSlot("A")}
                        >
                          만세력
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-medium mb-2 flex items-center gap-2">
                      두 번째 사람
                      {profileBId && <span className="text-green-500 text-lg">✓</span>}
                    </label>
                    <div className="flex gap-2">
                      <Select value={profileBId} onValueChange={setProfileBId}>
                        <SelectTrigger className="bg-card flex-1">
                          <SelectValue placeholder="사주 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.label} ({p.birthYear}.{String(p.birthMonth).padStart(2, "0")}.
                              {String(p.birthDay).padStart(2, "0")} · {p.gender === "male" ? "남" : "여"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Link href={`/saju/new?return=/compatibility&slot=B`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-card whitespace-nowrap"
                          onClick={() => setTargetSlot("B")}
                        >
                          만세력
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-base font-medium mb-2">관계 유형</label>
                  <Select value={relationType} onValueChange={setRelationType}>
                    <SelectTrigger className="bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATION_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-base font-medium mb-2">
                    특별히 궁금한 점 <span className="text-muted-foreground font-normal">(선택)</span>
                  </label>
                  <Textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="예: 이 사람과 동업해도 괜찮을지, 오래 갈 인연인지 등"
                    maxLength={500}
                    rows={3}
                    className="bg-card resize-none"
                  />
                </div>

              </>
            )}

            {/* 상품 안내 + 신청 버튼: 사주 수와 무관하게 항상 노출 (신규 방문자가 상품을 먼저 이해하도록) */}
            <div className="rounded-lg border border-purple-300/30 bg-purple-500/5 px-4 py-3 text-sm leading-relaxed text-foreground/80">
              궁합은 꼭 필요하신 분만 편안하게 보세요. 부담 없이 보실 수 있도록
              <span className="font-semibold text-foreground"> 7,900원</span>으로 마련했습니다. (질문 10회 포함 · 입금 확인 후 입장)
            </div>

            <Button
              onClick={handleAnalyze}
              className="w-full text-base"
              size="lg"
            >
              7,900원 궁합 신청하기
            </Button>
          </CardContent>
        </Card>

        {/* 결과 */}
        {result && (
          <Card id="compat-result" className="hanji-card mt-8">
            <CardHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-xl hanja-display">
                  {result.labelA} × {result.labelB}
                </CardTitle>
                <Badge variant="secondary">{RELATION_LABEL[result.relationType] ?? "관계"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap leading-loose text-[1.05rem] text-foreground/90">
                {result.result}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 지난 궁합 기록 */}
        {(historyQuery.data ?? []).length > 0 && (
          <Card className="hanji-card mt-8">
            <CardHeader>
              <CardTitle className="text-xl hanja-display">지난 궁합 기록</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(historyQuery.data ?? []).map((c) => (
                <details key={c.id} className="border border-border rounded-md p-3 group">
                  <summary className="cursor-pointer flex items-center justify-between gap-2 list-none">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-medium">
                        {c.labelA} × {c.labelB}
                      </span>
                      <Badge variant="outline">{RELATION_LABEL[c.relationType] ?? "관계"}</Badge>
                      <span className="text-sm text-muted-foreground">{formatKst(c.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-sm text-muted-foreground group-open:hidden mr-1">펼치기</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        onClick={async (e) => {
                          e.preventDefault();
                          const ok = await confirm({
                            title: "궁합 기록 삭제",
                            description: "이 궁합 기록을 삭제하시겠습니까?",
                            confirmText: "삭제",
                            destructive: true,
                          });
                          if (ok) deleteMutation.mutate({ id: c.id });
                        }}
                        disabled={deleteMutation.isPending}
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </summary>
                  <div className="mt-3 whitespace-pre-wrap leading-loose text-[1.02rem] text-foreground/85">
                    {c.result}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => {
                        const text = `[${c.labelA} × ${c.labelB} 궁합]\n${RELATION_LABEL[c.relationType] ?? "관계"}\n\n${c.result}`;
                        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `궁합_${c.labelA}_${c.labelB}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("궁합 기록을 저장했습니다.");
                      }}
                    >
                      <FileDown className="w-3 h-3" /> 저장
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => {
                        const subject = encodeURIComponent(`[휴먼프리즘] ${c.labelA} × ${c.labelB} 궁합 기록`);
                        const body = encodeURIComponent(`${c.labelA} × ${c.labelB} 궁합 (${RELATION_LABEL[c.relationType] ?? "관계"})\n\n${c.result}`);
                        window.open(`mailto:?subject=${subject}&body=${body}`);
                      }}
                    >
                      <Mail className="w-3 h-3" /> 이메일
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => {
                        const text = `[${c.labelA} × ${c.labelB} 궁합]\n${RELATION_LABEL[c.relationType] ?? "관계"}\n\n${c.result}`;
                        if (navigator.share) {
                          navigator.share({ title: `${c.labelA} × ${c.labelB} 궁합`, text });
                        } else {
                          navigator.clipboard.writeText(text);
                          toast.success("클립보드에 복사했습니다.");
                        }
                      }}
                    >
                      <Share2 className="w-3 h-3" /> 공유
                    </Button>
                  </div>
                </details>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 이용 문의 안내 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded-lg border border-amber-300 bg-amber-50 mt-6">
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

      {/* 무통장 입금 신청 다이얼로그 (궁합 채팅 결제 입구) */}
      <DepositRequestDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        planType="compatibility_chat"
        sajuProfileId={profileAId ? Number(profileAId) : undefined}
        sajuProfileBId={profileBId ? Number(profileBId) : undefined}
      />
    </div>
  );
}
