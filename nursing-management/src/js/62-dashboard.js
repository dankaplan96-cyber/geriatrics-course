'use strict';
// ════════════════════════════════════════════════════════════════
// Dashboard — status of the departments at a glance
// ════════════════════════════════════════════════════════════════

App.views.dashboard = {
  render() {
    const D = db();
    const ids = currentDeptIds();
    if (!deptList(D).length) return firstStepsHTML();
    const st = deptStats(D, ids);
    const y = U.thisYear();
    const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
    const barCls = (p) => (p >= 80 ? '' : p >= 50 ? 'warn' : 'crit');
    const kpi = (lbl, val, sub, p = null, view = '', extra = '') => `<div class="card kpi ${view ? 'click' : ''}" ${view ? `data-act="go" data-view="${view}" ${extra}` : ''}><div class="lbl">${lbl}</div><div class="val">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}${p != null ? `<div class="bar ${barCls(p)}"><i style="width:${p}%"></i></div>` : ''}</div>`;
    const roleLine = ROLE_ORDER.map((r) => `${ROLES[r].plural}: <b>${st.byRole[r].length}</b>`).join(' · ');
    const half = st.half === 'h1' ? "מחצית א'" : "מחצית ב'";
    const crit = st.issues.filter((i) => i.sev === 'crit'), warn = st.issues.filter((i) => i.sev === 'warn');
    const fteAll = st.fte(ROLE_ORDER.flatMap((r) => st.byRole[r]));
    let approved = 0, anyApproved = false;
    for (const id of ids) { const s = staffingComputed(D, id).total; if (s.approvedFte != null) { approved += s.approvedFte; anyApproved = true; } }
    const kpis = `<div class="kpis">
      ${kpi('עובדים פעילים', st.total, roleLine, null, 'employees')}
      ${kpi('תקנים בפועל (FTE)', U.round(fteAll, 2), anyApproved ? `מאושר: ${U.round(approved, 2)} · פער: <b>${U.round(fteAll - approved, 2)}</b>` : 'לא הוגדר תקן מאושר', null, 'staffing')}
      ${kpi(`בטיחות הטיפול ${y}`, `${st.safetyDone}<small> / ${st.active}</small>`, `${pct(st.safetyDone, st.active)}% מהעובדים הפעילים נבדקו`, pct(st.safetyDone, st.active), 'sheets', 'data-tab="safety"')}
      ${kpi(`שיחות משוב · ${half} ${y}`, `${st.convDone}<small> / ${st.active}</small>`, `${pct(st.convDone, st.active)}% בוצעו`, pct(st.convDone, st.active), 'sheets', 'data-tab="conv"')}
      ${kpi(`הערכות עובדים ${y}`, `${st.evalDone}<small> / ${st.active}</small>`, `${pct(st.evalDone, st.active)}% בוצעו`, pct(st.evalDone, st.active), 'sheets', 'data-tab="evals"')}
      ${kpi('אחראי/ות משמרת', `${st.shiftValid}<small> / ${st.shiftCount}</small>`, 'מינויים בתוקף', st.shiftCount ? pct(st.shiftValid, st.shiftCount) : null, 'sheets', 'data-tab="shift"')}
      ${kpi('דורש טיפול', `<span style="color:var(--crit)">${crit.length}</span><small> דחוף · ${warn.length} לטיפול</small>`, st.absent ? `${st.absent} עובדים בהיעדרות ממושכת` : '')}
    </div>`;

    const issues = U.sortBy(st.issues.filter((i) => i.sev !== 'info'), (i) => (i.sev === 'crit' ? 0 : 1), (i) => i.due || '9999');
    const list = issues.length
      ? issues.slice(0, 60).map((i) => { const e = D.employees[i.empId]; return `<div class="issue click" data-act="emp" data-id="${i.empId}" data-tab="${i.tab}">${sevBadge(i.sev)}<div class="w"><div><b>${esc(e.name)}</b> <span class="muted small">· ${esc(deptName(D, e.deptId))}</span></div><div class="small">${esc(i.text)}</div></div><span class="bdg">${esc(i.area)}</span></div>`; }).join('') + (issues.length > 60 ? `<div class="issue muted small">ועוד ${issues.length - 60} פריטים…</div>` : '')
      : '<div class="empty"><div class="ttl">אין פריטים פתוחים</div>כל הנתונים מעודכנים 👍</div>';

    let deptTable = '';
    if (ids.length > 1) {
      const rows = ids.map((id) => {
        const s = deptStats(D, [id]);
        const sc = staffingComputed(D, id).total;
        const fte = s.fte(ROLE_ORDER.flatMap((r) => s.byRole[r]));
        const cell = (a, b) => { const p = pct(a, b); return `<td class="c"><span class="bdg ${b ? (p >= 80 ? 'ok' : p >= 50 ? 'warn' : 'crit') : ''}">${b ? `${a}/${b}` : '—'}</span></td>`; };
        return `<tr class="click" data-act="dept" data-value="${id}"><td class="b">${esc(deptName(D, id))}</td><td class="c num">${s.total}</td><td class="c num">${U.round(fte, 2)}</td><td class="c num">${sc.approvedFte ?? '—'}</td>${cell(s.safetyDone, s.active)}${cell(s.convDone, s.active)}${cell(s.evalDone, s.active)}<td class="c">${s.issues.filter((i) => i.sev === 'crit').length || ''}</td></tr>`;
      }).join('');
      deptTable = `<div class="card" style="margin-top:16px"><div class="hd"><h3>מצב לפי מחלקה</h3></div><div class="bd flush tbl-wrap"><table class="tbl"><thead><tr><th>מחלקה</th><th class="c">עובדים</th><th class="c">FTE בפועל</th><th class="c">FTE מאושר</th><th class="c">בטיחות ${y}</th><th class="c">שיחות (${half})</th><th class="c">הערכות ${y}</th><th class="c">דחוף</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }
    return `${kpis}${deptTable}<div class="card" style="margin-top:16px"><div class="hd"><h3>דורש טיפול</h3><span class="muted small">${issues.length} פריטים · לחיצה פותחת את כרטיס העובד</span></div><div class="bd flush" style="max-height:520px;overflow:auto">${list}</div></div>`;
  },
};
ACT.dept = (el) => setDept(el.value || el.dataset.value);

function firstStepsHTML() {
  return `<div class="card"><div class="bd"><div class="empty"><div class="ttl">ברוכים הבאים 👋</div>
    <div>כדי להתחיל יש להגדיר מחלקות ולהזין עובדים. הדרך המהירה: לייבא את קובץ האקסל של הנהלת הסיעוד — המערכת תזהה את כל הגיליונות.</div>
    <div class="row" style="justify-content:center;margin-top:16px">
      ${can('import_run') ? `<button class="btn pri" data-act="nav" data-view="import">${icon('upload', 16)} ייבוא קובץ אקסל</button>` : ''}
      ${can('settings_edit') ? `<button class="btn" data-act="nav" data-view="settings">${icon('cog', 16)} הגדרת מחלקות</button>` : ''}
      ${Store.status === 'local' && can('settings_edit') ? `<button class="btn" data-act="connect">${icon('folder', 16)} חיבור לתיקייה משותפת</button>` : ''}
    </div></div></div></div>`;
}
