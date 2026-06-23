# 휴먼프리즘 - 비밀번호 및 API 키 관리

**⚠️ 주의:** 이 문서는 참고용입니다. 실제 값은 Manus 시스템에 안전하게 저장됩니다.

---

## 1. 자동 주입 환경변수 (Manus)

다음 변수들은 Manus에서 자동으로 주입되므로 수동 설정 불필요:

```
BUILT_IN_FORGE_API_KEY
BUILT_IN_FORGE_API_URL
JWT_SECRET
OAUTH_SERVER_URL
OWNER_NAME
OWNER_OPEN_ID
VITE_ANALYTICS_ENDPOINT
VITE_ANALYTICS_WEBSITE_ID
VITE_APP_ID
VITE_FRONTEND_FORGE_API_KEY
VITE_FRONTEND_FORGE_API_URL
VITE_OAUTH_PORTAL_URL
DATABASE_URL
```

---

## 2. 수동 설정 필요 환경변수

### 2.1 Claude API (긴급)

| 변수명 | 값 | 상태 | 비고 |
|--------|-----|------|------|
| `CLAUDE_API_KEY` | `sk-ant-...` | ⏳ 대기 | https://console.anthropic.com에서 발급 |

**상태:** $5 크레딧 구매 필요 (진행 중)

**구매 방법:**
1. https://console.anthropic.com 접속
2. "Billing" → "Buy credits" 클릭
3. $5 입력
4. 결제 정보 입력 (세종 집에서 세종 주소로)
5. 결제 완료 후 API 키 발급

### 2.2 카카오 로그인

| 변수명 | 값 | 상태 | 비고 |
|--------|-----|------|------|
| `KAKAO_REST_API_KEY` | `...` | ✓ 설정됨 | 카카오 개발자 센터 |
| `KAKAO_CLIENT_SECRET` | `...` | ✓ 설정됨 | 카카오 개발자 센터 |

**발급처:** https://developers.kakao.com
**앱 이름:** Human Prism (휴먼프리즘)
**상태:** 활성화됨

### 2.3 네이버 로그인

| 변수명 | 값 | 상태 | 비고 |
|--------|-----|------|------|
| `NAVER_CLIENT_ID` | `...` | ✓ 설정됨 | 네이버 개발자 센터 |
| `NAVER_CLIENT_SECRET` | `...` | ✓ 설정됨 | 네이버 개발자 센터 |

**발급처:** https://developers.naver.com
**앱 이름:** Human Prism (휴먼프리즘)
**상태:** 활성화됨

### 2.4 포트원 (Portone) - 결제

| 변수명 | 값 | 상태 | 비고 |
|--------|-----|------|------|
| `PORTONE_STORE_ID` | `...` | ✓ 설정됨 | 포트원 대시보드 |
| `PORTONE_API_SECRET` | `...` | ✓ 설정됨 | 포트원 대시보드 |

**발급처:** https://portone.io
**상태:** 활성화됨

### 2.5 앱 정보

| 변수명 | 값 | 상태 | 비고 |
|--------|-----|------|------|
| `VITE_APP_TITLE` | `휴먼프리즘` | ✓ 설정됨 | 앱 제목 |
| `VITE_APP_LOGO` | `[S3 URL]` | ✓ 설정됨 | 앱 로고 |

---

## 3. 환경변수 설정 방법

### 새 환경변수 추가

```bash
# 1. Manus Management UI 접속
# 2. Settings → Secrets 패널
# 3. "Add Secret" 버튼 클릭
# 4. 변수명과 값 입력
# 5. 저장

# 또는 CLI 사용:
# webdev_request_secrets 도구 사용
```

### 환경변수 확인

```bash
# 개발 환경에서 확인
cd /home/ubuntu/human-prism
echo $CLAUDE_API_KEY
echo $KAKAO_REST_API_KEY
# 등등...
```

---

## 4. API 키 갱신 주기

| API | 갱신 주기 | 마지막 갱신 | 비고 |
|-----|---------|-----------|------|
| Claude API | 월 1회 | 2026-06-05 | 크레딧 확인 필요 |
| 카카오 | 연 1회 | 2025-12 | 자동 갱신 |
| 네이버 | 연 1회 | 2025-12 | 자동 갱신 |
| 포트원 | 연 1회 | 2025-12 | 자동 갱신 |

---

## 5. 보안 체크리스트

### 금지 사항
- ❌ API 키를 코드에 하드코딩
- ❌ API 키를 git에 커밋
- ❌ API 키를 로그에 출력
- ❌ API 키를 이메일로 전송
- ❌ API 키를 평문 파일에 저장

### 필수 사항
- ✓ 모든 API 키는 환경변수로 관리
- ✓ 환경변수는 Manus 시스템에 저장
- ✓ 코드는 `process.env.VARIABLE_NAME`으로 접근
- ✓ 정기적으로 API 키 갱신 확인

---

## 6. 문제 해결

### Claude API 크레딧 부족
```
에러: "Your credit balance is too low to access the Anthropic API"

해결:
1. https://console.anthropic.com 접속
2. "Billing" → "Buy credits" 클릭
3. $5 이상 구매
4. 개발 서버 재시작
```

### 카카오/네이버 로그인 오류
```
에러: "Unauthorized" 또는 "Invalid client"

해결:
1. 개발자 센터에서 API 키 확인
2. 리다이렉트 URI 확인
3. 환경변수 재설정
4. 개발 서버 재시작
```

### 포트원 결제 오류
```
에러: "Payment gateway error"

해결:
1. https://portone.io 대시보드 접속
2. API 키 확인
3. 테스트 모드/실제 모드 확인
4. 환경변수 재설정
```

---

## 7. 개발 vs 프로덕션

### 개발 환경
- 모든 API는 테스트 모드 사용
- 테스트 API 키 사용
- 실제 결제 불가

### 프로덕션 환경
- 실제 API 키 사용
- 실제 결제 활성화
- 보안 강화 필수

**전환 방법:**
1. Manus Management UI → Settings → Environment
2. "Production" 선택
3. 프로덕션 API 키 설정
4. 배포

---

## 8. 긴급 상황 대응

### API 키 유출 시
1. 즉시 해당 서비스 대시보드 접속
2. API 키 재발급
3. 새 키로 환경변수 업데이트
4. 개발 서버 재시작
5. 로그 확인

### 결제 시스템 오류
1. 포트원 상태 페이지 확인
2. API 키 확인
3. 테스트 결제 시도
4. 지원팀 연락 (support@portone.io)

### 로그인 시스템 오류
1. 카카오/네이버 상태 페이지 확인
2. API 키 확인
3. 리다이렉트 URI 확인
4. 지원팀 연락

---

## 9. 참고 자료

- Anthropic Console: https://console.anthropic.com
- 카카오 개발자: https://developers.kakao.com
- 네이버 개발자: https://developers.naver.com
- 포트원: https://portone.io
- Manus 문서: https://help.manus.im

---

**마지막 업데이트:** 2026-06-05  
**다음 검토:** 2026-07-05
