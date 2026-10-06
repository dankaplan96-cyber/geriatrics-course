#!/usr/bin/env node
/*
 * Bundles game/ into a single self-contained HTML file (CSS, scripts, content and icon inlined)
 * that opens straight from disk — no server needed.
 * Usage: node tools/build-standalone.js [out.html]   (default: game/dist/hamishmeret.html)
 * The only external resource left is the Rubik web font (falls back to system fonts offline).
 * The in-game "library" link needs the full game/ folder and is disabled in the bundle.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const game = path.resolve(__dirname, '..', 'game');
const out = process.argv[2] || path.join(game, 'dist', 'hamishmeret.html');
let html = fs.readFileSync(path.join(game, 'index.html'), 'utf8');

const inlineScript = src => fs.readFileSync(path.join(game, src), 'utf8').replace(/<\/script/gi, '<\\/script');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => `<script>\n${inlineScript(src)}\n</script>`);
html = html.replace('<link rel="stylesheet" href="css/game.css">', () => `<style>\n${fs.readFileSync(path.join(game, 'css/game.css'), 'utf8')}\n</style>`);

const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(game, 'icons/icon-192.png')).toString('base64');
html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '');
html = html.replace(/href="icons\/icon-\d+\.png"/g, `href="${icon}"`);
// the library is a separate 2MB app — not part of the single-file build
html = html.replace(/window\.open\('library\/index\.html', '_blank', 'noopener'\)/g,
  "UI.toast('📚', 'הספרייה זמינה בגרסה המלאה', 'פתחו את game/library/index.html מהמאגר', true)");

if (/<script src=|href="css\//.test(html)) throw new Error('unbundled reference left in output');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(path.relative(process.cwd(), out), Math.round(html.length / 1024) + ' KB');
