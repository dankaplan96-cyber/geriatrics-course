'use strict';
// ════════════════════════════════════════════════════════════════
// Utilities — pure helpers, no DOM (shared by browser and tests)
// ════════════════════════════════════════════════════════════════

const U = (() => {
  const rnd = (n) => {
    const a = new Uint8Array(n);
    (globalThis.crypto || require('crypto').webcrypto).getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  };
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${rnd(4)}`;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const clone = (o) => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));

  const pad2 = (n) => String(n).padStart(2, '0');
  const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayISO = () => isoOf(new Date());
  const nowISO = () => new Date().toISOString();
  const thisYear = () => new Date().getFullYear();
  const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function validYMD(y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  // Accepts Date, Excel serial, "6.11.23", "06/11/2023", "2023-11-06", "25.2.2024".
  // Returns ISO "YYYY-MM-DD" or null when the value is not a recognisable date.
  function parseDate(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) {
      if (isNaN(v)) return null;
      // ExcelJS returns dates as UTC midnight
      return `${v.getUTCFullYear()}-${pad2(v.getUTCMonth() + 1)}-${pad2(v.getUTCDate())}`;
    }
    if (typeof v === 'number') {
      if (v < 20000 || v > 80000) return null; // plausible Excel serial range (1954-2119)
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
      return parseDate(d);
    }
    const s = String(v).trim();
    let m = s.match(ISO_RE);
    if (m) return validYMD(+m[1], +m[2], +m[3]) ? s : null;
    m = s.match(/^(\d{1,2})\s*[./\-]\s*(\d{1,2})\s*[./\-]\s*(\d{2}|\d{4})$/);
    if (!m) return null;
    let y = +m[3];
    if (m[3].length === 2) y += y < 70 ? 2000 : 1900;
    const mo = +m[2], d = +m[1];
    return validYMD(y, mo, d) ? `${y}-${pad2(mo)}-${pad2(d)}` : null;
  }

  // Display form used throughout the nursing-administration files: dd.mm.yy
  function fmtDate(v) {
    if (v == null || v === '') return '';
    const iso = typeof v === 'string' && ISO_RE.test(v) ? v : null;
    if (!iso) return String(v);
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y.slice(2)}`;
  }
  const fmtDateLong = (iso) => {
    if (!iso || !ISO_RE.test(iso)) return iso || '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  const isoToDate = (iso) => {
    if (!iso || !ISO_RE.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  };
  function daysUntil(iso) {
    if (!iso || !ISO_RE.test(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(y, m - 1, d) - t) / 86400000);
  }
  const fmtDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  // Israeli ID: digits only, keep leading zeros, pad to 9
  const normId = (s) => {
    const d = String(s ?? '').replace(/\D/g, '');
    return d ? d.padStart(9, '0') : '';
  };
  function validIsraeliId(s) {
    const id = normId(s);
    if (id.length !== 9) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let n = Number(id[i]) * ((i % 2) + 1);
      if (n > 9) n -= 9;
      sum += n;
    }
    return sum % 10 === 0;
  }

  const FINALS = { 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ף': 'פ', 'ך': 'כ' };
  const nameTokens = (s) => String(s ?? '')
    .replace(/[׳'`"״\-–_.,()]/g, ' ')
    .replace(/[םןץףך]/g, (c) => FINALS[c])
    .split(/\s+/).filter(Boolean);
  const normName = (s) => nameTokens(s).sort().join(' ');

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  const tokSim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length);

  // Order-insensitive fuzzy similarity between two person names (0..1)
  function nameSimilarity(a, b) {
    const A = nameTokens(a), B = nameTokens(b);
    if (!A.length || !B.length) return 0;
    if (A.slice().sort().join(' ') === B.slice().sort().join(' ')) return 1;
    const [small, big] = A.length <= B.length ? [A, B] : [B, A];
    const used = new Set();
    let total = 0;
    for (const t of small) {
      let best = 0, bi = -1;
      big.forEach((u, i) => { if (!used.has(i)) { const s = tokSim(t, u); if (s > best) { best = s; bi = i; } } });
      if (bi >= 0) used.add(bi);
      total += best;
    }
    // penalise unmatched extra tokens lightly (middle names are common)
    return (total / small.length) * (small.length === big.length ? 1 : 0.92);
  }

  const num = (v) => {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const s = String(v).replace('%', '').replace(',', '.').trim();
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    const n = Number(s);
    return String(v).includes('%') ? n / 100 : n;
  };
  const round = (n, d = 2) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);
  const clean = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/\s+/g, ' ').trim();
    return /^[_\-–.\s]*$/.test(s) ? '' : s;
  };

  const debounce = (fn, ms) => {
    let t;
    const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    d.flush = (...a) => { clearTimeout(t); return fn(...a); };
    d.cancel = () => clearTimeout(t);
    return d;
  };

  const sortBy = (arr, ...keys) => arr.slice().sort((a, b) => {
    for (const k of keys) {
      const x = k(a), y = k(b);
      if (x == null && y == null) continue;
      if (x == null) return 1;
      if (y == null) return -1;
      const c = typeof x === 'string' ? x.localeCompare(y, 'he') : x - y;
      if (c) return c;
    }
    return 0;
  });

  const bytesToHex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  const hexToBytes = (h) => { const b = new Uint8Array(h.length / 2); for (let i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16); return b; };
  const safeFileName = (s) => String(s || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120) || 'file';

  return {
    uid, esc, clone, pad2, isoOf, todayISO, nowISO, thisYear, parseDate, fmtDate, fmtDateLong, isoToDate, daysUntil, fmtDateTime,
    normId, validIsraeliId, nameTokens, normName, nameSimilarity, num, round, clean, debounce, sortBy, bytesToHex, hexToBytes, safeFileName,
    ISO_RE,
  };
})();

