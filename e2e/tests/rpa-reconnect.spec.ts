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

test('WebSocket 강제 종료 후 재연결되어 새 메시지를 수신한다', async ({
  page,
  request,
}) => {
  // 1. 위젯 페이지 열기 및 챗봇 탭으로 이동
  await page.goto(WIDGET_URL);
  const frame = getWidgetFrame(page);
  await frame.getByText('Chatbot').waitFor({ timeout: 15_000 });
  await frame.getByText('Chatbot').click();

  // 2. 첫 번째 메시지 전송 (WebSocket 연결 확인용)
  const firstMsg = `재연결 테스트 초기 메시지 ${Date.now()}`;
  const res1 = await postRpaMessage(request, firstMsg);
  expect(res1.status()).toBe(200);
  await expect(frame.getByText(firstMsg)).toBeVisible({ timeout: 10_000 });

  // 3. iframe src 리셋으로 WebSocket 재연결 시뮬레이션
  const originalSrc = await page.evaluate(() => {
    const iframe = document.getElementById('erxes-messenger-iframe') as HTMLIFrameElement;
    return iframe?.src ?? '';
  });

  await page.evaluate((src) => {
    const iframe = document.getElementById('erxes-messenger-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = 'about:blank';
      setTimeout(() => { iframe.src = src; }, 300);
    }
  }, originalSrc);

  // 4. iframe 재로드 후 위젯 재초기화 대기
  await frame.getByText('Chatbot').waitFor({ timeout: 20_000 });
  await frame.getByText('Chatbot').click();

  // 5. 재연결 후 새 메시지 전송
  const reconnectMsg = `재연결 후 메시지 ${Date.now()}`;
  const res2 = await postRpaMessage(request, reconnectMsg);
  expect(res2.status()).toBe(200);

  // 6. 재연결 후 메시지 수신 확인 (30초 내)
  await expect(frame.getByText(reconnectMsg)).toBeVisible({ timeout: 30_000 });
});
