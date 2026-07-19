# 우수 프롬프트 1 — 복구 절차

**우수 프롬프트 1 / 휴먼프리즘 사주상담 1차 완성 기준점**
**확정 일시: 2026년 7월 18일 토요일 14:04**

이 문서는 나중에 프롬프트가 변질됐을 때 우수 프롬프트 1(이하 "우프 1")로 안전하게 복구하기 위한 운영 절차다. 이 문서 자체는 `2f35106` 이후 main에 추가된 운영 절차 문서이며, 우프 1의 정확한 프롬프트·실행 상태·대표 결과가 완성된 역사적 기준점은 **Git 태그 `humanprism-saju-excellent-prompt-01`이 가리키는 `2f35106`**이다.

복구 시 태그(`2f35106`)와 이 RECOVERY.md를 함께 참고해야 한다.

---

## 1. 복구 대상 — L1 파일 하나가 아님

우프 1의 대표 상담 결과(`test-B0006-2026-07-18-1331.md`)는 `server/masterPromptV623.ts` 하나만으로 나온 것이 아니다. 아래 전체 실행 조합이 함께 작동한 결과다.

- **L1**: `server/masterPromptV623.ts` (우프 1 원문, blob `8e52cbca7564ca02f1a31bd95180d5355b6e7941`)
- **L2**: 간지 매핑 테이블 + 개인상담 정책 (`server/promptLayers.ts` → `buildGanjiMappingTable()` + `L2_PERSONAL_POLICY`)
- **L3**: 개인화법 규칙 (`server/promptLayers.ts` → `L3_PERSONAL_STYLE` + `L3_COMMON_TONE`)
- **PK**: 형충회합·육친통변 상주 블록 (`server/personalKnowledge.ts` → `buildPersonalKnowledgeBlock()`, 5,031자)
- **일주 RAG**: 일주 물상 1개 동적 주입 (`buildDayPillarSourceBlock(dayGanji)`)
- **L4**: 사주 데이터 동적 포맷 (`buildPersonalDynamicContext(saju, plan)`)
- **조립순서**: `buildPersonalPromptLayers()` → `invokeClaudeWithRagLayers()` → `invokeClaudeAPI()` (상세는 `runtime-context.md` §5 참고)
- **모델명**: `claude-sonnet-4-6` (`server/claude-api.ts` 상수 `MODEL`)
- **max_tokens**: 4000 (`server/routers.ts` consult.sendMessage 호출부)
- **temperature**: 명시 설정 없음 (API 기본값 사용)
- **캐시 구조**: `cachedSystemPrompt`(L1+L2+L3+PK 결합) + `cache_control: { type: "ephemeral" }`, `dynamicSystemPrompt`(L4+RAG)는 비캐시

자세한 실측 수치는 `runtime-context.md`를 참고한다.

---

## 2. 복구 절차

"우프 1로 돌아가자"는 요청을 받으면 아래 순서를 반드시 지킨다.

1. **현재 상태 실측**
   - 로컬 HEAD: `git log --oneline -3`
   - GitHub main HEAD: API 직접 조회
   - Railway ACTIVE SHA: 마스터에게 화면 확인 요청

2. **우프 1 기준 문서 확인**
   - `docs/prompt-checkpoints/excellent-prompt-01/README.md` — 공식 명칭·선정 사유·핵심 문장
   - `docs/prompt-checkpoints/excellent-prompt-01/runtime-context.md` — 전체 실행 조합 상세

3. **전체 조합 비교**
   - L1(`server/masterPromptV623.ts`)의 blob 해시를 우프 1 기대값(`8e52cbca...`)과 대조
   - L2·L3 관련 `server/promptLayers.ts` 변경 여부
   - PK(`server/personalKnowledge.ts`) 변경 여부
   - 모델명·max_tokens 변경 여부 (`server/claude-api.ts`, `server/routers.ts`)
   - 조립 순서 변경 여부 (`server/masterPrompt.ts`)

4. **차이 보고**
   - 변경된 항목과 실제 diff를 마스터에게 먼저 제시
   - 임의로 보정하거나 판단하지 않는다

5. **마스터 승인 후 복구**
   - L1만 달라졌다면 L1만 복구
   - 다른 항목도 달라졌다면 각 항목을 함께 복구
   - `reset` / `amend` / `force push` 금지
   - 변경 파일 diff 최종 확인 → TypeScript 검증 → 커밋 → push

6. **Railway 배포 확인**
   - 마스터에게 Railway 화면에서 새 커밋 SHA ACTIVE 확인 요청

7. **대표 테스트 재현**
   - 대상: 강평춘 B0006
   - 질문: "내 사주 총평해줘"
   - 1회 실행, 결과 원문 전체 보존
   - 핵심 작동 검증 후 최종 복구 완료 판정

---

## 3. 재현 테스트 검증 기준

파일 해시 일치만으로 "복구 완료"로 보지 않는다. B0006 재현 결과에서 아래 5가지를 확인해야 최종 복구 완료로 판정한다.

- **하나의 중심축이 유지되는가** — 여러 십성·요소가 분산되지 않고 하나의 작동 원리로 압축되는가
- **강한 재성과 실제 활용 능력을 분리하는가** — "재성이 강하다"와 "돈을 잘 번다"를 같은 말로 쓰지 않는가
- **욕구·통로·결과가 구분되는가** — 왕자필용론이 실제 문장에서 작동하는가
- **육친·십성 사전식 해설로 회귀하지 않는가** — 식상=자식, 관성=남편 식의 항목 나열이 없는가
- **"움직이는 힘과 지키는 힘 사이의 간격"이라는 핵심 판정이 살아 있는가**

우프 1 대표 결과의 핵심 문장:
> "돈을 향해 움직이는 힘이 강하다는 것과, 그 돈을 안정적으로 불리고 지켜왔다는 것은 다른 이야기입니다."

---

## 4. 원본 보호 원칙

- `excellent-prompt-01` 안의 원본 프롬프트(`masterPromptV623.ts`)와 대표 테스트(`test-B0006-2026-07-18-1331.md`)는 수정하지 않는다.
- 이 RECOVERY.md와 README.md는 복구 절차 보완이 필요할 때만 변경한다.
- 새 실험은 우프 1 원본을 직접 수정하지 않고, 운영 파일(`server/masterPromptV623.ts`)에서 별도 커밋으로 진행한다.
- 성공한 새 버전은 "우수 프롬프트 2, 3, 4…" 순으로 새 체크포인트 폴더에 저장한다.

---

## 5. Git 태그 정보

우프 1의 역사적 기준점을 가리키는 태그:

```
태그명: humanprism-saju-excellent-prompt-01
태그 대상: 2f35106 ([우수 프롬프트 1] 4번 B0006 대표 테스트 전문 보존)
```

이 태그에는 우프 1의 프롬프트 원문·runtime-context·선정 사유·B0006 대표 테스트 전문이 모두 포함된 시점이 기록되어 있다. 이 RECOVERY.md는 태그 이후 main에 추가된 문서이므로 태그에는 포함되지 않는다. 복구 시 태그와 이 문서를 함께 참고한다.
