# 로그아웃 문제 - 빠른 해결 가이드

## 문제 한 줄 요약
로그아웃 후 페이지 새로고침 시 다시 로그인 상태로 복구됨

## 원인
쿠키 설정 시와 삭제 시 옵션이 다름

## 즉시 적용 가능한 수정

### 수정 1: 서버 (server/routers.ts)

**현재 코드 (라인 62-67):**
```typescript
logout: publicProcedure.mutation(({ ctx }) => {
  ctx.res.clearCookie(COOKIE_NAME, { path: '/', domain: '.sg1.manus.computer' });
  return { success: true } as const;
}),
```

**수정된 코드:**
```typescript
logout: publicProcedure.mutation(({ ctx }) => {
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
  return { success: true } as const;
}),
```

### 수정 2: 클라이언트 (client/src/pages/Home.tsx)

**현재 코드 (라인 270-282):**
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

**수정된 코드:**
```typescript
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
  
  // 쿠키 삭제 후 홈으로 이동
  setTimeout(() => {
    window.location.href = '/';
  }, 100);
};
```

### 수정 3: 테스트 (server/auth.logout.test.ts)

**현재 코드 (라인 54-60):**
```typescript
expect(clearedCookies[0]?.options).toMatchObject({
  maxAge: -1,
  secure: true,
  sameSite: "none",
  httpOnly: true,
  path: "/",
});
```

**수정된 코드:**
```typescript
expect(clearedCookies[0]?.options).toMatchObject({
  secure: true,
  sameSite: "none",
  httpOnly: true,
  path: "/",
});
```

## 적용 순서
1. 서버 수정
2. 클라이언트 수정
3. 테스트 수정
4. 테스트 실행: `pnpm test`
5. 브라우저에서 확인

## 확인 방법
1. 로그인
2. 로그아웃 클릭
3. 브라우저 개발자 도구 (F12) → Application → Cookies
4. `app_session_id` 쿠키가 **삭제**되었는지 확인
5. 페이지 새로고침 → 로그인 상태 유지 안 됨 확인

## 예상 결과
- ✅ 로그아웃 후 "로그인/회원가입" 상태 유지
- ✅ 페이지 새로고침 후에도 로그인 상태 복구 안 됨
- ✅ 다른 페이지로 이동해도 로그인 상태 복구 안 됨

## 만약 여전히 안 되면
1. 브라우저 캐시 완전 삭제 (Ctrl+Shift+Delete)
2. 시크릿 모드에서 테스트
3. 다른 브라우저에서 테스트
4. 서버 재시작: `pnpm dev`
