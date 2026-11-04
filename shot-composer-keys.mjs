import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

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
await tryClick(/^Continue$/, 5000);
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// Open the Plugins page from the sidebar and screenshot it.
const pluginsPage = await tryClick(/Plugins/, 10000);
console.log('PLUGINS_PAGE=' + pluginsPage);
await page.waitForTimeout(3000);
await page.screenshot({ path: 'shots/composer-keys-plugins.png' });

// Try to open the composer-keys plugin row / config page.
let configOpened = false;
for (const pat of [/dsh-composer-keys/, /composer-keys/]) {
  try {
    const loc = page.getByText(pat, { exact: false }).first();
    await loc.waitFor({ state: 'visible', timeout: 5000 });
    await loc.click();
    configOpened = true;
    break;
  } catch {}
}
console.log('CONFIG_ROW_CLICK=' + configOpened);
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/composer-keys-config.png' });

// Try the WeChat-style preset (Enter = send) if its checkbox/label is visible.
let presetClicked = false;
for (const pat of [/微信/, /WeChat/]) {
  try {
    const loc = page.getByText(pat, { exact: false }).first();
    await loc.waitFor({ state: 'visible', timeout: 4000 });
    await loc.click();
    presetClicked = true;
    break;
  } catch {}
}
console.log('WECHAT_PRESET_CLICK=' + presetClicked);
if (presetClicked) {
  const saved = await tryClick(/保存|Save/, 4000);
  console.log('SAVE_CLICK=' + saved);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'shots/composer-keys-config-saved.png' });
}

// Back to a fresh chat: click the new-chat control if present, then test Enter.
await tryClick(/New chat|New session|新会话/, 4000);
await page.waitForTimeout(2000);

// Find the composer textbox and type a probe message.
let composer = null;
for (const sel of ['textarea', '[contenteditable="true"]', 'div[role="textbox"]']) {
  const loc = page.locator(sel).last();
  if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) { composer = loc; break; }
}
console.log('COMPOSER_FOUND=' + !!composer);
if (composer) {
  await composer.click();
  await composer.fill('composer-keys probe');
  await page.waitForTimeout(500);
  // Press Enter: with the WeChat preset this should SEND; with defaults it inserts a newline.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  const probeVisible = await page.getByText('composer-keys probe', { exact: false }).count();
  console.log('PROBE_SENT_AS_MESSAGE=' + (probeVisible > 0));
  await page.screenshot({ path: 'shots/composer-keys-enter-test.png' });
}

await browser.close();
console.log('composer-keys shot done');
