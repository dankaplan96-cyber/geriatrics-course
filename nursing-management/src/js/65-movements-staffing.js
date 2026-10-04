'use strict';
// ════════════════════════════════════════════════════════════════
// Personnel movements (sheet "תקינה") and short staffing ("תקן מקוצר")
// ════════════════════════════════════════════════════════════════

const MovUI = { period: 'month', from: '', to: '' };
function periodRange(p) {
  const t = new Date(), y = t.getFullYear(), m = t.getMonth();
  const iso = (d) => U.isoOf(d);
  if (p === 'month') return [iso(new Date(y, m, 1)), iso(new Date(y, m + 1, 0))];
  if (p === 'prev') return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
  if (p === 'year') return [`${y}-01-01`, `${y}-12-31`];
  if (p === 'custom') return [MovUI.from, MovUI.to];
  return ['', ''];
}
const MOV_COLS = [
  { k: 'date', h: 'תאריך', type: 'date', w: 100 }, { k: 'name', h: 'שם', w: 170 }, { k: 'dept', h: 'מחלקה', w: 130, list: 'mv-depts' },
  { k: 'role', h: 'תפקיד / מעמד', w: 110, list: 'mv-roles' }, { k: 'reason', h: 'הערות / סיבה', w: 150 }, { k: 'col1', h: 'עמודה1', w: 110 }, { k: 'col2', h: 'עמודה2', w: 110 },
];

App.views.movements = {
  render() {
    const D = db();
    const ed = can('movements_edit');
    const [from, to] = periodRange(MovUI.period);
    const inR = (m) => { const d = U.parseDate(m.date) || ''; return (!from || (d && d >= from)) && (!to || (d && d <= to)); };
    const all = U.sortBy(Object.values(D.movements).filter(inR), (m) => U.parseDate(m.date) || '', (m) => m.name);
    const table = (kind, title) => {
      const rows = all.filter((m) => m.kind === kind);
      const cols = MOV_COLS.map((c) => (kind === 'out' && c.k === 'role' ? { ...c, h: 'מעמד' } : kind === 'out' && c.k === 'reason' ? { ...c, h: 'סיבה', list: 'mv-reasons' } : c));
      return `<div class="card" style="margin-bottom:16px"><div class="hd"><h3>${title}</h3><span class="muted small">${rows.length} רשומות</span><div style="flex:1"></div>${ed ? `<button class="btn sm" data-act="movadd" data-kind="${kind}">${icon('plus', 15)} הוספת שורה</button>` : ''}</div>
        <div class="bd flush tbl-wrap"><table class="xgrid" style="width:100%"><thead><tr>${cols.map((c) => `<th style="min-width:${c.w}px">${c.h}</th>`).join('')}<th style="min-width:40px"></th></tr></thead><tbody>
        ${rows.map((m) => `<tr>${cols.map((c) => `<td><input class="cell" data-act="movchange" data-id="${m.id}" data-k="${c.k}" value="${esc(c.type === 'date' ? U.fmtDate(m[c.k]) : m[c.k] || '')}" ${c.list ? `list="${c.list}"` : ''} ${ed ? '' : 'disabled'} style="text-align:${c.k === 'name' || c.k === 'reason' ? 'right' : 'center'}"></td>`).join('')}<td class="c">${ed ? `<button class="iconbtn" data-act="movdel" data-id="${m.id}" title="מחיקה">${icon('trash', 15)}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="8" class="faint" style="padding:12px">אין רשומות בתקופה זו</td></tr>`}
        </tbody></table></div></div>`;
    };
    const seg = [['month', 'החודש'], ['prev', 'חודש קודם'], ['year', 'השנה'], ['all', 'הכל'], ['custom', 'טווח…']];
    return `<div class="row" style="margin-bottom:14px"><div class="seg">${seg.map(([v, l]) => `<button class="${MovUI.period === v ? 'on' : ''}" data-act="movperiod" data-v="${v}">${l}</button>`).join('')}</div>
      ${MovUI.period === 'custom' ? `<input class="inp" style="width:120px" placeholder="מתאריך" value="${esc(U.fmtDate(MovUI.from))}" data-act="movfrom"><input class="inp" style="width:120px" placeholder="עד תאריך" value="${esc(U.fmtDate(MovUI.to))}" data-act="movto">` : ''}
      <span class="muted small">${from ? `${U.fmtDateLong(from)} – ${U.fmtDateLong(to)}` : 'כל התקופות'}</span><div style="flex:1"></div>
      <span class="muted small">רשומות נוספות אוטומטית בעת הוספת עובד/ת או סיום העסקה</span></div>
      ${table('in', 'נכנסים')}${table('out', 'הפסקת עבודה')}
      <datalist id="mv-depts">${deptList(D).map((d) => `<option value="${esc(d.name)}">`).join('')}</datalist>
      <datalist id="mv-roles"><option value="אח"><option value="אחות"><option value="אח/ות מעשי/ת"><option value="כוח עזר"><option value="סטודנט/ית"></datalist>
      <datalist id="mv-reasons"><option value="התפטרות"><option value="פיטורים"><option value="פרישה"><option value="מעבר מחלקה"><option value="סיום חוזה"></datalist>`;
  },
};
Object.assign(ACT, {
  movperiod: (el) => { MovUI.period = el.dataset.v; render(); },
  movfrom: (el) => { MovUI.from = U.parseDate(el.value) || ''; render(); },
  movto: (el) => { MovUI.to = U.parseDate(el.value) || ''; render(); },
  movadd: (el) => {
    const id = U.uid('mov');
    Store.update((d) => { d.movements[id] = { id, kind: el.dataset.kind, date: U.todayISO(), name: '', dept: deptName(d, singleDept()), role: '', reason: '', col1: '', col2: '' }; }, ['תנועת כ"א', 'נוספה שורה']);
    render();
    const inp = $(`input[data-id="${id}"][data-k="name"]`);
    if (inp) inp.focus();
  },
  movchange: (el) => {
    const k = el.dataset.k;
    const v = k === 'date' ? (U.parseDate(el.value) || el.value.trim()) : el.value.trim();
    const m = db().movements[el.dataset.id];
    if (!m || m[k] === v) return;
    Store.update((d) => { d.movements[m.id][k] = v; }, ['תנועת כ"א', `${m.name || 'שורה'}: ${k} = ${v}`]);
    if (k === 'date') el.value = U.fmtDate(v);
  },
  movdel: async (el) => {
    const m = db().movements[el.dataset.id];
    if (!(await confirmBox('מחיקת שורה', `למחוק את הרשומה "${esc(m.name || '')}"?`, { ok: 'מחיקה', danger: true }))) return;
    Store.update((d) => { delete d.movements[m.id]; }, ['תנועת כ"א', `נמחקה: ${m.name}`]);
    render();
  },
});

// ── תקן מקוצר ──────────────────────────────────────────────────
App.views.staffing = {
  needsDept: true,
  render() {
    const D = db();
    const deptId = singleDept();
    if (!deptId) return '<div class="card"><div class="empty"><div class="ttl">לא הוגדרו מחלקות</div></div></div>';
    const dept = D.depts[deptId];
    const S = staffingComputed(D, deptId);
    const f = D.settings.staffing;
    const ed = can('staffing_edit');
    const n2 = (v) => (v == null || v === '' ? '' : U.round(v, 2));
    const inp = (key, field, val, ph = '') => `<input class="inp num" style="text-align:center;min-width:70px" data-act="stfchange" data-k="${key}" data-f="${field}" value="${esc(n2(val))}" placeholder="${esc(ph)}" ${ed ? '' : 'disabled'}>`;
    const gapCls = (g) => (g == null ? '' : g < -0.05 ? 'crit' : g > 0.05 ? 'warn' : 'ok');
    const row = (key, label, editable, strong = false) => {
      const x = S[key];
      const st = staffingOf(D, deptId).rows[key] || {};
      return `<tr style="${strong ? 'background:#f6f8fb;font-weight:650' : ''}"><td class="b">${label}</td>
        <td class="c">${editable ? inp(key, 'moh', st.moh, key === 'aux' && x.moh != null ? `${x.moh} (מיטות×${f.auxBedFactor})` : '') : n2(x.moh)}</td>
        <td class="c">${editable ? inp(key, 'reqShifts', st.reqShifts, key === 'aux' && x.reqShifts != null ? String(n2(x.reqShifts)) : '') : n2(x.reqShifts)}</td>
        <td class="c">${editable ? inp(key, 'approvedShifts', st.approvedShifts) : n2(x.approvedShifts)}</td>
        <td class="c num">${x.ratio != null ? `${Math.round(x.ratio * 100)}%` : ''}</td>
        <td class="c num b">${n2(x.approvedFte)}</td>
        <td class="c">${editable ? `${inp(key, 'actualOverride', st.actualOverride, String(x.actualAuto))}` : `<b class="num">${n2(x.actual)}</b>`}</td>
        <td class="c"><span class="bdg ${gapCls(x.gap)}">${x.gap == null ? '—' : (x.gap > 0 ? '+' : '') + n2(x.gap)}</span></td></tr>`;
    };
    const di = (k, l, type = 'text') => fieldHTML(l, `<input class="inp" data-act="deptinfo" data-k="${k}" data-type="${type}" value="${esc(dept[k] ?? '')}" ${can('settings_edit') || ed ? '' : 'disabled'}>`);
    return `<div class="card" style="margin-bottom:16px"><div class="hd"><h3>${esc(dept.name)}</h3><span class="muted small">${esc(dept.division || D.settings.divisions[0] || '')} · מקדם תקינה לפי אחות ${f.nurseFactor} · כ"ע ${f.auxFactor}</span></div>
      <div class="bd"><div class="grid g5">${di('mix', 'תמהיל חולים')}${di('beds', 'מספר מיטות', 'num')}${di('headNurse', 'אחראי/ת מחלקה')}${di('deputy', 'סגן/ית')}${fieldHTML('אגף', selectHTML(`data-act="deptinfo" data-k="division" ${can('settings_edit') || ed ? '' : 'disabled'}`, [['', '—'], ...D.settings.divisions.map((x) => [x, x])], dept.division))}</div></div></div>
      <div class="card"><div class="bd flush tbl-wrap"><table class="tbl"><thead><tr><th>תפקיד</th><th class="c">דרישות משרד הבריאות ברוטו</th><th class="c">משמרות נדרשות לפי משרה"ב</th><th class="c">משמרות מאושרות לביצוע</th><th class="c">יחס מאושר/נדרש</th><th class="c">תקנים לפי משמרות מאושרות</th><th class="c">תקנים בפועל</th><th class="c">פער (בפועל − מאושר)</th></tr></thead><tbody>
        ${row('rn', 'א. מוסמכות', true)}${row('lpn', 'א. מעשיות', true)}${row('student', 'סטודנטים', true)}${row('nurses', 'סה"כ אחיות', false, true)}${row('aux', 'כוחות עזר', true)}${row('total', 'סה"כ', false, true)}
      </tbody></table></div></div>
      <div class="muted small" style="margin-top:10px">"תקנים בפועל" מחושב אוטומטית מחלקיות המשרה של העובדים הפעילים במחלקה (ניתן לדרוס ידנית — מחיקת הערך מחזירה לחישוב האוטומטי). תקנים לפי משמרות = משמרות ÷ ${f.nurseGross} לאחיות, ÷ ${f.otherGross} לסטודנטים וכוחות עזר.</div>`;
  },
};
Object.assign(ACT, {
  stfchange: (el) => {
    const deptId = singleDept();
    const n = el.value.trim() === '' ? null : U.num(el.value);
    if (el.value.trim() !== '' && n == null) { toast('יש להזין מספר', 'err'); return; }
    Store.update((d) => {
      const s = d.staffing[deptId] = d.staffing[deptId] || { rows: {} };
      s.rows = s.rows || {};
      s.rows[el.dataset.k] = { ...(s.rows[el.dataset.k] || {}), [el.dataset.f]: n };
    }, ['תקן מקוצר', `${deptName(db(), deptId)}: ${el.dataset.k}.${el.dataset.f} = ${n ?? ''}`]);
    render();
  },
  deptinfo: (el) => {
    const deptId = singleDept();
    const v = el.dataset.type === 'num' ? (U.num(el.value) ?? null) : el.value.trim();
    Store.update((d) => { d.depts[deptId][el.dataset.k] = v; }, ['עדכון מחלקה', `${deptName(db(), deptId)}: ${el.dataset.k}`]);
    render();
  },
});
