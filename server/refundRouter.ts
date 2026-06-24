import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { notifyRefundToCustomer } from "./refundNotification";

/**
 * 환불 관리 라우터 (Admin Only)
 */
export const refundRouter = router({
  /**
   * 환불 요청 목록 조회 (운영자용)
   */
  listRequests: adminProcedure.query(() => db.listRefundRequests()),

  /**
   * 환불 요청 생성
   */
  requestRefund: adminProcedure
    .input(
      z.object({
        paymentId: z.number().int(),
        reason: z.string().min(1).max(1000),
        refundAmount: z.number().int().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.requestRefund(input.paymentId, input.reason, input.refundAmount);

      // 운영자 알림
      await notifyOwner({
        title: "[휴먼프리즘] 환불 요청",
        content: `결제 #${input.paymentId} 환불 요청이 접수되었습니다.\n사유: ${input.reason}`,
      }).catch(() => undefined);

      // 고객 알림 (결제수단별 안내 문구 자동 선택)
      await notifyRefundToCustomer(input.paymentId, "requested").catch(() => undefined);

      return { success: true } as const;
    }),

  /**
   * 환불 승인
   */
  approveRefund: adminProcedure
    .input(z.object({ paymentId: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.approveRefund(input.paymentId);

      await notifyOwner({
        title: "[휴먼프리즘] 환불 승인",
        content: `결제 #${input.paymentId} 환불이 승인되었습니다.`,
      }).catch(() => undefined);

      return { success: true } as const;
    }),

  /**
   * 환불 처리 중 (실제 환불 진행)
   */
  processRefund: adminProcedure
    .input(z.object({ paymentId: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.processRefund(input.paymentId);

      await notifyOwner({
        title: "[휴먼프리즘] 환불 처리 중",
        content: `결제 #${input.paymentId} 환불이 처리 중입니다.`,
      }).catch(() => undefined);

      return { success: true } as const;
    }),

  /**
   * 환불 완료
   */
  completeRefund: adminProcedure
    .input(z.object({ paymentId: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.completeRefund(input.paymentId);

      await notifyOwner({
        title: "[휴먼프리즘] 환불 완료",
        content: `결제 #${input.paymentId} 환불이 완료되었습니다.`,
      }).catch(() => undefined);

      // 고객 알림 (환불 완료)
      await notifyRefundToCustomer(input.paymentId, "completed").catch(() => undefined);

      return { success: true } as const;
    }),

  /**
   * 환불 거절
   */
  rejectRefund: adminProcedure
    .input(
      z.object({
        paymentId: z.number().int(),
        reason: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.rejectRefund(input.paymentId, input.reason);

      await notifyOwner({
        title: "[휴먼프리즘] 환불 거절",
        content: `결제 #${input.paymentId} 환불이 거절되었습니다.${input.reason ? `\n사유: ${input.reason}` : ""}`,
      }).catch(() => undefined);

      // 고객 알림 (환불 거절)
      await notifyRefundToCustomer(input.paymentId, "rejected").catch(() => undefined);

      return { success: true } as const;
    }),

  /**
   * 사용자의 환불 이력 조회
   */
  getRefundHistory: protectedProcedure.query(async ({ ctx }) => {
    return db.listRefundHistoryByUser(ctx.user.id);
  }),
});
