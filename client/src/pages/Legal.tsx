import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type TabKey = "terms" | "privacy" | "business";

function getInitialTab(): TabKey {
  if (typeof window === "undefined") return "terms";
  const hash = window.location.hash.replace("#", "");
  if (hash === "privacy" || hash === "business") return hash;
  return "terms";
}

export default function Legal() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<TabKey>(getInitialTab);

  useEffect(() => {
    const onHash = () => setTab(getInitialTab());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const handleTab = (v: string) => {
    const next = v as TabKey;
    setTab(next);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${next}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-10 md:py-16">
        <Button
          variant="ghost"
          className="mb-6 -ml-2 text-base"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          홈으로
        </Button>

        <h1 className="hanja-display text-3xl md:text-4xl font-bold mb-2">
          이용약관 · 개인정보 · 사업자정보
        </h1>
        <p className="text-muted-foreground text-base md:text-lg mb-8">
          휴먼프리즘 서비스 이용에 관한 안내입니다.
        </p>

        <Tabs value={tab} onValueChange={handleTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="terms" className="text-sm md:text-base py-2.5">
              이용약관
            </TabsTrigger>
            <TabsTrigger value="privacy" className="text-sm md:text-base py-2.5">
              개인정보처리방침
            </TabsTrigger>
            <TabsTrigger value="business" className="text-sm md:text-base py-2.5">
              사업자정보
            </TabsTrigger>
          </TabsList>

          {/* 이용약관 */}
          <TabsContent value="terms" className="mt-8">
            <article className="space-y-6 text-base md:text-lg leading-relaxed text-foreground/90">
              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">제1조 (서비스 안내)</h2>
                <p>
                  휴먼프리즘(이하 "서비스")은 무한상담소가 운영하는 인공지능 기반
                  사주·명리 상담 서비스입니다. 서비스는 인공지능 분석과 운영자
                  '마스터'의 해석을 결합하여 제공됩니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">제2조 (상담의 성격과 한계)</h2>
                <p>
                  본 서비스의 모든 상담 내용은 자기 이해와 성찰을 돕기 위한
                  참고 자료이며, 미래를 단정하는 예언이 아닙니다. 서비스는
                  의료·법률·투자·세무 등 전문 자격이 필요한 분야의 자문을
                  제공하지 않으며, 해당 사안은 반드시 전문가와 상의하시기
                  바랍니다. 상담 결과에 근거한 이용자의 판단과 행동에 대한
                  최종 책임은 이용자 본인에게 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">제3조 (이용 요금 및 결제)</h2>
                <p>
                  서비스는 무료 체험 상담과 유료 상담으로 구성됩니다. 유료 AI
                  채팅 상담은 시간제로 운영되며, 결제는 전자결제대행사(포트원)를
                  통해 처리됩니다. 마스터와의 직접 상담(채팅·대면)은 예약 확정 후
                  계좌이체로 결제하며, 요금과 진행 시간은 각 신청 화면에
                  표시됩니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">제4조 (환불 규정)</h2>
                <p>
                  유료 상담은 디지털 콘텐츠 및 실시간 용역의 특성상, 상담이
                  개시(첫 답변 전송 또는 예약 시간 도래)된 이후에는 환불이
                  제한됩니다. 결제 후 상담이 전혀 진행되지 않은 경우에는 전액
                  환불이 가능합니다. 운영자의 사정으로 상담이 지연·중단된
                  경우에는 잔여 시간만큼 연장하거나 해당 금액을 환불합니다.
                  환불 요청은 아래 사업자정보의 연락처로 접수해 주시기 바랍니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">제5조 (현금영수증)</h2>
                <p>
                  계좌이체로 결제하신 경우, 요청하시면 소득공제용 또는
                  지출증빙용 현금영수증을 발행해 드립니다.
                </p>
              </section>

              <p className="text-sm text-muted-foreground pt-4">
                본 약관은 2026년 6월 9일부터 적용됩니다.
              </p>
            </article>
          </TabsContent>

          {/* 개인정보처리방침 */}
          <TabsContent value="privacy" className="mt-8">
            <article className="space-y-6 text-base md:text-lg leading-relaxed text-foreground/90">
              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">1. 수집하는 개인정보 항목</h2>
                <p>
                  서비스는 상담 제공에 필요한 최소한의 정보만을 수집합니다.
                  수집 항목은 로그인 계정 정보(카카오·네이버 간편 로그인 시
                  제공되는 식별값과 닉네임), 상담 대상의 생년월일·태어난 시각·성별
                  등 사주 분석에 필요한 정보, 그리고 직접 상담 예약 시 입력하신
                  연락 수단과 희망 일시·상담 주제입니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">2. 이용 목적</h2>
                <p>
                  수집한 정보는 사주 분석 및 상담 제공, 본인 확인과 결제 처리,
                  고객 문의 응대의 목적으로만 이용합니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">3. 보유 및 이용 기간</h2>
                <p>
                  상담 기록은 기본적으로 저장하지 않으며, 이용자가 별도로 '보관'을
                  선택하지 않은 상담 내용은 상담 종료 후 7일 이내에 자동
                  삭제됩니다. 다만 전자상거래법 등 관계 법령에서 보존을 요구하는
                  거래·결제 기록은 해당 법령이 정한 기간 동안 보관합니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">4. 제3자 제공 및 처리 위탁</h2>
                <p>
                  서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
                  다만 서비스 운영에 필요한 범위에서 결제(포트원), 간편 로그인
                  (카카오·네이버) 등 외부 사업자의 기능을 이용하며, 이때 해당
                  목적에 필요한 정보만 안전하게 처리됩니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">5. 이용자의 권리</h2>
                <p>
                  이용자는 언제든지 자신의 개인정보 열람·정정·삭제를 요청할 수
                  있으며, 등록한 사주 정보와 상담 기록은 '내 상담실'에서 직접
                  삭제할 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-xl md:text-2xl font-bold mb-3 text-foreground">6. 개인정보 보호책임자</h2>
                <p>
                  개인정보 보호책임자: 전원석 (운영자명 '마스터')<br />
                  문의: 010-4448-8064
                </p>
              </section>

              <p className="text-sm text-muted-foreground pt-4">
                본 방침은 2026년 6월 9일부터 적용됩니다.
              </p>
            </article>
          </TabsContent>

          {/* 사업자정보 */}
          <TabsContent value="business" className="mt-8">
            <article className="space-y-6 text-base md:text-lg leading-relaxed text-foreground/90">
              <div className="rounded-xl border bg-card p-6 md:p-8 space-y-4">
                <BusinessRow label="서비스명" value="휴먼프리즘 (Human Prism)" />
                <BusinessRow label="상호" value="무한상담소" />
                <BusinessRow label="운영자" value="전원석 (운영자명 '마스터')" />
                <BusinessRow label="사업자등록번호" value="212-34-92530" />
                <BusinessRow label="통신판매업 신고번호" value="제2025-세종아름-0541호" />
                <BusinessRow
                  label="사업장 소재지"
                  value="세종특별자치시 달빛로 80 (종촌동, 가재마을 12단지)"
                />
                <BusinessRow label="고객 연락처" value="010-4448-8064" />
              </div>

              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                ※ 사업장 소재지의 상세 주소(동·호수)는 운영자의 거주지 정보 보호를
                위해 일부 비공개 처리하였습니다. 현재 사업장 이전을 준비 중이며,
                전자상거래법에 따른 확인이 필요하신 경우 위 연락처로 요청하시면
                관련 증빙(사업자등록증·통신판매업 신고증)을 안내해 드립니다.
              </p>
            </article>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function BusinessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
