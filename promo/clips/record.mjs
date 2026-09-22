import { chromium } from '/Users/sy/.claude/skills/gstack/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const OUT = process.argv[2];
const W = 1080, H = 1350; // 4:5, browser content scaled 0.75 from 1440
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MASK = readFileSync('/private/tmp/claude-501/-Users-sy/a266018c-1dec-457a-9efb-7ff01f4987a6/scratchpad/mask.js', 'utf8');

// Slow, visible pointer moves so the clip reads as a person using the tool.
async function glide(page, x, y, steps = 28) {
  await page.mouse.move(x, y, { steps });
}
async function clickAt(page, sel, opts = {}) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  const b = await el.boundingBox();
  await glide(page, b.x + b.width / 2, b.y + b.height / 2);
  await sleep(250);
  await el.click(opts);
}
async function typeSlow(page, sel, text) {
  await clickAt(page, sel);
  await page.keyboard.type(text, { delay: 90 });
}

const scenes = {
  // 1 · 입지분석: 장소 검색 → 후보 추가 → 반경 바꾸기
  location: async (page) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('button.metric strong');
    await sleep(2600);
    await clickAt(page, 'button.add-candidate');
    await sleep(700);
    await typeSlow(page, "[aria-label='추가할 후보지 검색']", '판교역');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.preset-options button');
    await sleep(1200);
    await clickAt(page, '.preset-options button');
    await sleep(3200);
    await page.mouse.wheel(0, 500); await sleep(1600);
    await page.mouse.wheel(0, -500); await sleep(800);
    await clickAt(page, "[aria-label='분석 범위']");
    await sleep(600);
    await clickAt(page, "[role=option]:has-text('2 km')");
    await sleep(3600);
  },
  // 2 · 입지분석: 지도와 인구 추이, 비용 탭의 임대료
  location2: async (page) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('svg.trend-chart');
    await sleep(1800);
    await page.mouse.wheel(0, 380); await sleep(2200);
    await clickAt(page, "[role=tab]:has-text('비용')");
    await sleep(900);
    await page.mouse.wheel(0, 260); await sleep(1400);
    await clickAt(page, '.rent-grid select >> nth=2');
    await sleep(500);
    await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
    await sleep(1200);
    await clickAt(page, '.rent-result button');
    await sleep(2600);
  },
  // 3 · AI 검색 진단: 수집 결과 → 답변 원문 → 우리 병원 형광
  answer: async (page) => {
    await page.goto('http://127.0.0.1:5201/ko/workspace.html');
    await page.waitForSelector('nav button');
    await sleep(1400);
    await clickAt(page, "nav button:has-text('AI 검색 진단')");
    await sleep(1200);
    await page.evaluate(MASK);
    await page.evaluate(() => document.querySelectorAll('.pw-filter').forEach((e) => (e.style.display = 'none')));
    await page.evaluate(() => document.querySelector('.pw-evidence')?.scrollIntoView({ block: 'start' }));
    await sleep(1200);
    await page.evaluate(() => { const b = [...document.querySelectorAll('.pw-answer-list button')].find((x) => x.textContent.includes('Gemini') && x.textContent.includes('근처')); b && b.click(); });
    await sleep(600);
    await page.evaluate(MASK);
    await sleep(1400);
    await page.evaluate(() => document.querySelector('.pw-ai-own')?.scrollIntoView({ block: 'center' }));
    await sleep(2600);
    await page.evaluate(() => document.querySelector('.pw-sources')?.scrollIntoView({ block: 'center' }));
    await sleep(2400);
  },
  // 4 · 오늘의 현황 → 성과 보고서
  overview: async (page) => {
    await page.goto('http://127.0.0.1:5201/ko/workspace.html');
    await page.waitForSelector('nav button');
    await page.evaluate(MASK);
    await sleep(2600);
    await page.mouse.wheel(0, 420); await sleep(1800);
    await clickAt(page, "nav button:has-text('성과 보고서')");
    await sleep(900);
    await page.evaluate(MASK);
    await sleep(1800);
    await page.mouse.wheel(0, 520); await sleep(2400);
  },
};

const name = process.argv[3];
const browser = await chromium.launch({ headless: false, args: ['--hide-scrollbars'] });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 1800 },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: 1440, height: 1800 } },
});
const page = await ctx.newPage();
try { await scenes[name](page); } catch (e) { console.error('scene error', e.message); }
const video = page.video();
await ctx.close();
console.log(name, await video.path());
await browser.close();
