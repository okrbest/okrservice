# E2E 테스트 설계 (Playwright)

**날짜:** 2026-05-26
**범위:** PDF 7절 "꼭 작성할 테스트 케이스" 중 3개 — 중복 메시지 방지, 오프라인 메시지 복원, WebSocket 자동 재연결

---

## 1. 목표

PDF 7절에서 명시한 테스트 케이스 4개 중 멀티노드 환경이 필요한 4번을 제외한 3개를 Playwright로 구현한다. 5240 서버 역할은 Playwright의 `request` API로 직접 `POST /api/rpa/messages`를 호출하여 대체한다.

---

## 2. 테스트 환경 구성

### 디렉토리 구조

```
e2e/
  playwright.config.ts       # webServer 설정, baseURL
  global-setup.ts            # DB seed: RPA Client 생성
  global-teardown.ts         # seed 데이터 정리
  fixtures/
    mock-page.html           # 위젯 임베드 mock 페이지
  tests/
    rpa-idempotency.spec.ts  # 테스트 1: 중복 메시지 방지
    rpa-offline.spec.ts      # 테스트 2: 오프라인 메시지 복원
    rpa-reconnect.spec.ts    # 테스트 3: WebSocket 자동 재연결
```

### 서버 기동 방식

`playwright.config.ts`의 `webServer` 옵션으로 `packages/core` 서버를 자동 기동:

```typescript
webServer: {
  command: 'cd packages/core && yarn dev',
  url: 'http://localhost:3300/health',
  reuseExistingServer: true,
  timeout: 30_000,
}
```

`reuseExistingServer: true` — 이미 서버가 실행 중이면 재사용.

### 환경 변수

`e2e/.env.test`:
```
CORE_URL=http://localhost:3300
WIDGETS_URL=http://localhost:3200
INTEGRATION_ID=<globalSetup이 생성>
RPA_CLIENT_ID=e2e-test-client
RPA_CLIENT_SECRET=e2e-test-secret
TEST_LOGIN_ID=e2e-user@test.com
```

### globalSetup

MongoDB에 직접 연결하여:
1. `Clients` 컬렉션에 테스트용 RPA Client 생성 (`clientId: 'e2e-test-client'`, bcrypt-hashed secret)
2. 환경 변수 파일에 생성된 ID 기록

### globalTeardown

MongoDB에서 `e2e-test-client` Client 문서 + `e2e-user@test.com`의 RpaMessages 문서 삭제.

---

## 3. Mock 페이지

`e2e/fixtures/mock-page.html` — 위젯 loader를 임베드하는 정적 HTML:

```html
<!DOCTYPE html>
<html>
<head><title>5240 Mock Page</title></head>
<body>
  <h1>5240 Mock Page</h1>
  <script>
    window.erxesSettings = {
      messenger: {
        brand_id: '__INTEGRATION_ID__',
        email: 'e2e-user@test.com',
      }
    };
    window.erxesEnv = {
      API_URL: 'http://localhost:3300',
      API_SUBSCRIPTIONS_URL: 'ws://localhost:3300/graphql',
    };
  </script>
  <script src="http://localhost:3200/build/widget.bundle.js"></script>
</body>
</html>
```

`__INTEGRATION_ID__`는 globalSetup이 실제 값으로 치환.

---

## 4. 테스트 케이스

### 테스트 1: 중복 메시지 방지 (rpa-idempotency.spec.ts)

**PDF 명시:** "같은 (loginId, rpaCode)가 5초 내 2번 도달해도 중복 메시지가 안 쌓이는가"

**시나리오:**
1. mock-page.html 열기 → 위젯 챗봇 탭 클릭
2. `POST /api/rpa/messages` 동일 payload (loginId, messageCode) 2회 전송
3. 챗봇 채팅 영역에 메시지가 1개만 표시됨을 확인

**검증:** 메시지 버블 개수 === 2 (인사 메시지 + RPA 메시지 1개)

---

### 테스트 2: 오프라인 메시지 복원 (rpa-offline.spec.ts)

**PDF 명시:** "위젯이 오프라인 상태에서 도달한 메시지를 재접속 시 누락 없이 받는가"

**시나리오:**
1. 위젯을 **열지 않은 상태**에서 `POST /api/rpa/messages` 전송 (DB에만 저장)
2. mock-page.html 열기 → 위젯 챗봇 탭 클릭
3. RPA 메시지가 히스토리에서 표시됨을 확인

**검증:** 메시지 버블이 보임 (`rpaMessages` GraphQL query 경로)

---

### 테스트 3: WebSocket 자동 재연결 (rpa-reconnect.spec.ts)

**PDF 명시:** "WebSocket 비정상 종료 시 60초 내 자동 재연결 되는가"

**시나리오:**
1. mock-page.html 열기 → 위젯 챗봇 탭 클릭 → WebSocket 연결 확인 (RPA 메시지 1개 수신)
2. `page.evaluate`로 iframe 내부의 WebSocket 객체를 직접 종료 (`ws.close()`)
3. 잠시 대기 후 새 RPA 메시지를 POST
4. 위젯이 재연결하여 메시지를 수신함을 확인

**WS 강제 종료 방법:**
```typescript
await page.frames()[1].evaluate(() => {
  // Apollo graphql-ws 클라이언트가 보유한 소켓을 찾아 강제 종료
  const ws = (window as any).__apolloWsClient?.__currentSocket;
  if (ws) ws.close(4000, 'test-forced-close');
});
```
- `graphql-ws` 라이브러리의 `retryAttempts: 100` 설정에 의해 자동 재연결됨
- 서버 코드 수정 불필요

**검증:** 재연결 후 30초 내에 신규 RPA 메시지가 채팅창에 표시됨

---

## 5. 파일 목록

| 파일 | 상태 | 역할 |
|------|------|------|
| `e2e/playwright.config.ts` | 신규 | Playwright 설정, webServer, baseURL |
| `e2e/global-setup.ts` | 신규 | DB seed: RPA Client 생성 |
| `e2e/global-teardown.ts` | 신규 | seed 데이터 정리 |
| `e2e/fixtures/mock-page.html` | 신규 | 위젯 임베드 mock 페이지 |
| `e2e/tests/rpa-idempotency.spec.ts` | 신규 | 테스트 1: 중복 메시지 방지 |
| `e2e/tests/rpa-offline.spec.ts` | 신규 | 테스트 2: 오프라인 메시지 복원 |
| `e2e/tests/rpa-reconnect.spec.ts` | 신규 | 테스트 3: WebSocket 자동 재연결 |
| `e2e/package.json` | 신규 | Playwright 의존성 |

---

## 6. 변경하지 않는 것

- 위젯 소스 코드 — 수정 없음
- `packages/core` 프로덕션 코드 — 수정 없음
- 기존 단위 테스트 — 영향 없음
