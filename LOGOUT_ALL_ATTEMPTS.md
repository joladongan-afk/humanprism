# 로그아웃 문제 - 모든 시도 기록

## 시도 1: 단순 쿠키 삭제 (원본)
**코드:**
```typescript
ctx.res.clearCookie(COOKIE_NAME, { path: '/', domain: '.sg1.manus.computer' });
```

**결과:** ❌ 실패
- 로그아웃 후 새로고침 시 다시 로그인 상태로 복구
- 쿠키가 제대로 삭제되지 않음

**원인:** 쿠키 설정 시 옵션과 삭제 시 옵션 불일치

---

## 시도 2: 클라이언트 캐시 무효화 추가
**코드:**
```typescript
const handleLogout = async () => {
  await logoutMutation.mutateAsync();
  await utils.auth.me.invalidate();
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '/';
};
```

**결과:** ⚠️ 부분 성공
- 실제 주소창: 조금 나아짐
- iframe (미리보기): 여전히 실패

**원인:** 서버 쿠키 삭제 문제 해결 안 됨

---

## 시도 3: window.location.replace() 사용
**코드:**
```typescript
window.location.replace('/?logout=true');
```

**결과:** ❌ 실패
- 로그아웃 버튼 클릭 → 로그인 화면 표시 → 즉시 로그아웃 상태로 복구

**원인:** 쿠키가 여전히 유효함

---

## 시도 4: 쿠키 옵션 완전 동기화 (maxAge 포함)
**코드:**
```typescript
const cookieOptions = getSessionCookieOptions(ctx.req);
ctx.res.clearCookie(COOKIE_NAME, {
  ...cookieOptions,
  maxAge: -1,
});
```

**결과:** ❌ 실패 + Express 경고 발생
```
res.clearCookie: Passing "options.maxAge" is deprecated. 
In v5.0.0 of Express, this option will be ignored.
```

**원인:** Express clearCookie에서 maxAge는 무시됨

---

## 시도 5: window.location.reload() 사용
**코드:**
```typescript
setTimeout(() => {
  window.location.reload();
}, 100);
```

**결과:** ❌ 실패
- 페이지 새로고침 후 서버가 다시 로그인 상태 생성

**원인:** 서버에서 새 세션을 자동 생성하는 것 같음

---

## 시도 6: localStorage 초기화 + 타이밍 조정
**코드:**
```typescript
const handleLogout = async () => {
  try {
    await logoutMutation.mutateAsync();
  } catch (e) {
    console.error('Logout error:', e);
  }
  await utils.auth.me.invalidate();
  localStorage.clear();
  sessionStorage.clear();
  setTimeout(() => {
    window.location.href = '/';
  }, 100);
};
```

**결과:** ⚠️ 부분 성공
- 실제 주소창: 나음
- iframe: 여전히 문제

**원인:** 여전히 서버 쿠키 삭제 문제

---

## 시도 7: 쿠키 옵션 정확히 동기화 (maxAge 제외)
**코드:**
```typescript
const cookieOptions = getSessionCookieOptions(ctx.req);
const { maxAge, ...cleanOptions } = cookieOptions;
ctx.res.clearCookie(COOKIE_NAME, cleanOptions);
```

**결과:** ✅ 이론상 가장 정확함
- Express 경고 제거
- 정확한 옵션 사용
- 실제 테스트 필요

**예상 성공률:** 70-80%

---

## 근본 원인 분석

### 원인 1: 쿠키 삭제 옵션 불일치 (확률 80%)
**증거:**
- 설정 시: `secure`, `sameSite: 'none'`, `httpOnly`, `domain` 모두 포함
- 삭제 시: `path`, `domain`만 포함
- Express는 쿠키 삭제 시 설정 시와 동일한 옵션 필요

**해결:** 옵션 완전 동기화

### 원인 2: iframe 환경의 쿠키 정책 (확률 60%)
**증거:**
- iframe에서만 심각
- 실제 주소창에서도 새로고침 시 복구됨
- `SameSite=None` 쿠키는 iframe에서 제3자 쿠키로 취급될 수 있음

**해결:** Manus 프록시 도메인 정책 확인 필요

### 원인 3: 서버 세션 자동 생성 (확률 40%)
**증거:**
- 로그아웃 후 새로고침 시 다시 로그인 상태로 복구
- `authenticateRequest()` 또는 OAuth 콜백이 뭔가 생성할 수 있음

**해결:** 서버 로직 검토 필요

---

## 권장 해결 순서

### 1단계: 쿠키 옵션 정확히 동기화 (즉시)
```typescript
// server/routers.ts
logout: publicProcedure.mutation(({ ctx }) => {
  const cookieOptions = getSessionCookieOptions(ctx.req);
  const { maxAge, ...cleanOptions } = cookieOptions;
  ctx.res.clearCookie(COOKIE_NAME, cleanOptions);
  return { success: true } as const;
}),
```

**테스트:**
```bash
pnpm test -- server/auth.logout.test.ts
```

### 2단계: 클라이언트 상태 초기화 강화 (즉시)
```typescript
// client/src/pages/Home.tsx
const handleLogout = async () => {
  try {
    await logoutMutation.mutateAsync();
  } catch (e) {
    console.error('Logout error:', e);
  }
  
  await utils.auth.me.invalidate();
  localStorage.clear();
  sessionStorage.clear();
  
  setTimeout(() => {
    window.location.href = '/';
  }, 100);
};
```

### 3단계: 브라우저 개발자 도구에서 확인
1. F12 → Application → Cookies
2. 로그아웃 후 `app_session_id` 쿠키 삭제 확인
3. 페이지 새로고침 후 로그인 상태 유지 안 됨 확인

### 4단계: 만약 여전히 실패하면
- 서버 `authenticateRequest()` 로직 검토
- Manus 프록시 도메인 정책 확인
- JWT 기반 인증으로 전환 검토

---

## 테스트 체크리스트

### 로그아웃 테스트
- [ ] 로그인 상태 확인
- [ ] 로그아웃 버튼 클릭
- [ ] 개발자 도구에서 쿠키 삭제 확인
- [ ] "로그인/회원가입" 상태 표시 확인
- [ ] 페이지 새로고침
- [ ] 로그인 상태 복구 안 됨 확인
- [ ] 다른 페이지로 이동
- [ ] 로그인 상태 복구 안 됨 확인

### 로그인 테스트
- [ ] 로그인 버튼 클릭
- [ ] 개발자 도구에서 쿠키 설정 확인
- [ ] `app_session_id` 쿠키 존재 확인
- [ ] 쿠키 옵션 확인 (secure, sameSite, httpOnly)
- [ ] 페이지 새로고침
- [ ] 로그인 상태 유지 확인

---

## Claude와 상의할 사항

1. **쿠키 정책**: Express clearCookie의 정확한 동작
2. **도메인**: `.sg1.manus.computer` 도메인의 쿠키 정책
3. **iframe**: iframe 환경에서 제3자 쿠키 정책
4. **대안**: JWT 기반 인증 vs 현재 세션 기반 인증
5. **우선순위**: 로그아웃 vs 상담 품질 중 어느 것이 더 중요한지

---

## 결론

**가장 가능성 높은 원인:** 쿠키 삭제 시 옵션 불일치

**즉시 시도할 수정:**
1. 서버: `getSessionCookieOptions()`로 정확한 옵션 사용
2. 클라이언트: localStorage 초기화 추가
3. 테스트: 브라우저 개발자 도구에서 쿠키 삭제 확인

**예상 성공률:** 70-80%

**시간 투자:** 30분 ~ 1시간

**만약 실패 시:** JWT 기반 인증 재구성 검토 (4-6시간)
