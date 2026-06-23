export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // 카카오/네이버 간편 로그인 키 자리. 콘솔에서 발급 후 webdev_request_secrets로 주입.
  kakaoRestApiKey: process.env.KAKAO_REST_API_KEY ?? "",
  kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET ?? "",
  naverClientId: process.env.NAVER_CLIENT_ID ?? "",
  naverClientSecret: process.env.NAVER_CLIENT_SECRET ?? "",
  // 포트원 V2 API 키. 콘솔에서 발급 후 webdev_request_secrets로 주입.
  portoneStoreId: process.env.PORTONE_STORE_ID ?? "",
  portoneApiSecret: process.env.PORTONE_API_SECRET ?? "",
  // 포트원 결제창 호출에 필요한 채널 키(콘솔 > 연동 정보에서 PG 채널 연동 후 발급).
  portoneChannelKey: process.env.PORTONE_CHANNEL_KEY ?? "",
  // 운영자 이메일 목록 (쉼표로 구분). 이 이메일로 로그인하면 자동으로 admin 역할 부여.
  adminEmails: (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim()).filter(Boolean),
  // 운영자 openId 목록 (쉼표로 구분). 예: "kakao:123456,naver:abc123,google:xyz789"
  adminOpenIds: (process.env.ADMIN_OPENIDS ?? "").split(",").map(e => e.trim()).filter(Boolean),
  // Claude API 키. Anthropic 콘솔에서 발급 후 webdev_request_secrets로 주입.
  claudeApiKey: process.env.CLAUDE_API_KEY ?? "",
  // 알리고(Aligo) SMS 발송 자리. 내일 가입·발신번호 등록 후 webdev_request_secrets로 주입.
  //  - aligoApiKey: 알리고 API 키
  //  - aligoUserId: 알리고 계정 아이디
  //  - aligoSender: 등록된 발신번호(마스터 휴대폰)
  //  - masterSmsTo: 알림을 받을 마스터 휴대폰(수신번호)
  aligoApiKey: process.env.ALIGO_API_KEY ?? "",
  aligoUserId: process.env.ALIGO_USER_ID ?? "",
  aligoSender: process.env.ALIGO_SENDER ?? "",
  masterSmsTo: process.env.MASTER_SMS_TO ?? "",
  // 솔라피(SOLAPI) SMS 발송 자격증명. 알리고가 IP 고정 정책으로 클라우드 환경에서 불가하여 전환.
  //  - solapiApiKey: 솔라피 API Key (모든 IP 허용으로 발급)
  //  - solapiApiSecret: 솔라피 API Secret (HMAC-SHA256 서명용)
  //  - solapiSender: 등록·인증된 발신번호(하이픈 없이, 예: 01044488064 = 010-4448-8064)
  solapiApiKey: process.env.SOLAPI_API_KEY ?? "",
  solapiApiSecret: process.env.SOLAPI_API_SECRET ?? "",
  solapiSender: process.env.SOLAPI_SENDER ?? "",
  // 운영 공개 도메인(OAuth redirect_uri 고정용). 프록시 뒤에서 host 헤더가 내부 주소(run.app)로
  // 잡히는 환경에서, 소셜 로그인 콜백 주소를 이 값으로 고정한다. 예: "https://human-prism.com"
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? "").replace(/\/+$/, ""),
};
