// Bundles src/* into one self-contained index.html (easy to share or open on a phone).
import fs from 'fs';
const r = f => fs.readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#0c1d22"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<title>לטיפה ופאבלו: מבצע בית הפוך</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
${r('style.css')}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/","@dimforge/rapier3d-compat":"https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.21.0/dist/rapier.mjs"}}</script>
</head>
<body>
${r('body.html')}
<script>
window.showBootError=e=>{console.error(e);document.getElementById('splash').hidden=true;document.getElementById('loading').hidden=false;document.getElementById('loading-status').textContent='הטעינה לא הושלמה. בדקו חיבור לאינטרנט ונסו שוב.';document.getElementById('retry').hidden=false;};document.getElementById('retry').onclick=()=>location.reload();window.addEventListener('error',e=>{if(!window.gameReady)window.showBootError(e.error||e.message);});setTimeout(()=>{if(!window.gameReady){document.getElementById('loading-status').textContent='הטעינה מתארכת. נדרש חיבור לאינטרנט למנוע המשחק.';document.getElementById('retry').hidden=false;}},25000);
</script>
<script type="module">
${['engine.js', 'world.js', 'actors.js', 'game.js'].map(r).join('\n')}
</script>
</body></html>
`;
fs.writeFileSync(new URL('./index.html', import.meta.url), html);
console.log('index.html', (html.length / 1024).toFixed(1) + 'KB');
