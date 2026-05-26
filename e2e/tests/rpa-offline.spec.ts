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
      messageCode: '',  // 빈 문자열 → 매번 저장 (멱등성 제외)
    },
  });
}

function getWidgetFrame(page: Page) {
  return page.frameLocator('#erxes-messenger-iframe');
}

test('위젯 열기 전에 도착한 RPA 메시지가 히스토리로 표시된다', async ({
  page,
  request,
}) => {
  const offlineMsg = `오프라인 복원 테스트 ${Date.now()}`;

  // 1. 위젯을 열기 전에 RPA 메시지 POST (오프라인 상태 시뮬레이션)
  const res = await postRpaMessage(request, offlineMsg);
  expect(res.status()).toBe(200);

  // 2. 위젯 페이지 열기
  await page.goto(WIDGET_URL);

  // 3. 위젯 iframe 로드 대기 및 챗봇 탭 클릭
  const frame = getWidgetFrame(page);
  await frame.getByText('Chatbot').waitFor({ timeout: 15_000 });
  await frame.getByText('Chatbot').click();

  // 4. 히스토리에서 메시지가 표시됨을 확인
  await expect(frame.getByText(offlineMsg)).toBeVisible({ timeout: 10_000 });
});
