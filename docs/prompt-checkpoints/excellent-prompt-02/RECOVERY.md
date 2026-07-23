# 우수 프롬프트 2 — 복구 절차

**기준 커밋:** `477bb07dc194166f43a90bd5983a57b909f258ec`  
**Git 태그:** `humanprism-saju-excellent-prompt-02`

---

## 복구 명령

```bash
# 방법 1: 태그 기준 체크아웃
git checkout humanprism-saju-excellent-prompt-02 -- server/masterPromptV623.ts

# 방법 2: 커밋 SHA 기준
git checkout 477bb07dc194166f43a90bd5983a57b909f258ec -- server/masterPromptV623.ts

# 방법 3: blob 직접 복원
git cat-file blob e41f7b4c84eb1bf801dea9f0c59026617a3f4610 > server/masterPromptV623.ts
```

## 복구 후 검증

```bash
# blob hash 일치 확인
git hash-object server/masterPromptV623.ts
# 기대값: e41f7b4c84eb1bf801dea9f0c59026617a3f4610

# L1 문자 수 확인 (Python)
python3 -c "
import re
with open('server/masterPromptV623.ts', encoding='utf-8') as f:
    c = f.read()
m = re.search(r'MASTER_PERSONA_V623\s*=\s*\x60(.*?)\x60;', c, re.DOTALL)
print(len(m.group(1)))
"
# 기대값: 11078
```

## 주의

- 복구 후 빌드 확인 필수: `npm run build`
- Railway 재배포 전 피치·마스터 승인 필수
- 우프1(8e52cbca) 파일은 별도 경로에 보존됨 — 혼동 금지
