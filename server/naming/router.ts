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
import { getRandomComment, initializeNamingData, searchHanjaBySound, getRequiredOhaeng, loadNangangmangDb } from "./dataLoader";
import { calculateSaju, lunarToSolar } from "../saju";
import { getUserFreeReadingCount } from "../db";


/**
 * 종합판정 카피 생성
 * 자원오행 결과 × 정격 길흉 조합으로 풍성한 판정 문구 반환
 */
function generateOverallCopy(
  jawonResult: string,
  jeongGilhyung: string,
  hasBulmyong: boolean,
  bulmyongChars: string[]
): string {
  // 불용문자 판정
  if (hasBulmyong) {
    const charList = bulmyongChars.join(", ");
    // 진짜 나쁜 경우(살, 형, 사 등) 강하게, 나머지는 정보 제공
    const severeChars = ["殺", "刑", "死", "凶", "鬼", "禍", "毒", "魔", "惡"];
    const hasSevere = bulmyongChars.some(c => severeChars.includes(c));
    if (hasSevere) {
      return `이름 안에 성명학에서 오랫동안 강하게 경계해온 글자(${charList})가 포함되어 있습니다. 이 글자들은 단순히 꺼리는 수준이 아니라, 뜻 자체에 부정적인 이미지가 강하게 담겨 있습니다. 이름은 평생 수만 번 불리는 것입니다. 그 글자가 담고 있는 에너지가 삶 속에서 어떻게 작동하는지, 한 번쯤 냉정하게 살펴볼 필요가 있습니다. 마스터 작명 상담을 통해 더 나은 대안을 찾아드릴 수 있습니다.`;
    }
    return `이름 안에 성명학에서 오랫동안 주의해온 글자(${charList})가 포함되어 있습니다. 저는 불용문자를 시대와 맥락 없이 무조건 나쁘게 보지 않습니다. 오랜 역사 속에서 특정 글자를 꺼리는 이유가 있었지만, 그 해석은 달라질 수 있습니다. 다만 해당 글자가 지닌 이미지와 에너지가 삶 전체에서 어떤 방식으로 작동하는지는 한 번쯤 짚어볼 가치가 있습니다.`;
  }

  // 자원오행 × 정격 수리 조합
  const key = `${jawonResult}__${jeongGilhyung}`;

  const copies: Record<string, string> = {
    "양호__吉": "한자가 품은 오행의 기운과 획수가 만들어내는 수리가 같은 방향을 향하고 있습니다. 물이 높은 곳에서 낮은 곳으로 자연스럽게 흐르듯, 이 이름 안의 에너지는 억지로 밀어붙이지 않아도 제 방향을 찾아가는 구조입니다. 좋은 이름은 화려한 의미를 담은 글자보다, 이처럼 기운의 방향이 일치할 때 만들어집니다. 이름 자체가 조용하지만 든든한 지원군이 되어줄 것입니다.",

    "양호__半吉半凶": "한자의 오행 기운은 서로를 생해주는 좋은 흐름입니다. 다만 획수가 만들어내는 수리는 성공과 굴곡이 교차하는 파동을 품고 있습니다. 마치 좋은 바람을 등에 업고 항해하지만, 파도가 잔잔하지만은 않은 바다를 가는 형국입니다. 이름이 가진 오행의 기운이 그 파도를 버티는 닻이 되어줄 것이지만, 직업 선택이나 대인관계처럼 중요한 선택의 순간마다 신중한 판단이 이 이름의 운을 결정짓는 열쇠가 됩니다.",

    "양호__凶": "한자가 품은 오행의 기운은 맑고 좋습니다. 서로를 북돋아주는 흐름이 이름 안에 흐르고 있습니다. 그러나 전체 획수의 수리가 만들어내는 파동이 그 좋은 기운에 짐을 얹고 있습니다. 뿌리는 좋은데 바람이 거센 나무와 같습니다. 재물이 모이는 듯하다가 흩어지거나, 가정 안에서 뜻대로 되지 않는 일이 반복되는 경험을 해볼 수 있습니다. 같은 뜻의 한자라도 획수가 다른 글자를 선택하면 전혀 다른 이름이 됩니다.",

    "중립__吉": "획수가 만들어내는 수리가 이 이름의 중심을 잡아주고 있습니다. 수리의 기운이 탄탄하여 삶의 굵직한 흐름에서 안정감을 주는 역할을 합니다. 한자의 오행은 크게 서로를 돕거나 방해하지 않는 중립적인 관계입니다. 이름 전체로 보면, 화려하지는 않지만 흔들리지 않는 단단한 기반 위에 서 있는 구조입니다. 꾸준히 자신의 길을 걸어갈 때 이 이름의 기운이 가장 빛을 발합니다.",

    "중립__半吉半凶": "한자의 오행도, 수리도 극단으로 치닫지 않는 중간의 기운입니다. 큰 기복 없이 흘러가는 듯 보이지만, 수리가 품은 파동이 삶의 중요한 갈림길에서 고개를 드는 경향이 있습니다. 직업 적성과 현실 사이에서 묘한 괴리감을 느끼거나, 노력한 만큼 주변에서 인정받지 못한다는 느낌이 드는 시기가 찾아올 수 있습니다. 좋은 환경과 좋은 사람을 선택하는 안목이 이 이름의 기운을 끌어올리는 방법입니다.",

    "중립__凶": "수리의 파동이 이 이름에서 가장 주의 깊게 살펴야 할 부분입니다. 한자의 오행이 수리의 거친 기운을 충분히 받쳐주지 못하는 구조입니다. 재물 인연이 쉽게 흩어지거나, 가정과 직업 모두에서 안정감을 찾기 어려운 시기가 반복될 수 있습니다. 이름을 바꾸기 어려운 상황이라면, 삶의 중요한 결정을 앞두고 충분한 시간을 들여 신중하게 판단하는 습관이 이 이름의 파동을 다스리는 데 도움이 됩니다.",

    "보완 필요__吉": "수리가 만들어내는 기운이 이 이름의 든든한 버팀목입니다. 전체 획수가 빚어내는 파동이 안정적이어서, 삶의 굵직한 흐름에서 중심을 잡아주는 역할을 합니다. 다만 한자의 오행이 서로 엇갈리는 방향을 품고 있어 아쉬움이 남습니다. 자원오행과 사주의 조화는 작명가마다 이견이 있는 영역이기도 합니다. 저는 자연으로서의 인간과 사회적·생물학적 인간의 모든 면을 깊이 통찰하여 판단합니다. 한자의 오행이 사주의 핵심 기운과 온전히 맞닿지 못할 경우, 자신의 적성과 실제 직업 사이에서 묘한 괴리감을 느끼거나, 대인관계가 노력만큼 매끄럽지 않다는 느낌이 드는 경험을 해볼 수 있습니다. 좋은 수리가 그 마찰을 완충해주고 있지만, 같은 독음의 다른 한자를 선택했다면 더 완성된 이름이 될 수 있었을 것입니다.",

    "보완 필요__半吉半凶": "한자의 오행도, 수리도 아쉬움이 있습니다. 오행이 서로 힘을 합치지 못하고, 수리 역시 기복의 파동을 품고 있습니다. 이름이 가진 두 가지 기운이 같은 방향을 가리키지 못하고 있는 형국입니다. 재물 인연이 손에 잡힐 듯 빠져나가거나, 가정과 직업 어느 한 쪽에서 늘 무언가 아쉬운 느낌이 드는 시기가 반복될 수 있습니다. 그러나 이것이 이 이름을 가진 사람의 삶을 결정짓는 것은 아닙니다. 이름은 운명을 만드는 것이 아니라, 운의 흐름에 영향을 미치는 하나의 요소입니다. 보완의 여지가 분명히 있습니다.",

    "보완 필요__凶": "이름을 구성하는 두 축, 한자의 오행과 획수의 수리가 모두 아쉬운 방향을 향하고 있습니다. 이름이 삶의 에너지를 돕는 방향보다 짐을 더하는 방향으로 작동할 가능성이 있습니다. 직업적 만족도가 떨어지거나, 가정생활에 예기치 못한 어려움이 따르거나, 재물 인연이 쌓이지 않고 흩어지는 패턴이 나타날 수 있습니다. 이름이 사람의 삶에서 어떤 역할을 하는지, 이 이름을 계기로 한 번쯤 진지하게 생각해보시길 권합니다.",

    "한자 미입력__吉": "획수가 만들어내는 수리가 안정적이고 좋은 기운을 품고 있습니다. 이름의 획수가 빚어내는 파동이 삶의 든든한 바탕이 되어줄 것입니다. 한자를 입력하시면 자원오행까지 함께 분석하여 더 완성된 결과를 보여드릴 수 있습니다. 같은 소리의 이름이라도 어떤 한자를 쓰느냐에 따라 그 기운이 달라지기 때문입니다.",

    "한자 미입력__半吉半凶": "수리의 파동이 기복을 품고 있습니다. 좋은 시기와 어려운 시기가 교차하는 기운으로, 선택의 순간마다 신중함이 필요한 구조입니다. 한자를 함께 입력하시면 자원오행 분석이 추가되어, 수리의 기복을 오행이 어떻게 보완하거나 강화하는지 더 정확하게 살펴볼 수 있습니다.",

    "한자 미입력__凶": "획수가 만들어내는 수리의 파동이 주의가 필요한 방향을 가리키고 있습니다. 수리 하나만으로 이름 전체를 평가하기는 이릅니다. 한자를 입력하시면 자원오행 분석이 함께 이루어지며, 오행이 수리의 파동을 얼마나 보완해주는지 확인할 수 있습니다. 이름의 기운은 여러 요소가 함께 작용하는 것입니다.",
  };

  return copies[key] || "이름의 자원오행과 수리사격을 종합적으로 분석하였습니다. 더 깊은 분석은 마스터 작명 상담을 통해 받으실 수 있습니다.";
}

initializeNamingData();
loadNangangmangDb();

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
        birthYear: z.number().optional(),
        birthMonth: z.number().optional(),
        birthDay: z.number().optional(),
        calendarType: z.enum(["solar", "lunar"]).optional(),
        namingConsent: z.boolean().refine(v => v === true, { message: "개인정보 수집에 동의해주세요" }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 1인 1회 제한 체크 (관리자 계정은 면제)
        if (ctx.user.role !== "admin") {
          const usedCount = await getUserFreeReadingCount(ctx.user.id);
          if (usedCount > 0) {
            throw new Error("무료 이름 감정은 1인 1회만 이용하실 수 있습니다. 더 자세한 분석은 마스터 작명 상담을 이용해 주세요.");
          }
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

        // 3-1. 필요오행 계산 (생년월일 있을 때)
        let requiredOhaeng: { primary: string; secondary: string } | null = null;
        if (input.birthYear && input.birthMonth && input.birthDay) {
          try {
            let year = input.birthYear;
            let month = input.birthMonth;
            let day = input.birthDay;
            if (input.calendarType === "lunar") {
              const solar = lunarToSolar(year, month, day, false);
              year = solar.year; month = solar.month; day = solar.day;
            }
            const saju = calculateSaju({ year, month, day, gender: "male" });
            const ilgan = saju.pillars.day.stem;
            const birthMonthBranch = saju.pillars.month.branch;
            requiredOhaeng = getRequiredOhaeng(ilgan, birthMonthBranch);
          } catch (e) {
            console.warn("[Naming] 필요오행 계산 실패:", e);
          }
        }

        // 4. 종합 판정
        const overallResult = judgeOverall(
          jawonJudgment.result,
          jeongJudgment.gilhyung, // 정격(총격)으로 종합 판정
          bulmyongCheck.hasBulmyong
        );

        // 5. 종합판정 카피 생성
        const rollingComment = generateOverallCopy(
          jawonJudgment.result,
          jeongJudgment.gilhyung,
          bulmyongCheck.hasBulmyong,
          bulmyongCheck.bulmyongChars
        );

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
          padoOhaeng: JSON.stringify({
            won: { number: suri4.won, gilhyung: wonJudgment.gilhyung, description: wonJudgment.description },
            hyeong: { number: suri4.hyeong, gilhyung: hyeongJudgment.gilhyung, description: hyeongJudgment.description },
            i: { number: suri4.i, gilhyung: iJudgment.gilhyung, description: iJudgment.description },
            jeong: { number: suri4.jeong, gilhyung: jeongJudgment.gilhyung, description: jeongJudgment.description },
          }),
          bulmyongFlag: bulmyongCheck.hasBulmyong,
          bulmyongList: bulmyongCheck.bulmyongChars.join(","),
          overallResult,
          rollingComment,
          certificateNumber,
          namingConsentAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
            requiredOhaeng,
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

  // 공유 페이지용: 인증번호로 이름감정 결과 조회 (비로그인 가능)
  getShareResult: publicProcedure
    .input(z.object({ certificateNumber: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new Error("Database connection failed");
      const results = await database
        .select()
        .from(namingServices)
        .where(eq(namingServices.certificateNumber, input.certificateNumber))
        .limit(1);
      const r = results[0];
      if (!r) throw new Error("결과를 찾을 수 없습니다");

      // nameKorean = "원석" (이름 두 글자), surnameKorean 별도
      const nameChars = (r.nameKorean || "").split("");
      const hanjaChars = (r.nameHanja || "").split("");

      return {
        certificateNumber: r.certificateNumber,
        surnameKorean: r.surnameKorean || "",
        surnameHanja: r.surnameHanja || "",
        name1Korean: nameChars[0] || "",
        name1Hanja: hanjaChars[0] || "",
        name2Korean: nameChars[1] || "",
        name2Hanja: hanjaChars[1] || "",
        analysis: {
          jawon: {
            ohaeng: r.jawonOhaeng || "",
            result: r.jawonResult || "",
            detail: "",
            hasHanja: !!(r.nameHanja),
          },
          suri4: (() => {
            try { return r.padoOhaeng ? JSON.parse(r.padoOhaeng) : null; } catch { return null; }
          })(),
          bulmyong: {
            hasBulmyong: r.bulmyongFlag || false,
            chars: r.bulmyongList ? r.bulmyongList.split(",") : [],
          },
          overall: r.overallResult || "",
          comment: r.suriResult || r.rollingComment || "",
          requiredOhaeng: r.padoResult ? { primary: r.padoResult, secondary: "" } : null,
        },
        createdAt: r.createdAt,
      };
    }),
});
