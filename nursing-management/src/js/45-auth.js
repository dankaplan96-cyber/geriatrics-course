'use strict';
// ════════════════════════════════════════════════════════════════
// Passwords — PBKDF2-SHA256 (Web Crypto). Only salted hashes are
// stored. The format is identical to the previous version, so users
// keep their existing passwords after the upgrade.
// ════════════════════════════════════════════════════════════════

const PBKDF2_ITERATIONS = 600000;
const LOCK_AFTER_FAILS = 5;
const LOCK_MINUTES = 10;

function legacyFallbackHash(password, saltHex) {
  // Same algorithm as the previous version's fallback (used only when Web Crypto is unavailable)
  const input = (saltHex || '') + '|' + password;
  let h1 = 0x811c9dc5, h2 = 0x9e3779b9, h3 = 0x85ebca6b, h4 = 0xc2b2ae35;
  for (let round = 0; round < 12000; round++) {
    for (let i = 0; i < input.length; i++) {
      const c = input.charCodeAt(i) + (round & 255);
      h1 = Math.imul(h1 ^ c, 0x01000193);
      h2 = Math.imul(h2 + (c ^ h1), 0x27d4eb2d);
      h3 = Math.imul(h3 ^ (c + h2), 0x165667b1);
      h4 = Math.imul(h4 + (c ^ h3), 0x85ebca6b);
    }
    h1 ^= h1 >>> 13; h2 ^= h2 >>> 15; h3 ^= h3 >>> 16; h4 ^= h4 >>> 13;
  }
  const p = (n) => (n >>> 0).toString(16).padStart(8, '0');
  return p(h1) + p(h2) + p(h3) + p(h4) + p(h1 ^ h3) + p(h2 ^ h4) + p(h1 + h4) + p(h2 + h3);
}

async function hashPassword(password, saltHex) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (subtle) {
    const salt = saltHex ? U.hexToBytes(saltHex) : globalThis.crypto.getRandomValues(new Uint8Array(16));
    const key = await subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const bits = await subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, key, 256);
    return { hash: U.bytesToHex(new Uint8Array(bits)), salt: U.bytesToHex(salt), algo: 'pbkdf2' };
  }
  const salt = saltHex || U.bytesToHex(Array.from({ length: 16 }, () => Math.floor(Math.random() * 256)));
  return { hash: legacyFallbackHash(password, salt), salt, algo: 'fallback' };
}

async function verifyPassword(password, cred) {
  if (!cred || !cred.hash || !cred.salt) return false;
  let h;
  if (cred.algo === 'fallback') h = legacyFallbackHash(password, cred.salt);
  else if (globalThis.crypto && globalThis.crypto.subtle) h = (await hashPassword(password, cred.salt)).hash;
  else return false;
  if (h.length !== cred.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ cred.hash.charCodeAt(i);
  return diff === 0;
}

function passwordProblem(pw, username = '') {
  if (!pw || pw.length < 8) return 'הסיסמה חייבת להכיל לפחות 8 תווים';
  if (!/\d/.test(pw) || !/[^\d]/.test(pw)) return 'הסיסמה חייבת להכיל גם ספרות וגם אותיות';
  if (username && pw.toLowerCase().includes(username.toLowerCase())) return 'הסיסמה לא יכולה להכיל את שם המשתמש';
  return '';
}

function tempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const a = new Uint8Array(10);
  globalThis.crypto.getRandomValues(a);
  let s = Array.from(a, (x) => chars[x % chars.length]).join('');
  if (!/\d/.test(s)) s = s.slice(0, 9) + '7';
  return s;
}

const activeAdmins = (db) => Object.values(db.users).filter((u) => u.active && userCan(u, 'users_manage'));
