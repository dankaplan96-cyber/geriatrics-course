'use strict';
// ════════════════════════════════════════════════════════════════
// Reports (Excel in the nursing-administration format + print) and
// importing data from files.
// ════════════════════════════════════════════════════════════════

const RepUI = { sheets: REPORT_SHEETS.map((s) => s.key), depts: null, period: 'month', from: '', to: '' };

App.views.reports = {
  render() {
    const D = db();
    const depts = deptList(D).filter((d) => myDeptIds().includes(d.id));
    if (!RepUI.depts) RepUI.depts = [singleDept()].filter(Boolean);
    const [from, to] = repPeriod();
    return `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:start">
      <div class="card"><div class="hd"><h3>1. מחלקות</h3><div style="flex:1"></div><button class="btn sm ghost" data-act="repalldepts">בחירת הכל</button></div><div class="bd stack" style="gap:8px;max-height:300px;overflow:auto">
        ${depts.map((d) => `<label class="chk"><input type="checkbox" data-act="repdept" value="${d.id}" ${RepUI.depts.includes(d.id) ? 'checked' : ''}> ${esc(d.name)} <span class="faint small">(${employeesOf(D, { deptId: d.id }).length} עובדים)</span></label>`).join('') || '<div class="muted">לא הוגדרו מחלקות</div>'}
        <div class="faint small">לכל מחלקה נוצר קובץ Excel נפרד — בדיוק במבנה קובץ הנהלת הסיעוד.</div></div></div>
      <div class="card"><div class="hd"><h3>2. גיליונות</h3><div style="flex:1"></div><button class="btn sm ghost" data-act="repallsheets">בחירת הכל</button></div><div class="bd stack" style="gap:8px">
        ${REPORT_SHEETS.map((s) => `<label class="chk"><input type="checkbox" data-act="repsheet" value="${s.key}" ${RepUI.sheets.includes(s.key) ? 'checked' : ''}> ${esc(s.name.trim())}</label>`).join('')}
      </div></div>
      <div class="card"><div class="hd"><h3>3. תקופה לגיליון "תקינה" (נכנסים / עוזבים)</h3></div><div class="bd stack">
        <div class="seg">${[['month', 'החודש'], ['prev', 'חודש קודם'], ['year', 'השנה'], ['all', 'הכל'], ['custom', 'טווח…']].map(([v, l]) => `<button class="${RepUI.period === v ? 'on' : ''}" data-act="repperiod" data-v="${v}">${l}</button>`).join('')}</div>
        ${RepUI.period === 'custom' ? `<div class="row"><input class="inp" style="width:130px" placeholder="מתאריך" value="${esc(U.fmtDate(RepUI.from))}" data-act="repfrom"><input class="inp" style="width:130px" placeholder="עד תאריך" value="${esc(U.fmtDate(RepUI.to))}" data-act="repto"></div>` : ''}
        <div class="muted small">${from ? `${U.fmtDateLong(from)} – ${U.fmtDateLong(to)}` : 'כל התקופות'}</div></div></div>
      <div class="card"><div class="hd"><h3>4. הפקה</h3></div><div class="bd stack">
        <div class="row"><button class="btn pri lg" data-act="repexport">${icon('download')} הורדת קובץ Excel</button><button class="btn lg" data-act="reppreview">${icon('eye')} תצוגה מקדימה והדפסה</button></div>
        <div class="muted small">${Store.connected ? 'עותק של כל דוח נשמר גם בתיקייה המשותפת: reports/' + U.todayISO() : 'מומלץ להתחבר לתיקייה המשותפת כדי ששמירת עותק הדוחות תתבצע אוטומטית.'}</div>
      </div></div></div>`;
  },
};
function repPeriod() {
  if (RepUI.period === 'custom') return [RepUI.from, RepUI.to];
  return periodRange(RepUI.period);
}
Object.assign(ACT, {
  repdept: (el) => { RepUI.depts = $$('input[data-act=repdept]:checked').map((x) => x.value); },
  repsheet: (el) => { RepUI.sheets = $$('input[data-act=repsheet]:checked').map((x) => x.value); },
  repalldepts: () => { RepUI.depts = myDeptIds(); render(); },
  repallsheets: () => { RepUI.sheets = REPORT_SHEETS.map((s) => s.key); render(); },
  repperiod: (el) => { RepUI.period = el.dataset.v; render(); },
  repfrom: (el) => { RepUI.from = U.parseDate(el.value) || ''; render(); },
  repto: (el) => { RepUI.to = U.parseDate(el.value) || ''; render(); },
  repexport: () => { const [movFrom, movTo] = repPeriod(); exportReports({ deptIds: RepUI.depts, sheets: RepUI.sheets, movFrom, movTo }); },
  reppreview: () => { const [movFrom, movTo] = repPeriod(); previewReports({ deptIds: RepUI.depts, sheets: RepUI.sheets, movFrom, movTo }); },
});

function reportFileName(deptId) {
  const d = new Date();
  return U.safeFileName(`הנהלת סיעוד - ${deptName(db(), deptId)} - ${U.pad2(d.getDate())}.${U.pad2(d.getMonth() + 1)}.${d.getFullYear()}.xlsx`);
}
function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
async function exportReports({ deptIds, sheets, movFrom = '', movTo = '' }) {
  if (!can('reports_export')) return toast('אין הרשאה להפקת דוחות', 'err');
  deptIds = (deptIds || []).filter((id) => myDeptIds().includes(id));
  if (!deptIds.length) return toast('יש לבחור מחלקה', 'warn');
  if (!sheets || !sheets.length) return toast('יש לבחור לפחות גיליון אחד', 'warn');
  for (const id of deptIds) {
    try {
      const wb = buildReportWorkbook(window.ExcelJS, REPORT_TEMPLATE, db(), id, { sheets, movFrom, movTo, author: App.user.displayName });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const name = reportFileName(id);
      downloadBlob(blob, name);
      try { await Store.saveReport(blob, name); } catch (e) { console.warn(e); }
      Store.update(() => {}, ['הפקת דוח', `${deptName(db(), id)} · ${sheets.length} גיליונות`]);
    } catch (e) { console.error(e); toast(`הפקת הדוח נכשלה: ${e.message}`, 'err'); }
  }
  toast(deptIds.length > 1 ? `${deptIds.length} קבצים הופקו` : 'הדוח הופק', 'ok');
}

// Renders an ExcelJS worksheet as an HTML table with the same formatting —
// used for preview and printing, so the printout matches the Excel file.
function worksheetHTML(ws) {
  const merges = {}, skip = new Set();
  for (const r of Object.values(ws._merges || {})) {
    const m = r.model || r;
    merges[`${m.top}:${m.left}`] = m;
    for (let y = m.top; y <= m.bottom; y++) for (let x = m.left; x <= m.right; x++) if (y !== m.top || x !== m.left) skip.add(`${y}:${x}`);
  }
  const maxC = Math.max(ws.columnCount, 1);
  const argb = (c) => (c && c.argb ? `#${c.argb.slice(-6)}` : '');
  const bw = { thin: '1px solid', medium: '2px solid', thick: '3px solid', double: '3px double', hair: '1px dotted', dotted: '1px dotted', dashed: '1px dashed' };
  const cols = []; for (let c = 1; c <= maxC; c++) cols.push(Math.round(((ws.getColumn(c).width || 9) * 7 + 5)));
  let html = `<table class="xl" style="width:${cols.reduce((a, b) => a + b, 0)}px"><colgroup>${cols.map((w) => `<col style="width:${w}px">`).join('')}</colgroup>`;
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const h = row.height ? Math.round(row.height * 96 / 72) : 19;
    html += `<tr style="height:${h}px">`;
    for (let c = 1; c <= maxC; c++) {
      if (skip.has(`${r}:${c}`)) continue;
      const cell = row.getCell(c);
      const m = merges[`${r}:${c}`];
      const s = cell.style || {};
      const css = [];
      if (s.font) { if (s.font.name) css.push(`font-family:'${s.font.name === 'Wingdings' || s.font.name === 'Wingdings 2' ? 'Segoe UI Symbol' : s.font.name}',Arial`); if (s.font.size) css.push(`font-size:${s.font.size}pt`); if (s.font.bold) css.push('font-weight:700'); if (s.font.color) css.push(`color:${argb(s.font.color)}`); }
      if (s.fill && s.fill.fgColor) css.push(`background:${argb(s.fill.fgColor)}`);
      const B = s.border || {};
      // RTL sheet: Excel's "left" border is drawn on the visual left
      for (const [side, prop] of [['left', 'left'], ['right', 'right'], ['top', 'top'], ['bottom', 'bottom']]) if (B[side] && B[side].style) css.push(`border-${prop}:${bw[B[side].style] || '1px solid'} ${argb(B[side].color) || '#000'}`);
      const al = s.alignment || {};
      css.push(`text-align:${al.horizontal === 'center' || al.horizontal === 'centerContinuous' ? 'center' : al.horizontal === 'left' ? 'left' : 'right'}`);
      css.push(`vertical-align:${al.vertical === 'top' ? 'top' : al.vertical === 'bottom' ? 'bottom' : 'middle'}`);
      css.push(al.wrapText ? 'white-space:pre-wrap' : 'white-space:nowrap');
      html += `<td${m ? ` rowspan="${m.bottom - m.top + 1}" colspan="${m.right - m.left + 1}"` : ''} style="${css.join(';')}">${esc(cellText(cell))}</td>`;
    }
    html += '</tr>';
  }
  return `${html}</table>`;
}
function cellText(cell) {
  let v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v || 'formula' in v) v = v.result;
    else if (v.richText) v = v.richText.map((t) => t.text).join('');
  }
  if (v == null || v === '') return '';
  const f = cell.numFmt || (cell.style && cell.style.numFmt) || '';
  if (v instanceof Date) return `${U.pad2(v.getUTCDate())}/${U.pad2(v.getUTCMonth() + 1)}/${String(v.getUTCFullYear()).slice(2)}`;
  if (typeof v === 'number') {
    if (/%/.test(f)) return `${U.round(v * 100, /0\.0/.test(f) ? 2 : 0)}%`;
    if (/0\.00/.test(f)) return v.toFixed(2);
    if (f === '0') return String(Math.round(v));
    return String(U.round(v, 2));
  }
  const font = cell.font && cell.font.name;
  if (font === 'Wingdings') return v === 'ü' ? '✓' : v === 'û' ? '✗' : v;
  return String(v);
}
async function previewReports({ deptIds, sheets, movFrom, movTo }) {
  deptIds = (deptIds || []).filter((id) => myDeptIds().includes(id));
  if (!deptIds.length || !sheets.length) return toast('יש לבחור מחלקה וגיליונות', 'warn');
  let pages = '';
  for (const id of deptIds) {
    const wb = buildReportWorkbook(window.ExcelJS, REPORT_TEMPLATE, db(), id, { sheets, movFrom, movTo });
    wb.eachSheet((ws) => { pages += `<section class="pg"><div class="cap">${esc(deptName(db(), id))} · ${esc(ws.name.trim())}</div><div class="fit">${worksheetHTML(ws)}</div></section>`; });
  }
  const doc = `<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>דוח הנהלת הסיעוד</title><style>
    @page{size:A4 landscape;margin:8mm} body{margin:0;background:#e9edf2;font-family:Arial} .bar{position:sticky;top:0;background:#1f4e79;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;z-index:5}
    .bar button{background:#fff;color:#1f4e79;border:0;border-radius:6px;padding:7px 14px;font-weight:700;cursor:pointer} .pg{background:#fff;margin:16px auto;padding:14px;width:fit-content;box-shadow:0 2px 8px rgba(0,0,0,.15)}
    .cap{font:12px Arial;color:#666;margin-bottom:8px} table.xl{border-collapse:collapse;table-layout:fixed;direction:rtl} table.xl td{padding:1px 3px;overflow:hidden;font-family:Arial;font-size:11pt}
    @media print{.bar{display:none}body{background:#fff}.pg{box-shadow:none;margin:0;padding:0;page-break-after:always}.cap{display:none}}
  </style></head><body><div class="bar"><b>תצוגה מקדימה — זהה לקובץ ה-Excel</b><span style="flex:1"></span><button onclick="window.print()">הדפסה / שמירה כ-PDF</button></div>${pages}
  <script>document.querySelectorAll('.fit').forEach(function(f){var t=f.firstChild;var max=1050;if(t&&t.offsetWidth>max){f.style.zoom=(max/t.offsetWidth).toFixed(3)}})<\/script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return toast('הדפדפן חסם את חלון התצוגה המקדימה — יש לאפשר חלונות קופצים', 'err');
  w.document.write(doc);
  w.document.close();
}

// ── Import ──────────────────────────────────────────────────────
const ImpUI = { parsed: null, plan: null, fileName: '', deptId: '', newDeptName: '', filter: 'all', open: {}, markLeft: {}, movs: true, staffing: true, legacy: null };

App.views.import = {
  render() {
    if (ImpUI.legacy) return legacyImportHTML();
    if (!ImpUI.plan) {
      return `<div class="card"><div class="bd">
        <div class="dropzone" data-drop="impfile" data-act="imppick">${icon('upload', 34)}<div class="big">גרירת קובץ לכאן או לחיצה לבחירה</div>
        <div class="small">קובץ Excel של הנהלת הסיעוד (כל הגיליונות: תקן, בטיחות הטיפול, אחראיות משמרת, שיחות, הערכות, חת"ש, תקינה, תקן מקוצר)<br>או קובץ נתונים מהגרסה הקודמת של המערכת (application-data.json)</div></div>
        <div class="grid g3" style="margin-top:18px">
          <div class="stack" style="gap:4px"><b>1. קריאה</b><span class="muted small">המערכת מזהה את הגיליונות ומאחדת את השורות של כל עובד/ת מכל הגיליונות לפי ת.ז. (או לפי שם, כשאין ת.ז.).</span></div>
          <div class="stack" style="gap:4px"><b>2. בדיקה</b><span class="muted small">מוצגת רשימת השינויים לפני ביצוע: עובדים חדשים, שדות שישתנו, התאמות שמות לא ודאיות ומספרי ת.ז. סותרים.</span></div>
          <div class="stack" style="gap:4px"><b>3. אישור</b><span class="muted small">רק השינויים שאושרו נכנסים למאגר. תאים ריקים בקובץ לא מוחקים מידע קיים. לפני הייבוא נשמר גיבוי.</span></div>
        </div></div></div>`;
    }
    const D = db();
    const P = ImpUI.plan;
    const items = P.items.filter((i) => ImpUI.filter === 'all' || (ImpUI.filter === 'uncertain' ? i.uncertain : i.action === ImpUI.filter));
    const cnt = (f) => P.items.filter(f).length;
    const depts = deptList(D);
    const actBadge = { new: '<span class="bdg blue">חדש</span>', update: '<span class="bdg warn">עדכון</span>', same: '<span class="bdg">ללא שינוי</span>' };
    const rows = items.map((it) => {
      const open = ImpUI.open[it.key];
      return `<tr class="${it.action === 'same' ? 'dim' : ''}"><td class="c"><input type="checkbox" data-act="impsel" data-k="${it.key}" ${it.selected ? 'checked' : ''} ${it.action === 'same' ? 'disabled' : ''}></td>
        <td><b>${esc(it.person.name)}</b>${it.empId && D.employees[it.empId] && D.employees[it.empId].name !== it.person.name ? ` <span class="small muted">(במאגר: ${esc(D.employees[it.empId].name)})</span>` : ''}<div class="tiny faint">${esc(it.person.sources.join(' · '))}</div></td>
        <td class="num small">${esc(it.person.idNum || '—')}</td><td>${roleBadge(it.person.fields.role || 'rn')}</td><td>${actBadge[it.action]} ${it.uncertain ? '<span class="bdg crit">לבדיקה</span>' : ''}</td>
        <td>${it.changes.length ? `<button class="btn sm ghost" data-act="impopen" data-k="${it.key}">${it.changes.length} שדות ${open ? '▲' : '▼'}</button>` : ''}</td></tr>
        ${it.notes.length ? `<tr><td></td><td colspan="5" class="small" style="color:var(--crit);padding-top:0">${it.notes.map(esc).join('<br>')}</td></tr>` : ''}
        ${open ? `<tr><td></td><td colspan="5" style="padding-top:0"><ul class="diff">${it.changes.map((c) => `<li><span class="muted">${esc(c.label)}:</span> ${c.from !== '' && c.from != null ? `<span class="from">${esc(displayCellValue(c.from, 'date'))}</span> ← ` : ''}<span class="to">${esc(displayCellValue(c.to, 'date'))}</span></li>`).join('')}</ul></td></tr>` : ''}`;
    }).join('');
    const newMov = P.movements.filter((m) => !m.exists).length;
    return `<div class="card" style="margin-bottom:16px"><div class="hd"><h3>${icon('file', 18)} ${esc(ImpUI.fileName)}</h3><span class="muted small">גיליונות שזוהו: ${esc(ImpUI.parsed.sheets.map((s) => s.trim()).join(', '))}</span><div style="flex:1"></div><button class="btn" data-act="impcancel">ביטול</button></div>
      <div class="bd"><div class="grid g3">
        ${fieldHTML('מחלקת יעד', `<select class="inp" data-act="impdept"><option value="">— בחירה —</option>${depts.map((d) => `<option value="${d.id}" ${ImpUI.deptId === d.id ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}<option value="__new" ${ImpUI.deptId === '__new' ? 'selected' : ''}>+ מחלקה חדשה: ${esc(ImpUI.parsed.deptTitle || '')}</option></select>`, { hint: ImpUI.parsed.deptTitle ? `בקובץ: "${esc(ImpUI.parsed.deptTitle)}"` : '' })}
        ${ImpUI.deptId === '__new' ? fieldHTML('שם המחלקה החדשה', `<input class="inp" data-act="impnewdept" value="${esc(ImpUI.newDeptName)}">`) : '<div></div>'}
        <div class="stack" style="gap:6px;justify-content:flex-end">
          ${P.movements.length ? `<label class="chk"><input type="checkbox" data-act="impmovs" ${ImpUI.movs ? 'checked' : ''}> ייבוא תנועות כ"א (${newMov} חדשות מתוך ${P.movements.length})</label>` : ''}
          ${P.staffing ? `<label class="chk"><input type="checkbox" data-act="impstf" ${ImpUI.staffing ? 'checked' : ''}> ייבוא נתוני "תקן מקוצר"</label>` : ''}
        </div></div>
        ${ImpUI.parsed.warnings.length ? `<div class="banner warn" style="margin:14px 0 0">${icon('warn')}<div class="grow small">${ImpUI.parsed.warnings.map(esc).join('<br>')}</div></div>` : ''}
      </div></div>
      <div class="card"><div class="hd"><div class="seg">${[['all', `הכל (${P.items.length})`], ['new', `חדשים (${cnt((i) => i.action === 'new')})`], ['update', `עדכונים (${cnt((i) => i.action === 'update')})`], ['uncertain', `לבדיקה (${cnt((i) => i.uncertain)})`], ['same', `ללא שינוי (${cnt((i) => i.action === 'same')})`]].map(([v, l]) => `<button class="${ImpUI.filter === v ? 'on' : ''}" data-act="impfilter" data-v="${v}">${l}</button>`).join('')}</div>
        <div style="flex:1"></div><button class="btn pri" data-act="impapply" ${ImpUI.deptId ? '' : 'disabled'}>${icon('check', 16)} ביצוע הייבוא</button></div>
        <div class="bd flush tbl-wrap"><table class="tbl"><thead><tr><th class="c" style="width:40px"></th><th>עובד/ת</th><th>ת.ז.</th><th>מעמד</th><th>פעולה</th><th>שינויים</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="faint" style="padding:14px">אין פריטים</td></tr>'}</tbody></table></div></div>
      ${P.missing.length ? `<div class="card" style="margin-top:16px"><div class="hd"><h3>עובדים במאגר שאינם מופיעים בקובץ (${P.missing.length})</h3><span class="muted small">לא יבוצע שינוי, אלא אם מסמנים "סיום העסקה"</span></div><div class="bd stack" style="gap:6px">${P.missing.map((e) => `<label class="chk"><input type="checkbox" data-act="impleft" value="${e.id}" ${ImpUI.markLeft[e.id] ? 'checked' : ''}> סיום העסקה: <b>${esc(e.name)}</b> <span class="faint small">${esc(e.idNum)}</span></label>`).join('')}</div></div>` : ''}`;
  },
};

Object.assign(ACT, {
  imppick: () => pickFiles({ accept: '.xlsx,.json' }, (files) => ACT.impfile(null, files)),
  impfile: async (el, files) => {
    const f = files[0];
    try {
      if (/\.json$/i.test(f.name)) {
        const doc = JSON.parse(await f.text());
        const data = doc.format === DOC_FORMAT ? normalizeDB(doc.data) : migrateLegacyState(doc.state || doc);
        ImpUI.legacy = { data, fileName: f.name };
        render();
        return;
      }
      const wb = new window.ExcelJS.Workbook();
      await wb.xlsx.load(await f.arrayBuffer());
      const parsed = parseWorkbook(wb);
      if (!parsed.people.length && !parsed.movements.length) { toast('לא נמצאו נתונים מוכרים בקובץ', 'err'); return; }
      ImpUI.parsed = parsed;
      ImpUI.fileName = f.name;
      const match = parsed.deptTitle ? findDeptByName(db(), parsed.deptTitle) : null;
      ImpUI.deptId = match ? match.id : (parsed.deptTitle ? '__new' : (singleDept() || ''));
      ImpUI.newDeptName = parsed.deptTitle || '';
      ImpUI.filter = 'all'; ImpUI.open = {}; ImpUI.markLeft = {};
      replanImport();
      render();
    } catch (e) { console.error(e); toast(`קריאת הקובץ נכשלה: ${e.message}`, 'err'); }
  },
  impdept: (el) => { ImpUI.deptId = el.value; replanImport(); render(); },
  impnewdept: (el) => { ImpUI.newDeptName = el.value.trim(); },
  impfilter: (el) => { ImpUI.filter = el.dataset.v; render(); },
  impopen: (el) => { ImpUI.open[el.dataset.k] = !ImpUI.open[el.dataset.k]; render(); },
  impsel: (el) => { const it = ImpUI.plan.items.find((i) => i.key === el.dataset.k); if (it) it.selected = el.checked; },
  impleft: (el) => { ImpUI.markLeft[el.value] = el.checked; },
  impmovs: (el) => { ImpUI.movs = el.checked; },
  impstf: (el) => { ImpUI.staffing = el.checked; },
  impcancel: () => { Object.assign(ImpUI, { parsed: null, plan: null, legacy: null }); render(); },
  impapply: async () => {
    const P = ImpUI.plan;
    const sel = P.items.filter((i) => i.selected && i.action !== 'same');
    const unc = sel.filter((i) => i.uncertain).length;
    const left = Object.keys(ImpUI.markLeft).filter((k) => ImpUI.markLeft[k]);
    if (!(await confirmBox('אישור ייבוא', `ייווצרו <b>${sel.filter((i) => i.action === 'new').length}</b> עובדים חדשים ויעודכנו <b>${sel.filter((i) => i.action === 'update').length}</b> עובדים.${unc ? `<br><span style="color:var(--crit)">${unc} מהם מסומנים "לבדיקה".</span>` : ''}${left.length ? `<br>${left.length} עובדים יסומנו כמי שסיימו העסקה.` : ''}<br><br>לפני הייבוא יישמר גיבוי.`, { ok: 'ביצוע' }))) return;
    try { if (Store.connected) await Store.backupNow('לפני-ייבוא'); } catch (e) { console.warn(e); }
    let deptId = ImpUI.deptId;
    let res;
    Store.update((d) => {
      if (deptId === '__new') {
        const name = ImpUI.newDeptName || ImpUI.parsed.deptTitle || 'מחלקה חדשה';
        const dep = findDeptByName(d, name) || newDept(name, { order: Object.keys(d.depts).length });
        d.depts[dep.id] = dep;
        deptId = dep.id;
        P.deptId = dep.id;
      }
      res = applyImport(d, P, App.user, { importMovements: ImpUI.movs, importStaffing: ImpUI.staffing, markMissingLeft: left });
    });
    Store.update(() => {}, ['ייבוא מקובץ', `${ImpUI.fileName} → ${deptName(db(), deptId)}: ${res.created} חדשים, ${res.updated} עודכנו, ${res.movements} תנועות`]);
    toast(`הייבוא הושלם: ${res.created} חדשים, ${res.updated} עודכנו${res.movements ? `, ${res.movements} תנועות` : ''}`, 'ok');
    Object.assign(ImpUI, { parsed: null, plan: null });
    App.dept = deptId; localStorage.setItem('nm3.dept', deptId);
    go('employees');
  },
});
function replanImport() {
  const deptId = ImpUI.deptId === '__new' ? '__new' : ImpUI.deptId;
  ImpUI.plan = planImport(db(), ImpUI.parsed, deptId || '__none');
  if (ImpUI.deptId === '__new' || !ImpUI.deptId) ImpUI.plan.missing = [];
}

// ── Import from the previous version / another database file ──
function legacyImportHTML() {
  const L = ImpUI.legacy.data;
  const D = db();
  const emps = Object.values(L.employees);
  const known = new Set(Object.values(D.employees).map((e) => e.idNum).filter(Boolean));
  const newEmps = emps.filter((e) => !e.idNum || !known.has(e.idNum));
  const newUsers = Object.values(L.users).filter((u) => !Object.values(D.users).some((x) => x.username === u.username));
  return `<div class="card"><div class="hd"><h3>${icon('file', 18)} ${esc(ImpUI.legacy.fileName)}</h3><div style="flex:1"></div><button class="btn" data-act="impcancel">ביטול</button></div><div class="bd stack">
    <div>נמצאו בקובץ: <b>${Object.keys(L.depts).length}</b> מחלקות, <b>${emps.length}</b> עובדים, <b>${Object.keys(L.users).length}</b> משתמשים, <b>${Object.keys(L.movements).length}</b> תנועות כ"א.</div>
    <div>ייתווספו למאגר: <b>${newEmps.length}</b> עובדים שאינם קיימים (לפי ת.ז.), <b>${newUsers.length}</b> משתמשים חדשים, ומחלקות חסרות. נתונים קיימים לא ישתנו.</div>
    <div class="row"><button class="btn pri" data-act="legacyapply">${icon('check', 16)} הוספה למאגר</button></div></div></div>`;
}
ACT.legacyapply = async () => {
  const L = ImpUI.legacy.data;
  try { if (Store.connected) await Store.backupNow('לפני-ייבוא'); } catch (e) { console.warn(e); }
  let n = 0;
  Store.update((d) => {
    const deptMap = {};
    for (const dep of Object.values(L.depts)) {
      const ex = findDeptByName(d, dep.name);
      if (ex) deptMap[dep.id] = ex.id; else { d.depts[dep.id] = dep; deptMap[dep.id] = dep.id; }
    }
    const known = new Set(Object.values(d.employees).map((e) => e.idNum).filter(Boolean));
    for (const e of Object.values(L.employees)) {
      if (e.idNum && known.has(e.idNum)) continue;
      const ne = { ...e, id: d.employees[e.id] ? U.uid('emp') : e.id, deptId: deptMap[e.deptId] || e.deptId };
      d.employees[ne.id] = normalizeEmployee(ne);
      n++;
    }
    for (const u of Object.values(L.users)) if (!Object.values(d.users).some((x) => x.username === u.username)) d.users[u.id] = u;
    const mk = new Set(Object.values(d.movements).map((m) => `${m.kind}|${m.date}|${U.normName(m.name)}`));
    for (const m of Object.values(L.movements)) if (!mk.has(`${m.kind}|${m.date}|${U.normName(m.name)}`)) d.movements[m.id] = m;
    for (const [k, v] of Object.entries(L.staffing || {})) if (!d.staffing[deptMap[k] || k]) d.staffing[deptMap[k] || k] = v;
    if (L.legacy && !d.legacy) d.legacy = L.legacy;
  }, ['ייבוא מקובץ נתונים', `${ImpUI.legacy.fileName}`]);
  toast(`נוספו ${n} עובדים`, 'ok');
  ImpUI.legacy = null;
  go('employees');
};
