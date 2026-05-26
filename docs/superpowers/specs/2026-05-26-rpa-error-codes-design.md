# RPA API 에러 코드 표준화 설계

**날짜:** 2026-05-26
**범위:** `POST /api/rpa/messages` 핸들러 — 에러 응답 포맷을 `{ code, message }` 로 통일

---

## 1. 목표

`validateRpaClient` 미들웨어가 이미 `{ code, message }` 포맷을 사용하는데, 핸들러 내부 에러 응답은 `{ ok, error }` 포맷을 사용해 일관성이 없다. 핸들러의 두 에러 응답을 미들웨어와 같은 포맷으로 맞춘다.

---

## 2. 변경 사항

**파일:** `packages/core/src/index.ts`

### 변경 1: loginId 누락 에러

```typescript
// 변경 전
return res.status(400).json({ ok: false, error: 'loginId is required' });

// 변경 후
return res.status(400).json({ code: 'INVALID_REQUEST', message: 'loginId is required' });
```

### 변경 2: catch 블록 내부 오류

```typescript
// 변경 전
return res.status(200).json({ ok: false });

// 변경 후
return res.status(200).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
```

HTTP 상태 코드는 그대로 유지 (400, 200) — 5240 재시도 루프 방지를 위해 catch는 200 유지.

---

## 3. 변경하지 않는 것

- 성공 응답 `res.status(200).json({ ok: true })` 3군데 — 변경 없음
- `validateRpaClient` 미들웨어 에러 응답 — 이미 표준화됨, 변경 없음
- `console.warn`/`console.error` 로그 — 변경 없음

---

## 4. 최종 에러 응답 포맷 일람

| 상황 | HTTP | body |
|------|------|------|
| clientId/secret 누락 | 401 | `{ code: 'UNAUTHORIZED', message: 'Missing credentials' }` |
| 인증 실패 | 401 | `{ code: 'UNAUTHORIZED', message: 'Invalid credentials' }` |
| IP 차단 | 403 | `{ code: 'FORBIDDEN', message: 'IP not allowed' }` |
| loginId 누락 | 400 | `{ code: 'INVALID_REQUEST', message: 'loginId is required' }` |
| 내부 서버 오류 | 200 | `{ code: 'INTERNAL_ERROR', message: 'Internal server error' }` |
| 성공 | 200 | `{ ok: true }` |
