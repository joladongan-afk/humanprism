# 로그아웃 지속성 문제 - 완전 분석 보고서

## 문제 정의

**증상:**
- 로그아웃 버튼 클릭 후 "로그인/회원가입" 상태로 변경됨
- 하지만 페이지 새로고침 시 다시 로그인 상태로 복구됨
- 미리보기 창(iframe)에서는 더 심함: 로그아웃 클릭 직후 다시 "로그아웃" 상태로 즉시 복구

**영향 범위:**
- 모든 페이지 (홈, 상담 안내, 상담 등)
- 미리보기 창과 실제 주소창 모두 영향

---

## 기술 분석

### 1. 현재 로그아웃 구현

**서버 (server/routers.ts, 라인 62-67):**
```typescript
logout: publicProcedure.mutation(({ ctx }) => {
  ctx.res.clearCookie(COOKIE_NAME, { path: '/', domain: '.sg1.manus.computer' });
  return { success: true } as const;
}),
```

**클라이언트 (client/src/pages/Home.tsx, 라인 270-282):**
```typescript
const handleLogout = async () => {
  try {
    await logoutMutation.mutateAsync();
  } catch (e) {
    console.error('Logout error:', e);
  }
  // 캐시 무효화 및 localStorage 초기화
  await utils.auth.me.invalidate();
  localStorage.clear();
  sessionStorage.clear();
  // 로그아웃 후 홈으로 이동 (새 세션 강제)
  window.location.href = '/';
};
```

### 2. 문제 원인 분석

#### 원인 1: 쿠키 삭제 옵션 불일치
**설정 시 (server/_core/oauth.ts, 라인 70-71):**
```typescript
const cookieOptions = getSessionCookieOptions(req);
res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
```

**삭제 시 (현재 구현):**
```typescript
ctx.res.clearCookie(COOKIE_NAME, { path: '/', domain: '.sg1.manus.computer' });
```

**문제:** 
- 설정할 때: `secure`, `sameSite: 'none'`, `httpOnly`, `domain` 모두 포함
- 삭제할 때: `path`와 `domain`만 포함
- Express는 쿠키 삭제 시 설정 시와 **동일한 옵션**을 사용해야 쿠키가 삭제됨

#### 원인 2: iframe 환경의 쿠키 정책
- 미리보기 창은 iframe 환경
- `SameSite=None` + `Secure` 쿠키는 iframe에서 제3자 쿠키로 취급될 수 있음
- Manus 프록시 환경의 도메인 정책이 복잡함

#### 원인 3: 서버 세션 자동 생성 가능성
- 로그아웃 후 페이지 새로고침 시 서버가 새 세션을 생성할 수 있음
- `authenticateRequest()` 로직이 쿠키 없을 때도 뭔가 생성하는지 확인 필요

---

## 시도한 해결 방법들

### 시도 1: 쿠키 옵션 완전 동기화 (실패)
```typescript
// 시도한 코드
logout: publicProcedure.mutation(({ ctx }) => {
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(COOKIE_NAME, {
    ...cookieOptions,
    maxAge: -1, // 즉시 삭제
  });
  return { success: true } as const;
}),
```

**결과:** Express 경고 발생
```
res.clearCookie: Passing "options.maxAge" is deprecated. 
In v5.0.0 of Express, this option will be ignored.
```

**교훈:** `maxAge`는 clearCookie에서 무시됨

### 시도 2: localStorage + sessionStorage 초기화 (부분 성공)
```typescript
await utils.auth.me.invalidate();
localStorage.clear();
sessionStorage.clear();
window.location.href = '/';
```

**결과:** 
- 실제 주소창에서는 더 잘 작동
- iframe에서는 여전히 쿠키 정책 문제

### 시도 3: window.location.reload() 사용 (실패)
```typescript
window.location.reload();
```

**결과:** 페이지 새로고침 후 서버에서 다시 로그인 상태 복구

---

## 근본 원인 가설

### 가설 A: 쿠키 삭제 실패 (가능성 높음)
- Express clearCookie가 정확한 옵션 없이 쿠키를 삭제하지 못함
- 브라우저가 쿠키를 계속 보유

**증거:**
- 실제 주소창에서는 나음 (도메인 정책 덜 복잡)
- iframe에서는 심함 (제3자 쿠키 정책)

### 가설 B: Manus 프록시의 도메인 정책
- `.sg1.manus.computer` 도메인의 쿠키 정책이 특수함
- iframe과 메인 창 간의 쿠키 공유 정책 차이

**증거:**
- iframe에서만 심각
- 실제 주소창에서도 새로고침 시 복구됨

### 가설 C: 서버 세션 자동 생성
- `authenticateRequest()` 또는 OAuth 콜백이 자동으로 새 세션 생성
- 쿠키 없는 요청에 대해서도 뭔가 하는지 확인 필요

---

## 권장 해결 방법 (우선순위)

### 방법 1: 쿠키 삭제 옵션 정확히 동기화 (최우선)
```typescript
logout: publicProcedure.mutation(({ ctx }) => {
  const cookieOptions = getSessionCookieOptions(ctx.req);
  // maxAge 제외하고 다른 모든 옵션 사용
  const { maxAge, ...cleanOptions } = cookieOptions;
  ctx.res.clearCookie(COOKIE_NAME, cleanOptions);
  return { success: true } as const;
}),
```

**장점:**
- Express 경고 제거
- 정확한 쿠키 삭제
- 간단한 수정

**테스트 방법:**
```bash
# 브라우저 개발자 도구 → Application → Cookies
# 로그아웃 후 app_session_id 쿠키가 실제로 삭제되는지 확인
```

### 방법 2: 클라이언트 강제 로그아웃 상태 유지
```typescript
const handleLogout = async () => {
  try {
    await logoutMutation.mutateAsync();
  } catch (e) {
    console.error('Logout error:', e);
  }
  
  // 클라이언트 상태 강제 초기화
  await utils.auth.me.invalidate();
  localStorage.removeItem('manus-runtime-user-info');
  sessionStorage.clear();
  
  // 쿠키 삭제 확인 후 이동
  setTimeout(() => {
    window.location.href = '/';
  }, 200);
};
```

**장점:**
- 클라이언트 상태 명확히 초기화
- 타이밍 이슈 해결

### 방법 3: 전용 로그인 페이지로 리다이렉트
```typescript
// 로그아웃 후 /login 페이지로 이동
// /login 페이지는 항상 로그인 상태 없음을 보장
window.location.href = '/login?from=logout';
```

**장점:**
- 명확한 상태 전환
- 사용자 경험 개선

### 방법 4: 서버 세션 검증 로직 확인
```typescript
// server/_core/sdk.ts의 authenticateRequest() 검토
// 쿠키 없을 때 새 세션을 생성하는지 확인
```

---

## 테스트 체크리스트

### 로그아웃 후 확인 사항
- [ ] 브라우저 개발자 도구 → Application → Cookies에서 `app_session_id` 삭제 확인
- [ ] 페이지 새로고침 후 로그인 상태 유지 안 됨 확인
- [ ] 다른 페이지로 이동 후 로그인 상태 유지 안 됨 확인
- [ ] 미리보기 창과 실제 주소창 모두 테스트
- [ ] 개발자 도구 → Network에서 `/api/trpc/auth.me` 요청 확인

### 로그인 후 확인 사항
- [ ] 쿠키가 정확히 설정되는지 확인 (domain, secure, sameSite 등)
- [ ] 쿠키 만료 시간 확인 (1년)
- [ ] 페이지 새로고침 후 로그인 상태 유지 확인

---

## 코드 스니펫 (복사 가능)

### 서버 수정 (권장)
```typescript
// server/routers.ts
logout: publicProcedure.mutation(({ ctx }) => {
  const cookieOptions = getSessionCookieOptions(ctx.req);
  const { maxAge, ...cleanOptions } = cookieOptions;
  ctx.res.clearCookie(COOKIE_NAME, cleanOptions);
  return { success: true } as const;
}),
```

### 클라이언트 수정 (권장)
```typescript
// client/src/pages/Home.tsx
const handleLogout = async () => {
  try {
    await logoutMutation.mutateAsync();
  } catch (e) {
    console.error('Logout error:', e);
  }
  
  // 클라이언트 상태 초기화
  await utils.auth.me.invalidate();
  localStorage.clear();
  sessionStorage.clear();
  
  // 홈으로 이동 (새 요청으로 쿠키 삭제 확인)
  setTimeout(() => {
    window.location.href = '/';
  }, 100);
};
```

### 테스트 코드 (권장)
```typescript
// server/auth.logout.test.ts
describe("auth.logout", () => {
  it("clears the session cookie with correct options", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
    // maxAge는 Express 5.0에서 무시되므로 확인하지 않음
  });
});
```

---

## Claude와의 상의 사항

1. **쿠키 정책**: Manus 프록시 환경에서 `SameSite=None` 쿠키의 동작
2. **iframe 쿠키**: iframe 환경에서 제3자 쿠키 정책 확인
3. **Express clearCookie**: 정확한 옵션 동기화 필요성
4. **대안**: JWT 기반 인증으로 전환 시 이점/단점
5. **우선순위**: 로그아웃 vs 상담 품질 개선 중 어느 것이 먼저인지

---

## 결론

**가장 가능성 높은 원인:** 쿠키 삭제 시 옵션 불일치

**즉시 시도할 수정:**
1. 서버: `getSessionCookieOptions()`로 정확한 옵션 사용
2. 클라이언트: localStorage 초기화 추가
3. 테스트: 브라우저 개발자 도구에서 쿠키 삭제 확인

**예상 성공률:** 70-80%

**만약 실패 시:** JWT 기반 인증 재구성 검토
