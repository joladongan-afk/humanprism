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
  calculateSuri4,
  judgeSuri,
  checkBulmyong,
  judgeOverall,
} from "./calculator";
import { getRandomComment, initializeNamingData, searchHanjaBySound } from "./dataLoader";
import { getUserFreeReadingCount } from "../db";

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
   * 자원오행 + 수리사격(4격) + 불용문자 분석
   */
  freeReading: protectedProcedure
    .input(
      z.object({
        surnameKorean: z.string().min(1, "성씨를 입력해주세요"),
        surnameHanja: z.string().optional(),
        name1Korean: z.string().min(1, "가운데 글자를 입력해주세요"),
        name1Hanja: z.string().optional(),
        name2Korean: z.string().min(1, "끝 글자를 입력해주세요"),
        name2Hanja: z.string().optional(),
        namingConsent: z.boolean().refine(v => v === true, { message: "개인정보 수집에 동의해주세요" }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 1인 1회 제한 체크
        const usedCount = await getUserFreeReadingCount(ctx.user.id);
        if (usedCount > 0) {
          throw new Error("무료 이름 감정은 1인 1회만 이용하실 수 있습니다. 더 자세한 분석은 마스터 작명 상담을 이용해 주세요.");
        }

        const name1Hanja = input.name1Hanja || "";
        const name2Hanja = input.name2Hanja || "";
        const surnameHanja = input.surnameHanja || "";
        const nameHanja = name1Hanja + name2Hanja;

        // 한자 미입력 시 차단
        if (!name1Hanja && !name2Hanja) {
          throw new Error("한자를 입력해야 이름 감정이 가능합니다. 이름 글자의 한자를 선택해 주세요.");
        }

        // 1. 자원오행 계산 (한자가 있을 때만)
        const hasHanja = name1Hanja.length > 0 || name2Hanja.length > 0;
        const jawonOhaeng = hasHanja ? calculateJawonOhaeng(nameHanja) : [];
        const jawonOhaengStr = jawonOhaeng.join("");
        const jawonJudgment = hasHanja
          ? judgeJawonOhaeng(jawonOhaeng)
          : { result: "한자 미입력", detail: "한자를 입력하면 자원오행을 분석합니다" };

        // 2. 수리사격 4격 계산
        // 성씨 한자가 없으면 성씨 한글로 대체 (획수 0으로 처리됨)
        const suri4 = calculateSuri4(
          surnameHanja || input.surnameKorean,
          name1Hanja || input.name1Korean,
          name2Hanja || input.name2Korean
        );
        const wonJudgment = judgeSuri(suri4.won);
        const hyeongJudgment = judgeSuri(suri4.hyeong);
        const iJudgment = judgeSuri(suri4.i);
        const jeongJudgment = judgeSuri(suri4.jeong);

        // 3. 불용문자 검사 (한자 있을 때만)
        const bulmyongCheck = hasHanja
          ? checkBulmyong(nameHanja)
          : { hasBulmyong: false, bulmyongChars: [] };

        // 4. 종합 판정
        const overallResult = judgeOverall(
          jawonJudgment.result,
          jeongJudgment.gilhyung, // 정격(총격)으로 종합 판정
          bulmyongCheck.hasBulmyong
        );

        // 5. 롤링 코멘트
        let commentType: "all_pass" | "jawon_fail" | "suri_fail" | "bulmyong" | "all_fail" = "all_pass";
        if (bulmyongCheck.hasBulmyong) {
          commentType = "bulmyong";
        } else if (jawonJudgment.result === "보완 필요" && jeongJudgment.gilhyung === "凶") {
          commentType = "all_fail";
        } else if (jawonJudgment.result === "보완 필요") {
          commentType = "jawon_fail";
        } else if (jeongJudgment.gilhyung === "凶") {
          commentType = "suri_fail";
        }

        const rollingComment = getRandomComment(commentType);

        // 6. DB 저장
        const certificateNumber = generateCertificateNumber();
        const database = await getDb();
        if (!database) throw new Error("Database connection failed");

        const [res] = await database.insert(namingServices).values({
          userId: ctx.user.id,
          nameKorean: input.name1Korean + input.name2Korean,
          nameHanja: nameHanja,
          surnameKorean: input.surnameKorean,
          surnameHanja: surnameHanja || undefined,
          jawonOhaeng: jawonOhaengStr,
          jawonResult: jawonJudgment.result,
          padoOhaeng: "",
          padoResult: "",
          suriNumber: suri4.jeong,
          suriGilhyung: jeongJudgment.gilhyung,
          suriResult: jeongJudgment.description,
          bulmyongFlag: bulmyongCheck.hasBulmyong,
          bulmyongList: bulmyongCheck.bulmyongChars.join(","),
          overallResult,
          rollingComment,
          certificateNumber,
          namingConsentAt: new Date(),
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
              hasHanja,
            },
            suri4: {
              won: { number: suri4.won, gilhyung: wonJudgment.gilhyung, description: wonJudgment.description },
              hyeong: { number: suri4.hyeong, gilhyung: hyeongJudgment.gilhyung, description: hyeongJudgment.description },
              i: { number: suri4.i, gilhyung: iJudgment.gilhyung, description: iJudgment.description },
              jeong: { number: suri4.jeong, gilhyung: jeongJudgment.gilhyung, description: jeongJudgment.description },
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
