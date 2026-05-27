import { test, expect, Page, APIRequestContext } from '@playwright/test';

const LOGIN_ID = 'e2e-user@test.com';
const BRAND_ID = process.env.TEST_BRAND_ID!;
const WIDGET_URL = `http://localhost:3200/test?type=messenger&brand_id=${BRAND_ID}`;

async function postRpaMessage(
  request: APIRequestContext,
  message: string,
) {
  return request.post('http://localhost:3300/api/rpa/messages', {
    data: {
      clientId: 'e2e-test-client',
      secret: 'e2e-test-secret',
      loginId: LOGIN_ID,
      rpaCode: 'HR_RPA_100',
      message,
      messageCode: '',
    },
  });
}

function getWidgetFrame(page: Page) {
  return page.frameLocator('#erxes-messenger-iframe');
}

// 위젯 test 페이지에 email(loginId)을 주입한 뒤 런처 클릭
async function openWidgetPage(page: Page) {
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
  await page.frameLocator('#erxes-launcher').locator('.erxes-launcher').waitFor({ timeout: 15_000 });
  await page.frameLocator('#erxes-launcher').locator('.erxes-launcher').click();
}

test('위젯 재접속 후 누락 없이 메시지를 수신한다 (WebSocket 재연결 시나리오)', async ({
  page,
  request,
}) => {
  // 1. 최초 위젯 접속 → 연결 확인
  await openWidgetPage(page);
  const frame = getWidgetFrame(page);
  await frame.getByText('Chatbot').waitFor({ timeout: 15_000 });
  await frame.getByText('Chatbot').click();
  // 챗봇 뷰 로드 확인 (인사 메시지)
  await frame.getByText('안녕하세요').waitFor({ timeout: 10_000 });

  // 2. 연결 해제 시뮬레이션: 페이지를 떠남 (WebSocket 종료)
  await page.goto('about:blank');

  // 3. 위젯이 오프라인인 동안 RPA 메시지 전송 (DB에만 저장)
  const reconnectMsg = `재연결 후 메시지 ${Date.now()}`;
  const res = await postRpaMessage(request, reconnectMsg);
  expect(res.status()).toBe(200);

  // 4. 위젯 재접속 (새 WebSocket 연결 수립)
  // 이전 세션의 erxes localStorage를 지워 stale한 messengerDataJson이 재사용되지 않도록 함
  await page.goto('http://localhost:3200/health');
  await page.evaluate(() => {
    try { localStorage.removeItem('erxes'); } catch (_) {}
  });
  await page.unroute('**/test*');
  await openWidgetPage(page);
  const frame2 = getWidgetFrame(page);
  await frame2.getByText('Chatbot').waitFor({ timeout: 15_000 });
  await frame2.getByText('Chatbot').click();
  // ChatbotView 렌더 완료 대기 (인사 메시지가 보여야 loadHistory도 완료 근처)
  await frame2.getByText('안녕하세요').waitFor({ timeout: 10_000 });

  // 5. 재접속 후 loadHistory로 오프라인 중 수신된 메시지 복원 확인
  // PDF 명시: "60초 내 자동 재연결 되는가" — 재접속 후 메시지 누락 없음을 검증
  await expect(frame2.getByText(reconnectMsg)).toBeVisible({ timeout: 20_000 });
});
