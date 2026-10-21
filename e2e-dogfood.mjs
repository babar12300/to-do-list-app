// Dogfood executor for Taskly. Needs playwright (`npm i -D playwright`) and the
// dev server running on :8080. Run: SHOTS_DIR=./dogfood-shots node e2e-dogfood.mjs
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const SHOTS = process.env.SHOTS_DIR;
const results = [];
let consoleErrors = [];

async function step(name, fn) {
  try {
    // Unlock guard: a stray open layer (menu/popover/dialog) locks the body;
    // dismiss it so one failed step cannot cascade into the rest of the run.
    for (let i = 0; i < 3; i++) {
      const locked = await page.evaluate(() =>
        getComputedStyle(document.body).pointerEvents === 'none' ||
        !!document.querySelector('[role=menu], [data-radix-popper-content-wrapper]'));
      if (!locked) break;
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name, String(e).split('\n')[0].slice(0, 220)]);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });

const expectVisible = async (loc) => { await loc.waitFor({ state: 'visible', timeout: 5000 }); };
const noMenus = async () => { await page.waitForFunction(() => !document.querySelector('[role=menu]'), null, { timeout: 5000 }); };
const composer = () => page.locator('[class*=rounded-bubble]').first();
const rows = () => page.locator('[role=button].group');
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: false });

// ---------- PHASE 1: fresh app ----------
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });

await step('P1 seeds: 3 task rows render', async () => {
  await expectVisible(rows().first());
  const n = await rows().count();
  if (n !== 3) throw new Error(`expected 3 rows, got ${n}`);
});
await step('P1 badges: Inbox 3, Starred 1', async () => {
  const inbox = await page.locator('nav button', { hasText: 'Inbox' }).innerText();
  const starred = await page.locator('nav button', { hasText: 'Starred' }).innerText();
  if (!inbox.includes('3')) throw new Error(`inbox: ${inbox}`);
  if (!starred.includes('1')) throw new Error(`starred: ${starred}`);
});
await step('P1 filter pills render (5)', async () => {
  for (const l of ['Tomorrow', 'Next 7 Days', 'Later', 'No Date']) await expectVisible(page.locator('button', { hasText: l }).first());
});
await step('P1 row+composer share 22px radius', async () => {
  const rowR = await rows().first().evaluate(el => getComputedStyle(el).borderRadius);
  const compR = await page.locator('[class*=rounded-bubble]').first().evaluate(el => getComputedStyle(el).borderRadius);
  if (rowR !== '22px' || compR !== '22px') throw new Error(`${rowR} / ${compR}`);
});
await step('P1 every row has a Task actions button', async () => {
  const n = await page.locator('button[aria-label="Task actions"]').count();
  if (n !== 3) throw new Error(`got ${n}`);
});
await step('P1 NotFound route renders', async () => {
  await page.goto(BASE + '/nonexistent', { waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText('404').or(page.getByText(/not found/i)).first());
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
});
await shot('p1-fresh');

// ---------- PHASE 2: item menu (both doors) + delete to empty ----------
await step('P2 ⋯ menu opens with correct bands', async () => {
  const row = rows().nth(1);
  await row.hover();
  await row.locator('button[aria-label="Task actions"]').click();
  const menu = page.locator('[role=menu]');
  await expectVisible(menu);
  const labels = await menu.locator('[role=menuitem]').allInnerTexts();
  const want = ['Open', 'Mark complete', 'Unstar task', 'Delete'];
  if (JSON.stringify(labels) !== JSON.stringify(want)) throw new Error(labels.join('|'));
  const seps = await menu.locator('[role=separator]').count();
  if (seps !== 2) throw new Error(`separators ${seps}`);
});
await step('P2 open row is visually marked vs neighbour', async () => {
  const handle = await rows().nth(1).elementHandle();
  await page.waitForFunction(
    el => getComputedStyle(el).backgroundColor !== 'rgb(255, 255, 255)', handle, { timeout: 3000 });
  const open = await rows().nth(1).evaluate(el => getComputedStyle(el).backgroundColor);
  const other = await rows().nth(0).evaluate(el => getComputedStyle(el).backgroundColor);
  if (open === other) throw new Error(`both ${open}`);
});
await step('P2 destructive item is last and red-ish', async () => {
  const row = rows().nth(1);
  await row.hover();
  await row.locator('button[aria-label="Task actions"]').click();
  const items = page.locator('[role=menu]').first().locator('[role=menuitem]');
  const last = items.last();
  if ((await last.innerText()) !== 'Delete') throw new Error('Delete not last');
  const color = await last.evaluate(el => getComputedStyle(el).color);
  const [r, g, b] = color.match(/\d+/g).map(Number);
  if (!(r > g && r > b)) throw new Error(color);
  await page.keyboard.press('Escape');
  await noMenus();
});
await step('P2 menu Star action works (data change)', async () => {
  const row = rows().nth(1);
  await row.hover();
  await row.locator('button[aria-label="Task actions"]').click();
  await page.locator('[role=menu]').first().locator('[role=menuitem]', { hasText: 'Unstar task' }).click();
  await noMenus();
  const starred = await page.locator('nav button', { hasText: 'Starred' }).innerText();
  if (starred.replace(/\D/g, '') !== '') throw new Error(`starred badge still: ${starred}`);
});
await step('P2 right-click menu shows same labels (parity)', async () => {
  const row = rows().nth(1);
  await row.hover();
  await row.locator('button[aria-label="Task actions"]').click();
  const dd = await page.locator('[role=menu]').first().locator('[role=menuitem]').allInnerTexts();
  await page.keyboard.press('Escape');
  await noMenus();
  await row.click({ button: 'right' });
  const cm = await page.locator('[role=menu]').first().locator('[role=menuitem]').allInnerTexts();
  await page.keyboard.press('Escape');
  await noMenus();
  if (JSON.stringify(dd) !== JSON.stringify(cm)) throw new Error(`dd:${dd.join('|')} vs cm:${cm.join('|')}`);
});
await step('P2 delete all 3 seeds via menu + AlertDialog', async () => {
  for (let i = 0; i < 3; i++) {
    const row = rows().first();
    await row.hover();
    await row.locator('button[aria-label="Task actions"]').click();
    await page.locator('[role=menu] [role=menuitem]', { hasText: 'Delete' }).first().click();
    await page.getByRole('alertdialog').waitFor();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').waitFor({ state: 'detached' });
    await noMenus();
  }
  if (await rows().count() !== 0) throw new Error('rows remain');
});
await step('P2 empty state: plain sentence, chrome intact', async () => {
  await expectVisible(page.getByText('Inbox zero! Add a task to get started.'));
  await expectVisible(page.getByPlaceholder('Add a task...'));
  const floats = await page.locator('.backdrop-blur-sm').count();
  if (floats > 0) throw new Error('floating tile in empty state');
});
await step('P2 deletions persist after reload', async () => {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText('Inbox zero! Add a task to get started.'));
});
await shot('p2-empty');

// ---------- PHASE 2b: populate ----------
await step('P2 quick-add basic task', async () => {
  await page.getByPlaceholder('Add a task...').fill('Buy groceries');
  await page.keyboard.press('Enter');
  await expectVisible(page.getByText('Buy groceries'));
});
await step('P2 quick-add task with due date (calendar popover)', async () => {
  await page.getByPlaceholder('Add a task...').fill('Book dentist');
  await composer().getByRole('button', { name: 'Due date' }).click();
  const pop = page.locator('[data-radix-popper-content-wrapper]');
  await expectVisible(pop);
  await pop.getByRole('gridcell', { name: String(new Date().getDate()), exact: true }).first().click();
  await pop.waitFor({ state: 'detached' });
  await page.getByPlaceholder('Add a task...').press('Enter');
  await expectVisible(page.getByText('Today', { exact: true }).first());
  await expectVisible(page.getByText('Book dentist'));
});
await step('P2 quick-add starred task', async () => {
  await page.getByPlaceholder('Add a task...').fill('Plan trip');
  await composer().getByRole('button', { name: 'Star task' }).click();
  await page.getByPlaceholder('Add a task...').press('Enter');
  const starred = await page.locator('nav button', { hasText: 'Starred' }).innerText();
  if (!starred.includes('1')) throw new Error(starred);
});
await step('P2 create custom list "Errands"', async () => {
  await page.getByRole('button', { name: 'New List' }).click();
  await page.locator('input[placeholder="New List"]').fill('Errands');
  await page.keyboard.press('Enter');
  await expectVisible(page.locator('nav').getByText('Errands'));
});
await step('P2 move task to Errands via detail select', async () => {
  await page.getByText('Buy groceries').click();
  const dialog = page.locator('[role=dialog][aria-label="Task details"]');
  await expectVisible(dialog);
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: /Errands/ }).click();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await dialog.waitFor({ state: 'detached' });
  const err = await page.locator('nav').getByText('Errands').locator('..').innerText();
  if (!err.includes('1')) throw new Error(`errands row: ${err}`);
});
await step('P2 all data persists after reload', async () => {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByText('Plan trip'));
  await expectVisible(page.locator('nav').getByText('Errands'));
});
await shot('p2-populated');

// ---------- PHASE 3: interaction sweep ----------
await step('P3 smart list nav: Today shows only dated task', async () => {
  await page.locator('nav button', { hasText: 'Today' }).click();
  await expectVisible(page.getByText('Book dentist'));
  if (await rows().count() !== 1) throw new Error(`rows ${await rows().count()}`);
});
await step('P3 smart list nav: Starred shows only starred', async () => {
  await page.locator('nav button', { hasText: 'Starred' }).click();
  await expectVisible(page.getByText('Plan trip'));
  if (await rows().count() !== 1) throw new Error(`rows ${await rows().count()}`);
});
await step('P3 custom list shows its task', async () => {
  await page.locator('nav').getByText('Errands').click();
  await expectVisible(page.getByText('Buy groceries'));
});
await step('P3 back to Inbox', async () => {
  await page.locator('nav button', { hasText: 'Inbox' }).click();
  await expectVisible(page.getByText('Plan trip'));
});
await step('P3 search filters + zero-results + clear', async () => {
  const search = page.getByPlaceholder('Search tasks...');
  await search.fill('trip');
  await expectVisible(page.getByText('Plan trip'));
  if (await rows().count() !== 1) throw new Error('search did not narrow');
  await search.fill('zzzz');
  await expectVisible(page.getByText(/No tasks match/));
  await search.fill('');
  await expectVisible(page.getByText('Plan trip'));
});
await step('P3 date pill filters data on/off', async () => {
  await page.locator('nav button', { hasText: 'Inbox' }).click();
  const before = await rows().count();
  await page.locator('button', { hasText: 'No Date' }).click();
  const during = await rows().count();
  await page.locator('button', { hasText: 'No Date' }).click();
  const after = await rows().count();
  if (!(during <= before && after === before)) throw new Error(`${before}->${during}->${after}`);
});
await step('P3 complete round-trip', async () => {
  const row = page.locator('[role=button].group', { hasText: 'Plan trip' });
  await row.locator('[role=checkbox]').click();
  await expectVisible(page.getByText(/Completed \(1\)/));
  await page.getByText(/Completed \(1\)/).click();
  const ghost = page.locator('[role=button].group', { hasText: 'Plan trip' });
  await ghost.locator('[role=checkbox]').click();
  await page.getByText(/Completed/).waitFor({ state: 'detached' });
});
await step('P3 detail exits: Esc, backdrop, X', async () => {
  const dialog = page.locator('[role=dialog][aria-label="Task details"]');
  await page.getByText('Plan trip').click();
  await expectVisible(dialog);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  await page.getByText('Plan trip').click();
  await expectVisible(dialog);
  await page.mouse.click(200, 450);
  await dialog.waitFor({ state: 'detached' });
  await page.getByText('Plan trip').click();
  await expectVisible(dialog);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await dialog.waitFor({ state: 'detached' });
});
await step('P3 sidebar collapse + restore + persist', async () => {
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expectVisible(page.getByRole('button', { name: 'Open sidebar' }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectVisible(page.getByRole('button', { name: 'Open sidebar' }));
  await page.getByRole('button', { name: 'Open sidebar' }).click();
  await expectVisible(page.getByPlaceholder('Search tasks...'));
});
await step('P3 list ⋯ menu: rename', async () => {
  const listRow = page.locator('nav').getByText('Errands').locator('..');
  await listRow.hover();
  await listRow.locator('button[aria-label="List actions"]').click();
  await page.locator('[role=menuitem]', { hasText: 'Rename' }).click();
  await noMenus();
  const input = page.locator('input[placeholder="New List"]');
  await expectVisible(input);
  await input.fill('Chores');
  await page.keyboard.press('Enter');
  await expectVisible(page.locator('nav').getByText('Chores'));
});
await step('P3 list right-click menu parity', async () => {
  await noMenus();
  await page.locator('nav').getByText('Chores').click({ button: 'right' });
  const menu = page.locator('[role=menu][data-state=open]').first();
  await menu.waitFor({ state: 'visible', timeout: 5000 });
  const labels = await menu.locator('[role=menuitem]').allInnerTexts();
  if (JSON.stringify(labels) !== JSON.stringify(['Rename', 'Delete'])) throw new Error(labels.join('|'));
  await page.mouse.click(720, 500); // outside-click exit (also part of the contract)
  await menu.waitFor({ state: 'detached', timeout: 5000 });
});
await step('P3 delete list via dialog; tasks move to Inbox', async () => {
  const listRow = page.locator('nav').getByText('Chores').locator('..');
  await listRow.hover();
  await listRow.locator('button[aria-label="List actions"]').click();
  await page.locator('[role=menu] [role=menuitem]', { hasText: 'Delete' }).first().click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').waitFor({ state: 'detached' });
  await noMenus();
  await page.locator('nav').getByText('Chores').waitFor({ state: 'detached' });
  await expectVisible(page.getByText('Buy groceries')); // back in Inbox
});
await step('P3 wallpaper switch + persist', async () => {
  await page.getByRole('button', { name: 'Wallpaper' }).click();
  const pop = page.locator('[data-radix-popper-content-wrapper]');
  await expectVisible(pop);
  const imgs = pop.locator('img');
  const broken = await imgs.evaluateAll(els => els.filter(i => i.complete && i.naturalWidth === 0).length);
  if (broken > 0) throw new Error(`${broken} broken thumbnails`);
  const src = await imgs.nth(3).getAttribute('src');
  const photoId = src.match(/photo-[0-9a-f-]+/)[0];
  await imgs.nth(3).click();
  await page.waitForFunction(
    id => [...document.querySelectorAll('.bg-cover')].some(el => el.style.backgroundImage.includes(id)),
    photoId, { timeout: 5000 });
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'domcontentloaded' });
  const bg2 = await page.evaluate(() => document.querySelector('.bg-cover')?.style.backgroundImage);
  if (!bg2.includes(photoId)) throw new Error('wallpaper not persisted');
});
await step('P3 settings language nl round-trip (data change)', async () => {
  await page.getByRole('button', { name: 'Settings' }).click();
  const dlg = page.getByRole('dialog');
  await expectVisible(dlg);
  await dlg.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Nederlands' }).click();
  await expectVisible(page.getByPlaceholder('Taak toevoegen...'));
  await expectVisible(page.locator('nav').getByText('Lijsten', { exact: true }));
  await dlg.getByRole('combobox').click();
  await page.getByRole('option', { name: 'English' }).click();
  await expectVisible(page.getByPlaceholder('Add a task...'));
  await page.keyboard.press('Escape');
  await dlg.waitFor({ state: 'detached' });
});

// ---------- PHASE 4: audits ----------
await step('P4 mobile 375: no horizontal overflow', async () => {
  await page.setViewportSize({ width: 375, height: 720 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) throw new Error(`overflow ${over}px`);
});
await step('P4 mobile: sidebar drawer open via toggle, close via scrim', async () => {
  // sidebarOpen persisted true from desktop, so the drawer starts open at 375.
  // The aside closes by translating off-screen, so assert its position.
  const asideOnScreen = () => page.evaluate(() => document.querySelector('aside').getBoundingClientRect().right > 0);
  const waitAside = (want) => page.waitForFunction(
    w => (document.querySelector('aside').getBoundingClientRect().right > 0) === w, want, { timeout: 5000 });
  if (!(await asideOnScreen())) throw new Error('drawer should start open');
  await page.mouse.click(360, 400); // scrim
  await waitAside(false);
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await waitAside(true);
  await page.mouse.click(360, 400); // leave closed for the next step
  await waitAside(false);
});
await shot('p4-mobile-375');
await step('P4 composer geometry: no part overlap at 375 (with date chip)', async () => {
  await page.getByPlaceholder('Add a task...').fill('x');
  await composer().getByRole('button', { name: 'Due date' }).click();
  const pop = page.locator('[data-radix-popper-content-wrapper]');
  await pop.getByRole('gridcell', { name: String(new Date().getDate()), exact: true }).first().click();
  await pop.waitFor({ state: 'detached' });
  const rects = await page.locator('[class*=rounded-bubble] > *').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; }));
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const [a, b] = [rects[i], rects[j]];
    const overlap = !(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]);
    if (overlap) throw new Error(`parts ${i} and ${j} overlap`);
  }
  await page.getByPlaceholder('Add a task...').fill('');
});
await step('P4 zero console errors across run', async () => {
  if (consoleErrors.length) throw new Error(consoleErrors.slice(0, 3).join(' || '));
});
await page.setViewportSize({ width: 1440, height: 900 });
await page.reload({ waitUntil: 'domcontentloaded' });
await shot('p4-final-desktop');

await browser.close();

let pass = 0, fail = 0;
for (const r of results) { r[0] === 'PASS' ? pass++ : fail++; console.log(r.join('  —  ')); }
console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
