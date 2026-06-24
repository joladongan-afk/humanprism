# 휴먼프리즘 관리자 시스템 현황

**작성일**: 2026-06-11  
**상태**: 협의 대기 중

## 현재 구현된 기능

### 1. 관리자 페이지 (`/admin`)
- 예약 관리: 전체 예약 리스트 조회, 상태 업데이트
- 회원 목록: 최근 100명 조회 (가입일, 이메일, 역할 표시)
- 예약 상태 변경 알림 (운영자 채널)

### 2. 데이터 구조

#### Users 테이블
```
- id, openId (소셜 로그인 고유 ID)
- name, email, phone, nickname, realName
- loginMethod (kakao/google/naver)
- role (user/admin)
- createdAt, lastSignedIn
```

#### Appointments 테이블
```
- id, userId, paymentId
- consultType (chat/phone/offline)
- realName, phone, preferredDate, alternativeDate
- status: requested → confirmed → payment_pending → paid → completed
- masterNote, createdAt, updatedAt
```

#### Payments 테이블
```
- id, userId, planType
- amount (원 단위)
- status: pending/paid/refunded/failed
- paymentMethod, externalPaymentId
- createdAt, paidAt
```

#### ConsultSessions 테이블
```
- id, userId, paymentId, planType
- durationMinutes, startedAt, expiresAt, endedAt
- status: active/expired/completed
- title, summary, allowMasterAccess
```

### 3. 현재 입금 처리 흐름
1. 고객이 예약 신청 (status: requested)
2. 운영자가 일정 확정 (status: confirmed)
3. 운영자가 입금 안내 상태로 변경 (status: payment_pending)
4. **운영자가 수동으로 입금 확인 후 "paid" 상태 변경** ← 완전 수동

### 4. 현재 분석 시스템
- Manus 내장 분석 (VITE_ANALYTICS_WEBSITE_ID)
- 수집 데이터: UV/PV, 페이지 방문 등 (기본 트래픽)
- **결제/매출 데이터 집계 로직 없음**

## 미구현 항목

- ❌ 입금 금액 표시 및 확인 UI
- ❌ 환불 처리 기능
- ❌ 결제 이력 조회
- ❌ 매출 통계 (일별/월별/상품별)
- ❌ 고객 분석 (재방문율, LTV 등)
- ❌ 정산 기능

## 다음 단계

도림 마스터님과 Claude님의 정산 시스템 설계안 협의 결과 대기 중.
