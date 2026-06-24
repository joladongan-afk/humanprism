// 실제 개인상담 시스템 프롬프트 구성요소별 분량 측정
import { readFileSync } from "fs";

function chars(file) {
  try {
    return readFileSync(file, "utf-8").length;
  } catch {
    return 0;
  }
}

// 소스 파일 원시 길이(코드 포함이라 실제 문자열보다 약간 큼 → 참고용)
const v4 = chars("./server/masterPromptV4.ts");
const layers = chars("./server/promptLayers.ts");
const pk = chars("./server/personalKnowledge.ts");

// 실제 문자열 추출: 백틱 템플릿 리터럴 내용만 근사 추출
function extractTemplateChars(file) {
  const src = readFileSync(file, "utf-8");
  const matches = src.match(/`[\s\S]*?`/g) || [];
  return matches.reduce((a, m) => a + (m.length - 2), 0);
}

const v4Str = extractTemplateChars("./server/masterPromptV4.ts");
const layersStr = extractTemplateChars("./server/promptLayers.ts");
const pkStr = extractTemplateChars("./server/personalKnowledge.ts");

console.log("=== 소스 파일 원시 길이(코드 포함) ===");
console.log("masterPromptV4.ts:", v4, "자");
console.log("promptLayers.ts:", layers, "자");
console.log("personalKnowledge.ts:", pk, "자");

console.log("\n=== 실제 프롬프트 문자열(템플릿 리터럴) 근사 ===");
console.log("V4 페르소나(L1):", v4Str, "자");
console.log("레이어(L2+L3+동적템플릿):", layersStr, "자");
console.log("personalKnowledge(C·D 상주):", pkStr, "자");

// 개인상담 고정 시스템 프롬프트 ≈ L1(V4) + L2personal + L3personal + personalKnowledge
// 레이어 중 personal 정책/스타일만 들어가므로 보수적으로 전체 레이어의 60%로 근사
const fixedApprox = v4Str + Math.round(layersStr * 0.6) + pkStr;
console.log("\n개인상담 고정 시스템 프롬프트(근사):", fixedApprox, "자");

// 토큰 환산: 한글 1자 ≈ 1.5 토큰(보수적), 영문/기호 혼재 가정
const tokPerChar = 1.5;
const sysTokens = Math.round(fixedApprox * tokPerChar);
console.log("시스템 프롬프트 토큰(≈x1.5):", sysTokens, "토큰");

// RAG: top-k=3, 평균 159자 x 3 + 헤더 ≈ 600자
const ragChars = 600;
const ragTokens = Math.round(ragChars * tokPerChar);

// 사용자 질문 평균 + 동적(사주) 블록
const dynChars = 1500; // 사주 동적 컨텍스트
const userChars = 300; // 사용자 질문
const dynTokens = Math.round((dynChars + userChars) * tokPerChar);

// 출력: 답변 1000자 기준
const outChars = 1000;
const outTokens = Math.round(outChars * tokPerChar);

// Claude Sonnet 단가(USD per 1M): input 3.0, output 15.0 (3.5 sonnet 기준)
const IN = 3.0 / 1e6;
const OUT = 15.0 / 1e6;
const USDKRW = 1380;

// 컨텍스트 누적: 질문 N회 시 직전 대화가 입력에 누적
function sessionCost(turns, sysTok, splitSys) {
  // splitSys: 압축 후 시스템 토큰
  const s = splitSys ?? sysTok;
  let totalIn = 0;
  let totalOut = 0;
  let history = 0; // 누적된 이전 대화 토큰
  for (let i = 0; i < turns; i++) {
    const inTok = s + ragTokens + dynTokens + history;
    totalIn += inTok;
    totalOut += outTokens;
    history += dynTokens + outTokens; // 이번 질문+답변이 다음 턴 history로
  }
  const usd = totalIn * IN + totalOut * OUT;
  return usd * USDKRW;
}

console.log("\n=== 20회 상담(답변 1000자) 비용 시나리오 (KRW) ===");
const base = sessionCost(20, sysTokens);
console.log("현재 시스템 프롬프트(", sysTokens, "토큰):", Math.round(base), "원");
const c50 = sessionCost(20, Math.round(sysTokens * 0.5));
console.log("50% 압축(", Math.round(sysTokens * 0.5), "토큰):", Math.round(c50), "원  | 절감", Math.round(base - c50), "원");
const c25 = sessionCost(20, Math.round(sysTokens * 0.25));
console.log("75% 압축(", Math.round(sysTokens * 0.25), "토큰):", Math.round(c25), "원  | 절감", Math.round(base - c25), "원");
const c15 = sessionCost(20, Math.round(sysTokens * 0.15));
console.log("85% 압축(", Math.round(sysTokens * 0.15), "토큰):", Math.round(c15), "원  | 절감", Math.round(base - c15), "원");

console.log("\n판매가 9,900원 기준 마진율:");
for (const [label, cost] of [["현재", base], ["50%압축", c50], ["75%압축", c25], ["85%압축", c15]]) {
  console.log(`  ${label}: 비용 ${Math.round(cost)}원 → 마진 ${(((9900 - cost) / 9900) * 100).toFixed(1)}%`);
}
