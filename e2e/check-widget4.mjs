import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3200/test?type=messenger&brand_id=YhiZqn');
await page.waitForTimeout(3000);

// Click launcher
await page.frameLocator('#erxes-launcher').locator('.erxes-launcher').click();
await page.waitForTimeout(3000);

// Check messenger iframe
const messengerFrame = page.frameLocator('#erxes-messenger-iframe');

// Get all text in the messenger
try {
  const bodyText = await messengerFrame.locator('body').innerText();
  console.log('Messenger body text (200chars):', bodyText.substring(0, 200));
} catch(e) {
  console.log('Error getting body text:', e.message);
}

// Look for Chatbot tab
try {
  const chatbotEl = messengerFrame.getByText('Chatbot');
  const count = await chatbotEl.count();
  console.log('Chatbot text count:', count);
} catch(e) {
  console.log('Chatbot search error:', e.message);
}

await page.screenshot({ path: '/tmp/widget-open.png', fullPage: true });
console.log('Screenshot saved to /tmp/widget-open.png');

await browser.close();
