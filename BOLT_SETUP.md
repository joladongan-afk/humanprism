# HumanPrism Bolt.new 이관 가이드

이 문서는 HumanPrism 프로젝트를 Bolt.new로 이관하기 위한 단계별 가이드입니다.

---

## 📋 목차

1. [사전 요구사항](#사전-요구사항)
2. [Bolt.new 초기 설정](#boltnew-초기-설정)
3. [환경 변수 설정](#환경-변수-설정)
4. [데이터베이스 초기화](#데이터베이스-초기화)
5. [API 연동 설정](#api-연동-설정)
6. [로컬 실행 및 테스트](#로컬-실행-및-테스트)
7. [알려진 문제 및 해결 방법](#알려진-문제-및-해결-방법)

---

## 사전 요구사항

### 필수 환경
- **Node.js**: v18.0.0 이상 (권장: v22.13.0)
- **npm**: v9.0.0 이상 또는 **pnpm**: v8.0.0 이상
- **MySQL/TiDB**: 데이터베이스 서버 (원격 또는 로컬)

### 필수 API 키 및 자격증명
- **Claude API 키** (Anthropic)
- **카카오 REST API 키** (간편 로그인)
- **네이버 클라이언트 ID/시크릿** (간편 로그인)
- **포트원 API 키** (결제 연동, 현재 심사 대기)
- **솔라피 API 키/시크릿** (SMS 발송)

---

## Bolt.new 초기 설정

### 1단계: 프로젝트 업로드
1. Bolt.new 접속: https://bolt.new
2. "New Project" 클릭
3. ZIP 파일 업로드 또는 GitHub 리포지토리 연결
4. 프로젝트 로드 대기

### 2단계: 의존성 설치
```bash
npm install
# 또는
pnpm install
```

**예상 시간**: 2-3분

### 3단계: 프로젝트 구조 확인
```
humanprism/
├── client/                 # React 프론트엔드
├── server/                 # Express 백엔드
├── drizzle/                # DB 스키마 및 마이그레이션
├── shared/                 # 공유 타입/상수
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example            # 환경 변수 템플릿
```

---

## 환경 변수 설정

### 1단계: .env.local 파일 생성
```bash
cp .env.example .env.local
```

### 2단계: 필수 환경 변수 입력

#### 데이터베이스
```env
DATABASE_URL=mysql://username:password@host:3306/humanprism
```

#### JWT 시크릿 (쿠키 서명용)
```env
JWT_SECRET=your-32-character-secret-key-here-min-32-chars
```

#### Node 환경
```env
NODE_ENV=development
```

#### 공개 도메인 (로컬 개발 시)
```env
PUBLIC_BASE_URL=http://localhost:5173
```

---

## 데이터베이스 초기화

### 1단계: 데이터베이스 생성
```sql
CREATE DATABASE humanprism CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2단계: 마이그레이션 실행
```bash
npm run db:migrate
# 또는
pnpm db:migrate
```

**마이그레이션 파일 위치**: `drizzle/` 폴더 (0000 ~ 0020)

### 3단계: 마이그레이션 상태 확인
```bash
npm run db:studio
# 또는
pnpm db:studio
```

Drizzle Studio가 브라우저에서 열리면 성공입니다.

---

## API 연동 설정

### ⚠️ 중요: Manus Forge API → Anthropic API 전환

**현재 상태**: 코드가 Manus 내장 Forge API를 사용합니다.
**필요한 작업**: Anthropic API로 직접 연결 변경

#### 변경 사항 요약

| 항목 | Manus (현재) | Anthropic (Bolt.new) |
|------|-------------|----------------------|
| API 엔드포인트 | `BUILT_IN_FORGE_API_URL` | `https://api.anthropic.com` |
| 인증 | `BUILT_IN_FORGE_API_KEY` | `CLAUDE_API_KEY` |
| 프롬프트 캐싱 | 지원 (Forge 게이트웨이) | 지원 (직접 Anthropic) |

#### 수정 필요 파일

**파일**: `server/_core/llm.ts`

**현재 코드** (라인 212-214):
```typescript
const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
```

**변경 코드** (Anthropic 직접 연결):
```typescript
const resolveApiUrl = () => "https://api.anthropic.com/v1/messages";
```

**파일**: `server/_core/llm.ts` (라인 315-322)

**현재 코드**:
```typescript
const response = await fetch(resolveApiUrl(), {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${ENV.forgeApiKey}`,
  },
  body: JSON.stringify(payload),
});
```

**변경 코드** (Anthropic 헤더 추가):
```typescript
const response = await fetch(resolveApiUrl(), {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": ENV.claudeApiKey,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify(payload),
});
```

### Claude API 키 설정

#### .env.local에 추가:
```env
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 발급 방법:
1. Anthropic 콘솔 접속: https://console.anthropic.com
2. "API Keys" 메뉴 클릭
3. "Create Key" 버튼 클릭
4. 키 복사 및 .env.local에 붙여넣기

### 프롬프트 캐싱 설정 확인

**파일**: `server/routers.ts` (consult.sendMessage 프로시저)

프롬프트 캐싱이 올바르게 설정되어 있는지 확인:

```typescript
// 시스템 프롬프트에 cache_control 설정
{
  role: "system",
  content: [
    {
      type: "text",
      text: "마스터 페르소나 시스템 프롬프트...",
      cache_control: { type: "ephemeral" }
    }
  ]
}
```

**참고**: Anthropic API 사용 시 프롬프트 캐싱은 자동으로 작동합니다.

### 간편 로그인 설정

#### 카카오
```env
KAKAO_REST_API_KEY=your_kakao_rest_api_key
KAKAO_CLIENT_SECRET=your_kakao_client_secret
```

**발급처**: https://developers.kakao.com

#### 네이버
```env
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

**발급처**: https://developers.naver.com

### 결제 연동 (포트원)

**현재 상태**: 심사 대기 중 (수동 승인 흐름 사용)

```env
PORTONE_STORE_ID=your_portone_store_id
PORTONE_API_SECRET=your_portone_api_secret
PORTONE_CHANNEL_KEY=your_portone_channel_key
```

**발급처**: https://admin.portone.io

**참고**: 현재 자동 승인 대신 수동 승인 흐름이 구현되어 있습니다.

### SMS 발송 (솔라피)

```env
SOLAPI_API_KEY=your_solapi_api_key
SOLAPI_API_SECRET=your_solapi_api_secret
SOLAPI_SENDER=01044488064
MASTER_SMS_TO=01012345678
```

**발급처**: https://solapi.com

**참고**: 알리고는 IP 고정 정책으로 클라우드 환경에서 불가하여 솔라피로 변경됨.

---

## 로컬 실행 및 테스트

### 1단계: 개발 서버 시작
```bash
npm run dev
# 또는
pnpm dev
```

**예상 출력**:
```
[OAuth] Initialized with baseURL: https://api.manus.im
Server running on http://localhost:3000/
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### 2단계: 브라우저에서 확인
- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3000/api/trpc

### 3단계: 기본 기능 테스트

#### 로그인 테스트
1. 홈페이지 접속
2. "로그인" 버튼 클릭
3. 카카오 또는 네이버 로그인 진행

#### 사주 입력 테스트
1. "만세력" 탭 접속
2. 생년월일 입력
3. "사주 확인" 버튼 클릭
4. 결과 화면 표시 확인

#### 상담 기능 테스트
1. "개인 상담" 탭 접속
2. 플랜 선택 후 결제 진행
3. 채팅 인터페이스 확인

---

## 알려진 문제 및 해결 방법

### 문제 1: "Cannot find module 'BUILT_IN_FORGE_API_URL'"

**원인**: Manus 환경 변수가 설정되지 않음

**해결**:
1. `.env.local`에 Claude API 키 추가
2. `server/_core/llm.ts` 파일 수정 (위 "API 연동 설정" 참고)

### 문제 2: 데이터베이스 연결 오류

**원인**: DATABASE_URL이 잘못되었거나 DB 서버가 실행 중이 아님

**해결**:
```bash
# 1. DATABASE_URL 확인
echo $DATABASE_URL

# 2. DB 서버 상태 확인
mysql -u username -p -h host -e "SELECT 1"

# 3. 마이그레이션 재실행
npm run db:migrate
```

### 문제 3: 로그인 실패

**원인**: OAuth 리다이렉트 URL이 잘못됨

**해결**:
1. `.env.local`에 `PUBLIC_BASE_URL=http://localhost:5173` 추가
2. 카카오/네이버 개발자 콘솔에서 리다이렉트 URL 확인
3. 서버 재시작

### 문제 4: SMS 발송 실패

**원인**: 솔라피 API 키가 잘못되었거나 발신번호 미등록

**해결**:
1. 솔라피 콘솔에서 발신번호 등록 확인
2. API 키/시크릿 재확인
3. 로그 확인: `server/_core/sms.ts`

---

## 프로덕션 배포

### 1단계: 빌드
```bash
npm run build
# 또는
pnpm build
```

### 2단계: 환경 변수 설정 (프로덕션)
시스템 환경 변수로 설정 (`.env.local` 사용 금지)

### 3단계: 서버 시작
```bash
npm run start
# 또는
pnpm start
```

---

## 지원 및 문제 해결

### 로그 확인
```bash
# 개발 서버 로그
tail -f .manus-logs/devserver.log

# 브라우저 콘솔 로그
# 브라우저 개발자 도구 (F12) → Console 탭
```

### 타입체크
```bash
npm run typecheck
# 또는
pnpm typecheck
```

### 테스트 실행
```bash
npm run test
# 또는
pnpm test
```

---

## 추가 리소스

- **Anthropic API 문서**: https://docs.anthropic.com
- **프롬프트 캐싱**: https://docs.anthropic.com/en/docs/build-a-bot/recommended-setup#caching
- **Drizzle ORM**: https://orm.drizzle.team
- **Express.js**: https://expressjs.com
- **React**: https://react.dev

---

## 버전 정보

- **프로젝트**: HumanPrism
- **Node.js**: v18+
- **React**: 19.x
- **Express**: 4.x
- **Drizzle ORM**: 0.x
- **Claude API**: claude-sonnet-4-6 (또는 최신)

---

**마지막 업데이트**: 2026-06-23
