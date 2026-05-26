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

test('같은 messageCode로 2번 POST해도 메시지가 1개만 표시된다', async ({
  page,
  request,
}) => {
  const messageCode = `IDEM-TEST-${Date.now()}`;

  // 1. 위젯 페이지 열기
  await page.goto(WIDGET_URL);

  // 2. 위젯 iframe 로드 대기
  const frame = getWidgetFrame(page);
  await frame.getByText('Chatbot').waitFor({ timeout: 15_000 });

  // 3. 챗봇 탭 클릭
  await frame.getByText('Chatbot').click();

  // 4. 동일 messageCode로 2번 POST
  const res1 = await postRpaMessage(request, messageCode);
  expect(res1.status()).toBe(200);

  // 첫 번째 메시지가 위젯에 나타날 때까지 대기
  await frame.getByText('출근 알림 테스트').waitFor({ timeout: 10_000 });

  const res2 = await postRpaMessage(request, messageCode);
  expect(res2.status()).toBe(200);

  // 5. 메시지가 정확히 1개만 존재해야 함 (중복 방지 검증)
  // toHaveCount는 지정 timeout 안에 조건이 맞을 때까지 polling함
  await expect(frame.getByText('출근 알림 테스트')).toHaveCount(1, { timeout: 5_000 });
});
