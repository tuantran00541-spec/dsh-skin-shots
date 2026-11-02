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

// Dismiss the first-run Preview Notice dialog — it blocks all navigation.
await tryClick(/^Continue$/, 5000);
await page.waitForTimeout(1500);
// A second "Get started" (sign-in / API key) dialog appears behind it.
// Close it with Escape; do NOT enter any key or sign in.
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/welcome-nodialog.png' });

// Skin Center lives under Settings -> Web Extensions -> Skins tab
// (Chinese UI: 设置 -> Web 扩展 -> 皮肤), or a first-level Skin Center section.
// Settings hides inside a "More" menu; try the bottom one first, then the top.
let inSettings = false;
for (const which of ['last', 'first']) {
  try {
    const moreBtn = page.getByText(/^More$/, { exact: false });
    const btn = which === 'last' ? moreBtn.last() : moreBtn.first();
    await btn.waitFor({ state: 'visible', timeout: 3000 });
    await btn.click();
    await page.waitForTimeout(1200);
    if (await tryClick(/^(Settings|设置)$/, 3000)) { inSettings = true; break; }
  } catch { /* try the next More button */ }
}
if (!inSettings) {
  // Direct Settings entry, if the UI exposes one.
  inSettings = await tryClick(/^(Settings|设置)$/, 3000);
}
await page.waitForTimeout(2000);
await page.screenshot({ path: 'shots/settings.png' });

if (inSettings) {
  // Web Extensions section, then the Skins tab/card; fall back to a
  // first-level Skin Center entry.
  const gotExt = await tryClick(/Web Extensions|Web 扩展|Extensions|扩展/);
  await page.waitForTimeout(1500);
  const gotSkins = await tryClick(/^(Skins|皮肤)$/);
  if (!gotExt && !gotSkins) {
    await tryClick(/Skin Center|皮肤中心/);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shots/skin-center.png' });
  await page.screenshot({ path: 'shots/skin-center-full.png', fullPage: true });
}

await browser.close();
console.log('shots done, inSettings=' + inSettings);
