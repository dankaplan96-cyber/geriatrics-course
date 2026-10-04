'use strict';
// ════════════════════════════════════════════════════════════════
// Boot
// ════════════════════════════════════════════════════════════════
(async function boot() {
  document.body.innerHTML = '<div class="auth"><div class="box" style="text-align:center">טוען את המערכת…</div></div>';
  try {
    await Store.init();
  } catch (e) {
    console.error(e);
    document.body.innerHTML = `<div class="auth"><div class="box"><h1>שגיאה בטעינת המערכת</h1><p>${U.esc(e.message)}</p><p class="muted small">יש לפתוח את הקובץ ב-Google Chrome או Microsoft Edge.</p></div></div>`;
    return;
  }
  let sess = null;
  try { sess = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { sess = null; }
  const u = sess && db().users[sess.id];
  if (u && u.active) startSession(u); else renderAuth();
})();

// Hooks for the automated browser tests (enabled only by the test harness)
if (window.__NM_TEST__) {
  window.addEventListener('nm-test-edit', (e) => setEmpField(e.detail.id, 'notes', e.detail.val));
  window.__nmPeek = (id) => db().employees[id] && db().employees[id].notes;
}
