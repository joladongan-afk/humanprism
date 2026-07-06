import SiteHeader from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { planLabelOf } from "@shared/revenue";
import { periodRange } from "@shared/revenueStats";
import { getRefundMessage, classifyRefundMethod } from "@shared/refundMessages";

export default function Admin({ embedded = false }: { embedded?: boolean } = {}) {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: !embedded });
  if (loading) {
    if (embedded) {
      return <div className="py-20 text-center text-muted-foreground">잠시만요...</div>;
    }
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container py-20 text-center text-muted-foreground">잠시만요...</div>
      </div>
    );
  }
  if (user?.role !== "admin") {
    if (embedded) {
      return <div className="py-20 text-center text-destructive">관리자만 접근 가능합니다.</div>;
    }
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="container py-20 text-center">
          <p className="text-destructive">관리자만 접근 가능합니다.</p>
        </div>
      </div>
    );
  }
  return <AdminInner embedded={embedded} />;
}

function AdminInner({ embedded = false }: { embedded?: boolean }) {
  const apptsQuery = trpc.admin.listAppointments.useQuery();
  const usersQuery = trpc.admin.listUsers.useQuery();
  const utils = trpc.useUtils();
  const updateMutation = trpc.admin.updateAppointment.useMutation({
    onSuccess: () => {
      utils.admin.listAppointments.invalidate();
      toast.success("예약 상태를 갱신했습니다.");
    },
  });

  const inner = (
    <Tabs defaultValue="appts">
          <TabsList>
            <TabsTrigger value="appts">예약 관리</TabsTrigger>
            <TabsTrigger value="deposits">입금 승인</TabsTrigger>
            <TabsTrigger value="naming">작명 현황</TabsTrigger>
            <TabsTrigger value="refunds">환불 관리</TabsTrigger>
            <TabsTrigger value="stats">매출 통계</TabsTrigger>
            <TabsTrigger value="members">회원/방문</TabsTrigger>
            <TabsTrigger value="users">회원 목록</TabsTrigger>
          </TabsList>

          <TabsContent value="appts" className="mt-6">
            <Card className="hanji-card">
              <CardHeader>
                <CardTitle className="text-lg hanja-display">예약 요청</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(apptsQuery.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">예약 내역이 없습니다.</p>
                )}
                {((apptsQuery.data as Appt[] | undefined) ?? []).map((a) => (
                  <ApptRow
                    key={a.id}
                    appt={a}
                    onUpdate={(patch) =>
                      updateMutation.mutate({
                        id: a.id,
                        status: patch.status,
                        masterNote: patch.masterNote,
                        depositAmount: patch.depositAmount,
                      })
                    }
                  />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposits" className="mt-6">
            <DepositApprovalTab />
          </TabsContent>

          <TabsContent value="naming" className="mt-6">
            <NamingLicenseTab />
          </TabsContent>

          <TabsContent value="refunds" className="mt-6">
            <RefundManagementTab />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <RevenueStatsTab />
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <MembershipStatsTab />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="hanji-card">
              <CardHeader>
                <CardTitle className="text-lg hanja-display">회원 목록</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(usersQuery.data ?? []).map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                      <div>
                        <div className="font-medium">{u.nickname || u.name || u.openId}</div>
                        <div className="text-xs text-muted-foreground">
                          {u.email ?? "—"} · 가입 {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                        </div>
                      </div>
                      <Badge variant={u.role === "admin" ? "default" : "outline"}>{u.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
  );

  // 임베디드(내 상담실 탭 내부): 헤더/풀페이지 래퍼 없이 탭 콘텐츠만 렌더
  if (embedded) {
    return <div className="space-y-2">{inner}</div>;
  }

  // 단독 /admin 페이지: 기존 풀페이지 레이아웃
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container py-12 max-w-6xl">
        <div className="mb-10 fade-up">
          <span className="text-xs tracking-[0.4em] text-muted-foreground">LISTENER ADMIN</span>
          <h1 className="hanja-display text-4xl mt-3">마스터 운영실</h1>
          <div className="gold-divider w-32 mt-6" />
        </div>
        {inner}
      </div>
    </div>
  );
}

function DepositApprovalTab() {
  const listQuery = trpc.payment.listAwaiting.useQuery();
  const utils = trpc.useUtils();
  const approveMutation = trpc.payment.approve.useMutation({
    onSuccess: () => {
      utils.payment.listAwaiting.invalidate();
      toast.success("승인했습니다. 고객에게 안내 문자가 발송됩니다(알리고 연동 시).");
    },
    onError: (e) => toast.error(e.message || "승인 실패"),
  });
  const rejectMutation = trpc.payment.reject.useMutation({
    onSuccess: () => {
      utils.payment.listAwaiting.invalidate();
      toast.success("신청을 반려했습니다.");
    },
    onError: (e) => toast.error(e.message || "반려 실패"),
  });

  const rows = listQuery.data ?? [];

  return (
    <Card className="hanji-card">
      <CardHeader>
        <CardTitle className="text-lg hanja-display">입금 승인 대기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          고객이 통장 입금 신청한 목록입니다. 실제 입금을 통장에서 확인한 뒤 [승인]을 눌러주세요.
          승인 즉시 고객 휴대폰으로 안내 문자가 나가고, 고객은 72시간 이내 입장해야 합니다.
        </p>
        {listQuery.isLoading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
        {!listQuery.isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">대기 중인 입금 신청이 없습니다.</p>
        )}
        {rows.map((r: Record<string, unknown>) => {
          const id = r.id as number;
          const created = r.startedAt ? new Date(r.startedAt as string) : null;
          return (
            <div key={id} className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{(r.title as string) || "상담"}</Badge>
                {typeof r.paymentAmount === "number" && (
                  <Badge>{(r.paymentAmount as number).toLocaleString("ko-KR")}원</Badge>
                )}
                {created && (
                  <span className="text-xs text-muted-foreground">
                    신청: {created.toLocaleString("ko-KR")}
                  </span>
                )}
              </div>
              <div className="grid gap-1 text-sm">
                <div>
                  <span className="text-muted-foreground">입금자명:</span>{" "}
                  <strong>{(r.depositorName as string) || "—"}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">연락처:</span>{" "}
                  <strong>{(r.depositorPhone as string) || "— (미입력)"}</strong>
                </div>
                <div className="text-xs text-muted-foreground">
                  회원: {(r.userName as string) || "—"} ({(r.userEmail as string) || "—"})
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate({ sessionId: id })}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  승인 (입금 확인됨)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("이 신청을 반려할까요? 세션이 취소됩니다.")) {
                      rejectMutation.mutate({ sessionId: id });
                    }
                  }}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  반려
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

const STATUS_LABELS: Record<string, string> = {
  requested: "예약 신청",
  confirmed: "일정 확정",
  payment_pending: "입금 안내",
  paid: "입금 완료",
  completed: "상담 완료",
  rejected: "거절",
  cancelled: "취소",
};

type Appt = {
  id: number;
  realName: string;
  phone: string;
  consultType: "chat" | "phone" | "offline";
  preferredDate: Date | string;
  alternativeDate: Date | string | null;
  notes: string | null;
  status: string;
  masterNote: string | null;
  depositAmount: number | null;
  depositAccountInfo: { bank: string; accountNumber: string; accountHolder: string } | null;
  paidAt: Date | string | null;
};

function ApptRow({
  appt,
  onUpdate,
}: {
  appt: Appt;
  onUpdate: (patch: { status: any; masterNote?: string; depositAmount?: number }) => void;
}) {
  const [status, setStatus] = useState<string>(appt.status);
  const [note, setNote] = useState<string>(appt.masterNote ?? "");
  const [depositAmount, setDepositAmount] = useState<string>(appt.depositAmount?.toString() ?? "");
  
  return (
    <div className="border border-border rounded-md p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <div className="font-medium">
            {appt.realName} ({appt.phone}) ·{" "}
            {appt.consultType === "chat" ? "채팅" : "대면"}
          </div>
          <div className="text-xs text-muted-foreground">
            희망: {new Date(appt.preferredDate).toLocaleString("ko-KR")}
            {appt.alternativeDate
              ? ` / 차순위: ${new Date(appt.alternativeDate).toLocaleString("ko-KR")}`
              : ""}
          </div>
        </div>
        <Badge variant="outline">{STATUS_LABELS[appt.status] ?? appt.status}</Badge>
      </div>
      {appt.notes && (
        <div className="text-sm bg-muted/40 rounded p-3 mb-3 whitespace-pre-wrap">{appt.notes}</div>
      )}
      
      {/* 계좌 정보 표시 */}
      {status === "payment_pending" && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3 mb-3">
          <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">입금 계좌</div>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <div>국민은행 652301-01-809536 (예금주: 전원석)</div>
          </div>
        </div>
      )}
      
      <div className="grid md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-xs text-muted-foreground">상태</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="requested">예약 신청</SelectItem>
              <SelectItem value="confirmed">일정 확정</SelectItem>
              <SelectItem value="payment_pending">입금 안내(입금 대기)</SelectItem>
              <SelectItem value="paid">입금 완료</SelectItem>
              <SelectItem value="completed">상담 완료</SelectItem>
              <SelectItem value="rejected">거절</SelectItem>
              <SelectItem value="cancelled">취소</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {status === "payment_pending" && (
          <div>
            <label className="text-xs text-muted-foreground">입금액 (원)</label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-border rounded-md text-sm"
            />
          </div>
        )}
        
        <div className={status === "payment_pending" ? "" : "md:col-span-2"}>
          <label className="text-xs text-muted-foreground">마스터 메모</label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      
      <div className="mt-3 flex justify-end gap-2">
        {status === "payment_pending" && depositAmount && (
          <Button
            size="sm"
            onClick={() => {
              onUpdate({
                status: "paid",
                masterNote: note || undefined,
                depositAmount: parseInt(depositAmount, 10),
              });
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            입금 확인
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => onUpdate({ status: status as any, masterNote: note || undefined })}
          className="bg-primary text-primary-foreground"
        >
          저장
        </Button>
      </div>
    </div>
  );
}


/**
 * 환불 관리 탭
 */
function RefundManagementTab() {
  const refundsQuery = trpc.refund.listRequests.useQuery();
  const utils = trpc.useUtils();

  const approveMutation = trpc.refund.approveRefund.useMutation({
    onSuccess: () => {
      utils.refund.listRequests.invalidate();
      toast.success("환불이 승인되었습니다.");
    },
    onError: (err) => {
      toast.error(err.message || "환불 승인에 실패했습니다.");
    },
  });

  const processMutation = trpc.refund.processRefund.useMutation({
    onSuccess: () => {
      utils.refund.listRequests.invalidate();
      toast.success("환불이 처리 중입니다.");
    },
    onError: (err) => {
      toast.error(err.message || "환불 처리에 실패했습니다.");
    },
  });

  const completeMutation = trpc.refund.completeRefund.useMutation({
    onSuccess: () => {
      utils.refund.listRequests.invalidate();
      toast.success("환불이 완료되었습니다.");
    },
    onError: (err) => {
      toast.error(err.message || "환불 완료에 실패했습니다.");
    },
  });

  const rejectMutation = trpc.refund.rejectRefund.useMutation({
    onSuccess: () => {
      utils.refund.listRequests.invalidate();
      toast.success("환불이 거절되었습니다.");
    },
    onError: (err) => {
      toast.error(err.message || "환불 거절에 실패했습니다.");
    },
  });

  const REFUND_STATUS_LABELS: Record<string, string> = {
    none: "없음",
    requested: "요청됨",
    approved: "승인됨",
    processing: "처리 중",
    completed: "완료",
    rejected: "거절",
  };

  return (
    <Card className="hanji-card">
      <CardHeader>
        <CardTitle className="text-lg hanja-display">환불 요청</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(refundsQuery.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">환불 요청이 없습니다.</p>
        )}
        {(refundsQuery.data ?? []).map((payment) => (
          <div key={payment.id} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">결제 #{payment.id}</div>
                <div className="text-sm text-muted-foreground">
                  {planLabelOf(payment.planType)} · {payment.amount.toLocaleString()}원
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  결제수단: {classifyRefundMethod(payment.paymentMethod) === "card" ? "카드결제" : "계좌입금"}
                </div>
              </div>
              <Badge variant="outline">
                {REFUND_STATUS_LABELS[payment.refundStatus] || payment.refundStatus}
              </Badge>
            </div>

            {/* 고객에게 발송될 환불 안내 문구 미리보기 */}
            <div className="bg-amber-50 border border-amber-200 p-2 rounded text-xs text-amber-900">
              <div className="font-medium mb-1">고객 안내 문구 (자동 발송):</div>
              <div>{getRefundMessage(payment.paymentMethod)}</div>
            </div>

            {payment.refundReason && (
              <div className="bg-muted p-2 rounded text-sm">
                <div className="font-medium text-xs mb-1">환불 사유:</div>
                <div className="text-muted-foreground">{payment.refundReason}</div>
              </div>
            )}

            {payment.refundAmount && (
              <div className="text-sm">
                <span className="text-muted-foreground">환불액: </span>
                <span className="font-medium">{payment.refundAmount.toLocaleString()}원</span>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {payment.refundStatus === "requested" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => approveMutation.mutate({ paymentId: payment.id })}
                    disabled={approveMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    승인
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => rejectMutation.mutate({ paymentId: payment.id })}
                    disabled={rejectMutation.isPending}
                    variant="outline"
                  >
                    거절
                  </Button>
                </>
              )}
              {payment.refundStatus === "approved" && (
                <Button
                  size="sm"
                  onClick={() => processMutation.mutate({ paymentId: payment.id })}
                  disabled={processMutation.isPending}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  처리 시작
                </Button>
              )}
              {payment.refundStatus === "processing" && (
                <Button
                  size="sm"
                  onClick={() => completeMutation.mutate({ paymentId: payment.id })}
                  disabled={completeMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  완료
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


/**
 * 회원/방문 통계 탭
 * - 총 회원 수 + 신규 가입(오늘/이번주/이번달) + 누적 상담 세션
 * - 방문객(PV/UV)은 외부 애널리틱스 연동 후 노출 예정(현재 안내 표시)
 */
function MembershipStatsTab() {
  const statQuery = trpc.admin.membershipStats.useQuery();

  if (statQuery.isLoading) {
    return (
      <Card className="hanji-card">
        <CardContent className="py-16 text-center text-muted-foreground">
          회원 통계를 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  const s = statQuery.data;
  if (!s) {
    return (
      <Card className="hanji-card">
        <CardContent className="py-16 text-center text-muted-foreground">
          데이터를 불러오지 못했습니다.
        </CardContent>
      </Card>
    );
  }

  const num = (n: number) => n.toLocaleString("ko-KR");

  return (
    <div className="space-y-6">
      {/* 핵심 지표: 총 방문(준비중) + 총 회원 수 (요청 핵심) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hanji-card border-sky-500/40">
          <CardContent className="py-6">
            <div className="text-sm md:text-base text-muted-foreground font-medium">총 방문객</div>
            <div className="hanja-display text-2xl md:text-3xl mt-2 text-sky-500">집계 준비중</div>
            <div className="text-[11px] text-muted-foreground mt-1">방문 추적 연동 후 표시</div>
          </CardContent>
        </Card>
        <Card className="hanji-card border-amber-500/40">
          <CardContent className="py-6">
            <div className="text-sm md:text-base text-muted-foreground font-medium">총 회원 수</div>
            <div className="hanja-display text-3xl md:text-4xl mt-2 text-amber-600">{num(s.totalUsers)}명</div>
            <div className="text-[11px] text-muted-foreground mt-1">관리자 {num(s.adminUsers)}명 포함</div>
          </CardContent>
        </Card>
        <Card className="hanji-card">
          <CardContent className="py-6">
            <div className="text-sm md:text-base text-muted-foreground font-medium">누적 상담 세션</div>
            <div className="hanja-display text-3xl md:text-4xl mt-2">{num(s.totalSessions)}건</div>
            <div className="text-[11px] text-muted-foreground mt-1">오늘 {num(s.sessionsToday)}건</div>
          </CardContent>
        </Card>
        <Card className="hanji-card">
          <CardContent className="py-6">
            <div className="text-sm md:text-base text-muted-foreground font-medium">오늘 신규 가입</div>
            <div className="hanja-display text-3xl md:text-4xl mt-2">{num(s.newToday)}명</div>
          </CardContent>
        </Card>
      </div>

      {/* 신규 가입 추이 (기간별) */}
      <Card className="hanji-card">
        <CardHeader>
          <CardTitle className="text-lg hanja-display">신규 가입 회원</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-xs text-muted-foreground">오늘</div>
              <div className="hanja-display text-2xl mt-1">{num(s.newToday)}명</div>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-xs text-muted-foreground">이번 주</div>
              <div className="hanja-display text-2xl mt-1">{num(s.newWeek)}명</div>
            </div>
            <div className="text-center p-4 border border-border rounded-lg">
              <div className="text-xs text-muted-foreground">이번 달</div>
              <div className="hanja-display text-2xl mt-1">{num(s.newMonth)}명</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            ※ 방문객 수(순 방문자/페이지뷰)는 방문 추적 연동 후 "총 방문객" 카드에 표시됩니다.
            현재는 가입·이용 데이터를 기준으로 집계합니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * 매출 통계 탭
 * - 기간(일/주/월) 전환
 * - 1계층 총매출 / 2계층 채널(AI·마스터) / 3계층 메뉴 드릴다운
 * - 메뉴별 매출 비중
 * - 무료 건수는 매출 0이지만 이용 건수에 포함(구분 표시)
 */
function RevenueStatsTab() {
  // periodMode: 오늘 / 이번 주 / 이번 달 / 올해
  const [periodMode, setPeriodMode] = useState<"today" | "week" | "month" | "year">("today");
  const [openChannels, setOpenChannels] = useState<Record<string, boolean>>({
    ai: true,
    master: true,
  });

  // 기간 모드에 따라 from/to 구간과 시계열 단위(granularity)를 자동 결정.
  //  - 오늘: 오늘 00:00~현재, 일별
  //  - 이번 주: 이번 주 월요일 00:00~현재, 일별
  //  - 이번 달: 이번 달 1일 00:00~현재, 일별
  //  - 올해: 올해 1월 1일 00:00~현재, 월별
  const { queryInput, granularity } = useMemo(() => {
    const r = periodRange(periodMode);
    return {
      granularity: r.granularity,
      queryInput: {
        from: r.from.toISOString(),
        to: r.to.toISOString(),
        granularity: r.granularity,
      } as const,
    };
  }, [periodMode]);

  const statsQuery = trpc.stats.revenue.useQuery(queryInput);

  const won = (n: number) => `${n.toLocaleString()}원`;

  if (statsQuery.isLoading) {
    return (
      <Card className="hanji-card">
        <CardContent className="py-16 text-center text-muted-foreground">
          매출 데이터를 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  const data = statsQuery.data;
  if (!data) {
    return (
      <Card className="hanji-card">
        <CardContent className="py-16 text-center text-muted-foreground">
          데이터를 불러오지 못했습니다.
        </CardContent>
      </Card>
    );
  }

  const { summary, series, shares } = data;
  const maxBucket = Math.max(1, ...series.map((b) => b.revenue));

  return (
    <div className="space-y-6">
      {/* 기간 선택: 오늘 / 이번 주 / 이번 달 / 올해 */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { v: "today", label: "오늘" },
          { v: "week", label: "이번 주" },
          { v: "month", label: "이번 달" },
          { v: "year", label: "올해" },
        ] as const).map((opt) => (
          <Button
            key={opt.v}
            size="lg"
            variant={periodMode === opt.v ? "default" : "outline"}
            className={`text-base md:text-lg font-semibold px-6 py-5 ${
              periodMode === opt.v ? "" : "bg-card"
            }`}
            onClick={() => setPeriodMode(opt.v)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* 1계층: 총매출 + 요약 카드 (큰 글씨, 가시성 우선) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hanji-card border-amber-500/40">
          <CardContent className="py-6">
            <div className="text-sm md:text-base text-muted-foreground font-medium">총매출</div>
            <div className="hanja-display text-3xl md:text-4xl mt-2 text-amber-600">{won(summary.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card className="hanji-card">
          <CardContent className="py-6">
            <div className="text-sm md:text-base text-muted-foreground font-medium">유료 결제 건수</div>
            <div className="hanja-display text-3xl md:text-4xl mt-2">{summary.totalPaidCount}건</div>
          </CardContent>
        </Card>
        <Card className="hanji-card">
          <CardContent className="py-6">
            <div className="text-sm md:text-base text-muted-foreground font-medium">전체 이용 건수</div>
            <div className="hanja-display text-3xl md:text-4xl mt-2">{summary.totalCount}건</div>
          </CardContent>
        </Card>
        <Card className="hanji-card">
          <CardContent className="py-6">
            <div className="text-sm md:text-base text-muted-foreground font-medium">무료 이용 건수</div>
            <div className="hanja-display text-3xl md:text-4xl mt-2">{summary.freeCount}건</div>
          </CardContent>
        </Card>
      </div>

      {/* 시계열 막대 (매출) */}
      <Card className="hanji-card">
        <CardHeader>
          <CardTitle className="text-xl hanja-display">
            {periodMode === "today"
              ? "오늘"
              : periodMode === "week"
                ? "이번 주 (일별)"
                : periodMode === "month"
                  ? "이번 달 (일별)"
                  : "올해 (월별)"}{" "}
            매출 추이
          </CardTitle>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <p className="text-sm text-muted-foreground">해당 기간 매출이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {series.map((b) => (
                <div key={b.key} className="flex items-center gap-3 text-xs">
                  <div className="w-24 shrink-0 text-muted-foreground tabular-nums">{b.key}</div>
                  <div className="flex-1 bg-muted rounded h-5 overflow-hidden">
                    <div
                      className="h-full bg-amber-500/70 rounded transition-[width] duration-300"
                      style={{ width: `${(b.revenue / maxBucket) * 100}%` }}
                    />
                  </div>
                  <div className="w-28 shrink-0 text-right tabular-nums font-medium">
                    {won(b.revenue)}
                  </div>
                  <div className="w-12 shrink-0 text-right text-muted-foreground tabular-nums">
                    {b.totalCount}건
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2계층 → 3계층 드릴다운 */}
      <Card className="hanji-card">
        <CardHeader>
          <CardTitle className="text-lg hanja-display">채널별 · 메뉴별 매출</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.channels.map((ch) => {
            const isOpen = openChannels[ch.channel] ?? true;
            return (
              <div key={ch.channel} className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setOpenChannels((prev) => ({ ...prev, [ch.channel]: !isOpen }))
                  }
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{isOpen ? "▾" : "▸"}</span>
                    <span className="font-medium">{ch.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {ch.paidCount}건 결제
                    </Badge>
                  </div>
                  <span className="hanja-display text-lg">{won(ch.revenue)}</span>
                </button>
                {isOpen && (
                  <div className="divide-y divide-border">
                    {ch.menus.map((m) => (
                      <div
                        key={m.planType}
                        className="flex items-center justify-between px-4 py-2.5 pl-9 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span>{m.label}</span>
                          {m.isFree && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              무료
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {m.isFree
                              ? `${m.totalCount}건 이용`
                              : `${m.paidCount}/${m.totalCount}건`}
                          </span>
                          <span className="tabular-nums font-medium w-24 text-right">
                            {won(m.revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 고객 분석 섹션 */}
      <CustomerAnalyticsSection />

      {/* 메뉴별 매출 비중 */}
      <Card className="hanji-card">
        <CardHeader>
          <CardTitle className="text-lg hanja-display">상품별 매출 비중</CardTitle>
        </CardHeader>
        <CardContent>
          {shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">매출이 발생한 상품이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {shares.map((s) => (
                <div key={s.planType} className="flex items-center gap-3 text-sm">
                  <div className="w-32 shrink-0">{s.label}</div>
                  <div className="flex-1 bg-muted rounded h-4 overflow-hidden">
                    <div
                      className="h-full bg-amber-500/70 rounded"
                      style={{ width: `${s.sharePct}%` }}
                    />
                  </div>
                  <div className="w-14 shrink-0 text-right tabular-nums text-muted-foreground">
                    {s.sharePct}%
                  </div>
                  <div className="w-24 shrink-0 text-right tabular-nums font-medium">
                    {won(s.revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


/**
 * 고객 분석 섹션 (재구매율 / LTV / 결제 이력 상위 고객)
 * 데이터가 쌓일수록 의미가 커지는 인프라. 현재는 누적 결제 기준 즉시 반영.
 */
function CustomerAnalyticsSection() {
  const q = trpc.stats.customers.useQuery({ topN: 20 });
  const won = (n: number) => `${n.toLocaleString()}원`;

  return (
    <Card className="hanji-card">
      <CardHeader>
        <CardTitle className="text-lg hanja-display">고객 분석</CardTitle>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">고객 데이터를 불러오는 중...</p>
        ) : !q.data ? (
          <p className="text-sm text-muted-foreground">데이터를 불러오지 못했습니다.</p>
        ) : q.data.totalCustomers === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 고객 데이터가 없습니다. 결제가 쌓이면 자동으로 분석됩니다.
          </p>
        ) : (
          <div className="space-y-6">
            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs text-muted-foreground">결제 고객</div>
                <div className="hanja-display text-2xl mt-1">{q.data.payingCustomers}명</div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs text-muted-foreground">재구매율</div>
                <div className="hanja-display text-2xl mt-1">{q.data.repurchaseRatePct}%</div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs text-muted-foreground">LTV (1인 평균)</div>
                <div className="hanja-display text-2xl mt-1">{won(q.data.ltv)}</div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="text-xs text-muted-foreground">1인 평균 결제</div>
                <div className="hanja-display text-2xl mt-1">
                  {q.data.avgPaidCountPerCustomer}건
                </div>
              </div>
            </div>

            {/* 상위 고객 결제 이력 */}
            <div>
              <div className="text-sm font-medium mb-2">상위 고객 (누적 결제액 기준)</div>
              {q.data.profiles.filter((p) => p.paidCount > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground">유료 결제 고객이 없습니다.</p>
              ) : (
                <div className="space-y-1.5">
                  {q.data.profiles
                    .filter((p) => p.paidCount > 0)
                    .map((p) => (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between text-sm border-b border-border/50 pb-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground tabular-nums">#{p.userId}</span>
                          {p.isReturning && (
                            <Badge variant="outline" className="text-[10px]">
                              재구매
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {p.paidCount}건
                          </span>
                          {p.lastPaidAt && (
                            <span className="text-xs text-muted-foreground">
                              최근 {new Date(p.lastPaidAt).toLocaleDateString()}
                            </span>
                          )}
                          <span className="tabular-nums font-medium w-24 text-right">
                            {won(p.totalSpent)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// ── 셀프작명 라이선스 현황 탭 ───────────────────────────────────────────────
function NamingLicenseTab() {
  const paymentsQuery = trpc.naming.listSelfNamingPayments.useQuery();
  const rows = (paymentsQuery.data ?? []) as Array<{
    id: number;
    userId: number;
    status: string;
    paidAt: string | null;
    createdAt: string;
    depositorName: string | null;
    depositorPhone: string | null;
    userName: string | null;
    userEmail: string | null;
  }>;

  const DAYS = 30;
  const MS = DAYS * 24 * 60 * 60 * 1000;

  function calcDaysLeft(paidAt: string | null): number | null {
    if (!paidAt) return null;
    const expires = new Date(new Date(paidAt).getTime() + MS);
    const left = Math.ceil((expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return Math.max(0, left);
  }

  const paidRows = rows.filter((r) => r.status === "paid");
  const pendingRows = rows.filter((r) => r.status !== "paid");

  return (
    <div className="space-y-6">
      {/* 입금 대기 */}
      {pendingRows.length > 0 && (
        <Card className="hanji-card border-2" style={{ borderColor: "#b45309" }}>
          <CardHeader>
            <CardTitle className="text-xl font-extrabold" style={{ color: "#5c3d0a" }}>
              ⏳ 작명권 입금 승인 대기 ({pendingRows.length}건)
            </CardTitle>
            <p className="text-sm mt-1" style={{ color: "#7c5a20" }}>
              입금 탭에서 승인 처리하세요. 승인 즉시 30일 카운팅이 시작됩니다.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRows.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border-2" style={{ background: "#fffbeb", borderColor: "#d97706" }}>
                <div>
                  <div className="text-base font-extrabold" style={{ color: "#5c3d0a" }}>
                    {r.userName || r.userEmail || `회원 #${r.userId}`}
                  </div>
                  <div className="text-sm mt-0.5" style={{ color: "#7c5a20" }}>
                    입금자: {r.depositorName || "—"} · {r.depositorPhone || "연락처 미입력"}
                  </div>
                  <div className="text-xs mt-0.5 text-muted-foreground">
                    신청일: {new Date(r.createdAt).toLocaleString("ko-KR")}
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-sm font-extrabold text-white" style={{ background: "#b45309" }}>
                  승인 대기
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 활성 라이선스 목록 */}
      <Card className="hanji-card">
        <CardHeader>
          <CardTitle className="text-xl font-extrabold" style={{ color: "#2b1d10" }}>
            셀프작명 이용권 현황 (결제완료 {paidRows.length}건)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsQuery.isLoading && (
            <p className="text-base text-muted-foreground py-4">불러오는 중...</p>
          )}
          {!paymentsQuery.isLoading && paidRows.length === 0 && (
            <p className="text-base text-muted-foreground py-4">결제 완료된 이용권이 없습니다.</p>
          )}
          <div className="space-y-3">
            {paidRows.map((r) => {
              const daysLeft = calcDaysLeft(r.paidAt);
              const isExpired = daysLeft !== null && daysLeft === 0;
              const isUrgent = daysLeft !== null && daysLeft > 0 && daysLeft <= 5;
              const isActive = daysLeft !== null && daysLeft > 0;
              const pctLeft = daysLeft !== null ? Math.round((daysLeft / DAYS) * 100) : 0;
              const expiresAt = r.paidAt
                ? new Date(new Date(r.paidAt).getTime() + MS).toLocaleDateString("ko-KR")
                : "—";

              return (
                <div
                  key={r.id}
                  className="p-5 rounded-2xl border-2"
                  style={{
                    background: isExpired ? "#fef2f2" : isUrgent ? "#fffbeb" : "#f0fdf4",
                    borderColor: isExpired ? "#fca5a5" : isUrgent ? "#fbbf24" : "#86efac",
                  }}
                >
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="text-lg font-extrabold" style={{ color: "#2b1d10" }}>
                        {r.userName || r.userEmail || `회원 #${r.userId}`}
                      </div>
                      <div className="text-sm mt-1" style={{ color: "#5c3d0a" }}>
                        결제일: {r.paidAt ? new Date(r.paidAt).toLocaleDateString("ko-KR") : "—"} &nbsp;·&nbsp; 만료일: {expiresAt}
                      </div>
                    </div>
                    <div className="text-right">
                      {isExpired ? (
                        <span className="text-2xl font-extrabold text-red-700">만료</span>
                      ) : (
                        <div>
                          <span className="text-3xl font-extrabold" style={{ color: isUrgent ? "#b45309" : "#15803d" }}>
                            {daysLeft}일
                          </span>
                          <span className="text-base font-bold ml-1" style={{ color: "#5c3d0a" }}>남음</span>
                          {isUrgent && <div className="text-sm font-extrabold text-amber-700 mt-0.5">⚠ 곧 만료</div>}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 진행 바 */}
                  {isActive && (
                    <div className="mt-4 h-3 rounded-full overflow-hidden bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pctLeft}%`,
                          background: isUrgent ? "#d97706" : "#16a34a",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
