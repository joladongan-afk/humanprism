# CS 챗봇 요구사항 정의 및 설계

## 📋 요구사항

### **기능 범위**
1. **FAQ 기반 자동 응답**
   - 사용자 질문 입력
   - 유사도 기반 매칭
   - 관련 FAQ 제시

2. **카테고리별 정보 제공**
   - 상담 소개
   - 예약 방법
   - 가격 정보
   - 기능 설명
   - 자주 묻는 질문

3. **사용자 경험**
   - 채팅 인터페이스 (메시지 히스토리)
   - 빠른 응답 (1-2초)
   - 모바일 친화적

### **기술 요구사항**
- 라이트 버전 (크레딧 절약)
- 로컬 벡터 검색 (임베딩 없음)
- tRPC 기반 백엔드
- React 기반 프론트엔드

---

## 🗂️ 데이터 구조

### **FAQ 데이터 스키마**

```typescript
interface FAQ {
  id: string;           // "faq_001"
  category: string;     // "consultation", "booking", "pricing", "features", "general"
  question: string;     // "사주 상담이 뭐예요?"
  answer: string;       // 상세 답변
  keywords: string[];   // ["사주", "상담", "의미"]
  priority: number;     // 1-5 (높을수록 우선)
}
```

### **데이터베이스 테이블**

```sql
CREATE TABLE cs_faqs (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT NOT NULL,  -- JSON array
  priority INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cs_chat_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  matched_faq_id TEXT,
  similarity_score REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (matched_faq_id) REFERENCES cs_faqs(id)
);
```

---

## 📝 초기 FAQ 데이터 (20개)

### **카테고리: consultation (상담 소개)**

| ID | 질문 | 핵심 답변 |
|---|---|---|
| faq_001 | 사주 상담이 뭐예요? | 당신의 사주를 분석해 인생의 방향성, 직업, 운세를 제시합니다 |
| faq_002 | 사주 상담으로 뭘 알 수 있나요? | 성격, 직업 적성, 대운, 연애, 재정 상황 등을 파악할 수 있습니다 |
| faq_003 | 상담 결과가 정확한가요? | 30년 경력의 마스터가 당신의 사주를 개별적으로 분석합니다 |
| faq_004 | 상담은 얼마나 걸려요? | 초기 상담은 30-60분, 심화 상담은 60-120분입니다 |

### **카테고리: booking (예약)**

| ID | 질문 | 핵심 답변 |
|---|---|---|
| faq_005 | 예약은 어떻게 하나요? | 웹앱에서 원하는 날짜/시간을 선택하고 결제하면 됩니다 |
| faq_006 | 예약 취소는 어떻게 하나요? | 상담 24시간 전까지 웹앱에서 취소 가능합니다 |
| faq_007 | 예약 변경은 가능한가요? | 24시간 전까지 변경 가능합니다 |
| faq_008 | 예약 후 얼마나 기다려야 하나요? | 보통 3-5일 내에 상담을 진행합니다 |

### **카테고리: pricing (가격)**

| ID | 질문 | 핵심 답변 |
|---|---|---|
| faq_009 | 상담 가격은 얼마인가요? | 기본 상담 50,000원, 심화 상담 100,000원입니다 |
| faq_010 | 할인이 있나요? | 첫 상담 10% 할인, 패키지 상담 15% 할인이 있습니다 |
| faq_011 | 환불은 가능한가요? | 상담 24시간 전 취소 시 100% 환불됩니다 |
| faq_012 | 결제 방법은 뭐가 있나요? | 신용카드, 계좌이체, 포트원 결제가 가능합니다 |

### **카테고리: features (기능)**

| ID | 질문 | 핵심 답변 |
|---|---|---|
| faq_013 | PDF 다운로드는 뭐예요? | 상담 결과를 PDF로 저장할 수 있습니다 |
| faq_014 | 이메일 공유는 뭐예요? | 상담 기록을 이메일로 공유할 수 있습니다 |
| faq_015 | 카카오톡 공유는 뭐예요? | 상담 결과를 카카오톡으로 공유할 수 있습니다 |
| faq_016 | 상담 기록은 어디서 보나요? | 마이페이지에서 모든 상담 기록을 확인할 수 있습니다 |

### **카테고리: general (일반)**

| ID | 질문 | 핵심 답변 |
|---|---|---|
| faq_017 | 개인정보는 안전한가요? | 모든 정보는 암호화되어 안전하게 보관됩니다 |
| faq_018 | 기술 지원은 어떻게 받나요? | 웹앱 내 CS 챗봇 또는 이메일로 문의하세요 |
| faq_019 | 앱은 없나요? | 현재 웹앱만 제공합니다 |
| faq_020 | 다른 질문이 있으면? | CS 챗봇에 자유롭게 질문하세요 |

---

## 🔍 검색 알고리즘

### **유사도 계산 (간단한 키워드 매칭)**

```typescript
function calculateSimilarity(userQuery: string, faqQuestion: string, keywords: string[]): number {
  const query = userQuery.toLowerCase();
  let score = 0;
  
  // 정확한 키워드 매칭 (가중치 3)
  keywords.forEach(kw => {
    if (query.includes(kw)) score += 3;
  });
  
  // 질문 텍스트 매칭 (가중치 1)
  const questionWords = faqQuestion.toLowerCase().split(/\s+/);
  questionWords.forEach(word => {
    if (query.includes(word) && word.length > 2) score += 1;
  });
  
  return score;
}
```

### **응답 선택 로직**

```
1. 사용자 질문 입력
2. 모든 FAQ와 유사도 계산
3. 상위 3개 FAQ 선택
4. 유사도 > 5 이면 자동 응답
5. 유사도 <= 5 이면 "관련 FAQ 제시" + "다른 질문 있으세요?"
```

---

## 🎨 UI 컴포넌트 구조

### **CSChatBox 컴포넌트**

```
┌─────────────────────────────┐
│  CS 챗봇 헤더               │
│  "안녕하세요! 궁금한 점을  │
│   물어봐주세요"             │
├─────────────────────────────┤
│ [메시지 히스토리]           │
│ Bot: 안녕하세요!            │
│ User: 가격이 얼마인가요?    │
│ Bot: 기본 상담 50,000원...  │
├─────────────────────────────┤
│ [입력 필드]                 │
│ [텍스트 입력] [전송 버튼]   │
└─────────────────────────────┘
```

### **빠른 질문 버튼 (선택사항)**

```
[상담 소개] [예약 방법] [가격] [기능]
```

---

## 📊 tRPC 프로시저 설계

### **cs.chat (사용자 질문 처리)**

```typescript
// Input
{
  message: string;      // 사용자 질문
  sessionId?: string;   // 선택사항: 채팅 세션 ID
}

// Output
{
  response: string;           // 챗봇 응답
  matchedFaqId: string;       // 매칭된 FAQ ID
  similarityScore: number;    // 유사도 점수 (0-100)
  relatedFaqs: FAQ[];         // 관련 FAQ 3개
}
```

### **cs.getFaqs (FAQ 목록 조회)**

```typescript
// Input
{
  category?: string;  // 선택사항: 카테고리 필터
}

// Output
{
  faqs: FAQ[];
  total: number;
}
```

### **cs.saveChatHistory (채팅 기록 저장)**

```typescript
// Input
{
  message: string;
  response: string;
  matchedFaqId: string;
  similarityScore: number;
}

// Output
{
  success: boolean;
  historyId: string;
}
```

---

## ✅ 구현 체크리스트

- [ ] FAQ 데이터 DB에 삽입
- [ ] cs.chat 프로시저 개발
- [ ] cs.getFaqs 프로시저 개발
- [ ] cs.saveChatHistory 프로시저 개발
- [ ] CSChatBox UI 컴포넌트 개발
- [ ] 웹앱 라우팅 추가 (예: /cs 또는 모달)
- [ ] 테스트 작성 (8-10개 테스트 케이스)
- [ ] 웹앱 통합 및 검증

---

## 🚀 구현 순서

1. **Phase 1**: 데이터베이스 스키마 생성 및 FAQ 데이터 삽입
2. **Phase 2**: tRPC 프로시저 개발 (cs.chat, cs.getFaqs, cs.saveChatHistory)
3. **Phase 3**: CSChatBox UI 컴포넌트 개발
4. **Phase 4**: 웹앱 라우팅 및 네비게이션 통합
5. **Phase 5**: 테스트 작성 및 검증
6. **Phase 6**: 최종 검증 및 체크포인트 저장
