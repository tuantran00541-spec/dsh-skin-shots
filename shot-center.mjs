import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

// DSH_URL is the token login URL printed by `dsh web` (parsed from dsh.log).
const url = process.env.DSH_URL;
if (!url) throw new Error('DSH_URL is empty');

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function tryClick(pattern, timeout = 3000) {
  try {
    const loc = page.getByText(pattern, { exact: false }).first();
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click();
    return true;
  } catch {
    return false;
  }
}

await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: 'shots/welcome.png' });

// Skin Center lives under Settings -> Web Extensions -> Skins tab
// (Chinese UI: 设置 -> Web 扩展 -> 皮肤). Walk there defensively:
// sidebar "More" menu may hold Settings; otherwise a direct Settings entry.
let inSettings = await tryClick(/^(Settings|设置)$/);
if (!inSettings) {
  await tryClick(/^More$/);
  await page.waitForTimeout(1000);
  inSettings = await tryClick(/^(Settings|设置)$/);
}
await page.waitForTimeout(2000);
await page.screenshot({ path: 'shots/settings.png' });

if (inSettings) {
  // Web Extensions section, then the Skins tab/card.
  await tryClick(/Web Extensions|Web 扩展|Extensions|扩展/);
  await page.waitForTimeout(1500);
  await tryClick(/^(Skins|皮肤)$/);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/skin-center.png' });
  await page.screenshot({ path: 'shots/skin-center-full.png', fullPage: true });
}

await browser.close();
console.log('shots done');
