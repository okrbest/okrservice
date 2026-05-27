import { test, expect, Page, APIRequestContext } from '@playwright/test';

const LOGIN_ID = 'e2e-user@test.com';
const BRAND_ID = process.env.TEST_BRAND_ID!;
const WIDGET_URL = `http://localhost:3200/test?type=messenger&brand_id=${BRAND_ID}`;

async function postRpaMessage(
  request: APIRequestContext,
  messageCode: string,
) {
  return request.post('http://localhost:3300/api/rpa/messages', {
    data: {
      clientId: 'e2e-test-client',
      secret: 'e2e-test-secret',
      loginId: LOGIN_ID,
      rpaCode: 'HR_RPA_100',
      message: '출근 알림 테스트',
      messageCode,
    },
  });
}

function getWidgetFrame(page: Page) {
  return page.frameLocator('#erxes-messenger-iframe');
}

// 위젯 test 페이지에 email(loginId)을 주입한 뒤 런처 클릭
async function openWidgetPage(page: Page) {
  // 기존 widget-messenger-test.ejs에 email이 없으므로 route 인터셉션으로 주입
  await page.route('**/test*', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const modified = html.replace(
      /messenger:\s*\{/,
      `messenger: {\n          email: '${LOGIN_ID}',`,
    );
    await route.fulfill({ response, body: modified });
  });
  await page.goto(WIDGET_URL);
  // 런처 버튼 클릭으로 messenger iframe 열기
  await page.frameLocator('#erxes-launcher').locator('.erxes-launcher').waitFor({ timeout: 15_000 });
  await page.frameLocator('#erxes-launcher').locator('.erxes-launcher').click();
}

test('같은 messageCode로 2번 POST해도 메시지 수가 늘지 않는다', async ({
  page,
  request,
}) => {
  const messageCode = `IDEM-TEST-${Date.now()}`;

  // 1. 위젯 페이지 열기 (email 주입 + 런처 클릭)
  await openWidgetPage(page);

  // 2. messenger iframe 내 챗봇 탭 대기 및 클릭
  const frame = getWidgetFrame(page);
  await frame.getByText('Chatbot').waitFor({ timeout: 15_000 });
  await frame.getByText('Chatbot').click();

  // 3. loadHistory 완료 대기 (인사 메시지가 렌더링될 때까지)
  // 인사 메시지가 나타나면 chatbot 뷰가 초기화 완료된 상태
  await frame.getByText('안녕하세요').waitFor({ timeout: 10_000 });

  // 4. 첫 번째 POST: 메시지가 나타날 때까지 대기
  const res1 = await postRpaMessage(request, messageCode);
  expect(res1.status()).toBe(200);
  await frame.getByText('출근 알림 테스트').waitFor({ timeout: 10_000 });

  // 5. 안정화 후 현재 메시지 개수 기록 (WebSocket + 히스토리 중복 포함)
  await page.waitForTimeout(2_000);
  const countAfterFirst = await frame.getByText('출근 알림 테스트').count();
  expect(countAfterFirst).toBeGreaterThanOrEqual(1);

  // 6. 동일 messageCode로 두 번째 POST (멱등성 검증)
  const res2 = await postRpaMessage(request, messageCode);
  expect(res2.status()).toBe(200);

  // 7. 메시지 개수가 늘지 않아야 함 — 두 번째 POST는 무시되어야 한다
  await page.waitForTimeout(2_000);
  const countAfterSecond = await frame.getByText('출근 알림 테스트').count();
  expect(countAfterSecond).toBe(countAfterFirst);
});
