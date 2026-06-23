#!/usr/bin/env python3
"""
RAG-DB / e4-chunks에서 실명·아호·사승·출처 표현을 중립화한다.
- 명리 이론/용어(이수, 무자, 근묘화실 등)는 보존한다.
- 검색 품질을 위해 '관법/화법' 같은 일반어는 남기되, 사람 이름만 제거한다.
재실행 가능(idempotent)하도록 설계.
"""
import re, sys, json

TARGETS = ["server/rag-db.json", "server/rag-e4-chunks.json"]

# 순서 중요: 더 긴 패턴 먼저 치환
REPLACEMENTS = [
    # 본명 괄호 병기
    (r"도원\s*\(\s*권도원\s*\)", "전통 명리"),
    # 실명/아호 + 직함/사승
    (r"권도원\s*선생", "한 명리 마스터"),
    (r"박청화\s*선생", "한 명리 마스터"),
    (r"도원\s*선생", "한 명리 마스터"),
    (r"도림\s*사부", "한 명리 마스터"),
    # 디자인 사례 본명
    (r"박용후", "한 전문가"),
    # 아호 단독 + 관법/화법
    (r"도림\s*관법", "전승 관법"),
    (r"도림\s*화법", "상담 화법"),
    (r"선생\s*관법", "전승 관법"),
    # 아호 단독(한자 병기 포함)
    (r"도림\s*\(\s*[渡道]林\s*\)", "전통 명리"),
    (r"[渡道]林", "전통 명리"),
    (r"도림", "전통 명리"),
    (r"도원", "전통 명리"),
    (r"권도원", "한 명리 마스터"),
    (r"박청화", "한 명리 마스터"),
    # 출처 표현
    (r"공개강의\s*녹취", "공개 자료"),
    (r"강의록", "전승 자료"),
    (r"공개강의", "공개 자료"),
    (r"녹취", "자료"),
]

def scrub(text: str) -> str:
    for pat, rep in REPLACEMENTS:
        text = re.sub(pat, rep, text)
    return text

def main(check_only=False):
    forbidden = ["도림", "도원", "권도원", "박청화", "박용후", "渡林", "道林", "강의록", "공개강의", "녹취"]
    any_dirty = False
    for fn in TARGETS:
        raw = open(fn, encoding="utf-8").read()
        # JSON 유효성 보존: 문자열 값만 안전하게 다루기 위해 전체 텍스트 치환 후 재파싱 검증
        cleaned = scrub(raw)
        # 검증: JSON 파싱 가능해야 함
        json.loads(cleaned)
        if not check_only and cleaned != raw:
            open(fn, "w", encoding="utf-8").write(cleaned)
        # 잔존 검사
        remain = [w for w in forbidden if w in cleaned]
        # '전통 명리' 치환으로 '명리'는 정상. forbidden만 본다.
        print(f"[{fn}] changed={cleaned!=raw} remaining_forbidden={remain}")
        if remain:
            any_dirty = True
    sys.exit(1 if any_dirty else 0)

if __name__ == "__main__":
    main(check_only="--check" in sys.argv)
