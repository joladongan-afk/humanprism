# 휴먼프리즘 프로젝트 - 세션 인계 문서

**작성일:** 2026-06-05  
**프로젝트:** human-prism (Human Prism - Premium AI Saju Consulting Web App)  
**현재 버전:** fa30f25b (RAG 벡터 DB 구현 완료)

---

## 1. 프로젝트 기본 정보

| 항목 | 값 |
|------|-----|
| **프로젝트 경로** | `/home/ubuntu/human-prism` |
| **개발 서버** | https://3000-iox6v4txs7g17v8p7fvqt-a0702d08.sg1.manus.computer |
| **포트** | 3000 |
| **프레임워크** | React 19 + Express 4 + tRPC 11 |
| **데이터베이스** | MySQL/TiDB |
| **인증** | Manus OAuth + 카카오/네이버 간편 로그인 |
| **결제** | 포트원(Portone) |

---

## 2. 환경 변수 (Secrets)

### 2.1 자동 주입 환경변수 (Manus 시스템)
다음 변수들은 Manus에서 자동으로 주입됨. 코드에서 직접 사용 가능:

```
BUILT_IN_FORGE_API_KEY      - Manus 내장 API 키
BUILT_IN_FORGE_API_URL      - Manus 내장 API URL
CLAUDE_API_KEY              - Claude API 키 (구매 필요)
JWT_SECRET                  - 세션 쿠키 서명 키
KAKAO_CLIENT_SECRET         - 카카오 로그인 시크릿
KAKAO_REST_API_KEY          - 카카오 REST API 키
NAVER_CLIENT_ID             - 네이버 로그인 ID
NAVER_CLIENT_SECRET         - 네이버 로그인 시크릿
OAUTH_SERVER_URL            - Manus OAuth 서버 URL
OWNER_NAME                  - 프로젝트 소유자 이름
OWNER_OPEN_ID               - 프로젝트 소유자 ID
PORTONE_API_SECRET          - 포트원 API 시크릿
PORTONE_STORE_ID            - 포트원 상점 ID
VITE_ANALYTICS_ENDPOINT     - 분석 엔드포인트
VITE_ANALYTICS_WEBSITE_ID   - 분석 웹사이트 ID
VITE_APP_ID                 - Manus OAuth 앱 ID
VITE_APP_LOGO               - 앱 로고 URL
VITE_APP_TITLE              - 앱 제목
VITE_FRONTEND_FORGE_API_KEY - 프론트엔드 Forge API 키
VITE_FRONTEND_FORGE_API_URL - 프론트엔드 Forge API URL
VITE_OAUTH_PORTAL_URL       - OAuth 포탈 URL
DATABASE_URL                - 데이터베이스 연결 문자열
```

### 2.2 주요 API 키 출처

| API | 발급처 | 상태 | 비고 |
|-----|--------|------|------|
| **카카오 로그인** | https://developers.kakao.com | ✓ 설정됨 | 카카오 계정으로 간편 로그인 |
| **네이버 로그인** | https://developers.naver.com | ✓ 설정됨 | 네이버 계정으로 간편 로그인 |
| **Claude API** | https://console.anthropic.com | ⏳ 대기 | $5 크레딧 구매 필요 |
| **포트원** | https://portone.io | ✓ 설정됨 | 결제 처리 |

### 2.3 Claude API 크레딧 구매 상태

**문제:** $5 API 크레딧 구매 버튼 작동 안 함

**원인 분석:**
- 인천 IP에서 세종 주소 입력 → IP/주소 불일치 의심
- 결제 게이트웨이 부정 거래 탐지 시스템 차단 가능성

**해결 방법 (우선순위):**
1. 세종 집에서 세종 주소로 재시도 (IP/주소 일치)
2. 롯데카드 청구 주소 정확히 확인 후 입력
3. Chrome/Firefox 등 다른 브라우저 시도
4. 클라우드 컴퓨터에서 다른 IP로 시도
5. Anthropic 직접 연락 (수동 크레딧 추가)

**크레딧 추가 후:**
- `pnpm test` 실행 → 모든 테스트 통과 확인
- 실제 상담 흐름 테스트
- 배포 완료

---

## 3. 프로젝트 구조

```
/home/ubuntu/human-prism/
├── client/                    # React 프론트엔드
│   ├── src/
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── components/       # 재사용 컴포넌트
│   │   ├── lib/trpc.ts       # tRPC 클라이언트
│   │   └── App.tsx           # 라우팅
│   └── public/               # 정적 파일 (favicon, robots.txt만)
├── server/                    # Express + tRPC 백엔드
│   ├── routers.ts            # tRPC 라우터
│   ├── db.ts                 # 데이터베이스 헬퍼
│   ├── claude-api.ts         # Claude API 헬퍼
│   ├── claude-api-rag.ts     # Claude + RAG 통합
│   ├── rag-search.ts         # RAG 검색 엔진
│   ├── rag-db.json           # RAG 벡터 DB (16개 청크)
│   ├── masterPrompt.ts       # 마스터 시스템 프롬프트
│   ├── _core/                # 프레임워크 핵심 (수정 금지)
│   └── *.test.ts             # 테스트 파일
├── drizzle/                   # 데이터베이스 스키마
│   ├── schema.ts             # 테이블 정의
│   └── migrations/           # SQL 마이그레이션
├── todo.md                    # 작업 목록
├── PROJECT_HANDOVER.md        # 이 파일
└── package.json              # 의존성
```

---

## 4. 최근 완료된 작업 (2026-06-05)

### Phase 1-4: RAG 벡터 DB 구현

**완료 항목:**
1. ✓ RAG 검색 엔진 (rag-search.ts) - 21/21 테스트 통과
2. ✓ Claude API + RAG 통합 (claude-api-rag.ts) - 22/22 테스트 통과
3. ✓ 상담 라우터 수정 (routers.ts) - invokeClaudeWithRag 적용
4. ✓ 통합 테스트 (consult-rag-integration.test.ts) - 20/20 테스트 통과

**추가된 파일:**
- server/rag-db.json (16개 청크, 36KB)
- server/rag-search.ts (검색 엔진)
- server/claude-api-rag.ts (Claude 통합)
- server/rag-search.test.ts (21개 테스트)
- server/claude-api-rag.test.ts (22개 테스트)
- server/consult-rag-integration.test.ts (20개 테스트)

**테스트 결과:**
- 전체: 206/210 통과 (Claude 크레딧 부족으로 4개 실패)
- TypeScript: 0 에러
- 빌드: 정상

**RAG 검색 흐름:**
사용자 질문 → RAG 검색 (tags/query_keywords 기반) → 마스터 시스템 프롬프트에 append → Claude API 호출 → 강화된 상담 제공

---

## 5. 이전 완료 작업 (2026-06-01)

### Phase 1-2: 상담 기록 삭제 및 만세력 자동 선택

**완료 항목:**
1. ✓ MyRoom 페이지에 상담 세션 삭제 기능
2. ✓ Plans 페이지에 쿼리 파라미터 자동 선택
3. ✓ 사주 생성 후 자동 무료 플랜 다이얼로그 열기

**체크포인트:** 29210dbc

---

## 6. 현재 상태 요약

| 항목 | 상태 | 비고 |
|------|------|------|
| **코드 완성도** | 100% | 모든 기능 구현 완료 |
| **테스트** | 206/210 | Claude 크레딧 부족으로 4개 실패 |
| **빌드** | ✓ 정상 | 배포 준비 완료 |
| **Claude API** | ⏳ 대기 | $5 크레딧 구매 필요 |
| **배포** | ⏳ 대기 | 크레딧 추가 후 가능 |

---

## 7. 다음 작업 (우선순위)

### 긴급 (이번 세션)
1. **Claude API $5 크레딧 구매**
   - 세종 집에서 세종 주소로 시도
   - 롯데카드 청구 주소 정확히 확인
   - Chrome/Firefox 등 다른 브라우저 시도

### 높음 (크레딧 추가 후)
1. **최종 테스트**
   - `pnpm test` 실행 → 210/210 통과 확인
   - 실제 상담 흐름 테스트 (UI에서 질문 입력)
   - RAG 검색 + Claude 응답 동작 확인

2. **배포**
   - Publish 버튼 클릭
   - 라이브 환경에서 테스트

### 중간 (선택사항)
1. **상담 UI 개선**
   - RAG 검색 결과 시각화 (출처 표시)
   - 상담 히스토리 개선

2. **RAG 청크 관리**
   - 새로운 청크 추가 프로세스 자동화
   - 벡터 DB 업데이트 스크립트

---

## 8. 주요 파일 설명

### server/rag-search.ts
- **용도:** RAG 벡터 DB 검색 엔진
- **함수:**
  - `loadRagDb()` - JSON 로드
  - `searchRagChunks(query, k, threshold)` - 검색
  - `formatRagContext(chunks)` - 포맷팅

### server/claude-api-rag.ts
- **용도:** Claude API + RAG 통합
- **함수:**
  - `buildRagSystemPrompt(query, k)` - 시스템 프롬프트 생성
  - `invokeClaudeWithRag(messages, query, maxTokens)` - Claude 호출

### server/routers.ts
- **수정 사항:** `consult.sendMessage`에 `invokeClaudeWithRag` 적용
- **흐름:** 사용자 질문 → RAG 검색 → Claude 호출

### server/rag-db.json
- **내용:** 16개 청크 (10개 섹션)
- **구조:** id, section, subsection, content, tags, query_keywords
- **크기:** 약 36KB

---

## 9. 테스트 실행 방법

```bash
# 전체 테스트
cd /home/ubuntu/human-prism
pnpm test

# 특정 테스트만
pnpm test server/rag-search.test.ts
pnpm test server/claude-api-rag.test.ts
pnpm test server/consult-rag-integration.test.ts

# 빌드 확인
pnpm build

# 개발 서버 시작
pnpm dev
```

---

## 10. 중요한 주의사항

### 금지 사항
- ❌ `server/_core/` 폴더 수정 (프레임워크 핵심)
- ❌ `git reset --hard` 사용 (대신 `webdev_rollback_checkpoint` 사용)
- ❌ 로컬 파일로 이미지/미디어 저장 (S3 사용)
- ❌ 환경변수 코드에 하드코딩

### 필수 사항
- ✓ 파일 변경 후 테스트 실행
- ✓ 주요 변경 후 체크포인트 저장
- ✓ todo.md 업데이트 (완료 항목 [x] 표시)
- ✓ 새로운 기능 추가 시 테스트 작성

---

## 11. 연락처 및 참고

### 프로젝트 문서
- README.md - 프로젝트 개요
- todo.md - 작업 목록
- references/periodic-updates.md - 주기적 작업

### 외부 서비스
- Anthropic Console: https://console.anthropic.com
- Portone: https://portone.io
- 카카오 개발자: https://developers.kakao.com
- 네이버 개발자: https://developers.naver.com

---

## 12. 마지막 체크리스트

**세션 변경 전 확인:**
- [ ] todo.md 최신 상태 확인
- [ ] 모든 변경사항 저장됨
- [ ] 테스트 통과 확인
- [ ] 체크포인트 저장됨
- [ ] 이 문서 (PROJECT_HANDOVER.md) 최신 상태

**새 세션 시작 시:**
- [ ] 이 문서 읽기
- [ ] todo.md 확인
- [ ] 최신 체크포인트 확인
- [ ] 환경 변수 확인
- [ ] 개발 서버 실행

---

**마지막 업데이트:** 2026-06-05 11:58 UTC  
**작성자:** Manus AI
