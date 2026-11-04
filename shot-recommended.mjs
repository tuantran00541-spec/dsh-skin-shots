import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

// Generic runner screenshot: boot state + Plugins page, for one-plugin install tests.
// DSH_URL is the token login URL printed by `dsh web` (parsed from dsh.log).
const url = process.env.DSH_URL;
if (!url) throw new Error('DSH_URL is empty');

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('dialog', async (d) => { console.log('DIALOG:', d.message()); await d.accept(); });

async function tryClick(pattern, timeout = 5000) {
  try {
    const loc = page.getByText(pattern, { exact: false }).first();
    await loc.waitFor({ state: 'visible', timeout });
    await loc.click();
    return true;
  } catch { return false; }
}

await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: 'shots/welcome.png' });
await tryClick(/^Continue$/, 5000);
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);
const pluginsPage = await tryClick(/Plugins/, 10000);
console.log('PLUGINS_PAGE=' + pluginsPage);
await page.waitForTimeout(3000);
await page.screenshot({ path: 'shots/plugins.png' });
await browser.close();
console.log('recommended shot done');
