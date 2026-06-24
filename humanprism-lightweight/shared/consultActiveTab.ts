/**
 * 상담 세션의 planType을 상단 네비 활성 탭 경로로 매핑한다.
 * 궁합→/compatibility, 마스터→/appointments/new, 그 외→/plans(개인 상담)
 *
 * client(SiteHeader, Consult)와 server 테스트가 공유하므로 shared에 둔다.
 */
export function consultActiveTab(planType: string | undefined | null): string {
  if (planType === "compatibility_chat") return "/compatibility";
  if (planType === "master_chat" || planType === "master_offline") return "/appointments/new";
  return "/plans";
}
