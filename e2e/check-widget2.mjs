import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') errors.push(msg.text().substring(0, 100));
});

await page.goto('http://localhost:3200/test?type=messenger&brand_id=TyZwBwrg2xKQDlBT1ezF5');
await page.waitForTimeout(5000);

console.log('Console errors:', errors);

const launcherIframe = await page.$('#erxes-launcher');
if (launcherIframe) {
  const frame = await launcherIframe.contentFrame();
  const btn = await frame.$('.erxes-launcher');
  console.log('launcher btn:', btn ? 'found' : 'NOT found');
  const bodyHTML = await frame.evaluate(() => document.body.innerHTML);
  console.log('launcher body (100chars):', bodyHTML.substring(0, 100));
}

await browser.close();
