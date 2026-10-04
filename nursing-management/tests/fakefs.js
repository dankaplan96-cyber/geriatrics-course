// Simulated shared network folder for browser tests: a File System Access
// API-compatible directory handle whose files live in a real folder on disk,
// so several browser contexts ("computers") share it like an SMB share.
const fs = require('fs');
const path = require('path');

async function exposeSharedFolder(page, rootDir) {
  const abs = (p) => { const r = path.resolve(rootDir, p || '.'); if (!r.startsWith(path.resolve(rootDir))) throw new Error('bad path'); return r; };
  await page.exposeFunction('__fsMkdir', (p) => { fs.mkdirSync(abs(p), { recursive: true }); return true; });
  await page.exposeFunction('__fsKind', (p) => { try { return fs.statSync(abs(p)).isDirectory() ? 'directory' : 'file'; } catch (e) { return null; } });
  await page.exposeFunction('__fsList', (p) => fs.readdirSync(abs(p), { withFileTypes: true }).map((d) => [d.name, d.isDirectory() ? 'directory' : 'file']));
  await page.exposeFunction('__fsRead', (p) => { try { const st = fs.statSync(abs(p)); return { b64: fs.readFileSync(abs(p)).toString('base64'), lastModified: Math.floor(st.mtimeMs), size: st.size }; } catch (e) { return null; } });
  await page.exposeFunction('__fsWrite', (p, b64) => { const tmp = abs(p) + '.tmp' + Math.random(); fs.writeFileSync(tmp, Buffer.from(b64, 'base64')); fs.renameSync(tmp, abs(p)); return true; });
  await page.exposeFunction('__fsRemove', (p) => { try { fs.rmSync(abs(p), { recursive: true }); } catch (e) { /* gone */ } return true; });
  await page.addInitScript(() => {
    window.__NM_TEST__ = true;
    const b64ToBytes = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    const bytesToB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
    const nf = (msg) => { const e = new Error(msg); e.name = 'NotFoundError'; return e; };
    class FakeFile {
      constructor(p, name) { this.kind = 'file'; this.p = p; this.name = name; }
      async getFile() { const r = await window.__fsRead(this.p); if (!r) throw nf(this.p); return new File([b64ToBytes(r.b64)], this.name, { lastModified: r.lastModified }); }
      async createWritable() {
        const chunks = []; const p = this.p;
        return { async write(d) { chunks.push(typeof d === 'string' ? new TextEncoder().encode(d) : new Uint8Array(await new Blob([d]).arrayBuffer())); },
          async close() { const all = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0)); let o = 0; for (const c of chunks) { all.set(c, o); o += c.length; } await window.__fsWrite(p, bytesToB64(all)); } };
      }
    }
    class FakeDir {
      constructor(p, name) { this.kind = 'directory'; this.p = p; this.name = name; }
      async getDirectoryHandle(n, o = {}) { const p = `${this.p}/${n}`; const k = await window.__fsKind(p); if (!k) { if (!o.create) throw nf(p); await window.__fsMkdir(p); } return new FakeDir(p, n); }
      async getFileHandle(n, o = {}) { const p = `${this.p}/${n}`; const k = await window.__fsKind(p); if (!k) { if (!o.create) throw nf(p); await window.__fsWrite(p, ''); } return new FakeFile(p, n); }
      async removeEntry(n) { await window.__fsRemove(`${this.p}/${n}`); }
      async *entries() { for (const [n, k] of await window.__fsList(this.p)) yield [n, k === 'directory' ? new FakeDir(`${this.p}/${n}`, n) : new FakeFile(`${this.p}/${n}`, n)]; }
      async queryPermission() { return 'granted'; }
      async requestPermission() { return 'granted'; }
    }
    window.showDirectoryPicker = async () => new FakeDir('.', 'NursingShare');
    // IndexedDB cannot store the fake handle's methods — keep it in memory instead
    const origPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v, k) { if (k === 'sharedNetworkFolder') { window.__fakeHandle = v; return origPut.call(this, { fake: true }, k); } return origPut.call(this, v, k); };
  });
}
module.exports = { exposeSharedFolder };
