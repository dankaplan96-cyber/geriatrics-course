'use strict';
// ════════════════════════════════════════════════════════════════
// Three-way merge used when two computers saved concurrently.
// base   = the version both started from (last synced)
// local  = this computer's version
// remote = the version currently in the shared folder
// Records/fields changed on only one side are taken from that side.
// A field changed differently on both sides is a conflict: the local
// value wins (this user is saving now) and the conflict is reported.
// A record deleted on one side but edited on the other is kept.
// ════════════════════════════════════════════════════════════════

const MISSING = Symbol('missing');
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => {
  if (a === b) return true;
  if (a === MISSING || b === MISSING) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

function merge3(base, local, remote, path = '', conflicts = []) {
  if (same(local, remote)) return local;
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;
  // deleted on one side, modified on the other → keep the modified record
  if (local === MISSING) return remote;
  if (remote === MISSING) return local;
  if (isPlain(local) && isPlain(remote)) {
    const b = isPlain(base) ? base : {};
    const out = {};
    const keys = new Set([...Object.keys(remote), ...Object.keys(local), ...Object.keys(b)]);
    for (const k of keys) {
      const has = (o) => Object.prototype.hasOwnProperty.call(o, k);
      const v = merge3(has(b) ? b[k] : MISSING, has(local) ? local[k] : MISSING, has(remote) ? remote[k] : MISSING, path ? `${path}.${k}` : k, conflicts);
      if (v !== MISSING) out[k] = v;
    }
    return out;
  }
  conflicts.push({ path, base: base === MISSING ? undefined : base, local, remote });
  return local;
}

function mergeDB(base, local, remote) {
  const conflicts = [];
  const merged = merge3(base || {}, local, remote, '', conflicts);
  // updatedAt/updatedBy are bookkeeping, not real conflicts
  const real = conflicts.filter((c) => !/\.(updatedAt|updatedBy)$/.test(c.path));
  return { merged, conflicts: real };
}

// Human readable description of a conflict path, e.g. employees.emp_x.safety.2025.score
function describeConflict(db, c) {
  const parts = c.path.split('.');
  if (parts[0] === 'employees' && db.employees[parts[1]]) return `${db.employees[parts[1]].name}: ${parts.slice(2).join(' › ')}`;
  return c.path;
}
