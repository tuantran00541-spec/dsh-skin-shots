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
await page.screenshot({ path: 'shots/skin3-mascot-welcome.png' });

// Dismiss first-run dialogs.
await tryClick(/^Continue$/, 5000);
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// Open skin3 theme panel, then go to the mascot page.
const gotTheme = await tryClick(/🎨/, 15000);
console.log('THEME_BUTTON=' + gotTheme);
await page.waitForTimeout(2000);
const gotMascotPage = await tryClick(/挂件/, 10000);
console.log('MASCOT_PAGE=' + gotMascotPage);
await page.waitForTimeout(2000);
await page.screenshot({ path: 'shots/skin3-mascot-page.png' });

if (gotTheme && gotMascotPage) {
  // Click the mascot upload cell and feed the test GIF.
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 30000 }),
      page.getByText(/上传挂件/).first().click(),
    ]);
    await chooser.setFiles('skin3-test-mascot.gif');
    console.log('FILECHOOSER_SET=ok');
  } catch (e) { console.log('FILECHOOSER_SET=fail ' + e.message); }

  // Wait until the custom mascot lands in localStorage.
  let saved = false;
  try {
    await page.waitForFunction(() => {
      try {
        const arr = JSON.parse(localStorage.getItem('dsh-anime-theme.customMascots') || '[]');
        return arr.length > 0;
      } catch { return false; }
    }, { timeout: 30000 });
    saved = true;
  } catch { saved = false; }
  console.log('MASCOT_SAVED=' + saved);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'shots/skin3-mascot-applied.png' });
  await page.screenshot({ path: 'shots/skin3-mascot-applied-full.png', fullPage: true });

  // Verify from inside the page: stored GIFs, settings set, mascot img.
  try {
    const info = await page.evaluate(() => {
      let count = -1, set = null;
      try { count = JSON.parse(localStorage.getItem('dsh-anime-theme.customMascots') || '[]').length; } catch {}
      try { set = JSON.parse(localStorage.getItem('dsh-anime-theme.settings') || '{}').mascotSet; } catch {}
      const img = document.getElementById('dsh-anime-mascot');
      let box = null;
      if (img) { const r = img.getBoundingClientRect(); box = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }
      return { customMascots: count, mascotSet: set, mascotImg: !!img, mascotGif: img ? (img.src || '').startsWith('data:image/gif') : false, box };
    });
    console.log('PAGE_CHECK=' + JSON.stringify(info));
  } catch (e) { console.log('PAGE_CHECK=fail ' + e.message); }
}

await browser.close();
console.log('skin3 mascot shot done');
