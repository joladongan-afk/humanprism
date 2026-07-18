# 우수 프롬프트 1 — 전체 실행 조합 기록

**우수 프롬프트 1 / 휴먼프리즘 사주상담 1차 완성 기준점**
**확정: 2026년 7월 18일 토요일 14:04**

이 문서는 4번(V6-24-7) 테스트 결과를 재현하는 데 필요한 전체 실행 조합을 실제 코드 값으로 기록한다. 세션 33/34 시점의 코드베이스(운영 재현 SHA `2e05185`) 기준.

---

## 1. 레이어 구조 (server/promptLayers.ts)

4계층 아키텍처: 고정 컨텍스트와 동적 컨텍스트를 완전히 분리.

| 레이어 | 파일/함수 | 내용 | 변경 빈도 |
|---|---|---|---|
| **L1 CORE_PERSONA** | `server/masterPromptV623.ts` → `MASTER_PERSONA_V623` | 마스터 정체성·철학·관법·이론 | 거의 불변 (이번 체크포인트 대상) |
| **L2 OPERATING_POLICY** | `server/promptLayers.ts` → `buildGanjiMappingTable()` + `L2_PERSONAL_POLICY`/`L2_COMPATIBILITY_POLICY` | 간지 매핑 테이블(1900~2100년, 기준 1900=庚子) + 모드별 운영 정책 | 가끔 변경 |
| **L3 STYLE_RULES** | `server/promptLayers.ts` → `L3_PERSONAL_STYLE`/`L3_COMPATIBILITY_STYLE` + `L3_COMMON_TONE` | 화법·분량·호칭·금지사항 | 자주 변경 / A·B 대상 |
| **L4 DYNAMIC** | `server/promptLayers.ts` → `buildPersonalDynamicContext()` | 사주 데이터 + RAG + 사용자 입력 | 항상 변경, 캐시 제외 |

레이어 버전 태그(`LAYER_VERSIONS`): `L1_persona: "v6-21"`, `L2_policy: "v1"`, `L3_style: "v1"` (코드 상수명, 4번 실제 콘텐츠는 masterPromptV623.ts 파일로 결정됨 — 태그명과 번호체계는 별개 관리 축).

---

## 2. PK (Personal Knowledge, 형충회합·육친통변 상주 블록)

- 파일: `server/personalKnowledge.ts`
- 함수: `buildPersonalKnowledgeBlock()` → `PERSONAL_KNOWLEDGE_BLOCK` 상수 반환
- **상태: ON** (고정 캐시 계층에 항상 포함)
- **문자수: 5,031자** (실측, 인수인계서 수치와 일치 확인)
- 조립 위치: `server/masterPrompt.ts` → `buildPersonalPromptLayers()`에서 `[...cachedBlocks, buildPersonalKnowledgeBlock()]`로 캐시 블록 끝에 append

## 3. 일주(日柱) RAG

- 파일: `server/personalKnowledge.ts` → `buildDayPillarSourceBlock(dayGanji)`
- 소스: `server/rag-search.ts` → `getChunkById('E-{간지}')`
- 방식: 60갑자 전체를 상주시키지 않고, 해당 사주의 일주 1개(예: `E-甲子`)만 청크 조회하여 토큰 절약
- 조립 위치: `buildPersonalDynamicContext()` 내부에서 `sajuBlock` 뒤에 `\n\n${dayPillarBlock}`로 결합 → **L4(동적) 블록에 포함**

## 4. RAG 검색 (일반 쿼리 기반)

- 파일: `server/claude-api-rag.ts` → `invokeClaudeWithRagLayers()`
- `ragTopK` 기본값: 3
- 검색 함수: `searchRagChunks(userQuery, ragTopK)` → `formatRagContext()`로 포맷
- `ragOverride`가 없으면 사용자 쿼리로 검색, 있으면 override 텍스트 그대로 사용
- 조립: `dynamicSystemPrompt = [dynamicContext, ragText].join("\n\n")` → **비캐시 블록**

---

## 5. 조립 순서 (실제 상담 라우터 기준: server/routers.ts consult.sendMessage)

```
1. buildPersonalPromptLayers(sajuData, planType)
   → cachedBlocks = [ L1+L2+L3 (buildSystemLayers 결과), PK 블록 ]
   → dynamic = buildPersonalDynamicContext(saju, plan)
        = 사주 데이터(formatSajuForPrompt) + 일주 RAG(buildDayPillarSourceBlock) + 상담 플랜 안내

2. layerDynamic = dynamic + buildTemporalContext(input.content)  (시간 상대성 컨텍스트 추가)

3. (추가 인원 사주가 있으면 layerDynamic에 추가 사주 목록 append)

4. invokeClaudeWithRagLayers(claudeMessages, {
     cachedBlocks: layerCachedBlocks,
     dynamicContext: layerDynamic,
     userQuery: input.content,
     maxTokens: 4000,
     ragOverride: useRagSearch ? undefined : "",
   })

5. invokeClaudeWithRagLayers 내부:
   cachedSystemPrompt = cachedBlocks.join("\n\n")
   dynamicSystemPrompt = [dynamicContext, ragText(쿼리검색 결과)].join("\n\n")

6. invokeClaudeAPI({ cachedSystemPrompt, dynamicSystemPrompt, maxTokens, messages })
   → system 블록 2개 구성:
      [0] cachedSystemPrompt  + cache_control: { type: "ephemeral" }
      [1] dynamicSystemPrompt (캐시 없음)
```

캐시 전략 상세는 `server/promptLayers.ts` 상단 주석 참고: 기본은 `[L1+L2+L3]` 단일 고정 캐시 블록 + `[L4]` 동적 비캐시 블록. `splitStyleLayer: true` 옵션 사용 시에만 `[L1+L2]`/`[L3]` 2단 분리.

**단, PK 블록은 `buildPersonalPromptLayers()`에서 캐시 블록 배열에 별도 원소로 추가되므로, 실제 캐시 블록은 `[L1+L2+L3]`와 `[PK]` 2개 원소를 가진 배열이고, 이를 `invokeClaudeWithRagLayers`에서 `join("\n\n")`으로 합쳐 하나의 캐시 텍스트로 전송한다.**

---

## 6. 모델 및 호출 설정

- 파일: `server/claude-api.ts`
- 모델명: `claude-sonnet-4-6` (상수 `MODEL`)
- max_tokens: 상담 라우트(`server/routers.ts` consult.sendMessage)에서 **4000**으로 명시 호출
- temperature: 코드에 명시적 설정 없음 (Anthropic API 기본값 사용, 별도 override 없음)
- system block 구성: `TextBlock[]` 형태
  - `cachedSystemPrompt` 있을 때: `[{ type: "text", text: cachedSystemPrompt, cache_control: { type: "ephemeral" } }, { type: "text", text: dynamicSystemPrompt }]` (dynamic이 비어있지 않을 때만 두 번째 블록 추가)
- 캐시 사용 방식: Anthropic 프롬프트 캐싱 `cache_control: { type: "ephemeral" }`을 고정 블록에만 부여. 캐시 브레이크포인트는 최대 4개까지 가능하나, 현재 구조는 캐시 블록 1개(L1+L2+L3+PK 결합) + 비캐시 동적 블록 1개로 운용.
- SDK: `@anthropic-ai/sdk` (`Anthropic` 클라이언트)

---

## 7. 테스트 조건 (대표 테스트, 질문·답변 전문은 `test-B0006-2026-07-18-1331.md`에 원문 그대로 보존됨)

| 항목 | 값 |
|---|---|
| 테스트 대상 | 강평춘 B0006 |
| 테스트 질문 | "내 사주 총평해줘" |
| 테스트 시각 | 2026-07-18 13:31 |
| 운영 재현 SHA | `2e05185e8f456cde42d060ebca0da004c1d139cd` |
| L1 (masterPromptV623.ts) | 11,429자 / 26,787바이트(UTF-8) / 349줄 |
| PK | 5,031자, ON |
| 모델 | claude-sonnet-4-6 |
| max_tokens | 4000 |

세부 사항(L2 간지테이블 문자수, L3 정확 바이트수, 전체 프롬프트 총 글자수 등 다변량 수치)은 세션33 인수인계서의 "3. 각 번호의 실측 수치" 표를 1차 근거로 삼되, 이 문서는 세션34 시점 코드에서 실제 조립 로직·경로를 재확인한 기록이다.

---

## 8. 확인되지 않았거나 불확실한 항목

- L2/L3의 정확한 4번 시점 문자수는 이 문서 작성 시점(세션34)의 코드에서 측정한 값이며, 세션33 인수인계서 표의 수치(L1+L2+L3 결합 13,754자, 전체 프롬프트 26,270자)와 정합성 대조는 별도로 재실측이 필요하다.
- temperature는 코드에 명시적 값이 없어 "설정 안 함(API 기본값)"으로 기록했으나, Anthropic API 기본 temperature 값 자체는 이 문서에서 별도 검증하지 않았다.
