# 휴먼프리즘 웹앱 - 세션 인수인계 문서

**마지막 업데이트:** 2026-06-06  
**현재 진행 상황:** Phase 16-E 진행 중 (이벤트 플랜 시크릿 코드 시스템 구현)

---

## 📋 현재까지 구현된 기능

### Phase 16: 상담 플랜 구조 개편 (4→6 플랜)

#### A. 플랜 구조 개편 (완료)
- **DB 마이그레이션:** consultSessions/payments planType enum 확장
  - 기존: free, taste, deep, entry
  - 현재: free, taste, event, deep, master_chat, master_offline
  
- **플랜 정보:**
  1. **원픽 무료 상담** (free): 5분, 무료, 1회 한정
  2. **맛보기 상담** (taste): 15분, 9,900원
  3. **이벤트 상담** (event): 25분, 무료, 1회 한정 (시크릿 코드 필요)
  4. **메인 상담** (deep): 50분, 30,000원
  5. **경청자 직접 채팅** (master_chat): 60분, 100,000원 (예약제)
  6. **경청자 대면 상담** (master_offline): 80분, 200,000원 (예약제)

#### B. 프론트엔드 UI 동기화 (완료)
- `client/src/pages/Consult.tsx`: 플랜 라벨 + 시간 정보 업데이트
- `client/src/pages/MyRoom.tsx`: PLAN_LABEL 업데이트
- `client/src/pages/Plans.tsx`: 6개 플랜 카드 완전 재구성

#### C. 실시간 타이머 구현 (완료)
- 타이머 색상 동적 변화:
  - 정상: 금색
  - 5분 이하: 황색
  - 1분 이하: 주황색 (펄싱 애니메이션)
- 5분 이하 경고 메시지 표시
- 시간 만료 시 채팅 비활성화

#### D. 이벤트 플랜 시크릿 코드 검증 (진행 중)
- ✅ DB 테이블 생성: `eventCodes` 테이블
- ✅ 코드 생성 스크립트: `scripts/generate-event-codes.mjs`
- ✅ DB 헬퍼 함수: `server/db.ts`
  - `seedEventCodes()`: 코드 대량 저장
  - `validateAndUseEventCode()`: 코드 검증 및 사용 표시
  - `listEventCodes()`: 코드 목록 조회 (운영자용)
  - `countAvailableEventCodes()`: 사용 가능 코드 개수
- ✅ 검증 로직: `server/routers.ts` mockPay 업데이트
- ✅ 환경변수: `server/_core/env.ts` eventCodes 추가

---

## 🔐 이벤트 플랜 시크릿 코드 시스템

### 설계 개요
- **형식:** HUMAN + 001~999 (3자리 숫자)
- **예:** HUMAN847, HUMAN312, HUMAN591
- **총 100개 코드 생성** (무작위 조합, 순차 패턴 없음)
- **각 코드 1회만 사용 가능**
- **DB에 사용 여부 및 사용자 기록**

### 코드 생성 방법
```bash
node scripts/generate-event-codes.mjs
```

출력 예:
```
HUMAN600,HUMAN398,HUMAN426,HUMAN484,HUMAN081,HUMAN585,HUMAN765,...
```

### 환경변수 설정
1. 위의 스크립트로 100개 코드 생성
2. `webdev_request_secrets`를 통해 설정:
   - 키: `EVENT_CODES`
   - 값: 쉼표로 구분된 코드 목록 (위의 출력값)
3. 서버 재시작 후 자동으로 DB에 저장됨

### 코드 검증 흐름
```
사용자가 이벤트 상담 신청
    ↓
eventCode 파라미터 전달 (mockPay 또는 portone prepare)
    ↓
server/routers.ts에서 validateAndUseEventCode() 호출
    ↓
DB에서 코드 조회 + 미사용 확인
    ↓
코드 유효 → isUsed=true, usedBy=userId, usedAt=now() 업데이트
    ↓
결제 진행 및 세션 생성
```

### 보안 특징
- ✅ 순차 패턴 없음 (HUMAN001 → HUMAN002 같은 패턴 불가)
- ✅ 1회 사용 제한 (DB에 기록)
- ✅ 사용자별 1회 제한과 함께 작동 (이중 제한)
- ✅ 운영자만 코드 목록 알고 있음
- ✅ 필요시 새 코드 100개 재생성 가능

---

## 📁 주요 파일 변경사항

### DB 스키마
- `drizzle/schema.ts`: `eventCodes` 테이블 추가
- `drizzle/0007_puzzling_hellfire_club.sql`: 마이그레이션 SQL (이미 적용됨)

### 백엔드
- `server/db.ts`: 
  - eventCodes 임포트 추가
  - `seedEventCodes()` 함수
  - `validateAndUseEventCode()` 함수
  - `listEventCodes()` 함수
  - `countAvailableEventCodes()` 함수

- `server/routers.ts`:
  - mockPay에서 event 플랜 검증 로직 업데이트
  - `validateAndUseEventCode()` 호출 추가

- `server/_core/env.ts`:
  - `eventCodes` 환경변수 추가 (쉼표 구분 파싱)

- `server/_core/portoneRouter.ts`:
  - prepare 프로시저에 eventCode 파라미터 추가

### 프론트엔드
- `client/src/hooks/usePortonePayment.ts`:
  - StartArgs 인터페이스에 eventCode 추가
  - prepare 호출 시 eventCode 전달

- `client/src/pages/Consult.tsx`:
  - 타이머 색상 동적 변화 추가
  - 경고 메시지 표시 로직 추가

- `client/src/pages/Plans.tsx`:
  - 6개 플랜 카드 완전 재구성

### 스크립트
- `scripts/generate-event-codes.mjs`: 코드 생성 스크립트 (새로 추가)

---

## ⚠️ 다음 단계 (남은 할 일)

### Phase 16-E (계속)
- [ ] 이벤트 플랜 UI에 코드 입력 다이얼로그 추가
- [ ] Plans.tsx에서 event 플랜 클릭 시 코드 입력 모달
- [ ] usePortonePayment 훅 통합

### Phase 16-F: 테스트
- [ ] mockPay 코드 검증 테스트 (vitest)
- [ ] validateAndUseEventCode 함수 테스트
- [ ] 1회 사용 제한 테스트
- [ ] 브라우저 통합 테스트

### Phase 16-G: 문서화 및 배포
- [ ] 운영자 매뉴얼 작성
- [ ] 사용자 가이드 작성
- [ ] 최종 checkpoint 생성

---

## 🔧 환경변수 체크리스트

**필수 설정 (아직 미설정):**
- [ ] `EVENT_CODES`: 쉼표로 구분된 100개 코드 (예: HUMAN600,HUMAN398,...)

**기존 설정 (유지):**
- ✅ `DATABASE_URL`: MySQL/TiDB 연결 문자열
- ✅ `JWT_SECRET`: 세션 쿠키 서명 키
- ✅ `VITE_APP_ID`: Manus OAuth 앱 ID
- ✅ `OAUTH_SERVER_URL`: Manus OAuth 백엔드
- ✅ `VITE_OAUTH_PORTAL_URL`: Manus 로그인 포털
- ✅ `CLAUDE_API_KEY`: Claude API 키
- ✅ `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`: 카카오 로그인
- ✅ `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`: 네이버 로그인
- ✅ `PORTONE_STORE_ID`, `PORTONE_API_SECRET`: 포트원 결제
- ✅ `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`: Manus 빌트인 API

---

## 📝 코드 리뷰 포인트

### 보안
- eventCodes 테이블의 unique 제약 (중복 코드 방지)
- isUsed 플래그로 1회 사용 제한
- usedBy 필드로 사용자 추적
- 환경변수로 코드 관리 (하드코딩 금지)

### 성능
- eventCodes 테이블 인덱스 추가 고려 (code 컬럼)
- 대량 코드 생성 시 배치 처리

### 확장성
- 코드 형식 변경 가능 (현재: HUMAN + 001~999)
- 코드 개수 조정 가능 (현재: 100개)
- 새 코드 재생성 시 기존 코드 유지 또는 삭제 선택 가능

---

## 🎯 최종 체크리스트

- [x] DB 스키마 설계 및 마이그레이션
- [x] 코드 생성 스크립트 작성
- [x] DB 헬퍼 함수 구현
- [x] 백엔드 검증 로직 구현
- [x] 프론트엔드 파라미터 전달
- [x] TypeScript 타입 일관성 확인
- [ ] 환경변수 설정 (EVENT_CODES)
- [ ] UI 코드 입력 다이얼로그 추가
- [ ] 통합 테스트
- [ ] 운영자 매뉴얼 작성

---

## 💡 주의사항

1. **코드 생성 후 즉시 저장:** 스크립트 실행 후 출력된 코드를 반드시 복사해서 저장하세요.
2. **환경변수 설정 필수:** EVENT_CODES를 설정하지 않으면 이벤트 상담이 작동하지 않습니다.
3. **코드 소진 시 재생성:** 100개 코드가 모두 사용되면 스크립트를 다시 실행하여 새 코드 생성.
4. **운영자만 알아야 함:** 코드 목록은 절대 사용자에게 공개하지 마세요.
5. **DB 백업:** 코드 사용 기록이 중요하므로 정기적으로 DB 백업.

---

## 📞 문제 해결

### "유효하지 않은 시크릿 코드입니다" 에러
- EVENT_CODES 환경변수가 설정되었는지 확인
- 코드 입력 시 대소문자 정확히 확인 (HUMAN847, 소문자 불가)
- 이미 사용된 코드인지 DB 확인

### 코드가 DB에 저장되지 않음
- 서버가 재시작되었는지 확인
- EVENT_CODES 환경변수 형식 확인 (쉼표 구분)
- DB 연결 상태 확인

### 같은 사용자가 이벤트 상담 2회 이상 신청 가능
- 이미 사용된 코드인지 확인
- DB의 eventCodes 테이블에서 isUsed 확인
- payments 테이블에서 planType='event' 기록 확인

---

**다음 세션에서 이어서 진행할 사항:**
1. EVENT_CODES 환경변수 설정
2. Plans.tsx에서 event 플랜 클릭 시 코드 입력 다이얼로그 추가
3. 통합 테스트 및 검증
