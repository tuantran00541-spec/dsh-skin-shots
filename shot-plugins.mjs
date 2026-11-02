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

// Dismiss the two first-run dialogs (no key entered, no sign-in).
await tryClick(/^Continue$/, 5000);
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/welcome-nodialog.png' });

// Sidebar "Plugins" page shows installed plugins and toggles.
const gotPlugins = await tryClick(/^Plugins$/, 5000);
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/plugins.png' });
await page.screenshot({ path: 'shots/plugins-full.png', fullPage: true });

await browser.close();
console.log('shots done, gotPlugins=' + gotPlugins);
