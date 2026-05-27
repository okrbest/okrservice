# RPA 메시지 멱등성 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** `POST /api/rpa/messages`에서 동일한 `(loginId, messageCode)` 조합의 RPA 메시지가 중복 저장되지 않도록 MongoDB sparse unique 인덱스와 duplicate key 에러 처리를 추가한다.

**Architecture:** `rpaMessages.ts` 스키마 정의에 sparse unique 인덱스 추가. `RpaMessages.ts`의 `createRpaMessage`에서 `messageCode` 빈 문자열 → `undefined` 변환 + MongoDB 11000 에러 캐치 → `null` 반환. `index.ts` 핸들러에서 `saved === null`이면 WebSocket push 생략 후 즉시 200 반환.

**Tech Stack:** TypeScript, Mongoose (MongoDB), Jest + ts-jest

---

## 파일 목록

| 파일 | 상태 | 역할 |
|------|------|------|
| `packages/core/src/db/models/definitions/rpaMessages.ts` | 수정 | sparse unique 인덱스 추가 |
| `packages/core/src/db/models/RpaMessages.ts` | 수정 | createRpaMessage — 빈 문자열 변환 + 11000 캐치, 반환 타입 `\| null` |
| `packages/core/src/__tests__/db/models/RpaMessages.test.ts` | 신규 | createRpaMessage 단위 테스트 5개 |
| `packages/core/src/index.ts` | 수정 | saved === null 조기 반환 추가 |

---

## Task 1: 모델 레이어 — sparse 인덱스 + createRpaMessage 멱등성 + 테스트

**Files:**
- Modify: `packages/core/src/db/models/definitions/rpaMessages.ts`
- Modify: `packages/core/src/db/models/RpaMessages.ts`
- Create: `packages/core/src/__tests__/db/models/RpaMessages.test.ts`

### 배경 지식

**`rpaMessageSchema`** (`packages/core/src/db/models/definitions/rpaMessages.ts`):
```typescript
export const rpaMessageSchema = new Schema({
  _id: field({ pkey: true }),
  loginId: field({ type: String, label: 'Receiver login ID (email)', index: true }),
  rpaCode: field({ type: String, label: 'RPA code' }),
  messageCode: field({ type: String, label: 'Message code' }),
  message: field({ type: String, label: 'Message body' }),
  overtime: field({ type: String, label: 'Overtime minutes', optional: true }),
  receivedAt: field({ type: Date, label: 'Received at' }),
  buttons: field({ type: [rpaButtonSchema], label: 'Buttons', default: [] }),
});
```

**`createRpaMessage`** 현재 구현 (`packages/core/src/db/models/RpaMessages.ts`):
```typescript
public static async createRpaMessage(doc: IRpaMessage): Promise<IRpaMessageDocument> {
  return models.RpaMessages.create({
    ...doc,
    receivedAt: new Date(),
  });
}
```

**중요:** MongoDB `sparse: true` 인덱스는 `null`/`undefined` 필드를 인덱스에서 제외하지만 빈 문자열(`""`)은 포함한다. 빈 messageCode를 멱등성 키에서 제외하려면 반드시 `""` → `undefined` 변환이 필요하다.

**테스트 패턴:** `loadRpaMessageClass(mockModels)`를 호출하면 static 메서드가 `mockModels`를 클로저로 캡처한다. 이후 `(rpaMessageSchema.statics as any).createRpaMessage`로 직접 호출 가능.

---

- [x] **Step 1: 테스트 파일 작성 (실패 상태)**

```typescript
// packages/core/src/__tests__/db/models/RpaMessages.test.ts
import { loadRpaMessageClass } from '../../../db/models/RpaMessages';
import { rpaMessageSchema } from '../../../db/models/definitions/rpaMessages';

describe('RpaMessages.createRpaMessage', () => {
  let mockCreate: jest.Mock;

  function getCreateFn() {
    return (rpaMessageSchema.statics as any).createRpaMessage as (doc: any) => Promise<any>;
  }

  const baseDoc = {
    loginId: 'user@test.com',
    rpaCode: 'HR_RPA_100',
    message: '출근 알림',
    overtime: '0',
    receivedAt: new Date(),
  };

  beforeEach(() => {
    mockCreate = jest.fn();
    loadRpaMessageClass({ RpaMessages: { create: mockCreate } } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('첫 번째 요청 → IRpaMessageDocument 반환', async () => {
    const saved = { _id: '1', ...baseDoc, messageCode: 'MSG_001' };
    mockCreate.mockResolvedValue(saved);

    const result = await getCreateFn()({ ...baseDoc, messageCode: 'MSG_001' });

    expect(result).toEqual(saved);
  });

  it('중복 키 에러(code 11000) → null 반환', async () => {
    const dupError = Object.assign(new Error('duplicate key'), { code: 11000 });
    mockCreate.mockRejectedValue(dupError);

    const result = await getCreateFn()({ ...baseDoc, messageCode: 'MSG_001' });

    expect(result).toBeNull();
  });

  it('11000 외 DB 에러 → throw', async () => {
    const dbError = Object.assign(new Error('connection error'), { code: 50000 });
    mockCreate.mockRejectedValue(dbError);

    await expect(getCreateFn()({ ...baseDoc, messageCode: 'MSG_001' }))
      .rejects.toThrow('connection error');
  });

  it('messageCode 빈 문자열 → create 호출 시 undefined로 변환', async () => {
    mockCreate.mockResolvedValue({ _id: '2', ...baseDoc, messageCode: undefined });

    await getCreateFn()({ ...baseDoc, messageCode: '' });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ messageCode: undefined }),
    );
  });

  it('같은 loginId + 다른 messageCode → create 각각 호출', async () => {
    mockCreate
      .mockResolvedValueOnce({ _id: '1', messageCode: 'MSG_001' })
      .mockResolvedValueOnce({ _id: '2', messageCode: 'MSG_002' });

    const r1 = await getCreateFn()({ ...baseDoc, messageCode: 'MSG_001' });
    const r2 = await getCreateFn()({ ...baseDoc, messageCode: 'MSG_002' });

    expect(r1).toEqual({ _id: '1', messageCode: 'MSG_001' });
    expect(r2).toEqual({ _id: '2', messageCode: 'MSG_002' });
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
```

- [x] **Step 2: 테스트 실행 — 반드시 실패해야 함**

```bash
cd /Users/shin-yeji/okrservice/packages/core
yarn test --testPathPattern=RpaMessages --no-coverage 2>&1 | tail -20
```

Expected: `TypeError` 또는 assertion 실패 (null 반환 로직 없음)

- [x] **Step 3: rpaMessages.ts에 sparse unique 인덱스 추가**

`packages/core/src/db/models/definitions/rpaMessages.ts` 파일 맨 끝 (`rpaMessageSchema` 정의 닫힌 후)에 추가:

```typescript
rpaMessageSchema.index(
  { loginId: 1, messageCode: 1 },
  { unique: true, sparse: true },
);
```

파일 전체:
```typescript
import { Document, Schema } from 'mongoose';
import { field } from './utils';

export interface IRpaButton {
  label: string;
  path: string;
}

export interface IRpaMessage {
  loginId: string;
  rpaCode: string;
  messageCode: string;
  message: string;
  overtime: string;
  receivedAt: Date;
  buttons?: IRpaButton[];
}

export interface IRpaMessageDocument extends IRpaMessage, Document {
  _id: string;
}

const rpaButtonSchema = new Schema(
  {
    label: field({ type: String, label: '버튼 텍스트' }),
    path: field({ type: String, label: '버튼 경로' }),
  },
  { _id: false },
);

export const rpaMessageSchema = new Schema({
  _id: field({ pkey: true }),
  loginId: field({ type: String, label: 'Receiver login ID (email)', index: true }),
  rpaCode: field({ type: String, label: 'RPA code' }),
  messageCode: field({ type: String, label: 'Message code' }),
  message: field({ type: String, label: 'Message body' }),
  overtime: field({ type: String, label: 'Overtime minutes', optional: true }),
  receivedAt: field({ type: Date, label: 'Received at' }),
  buttons: field({ type: [rpaButtonSchema], label: 'Buttons', default: [] }),
});

rpaMessageSchema.index(
  { loginId: 1, messageCode: 1 },
  { unique: true, sparse: true },
);
```

- [x] **Step 4: RpaMessages.ts — createRpaMessage 멱등성 처리**

`packages/core/src/db/models/RpaMessages.ts` 전체:

```typescript
import { Model } from 'mongoose';
import { IRpaMessage, IRpaMessageDocument, rpaMessageSchema } from './definitions/rpaMessages';
import { IModels } from '../../connectionResolver';

export interface IRpaMessageModel extends Model<IRpaMessageDocument> {
  createRpaMessage(doc: IRpaMessage): Promise<IRpaMessageDocument | null>;
  getRpaMessagesByLoginId(loginId: string, limit?: number): Promise<IRpaMessageDocument[]>;
}

export const loadRpaMessageClass = (models: IModels) => {
  class RpaMessage {
    public static async createRpaMessage(doc: IRpaMessage): Promise<IRpaMessageDocument | null> {
      try {
        return await models.RpaMessages.create({
          ...doc,
          messageCode: doc.messageCode || undefined,
          receivedAt: new Date(),
        });
      } catch (e: any) {
        if (e.code === 11000) {
          return null;
        }
        throw e;
      }
    }

    public static async getRpaMessagesByLoginId(
      loginId: string,
      limit = 50,
    ): Promise<IRpaMessageDocument[]> {
      return models.RpaMessages.find({ loginId })
        .sort({ receivedAt: -1 })
        .limit(limit)
        .lean();
    }
  }

  rpaMessageSchema.loadClass(RpaMessage);
  return rpaMessageSchema;
};
```

- [x] **Step 5: 테스트 실행 — 전부 통과해야 함**

```bash
cd /Users/shin-yeji/okrservice/packages/core
yarn test --testPathPattern=RpaMessages --no-coverage 2>&1 | tail -20
```

Expected: `5 passed`

- [x] **Step 6: TypeScript 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice/packages/core
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [x] **Step 7: 커밋**

```bash
git add packages/core/src/db/models/definitions/rpaMessages.ts \
        packages/core/src/db/models/RpaMessages.ts \
        packages/core/src/__tests__/db/models/RpaMessages.test.ts
git commit -m "feat(rpa): RpaMessage 멱등성 — sparse unique 인덱스 + 중복 키 에러 처리"
```

---

## Task 2: index.ts 핸들러 — saved === null 조기 반환

**Files:**
- Modify: `packages/core/src/index.ts` (~line 732)

### 배경 지식

Task 1 이후 `createRpaMessage`는 중복 메시지 시 `null`을 반환한다. 핸들러는 `null`이면 WebSocket push 없이 즉시 200 OK를 반환해야 한다. 5240은 200 OK를 받으면 성공으로 간주하여 재전송 루프가 없다.

현재 핸들러 관련 코드 (변경 전):
```typescript
// DB 저장
const buttons = getIntentButtons(rpaCode);
const saved = await models.RpaMessages.createRpaMessage({
  loginId,
  rpaCode,
  messageCode,
  message: message.substring(0, 4000),
  overtime,
  receivedAt: new Date(),
  buttons,
});

// WebSocket push — 해당 loginId 위젯으로 실시간 전달
await graphqlPubsub.publish('rpaMessageReceived', {
  ...
});

return res.status(200).json({ ok: true });
```

---

- [x] **Step 1: saved === null 조기 반환 추가**

`createRpaMessage` 호출 직후, WebSocket publish 직전에 추가:

```typescript
// DB 저장
const buttons = getIntentButtons(rpaCode);
const saved = await models.RpaMessages.createRpaMessage({
  loginId,
  rpaCode,
  messageCode,
  message: message.substring(0, 4000),
  overtime,
  receivedAt: new Date(),
  buttons,
});

// 중복 메시지 — 이미 처리됨, 5240에 성공 응답
if (!saved) {
  return res.status(200).json({ ok: true });
}

// WebSocket push — 해당 loginId 위젯으로 실시간 전달
await graphqlPubsub.publish('rpaMessageReceived', {
  rpaMessageReceived: {
    _id: saved._id,
    loginId,
    rpaCode,
    messageCode,
    message: saved.message,
    overtime,
    receivedAt: saved.receivedAt,
    buttons: saved.buttons ?? [],
  },
});

return res.status(200).json({ ok: true });
```

- [x] **Step 2: TypeScript 빌드 확인**

```bash
cd /Users/shin-yeji/okrservice/packages/core
npx tsc --noEmit 2>&1 | head -20
```

Expected: 오류 없음

- [x] **Step 3: 커밋**

```bash
git add packages/core/src/index.ts
git commit -m "feat(rpa): 중복 RPA 메시지 수신 시 WebSocket push 생략"
```
