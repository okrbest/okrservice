# RPA 메시지 멱등성 설계

**날짜:** 2026-05-26
**범위:** `POST /api/rpa/messages` — messageCode 있는 케이스 중복 저장 방지

---

## 1. 목표

5240 서버가 네트워크 오류 등으로 동일 RPA 메시지를 재전송할 때, 서비스데스크 서버가 중복 저장하지 않도록 한다. messageCode가 있는 케이스(결재 알림 등)만 중복 방지. messageCode가 빈 케이스(근무시간/퇴근 알림 등)는 매번 저장한다.

---

## 2. 멱등성 키

`(loginId, messageCode)` 복합 키.

PDF 스펙 유의사항: `messageCode`를 단독 식별자로 쓰면 안 됨 — 배치와 결재에서 값 형식이 다르고 서로 충돌 가능. `loginId`와 함께 묶어야 사용자별 고유성 보장.

---

## 3. 구현 방식

### MongoDB sparse unique 인덱스

```typescript
rpaMessageSchema.index(
  { loginId: 1, messageCode: 1 },
  { unique: true, sparse: true }
);
```

- `sparse: true` — 인덱스 필드 중 하나라도 `null` 또는 `undefined`이면 인덱스에서 제외
- **주의:** MongoDB sparse index는 빈 문자열(`""`)을 `null`/`undefined`와 다르게 처리 — 빈 문자열은 인덱스에 **포함**됨
- 따라서 `createRpaMessage`에서 `messageCode`가 빈 문자열일 때 `undefined`로 변환 필요

### createRpaMessage 변경

```typescript
public static async createRpaMessage(doc: IRpaMessage): Promise<IRpaMessageDocument | null> {
  try {
    return await models.RpaMessages.create({
      ...doc,
      messageCode: doc.messageCode || undefined,  // "" → undefined (sparse 인덱스 제외)
      receivedAt: new Date(),
    });
  } catch (e: any) {
    if (e.code === 11000) {
      return null;  // 중복 키 에러 → 이미 처리된 메시지, 무시
    }
    throw e;
  }
}
```

반환 타입이 `Promise<IRpaMessageDocument | null>`로 변경됨.

### index.ts 핸들러 변경

`saved`가 `null`이면 WebSocket push 생략하고 즉시 200 반환:

```typescript
const saved = await models.RpaMessages.createRpaMessage({ ... });

if (!saved) {
  return res.status(200).json({ ok: true });  // 중복 → 성공으로 응답 (5240 재전송 루프 방지)
}

// 기존 WebSocket push 코드 (변경 없음)
await graphqlPubsub.publish('rpaMessageReceived', { ... });
return res.status(200).json({ ok: true });
```

---

## 4. 파일 목록

| 파일 | 상태 | 변경 내용 |
|------|------|-----------|
| `packages/core/src/db/models/definitions/rpaMessages.ts` | 수정 | sparse unique 인덱스 추가 |
| `packages/core/src/db/models/RpaMessages.ts` | 수정 | duplicate key 에러 처리, 반환 타입 변경 |
| `packages/core/src/index.ts` | 수정 | `saved === null` 조기 반환 추가 |

테스트 파일:
| 파일 | 상태 |
|------|------|
| `packages/core/src/__tests__/db/models/RpaMessages.test.ts` | 신규 |

---

## 5. 테스트 케이스

1. **첫 번째 요청** → `IRpaMessageDocument` 반환 (정상 저장)
2. **같은 (loginId, messageCode) 재전송** → `null` 반환 (저장 안 됨)
3. **messageCode 빈 문자열** → `IRpaMessageDocument` 반환 (중복 체크 없이 매번 저장)
4. **같은 loginId + 다른 messageCode** → 각각 `IRpaMessageDocument` 반환 (중복 아님)
5. **DB 에러 (11000 외)** → 에러 그대로 throw

---

## 6. 범위 외

- `messageCode` 빈 문자열 케이스(HR_RPA_090, HR_RPA_110 등) 중복 방지 — 하지 않음 (요구사항 외)
- 멱등성 TTL(오래된 messageCode 재사용 허용) — 하지 않음 (YAGNI)
- `IRpaMessage` 인터페이스의 `messageCode` 타입 변경 — 하지 않음 (인터페이스는 그대로 유지, 변환은 createRpaMessage 내부에서만)
