import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text().substring(0, 120));
});

await page.goto('http://localhost:3200/test?type=messenger&brand_id=YhiZqn');
await page.waitForTimeout(6000);

console.log('Console errors:', errors);

const launcherIframe = await page.$('#erxes-launcher');
if (launcherIframe) {
  const frame = await launcherIframe.contentFrame();
  const btn = await frame.$('.erxes-launcher');
  console.log('launcher btn:', btn ? 'FOUND ✓' : 'NOT found');
  const bodyHTML = await frame.evaluate(() => document.body.innerHTML);
  console.log('launcher body (150chars):', bodyHTML.substring(0, 150));
}

await browser.close();
