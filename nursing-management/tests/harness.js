// Loads the browser core modules into a Node VM context for testing.
const fs = require('fs'), path = require('path'), vm = require('vm');
const CORE = ['00-util.js', '10-model.js', '20-merge.js', '30-import.js', '40-export.js', '45-auth.js'];
function load(extra = {}) {
  const ctx = { console, require, Date, Math, JSON, Array, Object, Number, String, RegExp, Uint8Array, Promise, Symbol, Set, Map, structuredClone, TextEncoder, TextDecoder, Buffer, crypto: require('crypto').webcrypto, setTimeout, clearTimeout, ...extra };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  let src = CORE.filter((f) => fs.existsSync(path.join(__dirname, '../src/js', f))).map((f) => fs.readFileSync(path.join(__dirname, '../src/js', f), 'utf8')).join('\n;\n');
  const names = ['U', 'ROLES', 'STATUSES', 'TRAINING', 'CHECK', 'emptyDB', 'newEmployee', 'newDept', 'normalizeDB', 'employeesOf', 'deptStats', 'employeeIssues', 'staffingComputed', 'migrateLegacyState', 'userCan', 'mergeDB', 'parseWorkbook', 'planImport', 'applyImport', 'parseNameCell', 'buildReportWorkbook', 'REPORT_SHEETS', 'hashPassword', 'verifyPassword', 'reportName'];
  src += `\n;globalThis.__api={${names.map((n) => `${n}:typeof ${n}!=='undefined'?${n}:undefined`).join(',')}};`;
  vm.runInContext(src, ctx, { filename: 'core.js' });
  return ctx.__api;
}
module.exports = { load };
