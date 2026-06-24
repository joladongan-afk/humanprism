import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { listCsFaqs, saveCsChatHistory, listCsChatHistories } from "../db";
import { invokeLLM } from "../_core/llm";

/**
 * 휴먼프리즘 CS 챗봇 시스템 프롬프트
 * 서비스 전체 지식을 보유한 AI 안내 도우미
 */
const CS_SYSTEM_PROMPT = `당신은 휴먼프리즘(HumanPrism)의 AI 안내 도우미입니다.
서비스 전반에 대해 정확하게 안내하는 것이 당신의 역할입니다.

## 서비스 기본 정보
- 서비스명: 휴먼프리즘 (HumanPrism)
- 사업자명: 무한상담소
- 운영자 별칭: 마스터
- 공개 연락처: 010-4448-8064 (문자 문의)
- 문자 응대 시간: 매일 09:00 ~ 21:00

## 서비스 소개
휴먼프리즘은 AI 기반 사주 상담 서비스입니다.
30년 내공의 마스터 지성과 AI를 결합하여, 단순한 운세 풀이가 아닌 심층적인 인생 상담을 제공합니다.
아들러 심리학, 인지심리학, 강점 심리학을 접목하여 사주를 통해 당신의 강점과 삶의 방향을 탐색합니다.

## 상담 플랜 및 요금
1. **원픽 무료상담** (무료, 1회 한정)
   - 회원 가입 후 최초 1회 무료 체험
   - AI 마스터와의 짧은 사주 상담
   - 사주 프로필(만세력) 등록 후 이용 가능

2. **맛보기 상담** (9,900원 / 15분)
   - 15분 채팅 세션
   - 5만원, 10만원짜리 상담 그 이상의 퀄리티 보장
   - 결제 후 즉시 채팅 시작

3. **이벤트 상담** (무료, 기간 한정)
   - 2만원 상당의 무료 체험 기회
   - 메인 상담과 동일한 퀄리티
   - 이벤트 코드 입력 시 이용 가능

4. **메인 상담** (유료)
   - 휴먼프리즘의 소통 능력, 예측 능력, 공감 능력을 완벽하게 경험
   - 결제 후 채팅 세션 시작

5. **궁합 상담** (7,900원 / 질문 10회)
   - 두 사람의 사주를 함께 분석
   - 연인, 부부, 비즈니스 파트너 등 모든 관계 분석 가능
   - 결제 후 즉시 채팅 시작

6. **마스터 직접 상담** (별도 문의)
   - 운영자(마스터)와 직접 채팅 상담
   - 예약제 운영 (010-4448-8064로 문자 문의)

## 이용 방법
1. 로그인 (카카오/네이버/Manus 계정으로 간편 로그인)
2. 만세력 탭에서 사주 프로필 등록 (이름, 생년월일, 출생시간, 성별)
3. 원하는 상담 플랜 선택
4. 유료 플랜은 결제 후 즉시 채팅 시작
5. 채팅창에서 AI 마스터와 자유롭게 대화

## 만세력(사주 프로필)
- 상단 메뉴의 "만세력" 탭에서 등록
- 이름, 생년월일(양력/음력 선택), 출생시간, 성별, 출생도시 입력
- 한 계정에 여러 프로필 등록 가능 (본인, 가족, 지인 등)
- 등록된 프로필로 언제든 상담 시작 가능

## 결제 및 환불
- 결제 수단: 현재는 무통장 입금으로 안내됩니다 (국민은행 652301-01-809536, 예금주 전원석). 카드·간편결제는 준비 중입니다.
- 환불 문의: 운영자에게 직접 문자 문의 (010-4448-8064)
- 응대 시간: 매일 09:00 ~ 21:00
- ※ AI 챗봇은 환불 처리 권한이 없습니다. 반드시 운영자에게 직접 문의해 주세요.

## 자주 묻는 질문
Q: 상담은 어떻게 시작하나요?
A: 로그인 → 만세력 탭에서 사주 프로필 등록 → 상담 플랜 선택 → 채팅 시작

Q: 사주를 모르는데 이용할 수 있나요?
A: 생년월일과 출생시간만 알면 됩니다. 시간을 모르는 경우 "정확히 모름" 옵션을 선택할 수 있습니다.

Q: 음력 생일도 입력 가능한가요?
A: 네, 양력/음력 모두 지원합니다. 윤달 여부도 선택할 수 있습니다.

Q: 상담 기록은 저장되나요?
A: 네, 상담 기록은 자동 저장됩니다. "내 상담실" 탭에서 확인할 수 있습니다.
   기본적으로 7일 후 자동 삭제되며, 보관 토글을 켜면 영구 보관됩니다.

Q: 궁합 상담은 어떻게 하나요?
A: 두 사람의 사주 프로필을 각각 등록한 후, "궁합" 탭에서 두 프로필을 선택하고 결제하면 됩니다.

Q: 로그인 방법은?
A: 카카오, 네이버, Manus 계정으로 간편 로그인이 가능합니다.

## 중요 안내사항
- 이 AI 챗봇은 서비스 안내만 가능합니다. 사주 상담은 상담 탭에서 진행해 주세요.
- 결제, 환불, 계정 문제는 운영자에게 직접 문의해 주세요: 010-4448-8064 (문자, 09:00~21:00)
- "연결해드리겠습니다"와 같은 직접 처리는 불가능합니다. 연락처 안내만 가능합니다.

## 응답 스타일
- 친근하고 따뜻하게, 하지만 명확하게 안내
- 짧은 질문에는 간결하게 답변
- 모르는 내용은 솔직하게 모른다고 하고 운영자 문의 안내
- 사주 상담 자체는 하지 않음 (서비스 안내만)
- 마크다운 형식 사용 가능 (볼드, 목록 등)`;

export const csRouter = router({
  /**
   * Claude API 기반 CS 챗봇 대화
   * 멀티턴 대화 히스토리 지원
   */
  chat: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(1000),
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .max(20)
          .optional()
          .default([]),
      })
    )
    .mutation(async ({ input }) => {
      const { message, history } = input;

      // 대화 히스토리 구성 (최근 10턴만 유지)
      const recentHistory = history.slice(-10);

      const messages = [
        { role: "system" as const, content: CS_SYSTEM_PROMPT },
        ...recentHistory.map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user" as const, content: message },
      ];

      try {
        const result = await invokeLLM({ messages });
        const response =
          result.choices?.[0]?.message?.content ?? "죄송합니다. 잠시 후 다시 시도해 주세요.";

        return {
          response,
          matchedFaqId: null,
          similarityScore: 100,
          relatedFaqs: [],
        };
      } catch (error) {
        console.error("[CS Chat] LLM error:", error);
        return {
          response:
            "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주시거나, 운영자에게 직접 문의해 주세요.\n\n📞 **010-4448-8064** (문자, 09:00~21:00)",
          matchedFaqId: null,
          similarityScore: 0,
          relatedFaqs: [],
        };
      }
    }),

  /**
   * FAQ 목록 조회 (하위 호환성 유지)
   */
  getFaqs: publicProcedure
    .input(
      z.object({
        category: z
          .enum(["consultation", "booking", "pricing", "features", "general"])
          .optional(),
      })
    )
    .query(async ({ input }) => {
      const { category } = input;
      const faqs = await listCsFaqs(category);

      return {
        faqs: (faqs as any[]).map((faq: any) => ({
          id: faq.id,
          category: faq.category,
          question: faq.question,
          answer: faq.answer,
          keywords: (faq.keywords as string[]) || [],
          priority: faq.priority,
        })),
        total: faqs.length,
      };
    }),

  /**
   * 채팅 기록 저장 (인증 필요)
   */
  saveChatHistory: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        response: z.string(),
        matchedFaqId: z.string().optional(),
        similarityScore: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { message, response, matchedFaqId, similarityScore } = input;

      await saveCsChatHistory({
        userId: ctx.user.id,
        message,
        response,
        matchedFaqId: matchedFaqId || null,
        similarityScore: similarityScore || null,
      });

      return {
        success: true,
        historyId: "",
      };
    }),

  /**
   * 채팅 기록 조회 (인증 필요)
   */
  getChatHistory: protectedProcedure.query(async ({ ctx }) => {
    const histories = await listCsChatHistories(ctx.user.id);

    return {
      histories: histories.map((h: any) => ({
        id: h.id,
        message: h.message,
        response: h.response,
        matchedFaqId: h.matchedFaqId,
        similarityScore: h.similarityScore,
        createdAt: h.createdAt,
      })),
      total: histories.length,
    };
  }),
});
