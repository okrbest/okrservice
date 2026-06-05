import { chromium } from '@playwright/test';

const LOGIN_ID = 'e2e-user@test.com';
const BRAND_ID = 'YhiZqn';
const WIDGET_URL = `http://localhost:3200/test?type=messenger&brand_id=${BRAND_ID}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Inject email via route interception
await page.route('**/test*', async (route) => {
  const response = await route.fetch();
  const html = await response.text();
  const modified = html.replace(/messenger:\s*\{/, `messenger: {\n          email: '${LOGIN_ID}',`);
  await route.fulfill({ response, body: modified });
});

await page.goto(WIDGET_URL);
await page.frameLocator('#erxes-launcher').locator('.erxes-launcher').waitFor({ timeout: 15000 });
await page.frameLocator('#erxes-launcher').locator('.erxes-launcher').click();

const frame = page.frameLocator('#erxes-messenger-iframe');
await frame.getByText('Chatbot').waitFor({ timeout: 15000 });
await frame.getByText('Chatbot').click();

// Send RPA message
await page.request.post('http://localhost:3300/api/rpa/messages', {
  data: { clientId: 'e2e-test-client', secret: 'e2e-test-secret', loginId: LOGIN_ID, rpaCode: 'HR_RPA_100', message: '출근 알림 테스트', messageCode: `IDEM-DEBUG-${Date.now()}` }
});

// Wait for message
await frame.getByText('출근 알림 테스트').waitFor({ timeout: 10000 });
await page.waitForTimeout(1000);

// Check all elements containing the text
const allElements = await frame.locator('*:has-text("출근 알림 테스트")').all();
console.log('All elements count:', allElements.length);

for (let i = 0; i < Math.min(allElements.length, 10); i++) {
  const tagName = await allElements[i].evaluate(el => el.tagName);
  const className = await allElements[i].evaluate(el => el.className);
  const text = await allElements[i].innerText();
  console.log(`Element ${i}: <${tagName}> class="${className}" text="${text.substring(0, 50)}"`);
}

await browser.close();
