import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://localhost:3200/test?type=messenger&brand_id=Dn3GDInBCrIwxZmi7vCKT');
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/widget-test.png', fullPage: true });

const launcherIframe = await page.$('#erxes-launcher');
const messengerIframe = await page.$('#erxes-messenger-iframe');
console.log('launcher iframe:', launcherIframe ? 'found' : 'NOT found');
console.log('messenger iframe:', messengerIframe ? 'found' : 'NOT found');

if (launcherIframe) {
  const frame = await launcherIframe.contentFrame();
  const btn = await frame.$('.erxes-launcher');
  console.log('launcher btn:', btn ? 'found' : 'NOT found');
  const bodyHTML = await frame.evaluate(() => document.body.innerHTML);
  console.log('launcher body:', bodyHTML.substring(0, 300));
}

await browser.close();
