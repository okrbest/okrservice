# RPA API 에러 코드 표준화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `POST /api/rpa/messages` 핸들러의 에러 응답 포맷을 `{ ok, error }` 에서 `{ code, message }` 로 변경하여 `validateRpaClient` 미들웨어와 일관성을 맞춘다.

**Architecture:** `index.ts` 한 파일의 두 줄만 변경. 신규 파일 없음. 성공 응답 `{ ok: true }` 는 변경하지 않음.

**Tech Stack:** TypeScript, Express

---

## 파일 목록

| 파일 | 상태 | 변경 내용 |
|------|------|-----------|
| `packages/core/src/index.ts` | 수정 | 에러 응답 2곳 포맷 변경 |

---

## Task 1: 핸들러 에러 응답 포맷 변경

**Files:**
- Modify: `packages/core/src/index.ts`

### 배경 지식

현재 `POST /api/rpa/messages` 핸들러 (`index.ts` ~line 706):

```typescript
app.post('/api/rpa/messages', validateRpaClient, async (req, res) => {
  try {
    // ...
    if (!loginId) {
      return res.status(400).json({ ok: false, error: 'loginId is required' }); // ← 변경 대상 1
    }
    // ...
  } catch (e) {
    console.error('[RPA] Error processing RPA message:', e);
    return res.status(200).json({ ok: false }); // ← 변경 대상 2
  }
});
```

`validateRpaClient` 미들웨어는 이미 `{ code, message }` 포맷을 사용하고 있다. 핸들러도 같은 포맷으로 맞춘다.

---

- [ ] **Step 1: loginId 누락 에러 응답 변경**

`packages/core/src/index.ts`에서 아래 줄을 찾아 변경:

변경 전:
```typescript
return res.status(400).json({ ok: false, error: 'loginId is required' });
```

변경 후:
```typescript
return res.status(400).json({ code: 'INVALID_REQUEST', message: 'loginId is required' });
```

- [ ] **Step 2: catch 블록 에러 응답 변경**

같은 파일에서 catch 블록 마지막 줄 변경:

변경 전:
```typescript
return res.status(200).json({ ok: false });
```

변경 후:
```typescript
return res.status(200).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
```

HTTP 상태 코드 `200` 은 그대로 유지 — 5240이 2xx 외 응답 시 재시도할 수 있으므로.

- [ ] **Step 3: TypeScript 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice/packages/core
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```bash
git add packages/core/src/index.ts
git commit -m "feat(rpa): 에러 응답 포맷 표준화 - { code, message } 형식으로 통일"
```
