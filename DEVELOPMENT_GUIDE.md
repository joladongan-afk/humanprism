# 휴먼프리즘 - 개발 가이드

---

## 1. 개발 환경 설정

### 1.1 프로젝트 시작

```bash
cd /home/ubuntu/human-prism
pnpm install
pnpm dev
```

개발 서버: https://3000-iox6v4txs7g17v8p7fvqt-a0702d08.sg1.manus.computer

### 1.2 필수 도구

- Node.js 22.13.0
- pnpm (패키지 매니저)
- Git
- VSCode (권장)

---

## 2. 프로젝트 구조 및 역할

### 2.1 프론트엔드 (client/)

```
client/
├── src/
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── Home.tsx        # 홈페이지
│   │   ├── SajuNew.tsx     # 사주 입력
│   │   ├── MyRoom.tsx      # 마이룸 (상담 기록)
│   │   ├── Plans.tsx       # 플랜 선택
│   │   └── ...
│   ├── components/         # 재사용 컴포넌트
│   │   ├── DashboardLayout.tsx
│   │   ├── AIChatBox.tsx
│   │   ├── Map.tsx
│   │   └── ui/            # shadcn/ui 컴포넌트
│   ├── lib/
│   │   ├── trpc.ts        # tRPC 클라이언트
│   │   └── utils.ts
│   ├── App.tsx            # 라우팅
│   ├── main.tsx           # 진입점
│   └── index.css          # 글로벌 스타일
└── public/                # 정적 파일 (favicon, robots.txt만)
```

**작업 흐름:**
1. 페이지 컴포넌트 수정 (pages/)
2. 필요시 재사용 컴포넌트 추가 (components/)
3. tRPC 훅으로 백엔드 호출
4. 스타일은 Tailwind + shadcn/ui 사용

### 2.2 백엔드 (server/)

```
server/
├── routers.ts             # tRPC 라우터 (모든 API 정의)
├── db.ts                  # 데이터베이스 헬퍼
├── claude-api.ts          # Claude API 헬퍼
├── claude-api-rag.ts      # Claude + RAG 통합
├── rag-search.ts          # RAG 검색 엔진
├── rag-db.json            # RAG 벡터 DB
├── masterPrompt.ts        # 마스터 시스템 프롬프트
├── _core/                 # 프레임워크 핵심 (수정 금지)
│   ├── index.ts           # 서버 진입점
│   ├── context.ts         # tRPC 컨텍스트
│   ├── trpc.ts            # tRPC 설정
│   ├── oauth.ts           # OAuth 처리
│   ├── llm.ts             # LLM 헬퍼
│   ├── notification.ts    # 알림 헬퍼
│   ├── env.ts             # 환경변수
│   └── ...
└── *.test.ts              # 테스트 파일
```

**작업 흐름:**
1. 데이터 구조 정의 (drizzle/schema.ts)
2. 마이그레이션 생성 (pnpm drizzle-kit generate)
3. SQL 실행 (webdev_execute_sql)
4. 데이터베이스 헬퍼 추가 (server/db.ts)
5. tRPC 라우터 추가 (server/routers.ts)
6. 프론트엔드에서 호출

### 2.3 데이터베이스 (drizzle/)

```
drizzle/
├── schema.ts              # 테이블 정의 (TypeScript)
├── migrations/            # SQL 마이그레이션 파일
└── relations.ts           # 테이블 관계
```

**작업 흐름:**
1. schema.ts에서 테이블 정의
2. `pnpm drizzle-kit generate` 실행
3. 생성된 .sql 파일 검토
4. `webdev_execute_sql`로 실행
5. TypeScript 타입 자동 생성

---

## 3. 개발 워크플로우

### 3.1 새 기능 추가

**Step 1: 요구사항 정리**
```bash
# todo.md에 추가
- [ ] 새 기능 설명
```

**Step 2: 데이터 구조 설계**
```typescript
// drizzle/schema.ts
export const newTable = sqliteTable('new_table', {
  id: integer('id').primaryKey(),
  // ...
});
```

**Step 3: 마이그레이션**
```bash
pnpm drizzle-kit generate
# 생성된 SQL 파일 검토
webdev_execute_sql "SELECT * FROM new_table;"
```

**Step 4: 백엔드 구현**
```typescript
// server/db.ts - 헬퍼 함수
export async function getNewData() {
  return db.query.newTable.findMany();
}

// server/routers.ts - tRPC 라우터
feature: publicProcedure.query(async () => {
  return await db.getNewData();
})
```

**Step 5: 프론트엔드 구현**
```typescript
// client/src/pages/Feature.tsx
const { data } = trpc.feature.useQuery();
```

**Step 6: 테스트**
```bash
pnpm test
# 또는 특정 테스트만
pnpm test server/feature.test.ts
```

**Step 7: 체크포인트**
```bash
# todo.md 업데이트
- [x] 새 기능 설명

# 체크포인트 저장
webdev_save_checkpoint "새 기능 추가"
```

### 3.2 버그 수정

1. 버그 설명을 todo.md에 추가
2. 원인 파악 (테스트, 로그 확인)
3. 코드 수정
4. 테스트 실행
5. todo.md에서 [x] 표시
6. 체크포인트 저장

### 3.3 테스트 작성

```typescript
// server/feature.test.ts
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something", () => {
    const result = someFunction();
    expect(result).toBe(expected);
  });
});
```

**테스트 실행:**
```bash
pnpm test                    # 전체 테스트
pnpm test feature.test.ts    # 특정 파일
pnpm test --watch           # 감시 모드
```

---

## 4. tRPC 사용법

### 4.1 백엔드에서 라우터 정의

```typescript
// server/routers.ts
export const appRouter = router({
  feature: router({
    // 공개 쿼리
    getList: publicProcedure
      .query(async () => {
        return await db.getList();
      }),

    // 보호된 쿼리 (로그인 필요)
    getMyData: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getMyData(ctx.user.id);
      }),

    // 입력 검증
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.create(ctx.user.id, input.name);
      }),
  }),
});
```

### 4.2 프론트엔드에서 호출

```typescript
// client/src/pages/Feature.tsx
import { trpc } from "@/lib/trpc";

export function Feature() {
  // 쿼리 (GET)
  const { data, isLoading } = trpc.feature.getList.useQuery();

  // 뮤테이션 (POST/PUT/DELETE)
  const createMutation = trpc.feature.create.useMutation({
    onSuccess: () => {
      // 성공 후 처리
      trpc.useUtils().feature.getList.invalidate();
    },
  });

  return (
    <div>
      {isLoading ? <Spinner /> : data?.map(item => <div>{item}</div>)}
      <button onClick={() => createMutation.mutate({ name: "New" })}>
        Create
      </button>
    </div>
  );
}
```

---

## 5. 데이터베이스 작업

### 5.1 스키마 수정

```typescript
// drizzle/schema.ts
export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});
```

### 5.2 마이그레이션 생성

```bash
pnpm drizzle-kit generate
# 생성된 파일: drizzle/migrations/0001_*.sql
```

### 5.3 SQL 실행

```bash
# Manus UI 또는 CLI 사용
webdev_execute_sql "SELECT * FROM users;"
```

### 5.4 데이터베이스 쿼리

```typescript
// server/db.ts
import { db } from "./db";

export async function getUser(id: number) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function createUser(name: string, email: string) {
  return db.insert(users).values({ name, email }).returning();
}
```

---

## 6. 스타일링

### 6.1 Tailwind CSS

```jsx
<div className="flex gap-4 p-6 bg-background text-foreground">
  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
    Click me
  </button>
</div>
```

### 6.2 shadcn/ui 컴포넌트

```jsx
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function MyComponent() {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  );
}
```

### 6.3 글로벌 스타일

```css
/* client/src/index.css */
@layer base {
  :root {
    --primary: 220 90% 56%;
    --primary-foreground: 210 40% 98%;
    /* ... */
  }
}
```

---

## 7. 환경변수 관리

### 7.1 환경변수 추가

```bash
# Manus UI 또는 CLI 사용
webdev_request_secrets \
  --key "NEW_API_KEY" \
  --description "설명" \
  --value "값"
```

### 7.2 코드에서 사용

```typescript
// server/_core/env.ts에서 확인 가능한 변수만 사용
import { ENV } from "./_core/env";

console.log(ENV.CLAUDE_API_KEY);
```

---

## 8. 배포 전 체크리스트

### 배포 전
- [ ] 모든 테스트 통과 (pnpm test)
- [ ] 빌드 성공 (pnpm build)
- [ ] todo.md 모든 항목 완료
- [ ] 체크포인트 저장
- [ ] 환경변수 확인

### 배포
- [ ] Manus UI에서 Publish 버튼 클릭
- [ ] 배포 완료 대기
- [ ] 라이브 환경 테스트

### 배포 후
- [ ] 로그 확인
- [ ] 실제 기능 테스트
- [ ] 사용자 피드백 수집

---

## 9. 문제 해결

### 빌드 오류

```bash
# 캐시 삭제
rm -rf node_modules .pnpm-store
pnpm install

# 다시 빌드
pnpm build
```

### 테스트 실패

```bash
# 특정 테스트 실행
pnpm test --reporter=verbose feature.test.ts

# 디버그 모드
pnpm test --inspect-brk
```

### 개발 서버 오류

```bash
# 서버 재시작
webdev_restart_server

# 또는 수동 재시작
pnpm dev
```

### 데이터베이스 오류

```bash
# 마이그레이션 상태 확인
pnpm drizzle-kit status

# 마이그레이션 실행
webdev_execute_sql "SELECT 1;"
```

---

## 10. 성능 최적화

### 10.1 쿼리 최적화

```typescript
// ❌ 나쁜 예: N+1 쿼리
const users = await db.query.users.findMany();
for (const user of users) {
  const posts = await db.query.posts.findMany({
    where: eq(posts.userId, user.id),
  });
}

// ✓ 좋은 예: JOIN 사용
const users = await db.query.users.findMany({
  with: { posts: true },
});
```

### 10.2 캐싱

```typescript
// tRPC 클라이언트에서 자동 캐싱
const { data } = trpc.feature.getList.useQuery();

// 수동 무효화
trpc.useUtils().feature.getList.invalidate();
```

### 10.3 번들 크기

```bash
# 번들 분석
pnpm build --analyze

# 불필요한 의존성 제거
pnpm prune
```

---

## 11. 참고 자료

- [tRPC 문서](https://trpc.io)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [React 문서](https://react.dev)

---

**마지막 업데이트:** 2026-06-05
