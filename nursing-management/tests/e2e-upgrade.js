// Upgrade path: a shared folder that only has the previous version's
// data/application-data.json. Opening the new version migrates it and the
// existing users keep their passwords.
// Usage: node tests/e2e-upgrade.js <workdir>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { webcrypto } = require('crypto');
const { exposeSharedFolder } = require('./fakefs');
const WORK = path.resolve(process.argv[2] || '/tmp/nm-upgrade');
const SHARE = path.join(WORK, 'share');
fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(path.join(SHARE, 'data'), { recursive: true });
fs.copyFileSync(path.resolve(__dirname, '../dist/מערכת_ניהול_סיעוד.html'), path.join(SHARE, 'מערכת_ניהול_סיעוד.html'));
let failures = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); if (!c) failures++; };

(async () => {
  // previous-version password hash (PBKDF2-SHA256, 600k, 256 bit, hex)
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey('raw', new TextEncoder().encode('OldPass2024'), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await webcrypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' }, key, 256);
  const hex = (u) => Buffer.from(u).toString('hex');
  const state = {
    dept: "שיקום ה'", departments: ["שיקום ה'", 'פנימית'], divisions: ['אגף גריאטריה'], departmentDivisions: { "שיקום ה'": 'אגף גריאטריה', 'פנימית': 'אגף גריאטריה' },
    employees: [
      { id: 'e1', firstName: 'רחל', lastName: 'לוי', idNum: '000000018', dept: "שיקום ה'", type: 'אח/ות מוסמכ/ת', scope: 100, startDate: '2020-01-07', isActive: true, careSafety: { 2025: { checker: 'א', date: '2024-10-30', score: '95' } } },
      { id: 'e2', firstName: 'משה', lastName: 'כהן', idNum: '000000026', dept: 'פנימית', type: 'כוח עזר', scope: 50, startDate: '2019-03-03', isActive: true },
    ],
    managementWorkbook: { movements: { incoming: [], outgoing: [] } },
    security: { users: [{ id: 'u1', username: 'manager', fullName: 'הנהלת הסיעוד', role: 'manager', permissions: ['*'], hash: hex(new Uint8Array(bits)), salt: hex(salt), hashAlgo: 'pbkdf2', active: true }], auditLog: [] },
  };
  fs.writeFileSync(path.join(SHARE, 'data/application-data.json'), JSON.stringify({ schemaVersion: 2, revision: 57, state }));

  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await exposeSharedFolder(page, SHARE);
  await page.goto('file://' + path.join(SHARE, 'מערכת_ניהול_סיעוד.html'));
  await page.click('text=בחירת התיקייה המשותפת');
  await page.waitForSelector('#login-form');
  ok(true, 'login screen shown after migration (users came from the old file)');
  await page.fill('#li-user', 'manager'); await page.fill('#li-pass', 'OldPass2024');
  await page.click('#login-form button[type=submit]');
  await page.waitForSelector('#side');
  ok(true, 'existing user logs in with the old password');
  await page.waitForTimeout(1500);
  const doc = JSON.parse(fs.readFileSync(path.join(SHARE, 'data/nursing-db.json'), 'utf8'));
  ok(Object.keys(doc.data.employees).length === 2 && Object.keys(doc.data.depts).length === 2, 'employees and departments migrated');
  ok(fs.existsSync(path.join(SHARE, 'data/application-data.json')), 'old data file left untouched');
  ok(Object.values(doc.data.employees).some((e) => e.safety && e.safety[2025] && e.safety[2025].score === '95'), 'nested data (safety checks) migrated');
  ok(errors.length === 0, `no JavaScript errors ${errors.join('|')}`);
  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
