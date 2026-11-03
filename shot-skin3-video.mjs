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
await page.screenshot({ path: 'shots/skin3-welcome.png' });

// Dismiss first-run dialogs.
await tryClick(/^Continue$/, 5000);
await page.waitForTimeout(1500);
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);

// Open skin3 theme panel via the floating paint button.
const gotTheme = await tryClick(/🎨/, 15000);
console.log('THEME_BUTTON=' + gotTheme);
await page.waitForTimeout(3000);
await page.screenshot({ path: 'shots/skin3-panel.png' });

if (gotTheme) {
  // The wallpaper grid lives inside the collapsed background section:
  // expand it first, otherwise the upload button is not visible.
  const expanded = await tryClick(/背景/, 10000);
  console.log('BG_SECTION_EXPANDED=' + expanded);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'shots/skin3-bg-expanded.png' });
  // Click the dynamic-wallpaper upload cell and feed the test video.
  try {
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 30000 }),
      page.getByText(/上传动态壁纸/).first().click(),
    ]);
    await chooser.setFiles('skin3-test-video.mp4');
    console.log('FILECHOOSER_SET=ok');
  } catch (e) { console.log('FILECHOOSER_SET=fail ' + e.message); }

  // The panel closes on the post-upload refresh, so reopen it if the
  // grid is gone before looking for the uploaded cell.
  let cellThere = false;
  try { cellThere = await page.getByText('skin3-test-video.mp4', { exact: false }).first().isVisible(); } catch { cellThere = false; }
  if (!cellThere) {
    console.log('PANEL_REOPEN=try');
    await tryClick(/🎨/, 10000);
    await page.waitForTimeout(2000);
    await tryClick(/背景/, 10000);
    await page.waitForTimeout(2000);
  }
  // Wait for the uploaded video cell (named after the file) to appear.
  let uploaded = false;
  try {
    await page.getByText('skin3-test-video.mp4', { exact: false }).first().waitFor({ state: 'visible', timeout: 60000 });
    uploaded = true;
  } catch { uploaded = false; }
  console.log('VIDEO_CELL_VISIBLE=' + uploaded);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'shots/skin3-uploaded.png' });

  // Click the video cell to apply it as wallpaper.
  if (uploaded) {
    await page.getByText('skin3-test-video.mp4', { exact: false }).first().click();
    await page.waitForTimeout(4000);
  }
  await page.screenshot({ path: 'shots/skin3-applied.png' });
  await page.screenshot({ path: 'shots/skin3-applied-full.png', fullPage: true });

  // Verify from inside the page: IndexedDB videos count + wallpaper video element.
  try {
    const info = await page.evaluate(async () => {
      const db = await new Promise((res, rej) => {
        const r = indexedDB.open('dsh-anime-theme', 1);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      let count = -1;
      try {
        count = await new Promise((res, rej) => {
          const tx = db.transaction('videos', 'readonly').objectStore('videos').count();
          tx.onsuccess = () => res(tx.result);
          tx.onerror = () => rej(tx.error);
        });
      } catch { count = -2; }
      const vids = [...document.querySelectorAll('video')].map(v => ({
        loop: v.loop, autoplay: v.autoplay, muted: v.muted, paused: v.paused,
        readyState: v.readyState, id: v.id, cls: v.className,
      }));
      return { idbVideos: count, videos: vids };
    });
    console.log('PAGE_CHECK=' + JSON.stringify(info));
  } catch (e) { console.log('PAGE_CHECK=fail ' + e.message); }
}

await browser.close();
console.log('skin3 video shot done');
