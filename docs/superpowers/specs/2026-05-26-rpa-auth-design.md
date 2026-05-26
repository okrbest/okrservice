# RPA API 인증 설계

**날짜:** 2026-05-26
**범위:** `POST /api/rpa/messages` — clientId + secret 미들웨어 인증

---

## 1. 목표

5240 서버가 RPA 메시지를 전송할 때 `clientId` + `secret`을 body에 포함하여 전송한다.
서비스데스크 서버는 이 쌍이 유효한지 검증한 후에만 메시지를 처리한다.

---

## 2. 인증 방식 (PDF 스펙 확정)

- **헤더 인증 없음.** body 파라미터 `clientId` + `secret`으로 검증.
- `Content-Type: application/x-www-form-urlencoded` (5240이 form-urlencoded로 전송)
- 평문 전송이므로 반드시 HTTPS 환경에서만 운영.
- `whiteListedIps`가 설정된 클라이언트는 추가로 요청 IP도 검증.

기존 `Clients` 컬렉션 재사용:
- `clientId`: 랜덤 hex 32자 (unique)
- `clientSecret`: bcrypt 해시 저장 (평문 절대 저장 안 함)
- `whiteListedIps`: IP 허용 목록 (빈 배열이면 IP 검사 생략)

---

## 3. 파일 구조

| 파일 | 상태 | 역할 |
|------|------|------|
| `packages/core/src/middlewares/validateRpaClient.ts` | 신규 | Express 미들웨어 — clientId/secret/IP 검증 |
| `packages/core/src/__tests__/middlewares/validateRpaClient.test.ts` | 신규 | 단위 테스트 |
| `packages/core/src/index.ts` | 수정 | 미들웨어를 RPA 엔드포인트에 연결 |

---

## 4. 미들웨어 인터페이스

```typescript
// packages/core/src/middlewares/validateRpaClient.ts

import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcryptjs';
import { getSubdomain } from '@erxes/api-utils/src/core';
import { generateModels } from '../connectionResolver';

export async function validateRpaClient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { clientId, secret } = req.body as Record<string, string>;

  if (!clientId || !secret) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing credentials' });
    return;
  }

  const subdomain = getSubdomain(req);
  const models = await generateModels(subdomain);
  const client = await models.Clients.findOne({ clientId }).lean();

  // clientId 없음과 secret 불일치를 동일 메시지로 통일 (존재 여부 노출 방지)
  if (!client) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    return;
  }

  const isValid = await bcrypt.compare(secret, client.clientSecret);

  if (!isValid) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    return;
  }

  if (client.whiteListedIps.length > 0 && !client.whiteListedIps.includes(req.ip ?? '')) {
    res.status(403).json({ code: 'FORBIDDEN', message: 'IP not allowed' });
    return;
  }

  next();
}
```

---

## 5. 엔드포인트 연결

```typescript
// packages/core/src/index.ts (변경 부분만)

import { validateRpaClient } from './middlewares/validateRpaClient';

// 기존:
app.post('/api/rpa/messages', async (req, res) => { ... });

// 변경:
app.post('/api/rpa/messages', validateRpaClient, async (req, res) => { ... });
```

핸들러 내부 변경 없음. 미들웨어가 401/403 반환 시 핸들러는 실행되지 않는다.

---

## 6. 에러 응답

| 상황 | HTTP | body |
|------|------|------|
| clientId 또는 secret 누락 | 401 | `{ code: "UNAUTHORIZED", message: "Missing credentials" }` |
| clientId 없음 | 401 | `{ code: "UNAUTHORIZED", message: "Invalid credentials" }` |
| secret 불일치 | 401 | `{ code: "UNAUTHORIZED", message: "Invalid credentials" }` |
| IP 차단 | 403 | `{ code: "FORBIDDEN", message: "IP not allowed" }` |

---

## 7. 테스트 케이스

```typescript
// packages/core/src/__tests__/middlewares/validateRpaClient.test.ts

describe('validateRpaClient', () => {
  it('clientId 없으면 401 반환')
  it('secret 없으면 401 반환')
  it('존재하지 않는 clientId면 401 반환')
  it('secret 불일치 시 401 반환')
  it('IP whitelist에 없는 IP면 403 반환')
  it('whiteListedIps가 빈 배열이면 IP 검사 생략하고 next() 호출')
  it('모든 검증 통과 시 next() 호출')
})
```

각 테스트는 `models.Clients.findOne`과 `bcrypt.compare`를 mock하여 DB 없이 실행.

---

## 8. 범위 외

- URL 경로 변경 없음 (`/api/rpa/messages` 유지)
- Client 발급 UI/API 변경 없음 (기존 `createClient` 그대로 사용)
- JWT/OAuth 플로우 변경 없음
