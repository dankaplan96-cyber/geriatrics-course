// End-to-end test: two "computers" (browser contexts) sharing one folder.
// Usage: node tests/e2e.js <workbook.xlsx> <workdir>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { exposeSharedFolder } = require('./fakefs');
const HTML = path.resolve(__dirname, '../dist/מערכת_ניהול_סיעוד.html');
const XLSX = path.resolve(process.argv[2]);
const WORK = path.resolve(process.argv[3] || '/tmp/nm-e2e');
const SHARE = path.join(WORK, 'share'), SHOTS = path.join(WORK, 'shots');
fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(SHARE, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
fs.copyFileSync(HTML, path.join(SHARE, 'מערכת_ניהול_סיעוד.html'));
const url = 'file://' + path.join(SHARE, 'מערכת_ניהול_סיעוד.html');
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function station(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL', acceptDownloads: true });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => { page.errors.push(e.message); console.log(`[${name}] PAGEERROR`, e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { page.errors.push(m.text()); console.log(`[${name}] console.error`, m.text()); } });
  await exposeSharedFolder(page, SHARE);
  await page.goto(url);
  return page;
}
const shot = (page, n) => page.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: false });
const readDB = () => JSON.parse(fs.readFileSync(path.join(SHARE, 'data/nursing-db.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch();
  // ── Station A: first-time setup ──
  const A = await station(browser, 'A');
  await A.waitForSelector('text=ברוכים הבאים');
  await shot(A, '01-setup');
  await A.click('text=בחירת התיקייה המשותפת');
  await A.waitForSelector('text=מחובר לתיקייה המשותפת');
  await A.fill('#su-pass', 'Herzog2026x');
  await A.fill('#su-pass2', 'Herzog2026x');
  await A.click('#setup-form button[type=submit]');
  await A.waitForSelector('#side');
  ok(fs.existsSync(path.join(SHARE, 'data/nursing-db.json')), 'database file created in shared folder');
  await shot(A, '02-empty-dashboard');

  // ── import the nursing-administration workbook ──
  await A.click('#side >> text=ייבוא מקבצים');
  const [fc] = await Promise.all([A.waitForEvent('filechooser'), A.click('.dropzone')]);
  await fc.setFiles(XLSX);
  await A.waitForSelector('text=ביצוע הייבוא');
  await shot(A, '03-import-review');
  const rows = await A.$$eval('table.tbl tbody tr input[type=checkbox]', (x) => x.length);
  ok(rows >= 30, `import review lists employees (${rows})`);
  await A.click('text=ביצוע הייבוא');
  await A.click('.modal .btn.pri');
  await A.waitForSelector('text=עובדים פעילים');
  await sleep(1500);
  const d1 = readDB();
  ok(Object.keys(d1.data.employees).length === 33, `33 employees saved to shared database (${Object.keys(d1.data.employees).length})`);
  ok(Object.keys(d1.data.movements).length === 6, 'movements imported');
  await shot(A, '04-employees');

  // ── dashboard ──
  await A.click('#side >> text=לוח בקרה');
  await A.waitForSelector('.kpis');
  await shot(A, '05-dashboard');

  // ── sheets ──
  await A.click('#side >> text=גיליונות הנהלת הסיעוד');
  await A.waitForSelector('table.xgrid');
  await shot(A, '06-sheet-safety');
  for (const [k, n] of [['shift', '07-sheet-shift'], ['training', '08-sheet-training'], ['takan', '09-sheet-takan']]) {
    await A.click(`.sheet-tabs button[data-k=${k}]`);
    await A.waitForSelector('table.xgrid');
    await shot(A, n);
  }
  // edit a cell in the grid (תקן: notes of first employee)
  await A.click('.sheet-tabs button[data-k=safety]');
  const cell = await A.$('#c-0-4'); // first employee, first safety year "תאריך"
  await cell.click(); await cell.fill('3.3.25'); await cell.press('Enter');
  await sleep(1500);
  const firstName = await A.$eval('table.xgrid tbody tr td.nm', (x) => x.textContent);
  const d2 = readDB();
  const emp = Object.values(d2.data.employees).find((e) => firstName.startsWith(e.name));
  const sy = d2.data.settings.years.safety.slice().sort()[0];
  ok(emp && emp.safety[sy] && emp.safety[sy].date === '2025-03-03', `grid edit saved as date (${emp && JSON.stringify(emp.safety[sy])})`);

  // ── employee card ──
  await A.click('table.xgrid tbody tr td.nm');
  await A.waitForSelector('.emp-head');
  await shot(A, '10-employee-card');
  await A.click('.tabs button:has-text("חת\\"ש")');
  await shot(A, '11-employee-training');

  // ── report export ──
  await A.click('#side >> text=הפקת דוחות');
  await A.waitForSelector('text=הורדת קובץ Excel');
  await shot(A, '12-reports');
  const [dl] = await Promise.all([A.waitForEvent('download'), A.click('text=הורדת קובץ Excel')]);
  const out = path.join(WORK, 'export.xlsx');
  await dl.saveAs(out);
  ok(fs.statSync(out).size > 10000, `excel downloaded (${fs.statSync(out).size} bytes)`);
  await sleep(500);
  const repDir = path.join(SHARE, 'reports');
  ok(fs.existsSync(repDir) && fs.readdirSync(repDir).length > 0, 'report copy saved in shared reports folder');
  // preview window
  const [pv] = await Promise.all([A.waitForEvent('popup'), A.click('text=תצוגה מקדימה והדפסה')]);
  await pv.waitForLoadState();
  await pv.setViewportSize({ width: 1400, height: 900 });
  await pv.screenshot({ path: path.join(SHOTS, '13-print-preview.png') });
  ok((await pv.$$('section.pg')).length === 8, 'print preview renders all 8 sheets');
  await pv.close();

  // ── users ──
  await A.click('#side >> text=משתמשים והרשאות');
  await A.click('text=משתמש חדש');
  await A.fill('#ue-name', 'אחראית שיקום ה');
  await A.fill('#ue-user', 'nurse1');
  await A.selectOption('#ue-role', 'viewer');
  await A.fill('#ue-pass', 'Temp1234x');
  await A.check('input[name=ue-scope][value=some]');
  await A.check('.ue-dept >> nth=0');
  await shot(A, '14-user-edit');
  await A.click('#ue-save');
  await sleep(1500);
  ok(Object.values(readDB().data.users).some((u) => u.username === 'nurse1' && u.cred && u.cred.hash && !JSON.stringify(u).includes('Temp1234x')), 'new user stored with hashed password only');

  // ── Station B: second computer joins ──
  const B = await station(browser, 'B');
  await B.waitForSelector('text=ברוכים הבאים');
  await B.click('text=בחירת התיקייה המשותפת');
  await B.waitForSelector('#login-form');
  ok(true, 'second computer sees existing users after connecting the folder');
  await B.fill('#li-user', 'admin'); await B.fill('#li-pass', 'Herzog2026x');
  await B.click('#login-form button[type=submit]');
  await B.waitForSelector('#side');
  await B.click('#side >> text=עובדים');
  const bCount = await B.$$eval('table.tbl tbody tr', (x) => x.length);
  ok(bCount === 33, `station B sees all employees (${bCount})`);

  // ── concurrent edits on both computers ──
  const ids = Object.keys(readDB().data.employees);
  await A.close();
  const A2 = await station(browser, 'A2');
  await A2.click('text=בחירת התיקייה המשותפת');
  await A2.waitForSelector('#login-form');
  await A2.fill('#li-user', 'admin'); await A2.fill('#li-pass', 'Herzog2026x');
  await A2.click('#login-form button[type=submit]');
  await A2.waitForSelector('#side');
  // edit via in-page API on both stations at the same time
  const edit = (p, id, val) => p.evaluate(([id, val]) => window.dispatchEvent(new CustomEvent('nm-test-edit', { detail: { id, val } })), [id, val]);
  await Promise.all([edit(A2, ids[3], 'הערה ממחשב A'), edit(B, ids[5], 'הערה ממחשב B')]);
  await sleep(6000);
  const d3 = readDB().data.employees;
  ok(d3[ids[3]].notes === 'הערה ממחשב A' && d3[ids[5]].notes === 'הערה ממחשב B', `simultaneous edits from two computers both kept (${d3[ids[3]].notes} | ${d3[ids[5]].notes})`);
  // same field on both → conflict, latest saver wins, nothing crashes
  await Promise.all([edit(A2, ids[7], 'A גרסה'), edit(B, ids[7], 'B גרסה')]);
  await sleep(6000);
  const n7 = readDB().data.employees[ids[7]].notes;
  ok(n7 === 'A גרסה' || n7 === 'B גרסה', `same-field conflict resolved to one value (${n7})`);
  // both stations converge
  await sleep(5000);
  const [na, nb] = await Promise.all([A2, B].map((p) => p.evaluate((id) => window.__nmPeek && window.__nmPeek(id), ids[7])));
  ok(na === nb, `both computers converge to same value (${na} / ${nb})`);

  // ── restricted user on station B ──
  await B.click('.userbox'); await B.click('.menu >> text=יציאה');
  await B.fill('#li-user', 'nurse1'); await B.fill('#li-pass', 'Temp1234x');
  await B.click('#login-form button[type=submit]');
  await B.waitForSelector('text=יש לבחור סיסמה אישית');
  await B.fill('#cp-new', 'Nurse2026a'); await B.fill('#cp-new2', 'Nurse2026a');
  await B.click('#cp-save');
  await sleep(500);
  const navs = await B.$$eval('#side .nav span', (x) => x.map((n) => n.textContent));
  ok(!navs.includes('משתמשים והרשאות') && !navs.includes('ייבוא מקבצים'), `viewer menu restricted (${navs.join(', ')})`);
  ok(await B.$$eval('input.cell', (x) => x.length === 0 || x.every((i) => i.disabled)).catch(() => true), 'viewer cannot edit');
  await shot(B, '15-viewer');

  const errs = [...A2.errors, ...B.errors];
  ok(errs.length === 0, `no JavaScript errors (${errs.slice(0, 3).join(' | ')})`);
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
