# 휴먼프리즘 웹앱 개발 인수인계 문서
## Session 2 → Session 3

**작성일:** 2026-06-08
**작성자:** Manus AI (Session 2)
**대상:** Session 3 Manus AI
**프로젝트:** human-prism (Human Prism - Premium AI Saju)
**상태:** 진행 중 (Phase 24-A 완료)

---

## 📋 목차
1. [현재 상태 요약](#현재-상태-요약)
2. [Phase 24-A 완성 내용](#phase-24-a-완성-내용)
3. [구현 상세 내용](#구현-상세-내용)
4. [설계 원칙 및 결정사항](#설계-원칙-및-결정사항)
5. [현재 시스템 상태](#현재-시스템-상태)
6. [다음 작업 (우선순위)](#다음-작업-우선순위)
7. [주의사항 및 트러블슈팅](#주의사항-및-트러블슈팅)
8. [파일 구조 및 핵심 코드](#파일-구조-및-핵심-코드)

---

## 현재 상태 요약

### 프로젝트 정보
- **프로젝트명:** human-prism
- **경로:** /home/ubuntu/human-prism
- **버전:** 571b8164 (최신 체크포인트)
- **기능:** db, server, user
- **개발 서버:** https://3000-i5s0c426mr6qav8rz9qp9-890e8fdf.sg1.manus.computer

### 최근 완료 작업
- ✅ Phase 24-A: 통합 결제 → 만세력 → 상담 채팅 플로우
- ✅ 시간 분할 불가 안내 (주황색 굵은 글씨)
- ✅ 카드 텍스트 레이아웃 개선 (줄 바꿈 + 가독성)

### 현재 상태
- TypeScript: 0 에러 ✅
- 개발 서버: 정상 작동 ✅
- 빌드: 성공 ✅
- 테스트: 준비 필요

---

## Phase 24-A 완성 내용

### 개요
사용자의 요청: "9,900원짜리 맛보기 상담도 그렇고 메인 상담도 마찬가지야. 같은 구조로 문제가 있어. 그러니까 내용이 조금은 다르지만 흘러가는 과정은 똑같이 설계를 해 줘야 돼."

**결과:** 맛보기(9,900원, 15분)와 메인 상담(30,000원, 50분)이 동일한 통합 플로우로 작동

### 1. 결제 확인 모달 (Plans.tsx)

**위치:** `client/src/pages/Plans.tsx` 라인 420-480

**기능:**
- 상담 선택 시 항상 결제 확인 모달 표시
- 가격 + 시간 + 시간 분할 불가 안내 포함
- 예/아니오 버튼으로 사용자 선택

**코드 흐름:**
```
상담 선택 (맛보기/메인/이벤트)
  ↓
handleStart(plan) 호출
  ↓
setPendingPlan(plan)
setPaymentConfirmOpen(true) ← 결제 확인 모달 표시
  ↓
사용자 "결제하기" 선택
  ↓
startPayment.mutate() ← 포트원 결제 시작
```

**중요:** 기존 프로필 유무 상관없이 항상 결제 모달 먼저 표시

### 2. 만세력 이동 확인 모달 (Plans.tsx)

**위치:** `client/src/pages/Plans.tsx` 라인 480-520

**기능:**
- 결제 완료 후 자동 표시
- "만세력으로 이동하여 사주를 입력하시겠습니까?" 메시지
- 예/아니오 선택

**코드 흐름:**
```
결제 완료
  ↓
setManselyeokConfirmOpen(true) ← 만세력 이동 확인 모달
  ↓
사용자 "예" 선택
  ↓
setLocation(`/saju/new?plan=${pendingPlan}&sessionId=${sessionId}`)
  ↓
SajuNew.tsx로 이동
```

**중요:** sessionId를 쿼리 파라미터로 전달 (나중에 사주 저장 시 세션 링크)

### 3. 사주 저장 후 자동 채팅 이동 (SajuNew.tsx)

**위치:** `client/src/pages/SajuNew.tsx` 라인 208-214

**기능:**
- sessionId 쿼리 파라미터 감지
- 사주 저장 후 자동으로 `/consult/{sessionId}`로 이동
- 기존 프로필 선택 흐름과 분리

**코드 흐름:**
```
SajuNew 진입 (sessionId 포함)
  ↓
사주 입력 + 저장 버튼
  ↓
createSajuMutation 실행
  ↓
updateSessionMutation으로 세션에 사주 연결
  ↓
sessionIdStr 있으면 → /consult/{sessionId}로 이동 ← 자동 이동
sessionIdStr 없으면 → 기존 로직 유지
```

**중요:** 라인 211-214 로직 확인
```typescript
if (sessionIdStr) {
  setLocation(`/consult/${sessionIdStr}`);
} else {
  // 기존 로직
}
```

### 4. 시간 분할 불가 안내

#### A. 상담 카드 (Plans.tsx)

**위치:** `client/src/pages/Plans.tsx` 라인 52-75 (PLAN_DETAIL)

**맛보기 상담 body:**
```
"15분이지만 5만원, 10만원짜리 상담 그 이상의 퀄리티를 보장합니다.

⏱️ 상담 시간은 나눠서 쓸 수 없습니다. 결제 후 15분 내에 연속으로 진행되어야 합니다."
```

**메인 상담 body:**
```
"휴먼 프리즘의 놀라운 소통 능력과, 예측 능력, 공감 능력을 완벽하게 누릴 수 있습니다.

⏱️ 상담 시간은 나눠서 쓸 수 없습니다. 결제 후 50분 내에 연속으로 진행되어야 합니다."
```

**스타일링:** 라인 357-368
- `whitespace-pre-wrap`: 줄 바꿈 유지
- `leading-relaxed`: 줄 간격 확대
- 두 번째 단락 (idx === 1): `text-orange-500 font-bold` ← 주황색 굵은 글씨
- `mt-2`: 마진으로 시각적 분리

#### B. 상담 중 타이머 (Consult.tsx)

**위치:** `client/src/pages/Consult.tsx` 라인 397

**표시 내용:**
```
남은 시간: HH:MM (금색)
⏱️ 시간 분할 불가 (회색 작은 글씨)
```

**코드:**
```typescript
<div className="text-xs text-muted-foreground mt-2 whitespace-nowrap">⏱️ 시간 분할 불가</div>
```

---

## 구현 상세 내용

### 1. Plans.tsx 주요 로직

#### handleStart 함수 (라인 154-160)
```typescript
function handleStart(plan: PlanKey) {
  if (!isAuthenticated) {
    setLoginDialogOpen(true);
    return;
  }

  if (["taste", "event", "deep"].includes(plan)) {
    setPendingPlan(plan);
    setPaymentConfirmOpen(true);  // ← 항상 결제 확인 모달
    return;
  }
  
  // 다른 플랜 처리...
}
```

**중요:** 기존 프로필 유무 체크 제거됨
- 이전: `if (profilesQuery.data && profilesQuery.data.length > 0)` → 프로필 선택 다이얼로그
- 현재: 항상 결제 확인 모달

#### 결제 확인 모달 (라인 420-480)
```typescript
<Dialog open={paymentConfirmOpen} onOpenChange={setPaymentConfirmOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>상담 결제</DialogTitle>
      <DialogDescription>
        {pendingPlan === "taste" && "맛보기 상담 - 9,900원 / 15분"}
        {pendingPlan === "deep" && "메인 상담 - 30,000원 / 50분"}
        {pendingPlan === "event" && "이벤트 상담 - 무료 / 25분"}
      </DialogDescription>
    </DialogHeader>
    
    {/* 시간 분할 불가 안내 */}
    <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3">
      <p className="text-sm text-orange-500 font-bold">
        ⏱️ 상담 시간은 나눠서 쓸 수 없습니다.
        결제 후 {pendingPlan === "taste" ? "15" : "50"}분 내에 연속으로 진행되어야 합니다.
      </p>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setPaymentConfirmOpen(false)}>
        취소
      </Button>
      <Button onClick={() => startPayment.mutate()}>
        결제하기
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 만세력 이동 확인 모달 (라인 480-520)
```typescript
<Dialog open={manselyeokConfirmOpen} onOpenChange={setManselyeokConfirmOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>만세력 이동</DialogTitle>
      <DialogDescription>
        만세력으로 이동하여 사주를 입력하시겠습니까?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setManselyeokConfirmOpen(false)}>
        아니오
      </Button>
      <Button onClick={() => {
        setManselyeokConfirmOpen(false);
        setLocation(`/saju/new?plan=${pendingPlan}&sessionId=${sessionId}`);
      }}>
        예
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 2. SajuNew.tsx 주요 로직

**위치:** `client/src/pages/SajuNew.tsx` 라인 194-214

```typescript
// sessionId 쿼리 파라미터 감지
const sessionIdStr = searchParams.get("sessionId");

// 사주 저장 후 처리
const handleSave = async (sajuData: any) => {
  // 1. 사주 생성
  const saju = await createSajuMutation.mutateAsync(sajuData);
  
  // 2. 세션에 사주 연결 (sessionId 있으면)
  if (sessionIdStr) {
    await updateSessionMutation.mutateAsync({
      id: parseInt(sessionIdStr),
      sajuProfileId: saju.id,
    });
  }
  
  // 3. 자동 이동
  if (sessionIdStr) {
    // ← 새로운 로직: 채팅창으로 자동 이동
    setLocation(`/consult/${sessionIdStr}`);
  } else {
    // 기존 로직: 플랜 페이지로 이동
    setLocation(`/plans?profile=${saju.id}`);
  }
};
```

### 3. 백엔드 확인 (portoneRouter.ts)

**위치:** `server/_core/portoneRouter.ts` 라인 32-59

**중요:** 이미 구현되어 있음
- `fulfillPaidPlan` 함수: `sajuProfileId` optional
- 결제 후 `sessionId` 생성 (sajuProfileId 없이도 가능)

```typescript
export const fulfillPaidPlan = async (
  paymentId: number,
  sajuProfileId?: number  // ← optional
) => {
  // 세션 생성 로직
  const session = await db.insert(consultSessions).values({
    userId,
    paymentId,
    planType,
    sajuProfileId,  // null 가능
    expiresAt,
  }).returning();
  
  return session.id;
};
```

---

## 설계 원칙 및 결정사항

### 1. 통합 플로우 설계 원칙

**원칙:** "재방문도 항상 결제"
- 기존 사주 프로필이 있어도 결제 확인 모달 먼저 표시
- 무료 상담이 아니므로 매번 결제 필요
- 사용자가 프로필 선택 또는 새 사주 입력 선택 가능

**구현:**
- Plans.tsx에서 기존 프로필 유무 체크 제거
- 항상 `setPaymentConfirmOpen(true)` 호출

### 2. 시간 분할 불가 정책

**원칙:** "한 번에 연속으로 소모"
- 15분 결제 → 15분 내에 연속 진행
- 50분 결제 → 50분 내에 연속 진행
- 10분 + 5분 나눠 쓰기 불가

**구현:**
- 카드 설명에 명시 (주황색 굵은 글씨)
- 상담 중 타이머 아래 "⏱️ 시간 분할 불가" 표시
- 시간 만료 시 자동 종료 (Consult.tsx 타이머 로직)

### 3. sessionId 없이 세션 생성

**원칙:** "첫 방문자도 결제 후 즉시 상담 가능"
- 결제 → sessionId 생성 (sajuProfileId 없음)
- 만세력 진입 → 사주 저장 → 세션에 링크
- 기존 프로필 있으면 프로필 선택 옵션 제공 가능

**구현:**
- portoneRouter.ts: sajuProfileId optional
- Plans.tsx: 결제 후 sessionId 반환
- SajuNew.tsx: sessionId 쿼리 파라미터로 전달

---

## 현재 시스템 상태

### 데이터베이스
- ✅ consultSessions: sajuProfileId nullable
- ✅ payments: 결제 기록 저장
- ✅ 마이그레이션 완료

### 백엔드 (server/)
- ✅ portoneRouter.ts: sessionId 생성 로직 완성
- ✅ routers.ts: payment.list, session.get 등 API 완성
- ✅ 타이머 로직: expiresAt 기반 자동 종료

### 프론트엔드 (client/)
- ✅ Plans.tsx: 통합 결제 플로우 완성
- ✅ SajuNew.tsx: sessionId 처리 완성
- ✅ Consult.tsx: 타이머 + "시간 분할 불가" 안내 완성
- ✅ TypeScript: 0 에러

### 포트원 연동
- ❌ 아직 미연동 (테스트 단계)
- 현재: 모의 결제 (mockPay)로 테스트
- 결제 오류: "결제 중에 오류가 발생했습니다" (예상된 결과)

---

## 다음 작업 (우선순위)

### 1순위: 포트원 실 결제 연동
**상태:** 준비 필요
**작업:**
- 포트원 채널 키 발급 확인 (토스페이먼츠 승인 여부)
- server/_core/portoneRouter.ts에서 mockPay → 실제 포트원 API 호출로 변경
- 결제 테스트 (실제 카드 또는 테스트 카드)

**파일:**
- `server/_core/portoneRouter.ts` (prepare, verify 함수)
- `client/src/hooks/usePortonePayment.ts` (포트원 SDK 호출)

### 2순위: 재방문 사용자 테스트
**상태:** 필요
**작업:**
- 새 브라우저/시크릿 창에서 재방문 사용자 시뮬레이션
- 맛보기 상담 플로우 테스트
- 메인 상담 플로우 테스트
- 기존 프로필 있을 때 플로우 테스트

**테스트 항목:**
- [ ] 맛보기 상담 선택 → 결제 확인 모달 표시
- [ ] 메인 상담 선택 → 결제 확인 모달 표시
- [ ] 결제 후 만세력 이동 확인 모달 표시
- [ ] 만세력에서 사주 저장 → 자동 채팅창 이동
- [ ] 타이머 정상 작동
- [ ] "⏱️ 시간 분할 불가" 표시 확인

### 3순위: todo.md 미완료 항목 확인
**상태:** 29개 미완료 항목 있음
**작업:**
- todo.md 읽기 (라인 600-1200)
- 다음 Phase 확인
- 우선순위 정렬

---

## 주의사항 및 트러블슈팅

### 1. 컨텍스트 압축 문제
**증상:** Session 2에서 컨텍스트 계속 압축됨
**원인:** todo.md 파일이 너무 큼 (1200+ 라인)
**해결:**
- 이 인수인계 문서 참고
- 필요시 todo.md 분할 고려
- Session 3에서 작은 단위로 작업 진행

### 2. 포트원 결제 오류
**증상:** "결제 중에 오류가 발생했습니다"
**원인:** mockPay 사용 중 (포트원 미연동)
**해결:** 포트원 채널 키 발급 후 실제 API 호출로 변경

### 3. 세션 생성 실패
**증상:** 결제 후 sessionId 반환 안 됨
**원인:** portoneRouter.ts의 fulfillPaidPlan 함수 오류
**확인:**
- server/_core/portoneRouter.ts 라인 32-59
- sajuProfileId optional 확인
- 데이터베이스 consultSessions 테이블 상태

### 4. 자동 이동 안 됨
**증상:** SajuNew에서 사주 저장 후 채팅창으로 이동 안 함
**원인:** sessionId 쿼리 파라미터 누락
**확인:**
- Plans.tsx에서 sessionId 전달 확인
- SajuNew.tsx 라인 194: `const sessionIdStr = searchParams.get("sessionId");`
- 라인 211-214 자동 이동 로직 확인

---

## 파일 구조 및 핵심 코드

### 수정된 파일 목록
1. **client/src/pages/Plans.tsx** (핵심)
   - 라인 52-75: PLAN_DETAIL (시간 분할 불가 안내 추가)
   - 라인 154-160: handleStart 함수 (항상 결제 모달)
   - 라인 357-368: 카드 텍스트 렌더링 (주황색 강조)
   - 라인 420-520: 결제 확인 + 만세력 이동 모달

2. **client/src/pages/SajuNew.tsx** (핵심)
   - 라인 194: sessionId 쿼리 파라미터 감지
   - 라인 208-214: 사주 저장 후 자동 이동 로직

3. **client/src/pages/Consult.tsx** (부분)
   - 라인 397: "⏱️ 시간 분할 불가" 안내 추가

4. **server/_core/portoneRouter.ts** (확인만)
   - 라인 32-59: fulfillPaidPlan 함수 (이미 완성)

### 핵심 데이터 흐름

```
사용자 상담 선택
  ↓
Plans.tsx handleStart()
  ↓
결제 확인 모달 표시
  ↓
사용자 "결제하기" 선택
  ↓
startPayment.mutate() → portoneRouter.ts prepare()
  ↓
포트원 결제 창 (또는 모의 결제)
  ↓
결제 완료 → sessionId 생성
  ↓
만세력 이동 확인 모달 표시
  ↓
사용자 "예" 선택
  ↓
/saju/new?plan=taste&sessionId=123 이동
  ↓
SajuNew.tsx: 사주 입력
  ↓
사주 저장 → updateSessionMutation (세션에 사주 링크)
  ↓
자동으로 /consult/123 이동
  ↓
Consult.tsx: 상담 채팅 시작 (타이머 시작)
```

### 환경 변수 확인
```
VITE_APP_ID: Manus OAuth 앱 ID
OAUTH_SERVER_URL: Manus OAuth 서버
PORTONE_STORE_ID: 포트원 상점 ID (미연동)
PORTONE_API_SECRET: 포트원 API 시크릿 (미연동)
```

---

## Session 3 체크리스트

### 초기 확인 (필수)
- [ ] 프로젝트 경로 확인: `/home/ubuntu/human-prism`
- [ ] 개발 서버 상태 확인: `webdev_check_status`
- [ ] TypeScript 에러 확인: 0 에러 여부
- [ ] 최신 체크포인트 확인: `571b8164`

### 작업 시작 전
- [ ] 이 인수인계 문서 읽기 (필수)
- [ ] Plans.tsx 코드 검토 (라인 154-160, 357-368, 420-520)
- [ ] SajuNew.tsx 코드 검토 (라인 194-214)
- [ ] Consult.tsx 코드 검토 (라인 397)

### 첫 번째 작업
1. 포트원 채널 키 발급 상태 확인
2. 포트원 실 결제 연동 (또는 계속 테스트)
3. 재방문 사용자 플로우 테스트
4. todo.md 다음 Phase 확인

---

## 추가 정보

### 프로젝트 철학
- **페르소나:** 30년 내공의 마스터 지성 + Manus AI 자율 개발
- **상담 원칙:** 능동적 드리블, 서사적 스토리텔링, 기민한 재반응
- **설계 원칙:** 사용자 만족도 + 비즈니스 안정성 + 명확한 안내

### 상담 플랜 (현재)
| 플랜 | 가격 | 시간 | 특징 |
|------|------|------|------|
| 원픽 무료 | 무료 | 5분 | 1회 한정 |
| 맛보기 | 9,900원 | 15분 | 체험용 |
| 이벤트 | 무료 | 25분 | 1회 한정 (시크릿 코드) |
| 메인 | 30,000원 | 50분 | 기준점 |
| 경청자 채팅 | 100,000원 | 60분 | 예약제 |
| 경청자 대면 | 200,000원 | 80분 | 예약제 |

### 중요 연락처
- 프로젝트 소유자: OWNER_NAME (환경변수)
- 포트원 담당: 포트원 콘솔 확인
- 카카오/네이버: 비즈니스 앱 검증 대기 중

---

## 마지막 주의사항

**Session 3에게:**

1. **이 문서를 첫 번째로 읽으세요.** 컨텍스트 압축으로 인한 혼동 방지
2. **코드 검토 후 작업하세요.** 구현 내용 이해 필수
3. **테스트를 철저히 하세요.** 사용자 플로우 검증 필수
4. **포트원 연동이 막히면 사용자에게 보고하세요.** 채널 키 발급 필요
5. **다음 세션으로 인계할 때 이 문서를 업데이트하세요.** 최신 정보 유지

**Session 2가 고생한 부분:**
- 컨텍스트 압축으로 인한 작업 효율 저하
- todo.md 파일 크기로 인한 읽기 어려움
- 포트원 미연동으로 인한 테스트 제한
- 재방문 사용자 테스트 불가 (관리자 모드만 가능)

**Session 3이 해야 할 것:**
- 위의 문제들 해결
- 포트원 실 연동
- 재방문 사용자 테스트 (새 브라우저/시크릿 창)
- 다음 Phase 진행

---

**문서 작성 완료**
**최종 체크포인트:** 571b8164
**다음 세션 시작 시간:** 즉시

*이 문서는 Session 2 → Session 3 인수인계를 위해 작성되었습니다.*
*모든 내용은 2026-06-08 기준입니다.*
