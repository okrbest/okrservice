# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rpa-idempotency.spec.ts >> 같은 messageCode로 2번 POST해도 메시지 수가 늘지 않는다
- Location: tests/rpa-idempotency.spec.ts:45:5

# Error details

```
Error: locator.waitFor: Error: strict mode violation: getByText('출근 알림 테스트') resolved to 2 elements:
    1) <div>출근 알림 테스트</div> aka getByText('출근 알림 테스트').first()
    2) <div>출근 알림 테스트</div> aka getByText('출근 알림 테스트').nth(1)

Call log:
  - waiting for locator('#erxes-messenger-iframe').contentFrame().getByText('출근 알림 테스트') to be visible

```

# Page snapshot

```yaml
- generic:
  - generic:
    - iframe [active] [ref=e2]:
      - generic [ref=f1e4]:
        - img [ref=f1e8] [cursor=pointer]
        - generic [ref=f1e11]:
          - generic [ref=f1e12]:
            - generic [ref=f1e13]:
              - generic [ref=f1e14]: 🤖
              - generic [ref=f1e16]:
                - text: 안녕하세요! 👋
                - strong [ref=f1e17]: HR 시스템
                - text: 의 주요 기능을 바로 이용하세요.
            - generic [ref=f1e18]:
              - generic [ref=f1e19]: 🤖
              - generic [ref=f1e20]:
                - generic [ref=f1e21]: 출근 알림 테스트
                - generic [ref=f1e22]: 14:57
                - button "출퇴근 체크 →" [ref=f1e24] [cursor=pointer]
            - generic [ref=f1e25]:
              - generic [ref=f1e26]: 🤖
              - generic [ref=f1e27]:
                - generic [ref=f1e28]: 출근 알림 테스트
                - generic [ref=f1e29]: 14:57
                - button "출퇴근 체크 →" [ref=f1e31] [cursor=pointer]
          - 'textbox "HR 메뉴를 검색하세요 (예: 출근, 휴가)" [ref=f1e33]'
          - button "HR 메뉴 ▲" [ref=f1e35] [cursor=pointer]:
            - generic [ref=f1e36]: HR 메뉴
            - generic [ref=f1e37]: ▲
        - list [ref=f1e38]:
          - listitem [ref=f1e39] [cursor=pointer]:
            - generic [ref=f1e40]:
              - img [ref=f1e41]
              - generic [ref=f1e43]: 홈
          - listitem [ref=f1e44] [cursor=pointer]:
            - generic [ref=f1e45]:
              - img [ref=f1e46]
              - generic [ref=f1e48]: Chatbot
          - listitem [ref=f1e49] [cursor=pointer]:
            - generic [ref=f1e50]:
              - img [ref=f1e51]
              - generic [ref=f1e53]: 티켓
          - listitem [ref=f1e54] [cursor=pointer]:
            - generic [ref=f1e55]:
              - img [ref=f1e56]
              - generic [ref=f1e58]: 도움말
    - iframe [ref=e3]:
      - button [ref=f2e2] [cursor=pointer]:
        - img [ref=f2e3]
```

# Test source

```ts
  1  | import { test, expect, Page, APIRequestContext } from '@playwright/test';
  2  | 
  3  | const LOGIN_ID = 'e2e-user@test.com';
  4  | const BRAND_ID = process.env.TEST_BRAND_ID!;
  5  | const WIDGET_URL = `http://localhost:3200/test?type=messenger&brand_id=${BRAND_ID}`;
  6  | 
  7  | async function postRpaMessage(
  8  |   request: APIRequestContext,
  9  |   messageCode: string,
  10 | ) {
  11 |   return request.post('http://localhost:3300/api/rpa/messages', {
  12 |     data: {
  13 |       clientId: 'e2e-test-client',
  14 |       secret: 'e2e-test-secret',
  15 |       loginId: LOGIN_ID,
  16 |       rpaCode: 'HR_RPA_100',
  17 |       message: '출근 알림 테스트',
  18 |       messageCode,
  19 |     },
  20 |   });
  21 | }
  22 | 
  23 | function getWidgetFrame(page: Page) {
  24 |   return page.frameLocator('#erxes-messenger-iframe');
  25 | }
  26 | 
  27 | // 위젯 test 페이지에 email(loginId)을 주입한 뒤 런처 클릭
  28 | async function openWidgetPage(page: Page) {
  29 |   // 기존 widget-messenger-test.ejs에 email이 없으므로 route 인터셉션으로 주입
  30 |   await page.route('**/test*', async (route) => {
  31 |     const response = await route.fetch();
  32 |     const html = await response.text();
  33 |     const modified = html.replace(
  34 |       /messenger:\s*\{/,
  35 |       `messenger: {\n          email: '${LOGIN_ID}',`,
  36 |     );
  37 |     await route.fulfill({ response, body: modified });
  38 |   });
  39 |   await page.goto(WIDGET_URL);
  40 |   // 런처 버튼 클릭으로 messenger iframe 열기
  41 |   await page.frameLocator('#erxes-launcher').locator('.erxes-launcher').waitFor({ timeout: 15_000 });
  42 |   await page.frameLocator('#erxes-launcher').locator('.erxes-launcher').click();
  43 | }
  44 | 
  45 | test('같은 messageCode로 2번 POST해도 메시지 수가 늘지 않는다', async ({
  46 |   page,
  47 |   request,
  48 | }) => {
  49 |   const messageCode = `IDEM-TEST-${Date.now()}`;
  50 | 
  51 |   // 1. 위젯 페이지 열기 (email 주입 + 런처 클릭)
  52 |   await openWidgetPage(page);
  53 | 
  54 |   // 2. messenger iframe 내 챗봇 탭 대기 및 클릭
  55 |   const frame = getWidgetFrame(page);
  56 |   await frame.getByText('Chatbot').waitFor({ timeout: 15_000 });
  57 |   await frame.getByText('Chatbot').click();
  58 | 
  59 |   // 3. loadHistory 완료 대기 (인사 메시지가 렌더링될 때까지)
  60 |   // 인사 메시지가 나타나면 chatbot 뷰가 초기화 완료된 상태
  61 |   await frame.getByText('안녕하세요').waitFor({ timeout: 10_000 });
  62 | 
  63 |   // 4. 첫 번째 POST: 메시지가 나타날 때까지 대기
  64 |   const res1 = await postRpaMessage(request, messageCode);
  65 |   expect(res1.status()).toBe(200);
> 66 |   await frame.getByText('출근 알림 테스트').waitFor({ timeout: 10_000 });
     |                                      ^ Error: locator.waitFor: Error: strict mode violation: getByText('출근 알림 테스트') resolved to 2 elements:
  67 | 
  68 |   // 5. 안정화 후 현재 메시지 개수 기록 (WebSocket + 히스토리 중복 포함)
  69 |   await page.waitForTimeout(2_000);
  70 |   const countAfterFirst = await frame.getByText('출근 알림 테스트').count();
  71 |   expect(countAfterFirst).toBeGreaterThanOrEqual(1);
  72 | 
  73 |   // 6. 동일 messageCode로 두 번째 POST (멱등성 검증)
  74 |   const res2 = await postRpaMessage(request, messageCode);
  75 |   expect(res2.status()).toBe(200);
  76 | 
  77 |   // 7. 메시지 개수가 늘지 않아야 함 — 두 번째 POST는 무시되어야 한다
  78 |   await page.waitForTimeout(2_000);
  79 |   const countAfterSecond = await frame.getByText('출근 알림 테스트').count();
  80 |   expect(countAfterSecond).toBe(countAfterFirst);
  81 | });
  82 | 
```