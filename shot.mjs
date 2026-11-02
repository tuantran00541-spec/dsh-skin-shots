import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

// DSH_URL is the token login URL printed by `dsh web` (parsed from dsh.log).
const url = process.env.DSH_URL;
if (!url) throw new Error('DSH_URL is empty');

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: 'shots/welcome.png' });
await page.screenshot({ path: 'shots/welcome-full.png', fullPage: true });
// Theme panel button if the skin adds one (skin3 uses a floating palette button).
const themeBtn = page.locator('button:has-text("🎨")').first();
if (await themeBtn.count()) {
  await themeBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'shots/theme-panel.png' });
}
await browser.close();
console.log('shots done');
