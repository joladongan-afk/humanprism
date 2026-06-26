/**
 * 작명 서비스 tRPC 라우터
 * 무료 이름감정, 셀프작명, 마스터 작명 API를 제공한다.
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { namingServices } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  calculateJawonOhaeng,
  judgeJawonOhaeng,
  calculateSuri,
  judgeSuri,
  checkBulmyong,
  judgeOverall,
} from "./calculator";
import { getRandomComment, initializeNamingData, searchHanjaBySound } from "./dataLoader";

initializeNamingData();

function generateCertificateNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `HPS-${date}-${random}`;
}

export const namingRouter = router({
  /**
   * 무료 이름감정
   * 자원오행 + 수리사격 + 불용문자 분석
   */
  freeReading: protectedProcedure
    .input(
      z.object({
        surnameKorean: z.string().min(1, "성씨를 입력해주세요"),
        surnameHanja: z.string().optional(),
        nameKorean: z.string().min(1, "이름을 입력해주세요"),
        nameHanja: z.string().min(1, "한자 이름을 입력해주세요"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 1. 자원오행 계산 및 판정
        const jawonOhaeng = calculateJawonOhaeng(input.nameHanja);
        const jawonOhaengStr = jawonOhaeng.join("");
        const jawonJudgment = judgeJawonOhaeng(jawonOhaeng);

        // 2. 수리사격 계산 및 판정
        const suri = calculateSuri(input.nameKorean, input.nameHanja);
        const suriJudgment = judgeSuri(suri);

        // 3. 불용문자 검사
        const bulmyongCheck = checkBulmyong(input.nameHanja);

        // 4. 종합 판정
        const overallResult = judgeOverall(
          jawonJudgment.result,
          suriJudgment.gilhyung,
          bulmyongCheck.hasBulmyong
        );

        // 5. 롤링 코멘트
        let commentType: "all_pass" | "pado_fail" | "jawon_fail" | "suri_fail" | "bulmyong" | "all_fail" = "all_pass";
        if (bulmyongCheck.hasBulmyong) {
          commentType = "bulmyong";
        } else if (jawonJudgment.result === "보완 필요" && suriJudgment.gilhyung === "凶") {
          commentType = "all_fail";
        } else if (jawonJudgment.result === "보완 필요") {
          commentType = "jawon_fail";
        } else if (suriJudgment.gilhyung === "凶") {
          commentType = "suri_fail";
        }

        const rollingComment = getRandomComment(commentType);

        // 6. DB 저장
        const certificateNumber = generateCertificateNumber();
        const database = await getDb();
        if (!database) throw new Error("Database connection failed");

        const [res] = await database.insert(namingServices).values({
          userId: ctx.user.id,
          nameKorean: input.nameKorean,
          nameHanja: input.nameHanja,
          surnameKorean: input.surnameKorean,
          surnameHanja: input.surnameHanja,
          jawonOhaeng: jawonOhaengStr,
          jawonResult: jawonJudgment.result,
          padoOhaeng: "",
          padoResult: "",
          suriNumber: suri,
          suriGilhyung: suriJudgment.gilhyung,
          suriResult: suriJudgment.description,
          bulmyongFlag: bulmyongCheck.hasBulmyong,
          bulmyongList: bulmyongCheck.bulmyongChars.join(","),
          overallResult,
          rollingComment,
          certificateNumber,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        }).$returningId();

        return {
          success: true,
          id: res?.id,
          certificateNumber,
          analysis: {
            jawon: {
              ohaeng: jawonOhaengStr,
              result: jawonJudgment.result,
              detail: jawonJudgment.detail,
            },
            suri: {
              number: suri,
              gilhyung: suriJudgment.gilhyung,
              description: suriJudgment.description,
            },
            bulmyong: {
              hasBulmyong: bulmyongCheck.hasBulmyong,
              chars: bulmyongCheck.bulmyongChars,
            },
            overall: overallResult,
            comment: rollingComment,
          },
        };
      } catch (error) {
        console.error("[Naming] Free reading error:", error);
        throw new Error("이름 감정 중 오류가 발생했습니다");
      }
    }),

  getReading: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database connection failed");
      const results = await database.select().from(namingServices).where(eq(namingServices.id, input.id)).limit(1);
      const result = results[0];
      if (!result || result.userId !== ctx.user.id) throw new Error("감정 결과를 찾을 수 없습니다");
      return result;
    }),

  listReadings: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) throw new Error("Database connection failed");
    const results = await database.select().from(namingServices)
      .where(eq(namingServices.userId, ctx.user.id))
      .orderBy(namingServices.createdAt).limit(20);
    return results || [];
  }),

  selfNaming: protectedProcedure
    .input(z.object({
      surnameKorean: z.string().min(1),
      surnameHanja: z.string().optional(),
      requiredOhaeng: z.enum(["木", "火", "土", "金", "水"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return { success: true, message: "셀프작명 기능은 준비 중입니다", nameCandidates: [] };
    }),

  masterNaming: protectedProcedure
    .input(z.object({
      surnameKorean: z.string().min(1),
      surnameHanja: z.string().optional(),
      message: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return { success: true, message: "마스터 작명 상담은 준비 중입니다" };
    }),

  searchHanja: publicProcedure
    .input(z.object({ sound: z.string().min(1) }))
    .query(({ input }) => {
      const results = searchHanjaBySound(input.sound, 30);
      return results.map((r) => ({
        char: r.char,
        huneum: r.huneum,
        ohaeng: r.ohaeng,
        strokes: r.strokes,
      }));
    }),
});
