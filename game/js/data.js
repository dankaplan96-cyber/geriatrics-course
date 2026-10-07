/* המשמרת — game data: acts & badges, clinical types, items, maps, NPCs. */
'use strict';

const C = window.CONTENT;

/* Seven acts = seven badges (the "gyms"). Each act's episodes come from the clinical content. */
const ACTS = [
  { name: 'יסודות ליד המיטה', badge: '🩺', badgeName: 'תג המיטה', leader: 'ד״ר נגה אורן', role: 'גרונטולוגיה וגריאטריה', look: 'leader0' },
  { name: 'מוח והתנהגות', badge: '🧠', badgeName: 'תג המוח', leader: 'ד״ר עמית רז', role: 'נוירולוגיה', look: 'leader1' },
  { name: 'לב וריאות', badge: '🫀', badgeName: 'תג הלב', leader: 'ד״ר הדס לוי', role: 'קרדיולוגיה', look: 'leader2' },
  { name: 'כליה, תרופות ומטבוליזם', badge: '💧', badgeName: 'תג הכליה', leader: 'ד״ר יואב שגיא', role: 'פרמקולוגיה ונפרולוגיה', look: 'leader3' },
  { name: 'זיהום, דם ושוק', badge: '🦠', badgeName: 'תג החיסון', leader: 'ד״ר מאיה כהן', role: 'מחלות זיהומיות', look: 'leader4' },
  { name: 'כאב, טראומה ובטן', badge: '🦴', badgeName: 'תג התפקוד', leader: 'ד״ר אורי בן דוד', role: 'אורתוגריאטריה', look: 'leader5' },
  { name: 'מורכבות, מטרות ושחרור', badge: '🏠', badgeName: 'תג הבית', leader: 'פרופ׳ רונית אלון', role: 'מנהלת המחלקה', look: 'leader6' },
];
const BOSS_NEED = 0.6;   // share of an act's episodes needed before its grand rounds

/* Clinical "types" — the colour, icon and creature of each problem you face. */
const TYPES = {
  meds: { name: 'תרופות', icon: '💊', color: '#fbbf24' },
  labs: { name: 'מעבדה', icon: '🧪', color: '#f472b6' },
  neuro: { name: 'נוירו', icon: '🧠', color: '#a78bfa' },
  cardio: { name: 'לב-ריאה', icon: '🫀', color: '#f87171' },
  renal: { name: 'כליה', icon: '💧', color: '#38bdf8' },
  infect: { name: 'זיהום', icon: '🦠', color: '#4ade80' },
  func: { name: 'תפקוד', icon: '🦴', color: '#fb923c' },
  goals: { name: 'מטרות', icon: '🏠', color: '#cbd5e1' },
  pager: { name: 'קריאה', icon: '📟', color: '#fde047' },
};
const ACT_TYPE = ['meds', 'neuro', 'cardio', 'renal', 'infect', 'func', 'goals'];
const LAB_TAGS = /CBC|אנמיה|Hemolysis|Retic|Ferritin|B12|ברזל|מעבדה|Lab|INR|Iron/i;
function episodeType(e) { return e.a === 0 && e.tags.some(t => LAB_TAGS.test(t)) ? 'labs' : ACT_TYPE[e.a] || 'meds'; }

/* The four clinical decisions of every episode (Noticing happens through "אומדן"). */
const STAGES = [
  { key: 'q', ck: 'qc', name: 'פרשנות', dom: 'interpreting', prompt: 'מה הבעיה המרכזית כאן?' },
  { key: 'g', ck: 'gc', name: 'מטרה', dom: 'responding', prompt: 'מה המטרה הקלינית עכשיו?' },
  { key: 'x', ck: 'xc', name: 'התערבות', dom: 'responding', prompt: 'מה הפעולה הנכונה עכשיו?' },
  { key: 'r', ck: 'rc', name: 'הערכה חוזרת', dom: 'reflecting', prompt: 'איזה ממצא בהערכה החוזרת מראה שהתכנית עובדת?' },
];
const STAGE_HINT = {
  q: 'חזור/י לממצאים הקריטיים — מה השתנה מה-baseline ומה מחבר ביניהם?',
  g: 'מטרה טובה משרתת את המטופל: בטיחות, פרפוזיה ותפקוד — לא “לצבוע מספר בירוק”.',
  x: 'פעולה טובה מטפלת בגורם, בטוחה למבוגר השברירי וכוללת תכנית להערכה חוזרת.',
  r: 'הצלחה נמדדת בשיפור קליני ותפקודי מתועד — לא בבדיקה אחת או בהיעדר תלונה.',
};

const ITEMS = {
  coffee: { name: 'קפה של משמרת', icon: '☕', desc: '+40 זמן לאומדן בקרב הנוכחי.', price: 18, tint: '#d6a35c' },
  torch: { name: 'פנס בדיקה', icon: '🔦', desc: 'חושף את כל הממצאים הקריטיים — בלי לבזבז זמן.', price: 34, tint: '#fde047' },
  guide: { name: 'מדריך כיס', icon: '📘', desc: 'מסיר שתי תשובות שגויות בהחלטה הבאה.', price: 42, tint: '#60a5fa' },
  shield: { name: 'בדיקה כפולה', icon: '🛡️', desc: 'הטעות הבאה לא פוגעת ביציבות.', price: 38, tint: '#4ade80' },
  calm: { name: 'שיחה מרגיעה', icon: '🤝', desc: '+25 יציבות. לפעמים הדבר הכי טיפולי הוא נוכחות.', price: 26, tint: '#f472b6' },
};

/* Character looks (drawn by Art.drawPerson). */
const LOOKS = {
  nurseF: { skin: '#f2c7a1', hair: '#5b3420', hairStyle: 'bun', top: '#2aa198', top2: '#1f7d76', pants: '#1f6f69', shoes: '#f1f5f9', steth: true },
  nurseM: { skin: '#e9b98f', hair: '#3b2618', hairStyle: 'short', top: '#2aa198', top2: '#1f7d76', pants: '#1f6f69', shoes: '#f1f5f9', steth: true },
  rivka: { skin: '#d9a47c', hair: '#2a2430', hairStyle: 'bun', top: '#3563a8', top2: '#274b84', pants: '#274b84', shoes: '#f1f5f9', steth: true, badge: '#fbbf24' },
  shula: { skin: '#e8b58c', hair: '#b45309', hairStyle: 'curly', top: '#f472b6', top2: '#db2777', pants: '#475569', shoes: '#1e293b', apron: '#fff7ed' },
  tal: { skin: '#c48a5c', hair: '#18141a', hairStyle: 'bun', top: '#8b5cf6', top2: '#6d28d9', pants: '#5b21b6', shoes: '#f1f5f9', coat: true, goggles: true },
  omer: { skin: '#eebd94', hair: '#7c4a1f', hairStyle: 'short', top: '#16a34a', top2: '#15803d', pants: '#334155', shoes: '#1e293b', coat: true, glasses: true },
  hana: { skin: '#e3ae84', hair: '#cbd5e1', hairStyle: 'bob', top: '#e36f5a', top2: '#c2410c', pants: '#475569', shoes: '#1e293b', bag: true },
  noam: { skin: '#f0c49b', hair: '#1f2937', hairStyle: 'short', top: '#93c5fd', top2: '#3b82f6', pants: '#1e3a8a', shoes: '#f1f5f9', coat: true, steth: true },
  avi: { skin: '#b9825a', hair: '#111827', hairStyle: 'short', top: '#0f766e', top2: '#115e59', pants: '#134e4a', shoes: '#f1f5f9', steth: true, beard: true },
  shira: { skin: '#e9b98f', hair: '#7c2d12', hairStyle: 'long', top: '#f59e0b', top2: '#d97706', pants: '#334155', shoes: '#f1f5f9', badge: '#fff' },
  liat: { skin: '#f0c49b', hair: '#1f2937', hairStyle: 'bob', top: '#0e8f86', top2: '#0b6f68', pants: '#334155', shoes: '#1e293b', badge: '#fbbf24' },
  dana: { skin: '#d9a47c', hair: '#4b2e1e', hairStyle: 'curly', top: '#a855f7', top2: '#7e22ce', pants: '#334155', shoes: '#1e293b', bag: true },
  noa: { skin: '#f2c7a1', hair: '#a16207', hairStyle: 'bun', top: '#84cc16', top2: '#4d7c0f', pants: '#365314', shoes: '#f1f5f9', apron: '#f7fee7' },
  gil: { skin: '#c48a5c', hair: '#111827', hairStyle: 'short', top: '#1e3a8a', top2: '#1e40af', pants: '#1e293b', shoes: '#111827', badge: '#fbbf24' },
  maya: { skin: '#e9b98f', hair: '#1f2937', hairStyle: 'bun', top: '#ef4444', top2: '#b91c1c', pants: '#1e293b', shoes: '#f1f5f9' },
  ron: { skin: '#f0c49b', hair: '#92400e', hairStyle: 'short', top: '#06b6d4', top2: '#0e7490', pants: '#334155', shoes: '#f1f5f9', glasses: true },
  cohen: { skin: '#dcae86', hair: '#d1d5db', hairStyle: 'short', top: '#a3b5c9', top2: '#8397ad', pants: '#475569', shoes: '#1e293b', glasses: true },
  yael: { skin: '#d9a47c', hair: '#3b2618', hairStyle: 'long', top: '#0ea5e9', top2: '#0369a1', pants: '#1e3a8a', shoes: '#f1f5f9', bag: true, steth: true },
  moshe: { skin: '#e4b48c', hair: '#9ca3af', hairStyle: 'short', top: '#78716c', top2: '#57534e', pants: '#44403c', shoes: '#1c1917', beard: true },
  zelda: { skin: '#f2cfb1', hair: '#e5e7eb', hairStyle: 'curly', top: '#f472b6', top2: '#db2777', pants: '#475569', shoes: '#1e293b', glasses: true },
  michal: { skin: '#f2c7a1', hair: '#78350f', hairStyle: 'bob', top: '#fb923c', top2: '#ea580c', pants: '#334155', shoes: '#1e293b' },
  rachel: { skin: '#e8bf9c', hair: '#d1d5db', hairStyle: 'bun', top: '#7dd3fc', top2: '#0284c7', pants: '#475569', shoes: '#1e293b', glasses: true },
  ido: { skin: '#e9b98f', hair: '#b45309', hairStyle: 'short', top: '#6366f1', top2: '#4338ca', pants: '#3730a3', shoes: '#f1f5f9', steth: true },
  judge0: { skin: '#f0c49b', hair: '#6b7280', hairStyle: 'bob', top: '#f8fafc', top2: '#cbd5e1', pants: '#334155', shoes: '#1e293b', coat: true, inner: '#0e8f86', glasses: true },
  judge1: { skin: '#c48a5c', hair: '#1f2937', hairStyle: 'short', top: '#f8fafc', top2: '#cbd5e1', pants: '#1e293b', shoes: '#1e293b', coat: true, inner: '#ef4444', steth: true },
  judge2: { skin: '#e9b98f', hair: '#7c2d12', hairStyle: 'long', top: '#f8fafc', top2: '#cbd5e1', pants: '#334155', shoes: '#1e293b', coat: true, inner: '#22c55e' },
  judge3: { skin: '#f0c49b', hair: '#e5e7eb', hairStyle: 'short', top: '#f8fafc', top2: '#cbd5e1', pants: '#1e293b', shoes: '#1e293b', coat: true, inner: '#64748b', beard: true, glasses: true },
  champion: { skin: '#e8b58c', hair: '#f3f4f6', hairStyle: 'bun', top: '#1e3a8a', top2: '#1e40af', pants: '#1e293b', shoes: '#1e293b', coat: false, badge: '#fbbf24', glasses: true },
  leader0: { skin: '#f0c49b', hair: '#9ca3af', hairStyle: 'bob', top: '#f8fafc', top2: '#cbd5e1', pants: '#334155', shoes: '#1e293b', coat: true, inner: '#2aa198', glasses: true },
  leader1: { skin: '#e9b98f', hair: '#4b2e1e', hairStyle: 'short', top: '#f8fafc', top2: '#cbd5e1', pants: '#1e293b', shoes: '#1e293b', coat: true, inner: '#8b5cf6' },
  leader2: { skin: '#d9a47c', hair: '#1f1720', hairStyle: 'long', top: '#f8fafc', top2: '#cbd5e1', pants: '#334155', shoes: '#1e293b', coat: true, inner: '#ef4444', steth: true },
  leader3: { skin: '#f2c7a1', hair: '#a16207', hairStyle: 'short', top: '#f8fafc', top2: '#cbd5e1', pants: '#1e293b', shoes: '#1e293b', coat: true, inner: '#0ea5e9', glasses: true },
  leader4: { skin: '#c48a5c', hair: '#111827', hairStyle: 'bun', top: '#f8fafc', top2: '#cbd5e1', pants: '#334155', shoes: '#1e293b', coat: true, inner: '#22c55e' },
  leader5: { skin: '#e9b98f', hair: '#6b7280', hairStyle: 'short', top: '#f8fafc', top2: '#cbd5e1', pants: '#1e293b', shoes: '#1e293b', coat: true, inner: '#f97316', beard: true },
  leader6: { skin: '#f0c49b', hair: '#e5e7eb', hairStyle: 'bun', top: '#f8fafc', top2: '#cbd5e1', pants: '#1e293b', shoes: '#1e293b', coat: true, inner: '#e9c17c', glasses: true },
};

/* Patient looks: head on the pillow in the ward, bust in the battle card. */
const PEOPLE = {
  leah: { skin: '#f2cfb1', hair: '#eceef2', style: 'bun', glasses: true, gown: '#f29bb5' },
  ruth: { skin: '#f3d3b8', hair: '#f8fafc', style: 'short', gown: '#f7c08a' },
  yosef: { skin: '#e9be97', hair: '#cfd0d6', style: 'bald', gown: '#7fb2e5', cannula: true },
  avraham: { skin: '#dcae86', hair: '#9c9ca6', style: 'short', kippah: '#1e3a8a', gown: '#a3b5c9' },
  miriam: { skin: '#f0c9a6', hair: '#a9a9b3', style: 'curly', gown: '#b9a3e3' },
  sara: { skin: '#e8bf9c', hair: '#2dd4bf', style: 'scarf', gown: '#9fd9d0' },
  david: { skin: '#e4b48c', hair: '#f2f2f5', style: 'short', beard: true, glasses: true, gown: '#8fd1a5' },
};
const PATIENT_ROOM = { leah: 1, ruth: 1, yosef: 2, avraham: 2, miriam: 3, sara: 3, david: 4 };

/* ---------- maps ----------
   # wall · . floor · D door
   wall decor: W board · O window · m monitor · Q clock · H sanitizer · A poster · J screen
   furniture: B/b bed head/foot · C counter · K computer · T table · h chair · P plant · S sofa
              L bench · M microscope · R tube rack · F fridge · V coffee machine · X shelf
              Z locker · I IV pole · w wheelchair · c cart · y wet-floor sign · k sink */
const MAPS = [
  { id: 'staff', name: 'חדר הצוות', sub: 'מנוחה · קפה · לוח משמרת', floor: 'carpet', music: 'ward',
    grid: ['##W#O##O#Q##', '#ZZ....V.XX#', '#..........#', '#...TT.....#', '#..hTTh....D', '#..........#', '#SS......P.#', '############'],
    doors: { '11,4': { to: 1, x: 1, y: 4, dir: 'right' } },
    npcs: [{ id: 'shula', x: 6, y: 2, dir: 'down' }],
    hotspots: { '1,1': 'locker', '2,1': 'locker', '2,0': 'board', '7,1': 'coffee', '9,1': 'library', '10,1': 'library', '1,6': 'sofa', '2,6': 'sofa' } },
  { id: 'hall', name: 'מסדרון המחלקה', sub: 'מחלקה גריאטרית · קומה 3', floor: 'hall', music: 'ward', encounters: true,
    grid: ['##H#D##A##D##Q##D##H##D##A##D###', '#P............................P#', '#..............................#', '#............CCKCC.............#', 'D..............................D', '#.......y...............c......#', '#..w...........................#', '#P............................P#', '###########################D####'],
    doors: { '0,4': { to: 0, x: 10, y: 4, dir: 'left' }, '4,0': { to: 2, x: 5, y: 6, dir: 'up' }, '10,0': { to: 3, x: 5, y: 6, dir: 'up' }, '16,0': { to: 4, x: 5, y: 6, dir: 'up' }, '22,0': { to: 5, x: 5, y: 6, dir: 'up' }, '28,0': { to: 6, x: 4, y: 6, dir: 'up' }, '27,8': { to: 7, x: 5, y: 1, dir: 'down', boss: true }, '31,4': { to: 8, x: 1, y: 4, dir: 'right' } },
    labels: { '4,0': 'חדר 1', '10,0': 'חדר 2', '16,0': 'חדר 3', '22,0': 'חדר 4', '28,0': 'מעבדה', '27,8': 'ישיבות', '0,4': 'צוות', '31,4': 'מבואה' },
    npcs: [{ id: 'rivka', x: 14, y: 2, dir: 'down' }, { id: 'shira', x: 18, y: 2, dir: 'down' }, { id: 'hana', x: 25, y: 2, dir: 'down', wander: [19, 1, 29, 3] },
      { id: 'noam', x: 8, y: 1, dir: 'down', trainer: true, sight: 3 }, { id: 'avi', x: 21, y: 7, dir: 'up', trainer: true, sight: 3 }],
    hotspots: { '15,3': 'review' }, hidden: { '29,6': 'coffee' } },
  { id: 'room1', name: 'חדר 1', sub: 'לאה · רות', floor: 'ward', music: 'ward', beds: { '2,1': 'leah', '6,1': 'ruth' },
    grid: ['##m#O#m#O#', '#IB..IB..#', '#.b.h.b.h#', '#........#', '#........#', '#P......k#', '#........#', '#####D####'], doors: { '5,7': { to: 1, x: 4, y: 1, dir: 'down' } } },
  { id: 'room2', name: 'חדר 2', sub: 'יוסף · אברהם', floor: 'ward', music: 'ward', beds: { '2,1': 'yosef', '6,1': 'avraham' },
    grid: ['##m#O#m#O#', '#IB..IB..#', '#.b.h.b.h#', '#........#', '#........#', '#P......k#', '#........#', '#####D####'], doors: { '5,7': { to: 1, x: 10, y: 1, dir: 'down' } } },
  { id: 'room3', name: 'חדר 3', sub: 'מרים · שרה', floor: 'ward', music: 'ward', beds: { '2,1': 'miriam', '6,1': 'sara' },
    grid: ['##m#O#m#O#', '#IB..IB..#', '#.b.h.b.h#', '#........#', '#........#', '#P......k#', '#........#', '#####D####'], doors: { '5,7': { to: 1, x: 16, y: 1, dir: 'down' } } },
  { id: 'room4', name: 'חדר 4', sub: 'דוד', floor: 'ward', music: 'ward', beds: { '2,1': 'david', '6,1': null },
    grid: ['##m#O#m#O#', '#IB..IB..#', '#.b.h.b.h#', '#........#', '#........#', '#P......k#', '#........#', '#####D####'], doors: { '5,7': { to: 1, x: 22, y: 1, dir: 'down' } } },
  { id: 'lab', name: 'המעבדה', sub: 'סבבי מעבדה · מעבדון', floor: 'lab', music: 'lab',
    grid: ['##W##O##O#', '#LMLR..FF#', '#........#', '#........#', '#.....K..#', '#........#', '#P......P#', '####D#####'],
    doors: { '4,7': { to: 1, x: 28, y: 1, dir: 'down' } }, npcs: [{ id: 'tal', x: 3, y: 3, dir: 'down' }], hotspots: { '6,4': 'labdex', '2,1': 'microscope' } },
  { id: 'conf', name: 'חדר הישיבות', sub: 'ביקור רופאים גדול', floor: 'wood', music: 'ward',
    grid: ['#####D##JJ##', '#..........#', '#.hhhh.....#', '#.TTTT.....#', '#.TTTT.....#', '#.hhhh.....#', '#P........P#', '############'],
    doors: { '5,0': { to: 1, x: 27, y: 7, dir: 'up' } }, npcs: [{ id: 'leader', x: 8, y: 3, dir: 'left' }] },
  // 8 — the hospital lobby (the Pokémon Center of this game)
  { id: 'lobby', name: 'מבואת בית החולים', sub: 'קבלה · שיקום · בית מרקחת · יציאה לקהילה', floor: 'hall', music: 'town',
    grid: ['##A###D###D##Q##', '#P............P#', '#..............#', '#..CCCC.....hh.#', 'D..............D', '#..........hh..#', '#..w...........#', '#..............#', '#P............P#', '#######D########'],
    doors: { '0,4': { to: 1, x: 30, y: 4, dir: 'left' }, '6,0': { to: 9, x: 6, y: 6, dir: 'up' }, '10,0': { to: 10, x: 5, y: 6, dir: 'up' },
      '7,9': { to: 11, x: 11, y: 2, dir: 'down', needBadges: 1 }, '15,4': { to: 14, x: 6, y: 11, dir: 'up', elite: true } },
    labels: { '6,0': 'שיקום', '10,0': 'רוקחות', '7,9': 'יציאה', '15,4': 'מועצה' },
    npcs: [{ id: 'liat', x: 4, y: 2, dir: 'down' }, { id: 'dana', x: 12, y: 2, dir: 'down' }, { id: 'noa', x: 11, y: 7, dir: 'up' }, { id: 'gil', x: 14, y: 3, dir: 'left' }],
    hidden: { '13,8': 'calm' } },
  // 9 — rehabilitation gym
  { id: 'rehab', name: 'מכון השיקום', sub: 'פיזיותרפיה · ריפוי בעיסוק', floor: 'wood', music: 'town',
    grid: ['##W###O###O#', '#pppp..vv..#', '#..........#', '#.uuu..uuu.#', '#.uuu..uuu.#', '#..........#', '#P..z....P.#', '######D#####'],
    doors: { '6,7': { to: 8, x: 6, y: 1, dir: 'down' } },
    npcs: [{ id: 'maya', x: 6, y: 2, dir: 'down' }, { id: 'ron', x: 8, y: 5, dir: 'left' }, { id: 'cohen', x: 3, y: 5, dir: 'right' }],
    hidden: { '10,2': 'shield' } },
  // 10 — pharmacy
  { id: 'pharm', name: 'בית המרקחת', sub: 'רוקחות קלינית', floor: 'lab', music: 'town',
    grid: ['####A##Q##', '#XXXX.XXX#', '#........#', '#.CCCCCC.#', '#........#', '#P.....h.#', '#........#', '#####D####'],
    doors: { '5,7': { to: 8, x: 10, y: 1, dir: 'down' } }, npcs: [{ id: 'omer', x: 4, y: 2, dir: 'down' }] },
  // 11 — the community street (outdoors, tall grass)
  { id: 'street', name: 'רחוב הקהילה', sub: 'ביקורי בית · שיחות מהקהילה', floor: 'grass', music: 'town', outdoor: true, encounters: 'grass',
    grid: ['EEEEEEEEEEEEEEEEEEEEEEEE', 'EEEEEEEEEEEDEEEEEEEEEEEE', 'Y,,f,;;;,,,::,,,;;;,f,,Y', 'Y,,,,;;;,,,::,,,;;;,,,,Y', 'Y,,,lq,,,,,::,,,,ql,,,,Y',
      'Y::::::::::::::::::::::Y', 'Y======================Y', 'Y======================Y', 'Y::::::::::::::::::::::Y', 'Y,,UUUU,,,,,,,,,,UUUU,,Y',
      'Y,,UUUU,,,j,,;;;,UUUU,,Y', 'Y,,UUDU,,,,,;;;,,UDUU,,Y', 'Y,,,,:,,,,f,,,,,,,:,,,,Y', 'YYYYYYYYYYYYYYYYYYYYYYYY'],
    doors: { '11,1': { to: 8, x: 7, y: 8, dir: 'up' }, '5,11': { to: 12, x: 4, y: 5, dir: 'up', needBadges: 2 }, '18,11': { to: 13, x: 4, y: 5, dir: 'up', needBadges: 4 } },
    labels: { '5,11': 'בית לאה', '18,11': 'בית אברהם' },
    npcs: [{ id: 'yael', x: 15, y: 4, dir: 'left', trainer: true, sight: 3 }, { id: 'moshe', x: 8, y: 12, dir: 'up', trainer: true, sight: 3 }, { id: 'neighbor', x: 20, y: 3, dir: 'down', wander: [19, 2, 22, 4] }],
    hidden: { '22,12': 'guide' } },
  // 12 — Leah's home: the home-safety walk-through
  { id: 'homeLeah', name: 'הבית של לאה', sub: 'ביקור בית · סיור בטיחות', floor: 'wood', music: 'ward',
    grid: ['###O##O##', '#a..o..k#', '#..r.T..#', '#.......#', '#.B.....#', '#.b...P.#', '####D####'],
    doors: { '4,6': { to: 11, x: 5, y: 12, dir: 'down' } }, npcs: [{ id: 'michal', x: 6, y: 3, dir: 'down' }],
    hotspots: { '3,2': 'hz_rug', '4,1': 'hz_light', '5,2': 'hz_pills', '7,1': 'hz_reach', '2,4': 'hz_night', '2,5': 'hz_night' }, hidden: { '1,3': 'torch' } },
  // 13 — Avraham's home: teach-back before discharge
  { id: 'homeAvraham', name: 'הבית של אברהם', sub: 'ביקור בית · תרופות ומטפלים', floor: 'carpet', music: 'ward',
    grid: ['##O###O##', '#a..X..k#', '#...T...#', '#.......#', '#.....h.#', '#P......#', '####D####'],
    doors: { '4,6': { to: 11, x: 18, y: 12, dir: 'down' } }, npcs: [{ id: 'rachel', x: 4, y: 3, dir: 'down' }] },
  // 14 — the Expert Council (Elite Four + Champion)
  { id: 'council', name: 'מועצת המומחים', sub: 'ארבעה שופטים ויו״רית — בלי מנוחה בין הסבבים', floor: 'wood', music: 'boss',
    grid: ['#####JJJ#####', '#P....h....P#', '#...........#', '######G######', '#...........#', '#.P.......P.#', '######G######', '#...........#', '######G######', '#...........#', '######G######', '#...........#', '######D######'],
    doors: { '6,12': { to: 8, x: 14, y: 4, dir: 'left' } }, barriers: { '6,10': 1, '6,8': 2, '6,6': 3, '6,3': 4 },
    npcs: [{ id: 'judge0', x: 7, y: 11, dir: 'left' }, { id: 'judge1', x: 7, y: 9, dir: 'left' }, { id: 'judge2', x: 7, y: 7, dir: 'left' }, { id: 'judge3', x: 7, y: 4, dir: 'left' }, { id: 'champion', x: 6, y: 2, dir: 'down' }] },
];
const BLOCK = new Set('#WOmQHAJBbCKThPSLMRFVXZIwcykYUEqljnpvzaoG'.split(''));
const WALLISH = new Set('#WOmQHAJ'.split(''));
const GROUND = { ',': 'grass', ';': 'tallgrass', ':': 'path', '=': 'road', 'f': 'flowers', 'u': 'mat', 'r': 'rug' };   // walkable ground variants

const NPC_INFO = {
  rivka: { name: 'רבקה', role: 'האחות האחראית', look: 'rivka' },
  shula: { name: 'שולה', role: 'קפיטריית הצוות', look: 'shula' },
  tal: { name: 'טל', role: 'טכנאית המעבדה', look: 'tal' },
  omer: { name: 'עומר', role: 'רוקח המחלקה', look: 'omer' },
  hana: { name: 'חנה', role: 'בת של מטופלת', look: 'hana' },
  noam: { name: 'ד״ר נועם', role: 'מתמחה', look: 'noam' },
  avi: { name: 'אבי', role: 'אח בכיר', look: 'avi' },
  shira: { name: 'שירה', role: 'קלינאית תקשורת', look: 'shira' },
  liat: { name: 'ליאת', role: 'דלפק הקבלה', look: 'liat' },
  dana: { name: 'דנה', role: 'עובדת סוציאלית', look: 'dana' },
  noa: { name: 'נועה', role: 'דיאטנית קלינית', look: 'noa' },
  gil: { name: 'גיל', role: 'שומר המועצה', look: 'gil' },
  maya: { name: 'מאיה', role: 'פיזיותרפיסטית', look: 'maya' },
  ron: { name: 'רון', role: 'מרפא בעיסוק', look: 'ron' },
  cohen: { name: 'מר כהן', role: 'בשיקום אחרי שבר', look: 'cohen' },
  yael: { name: 'יעל', role: 'אחות בריאות הקהילה', look: 'yael' },
  moshe: { name: 'משה', role: 'מטפל עיקרי לאשתו', look: 'moshe' },
  neighbor: { name: 'זלדה', role: 'שכנה', look: 'zelda' },
  michal: { name: 'מיכל', role: 'הבת של לאה', look: 'michal' },
  rachel: { name: 'רחל', role: 'אשתו של אברהם', look: 'rachel' },
  ido: { name: 'עידו', role: 'אח חדש — היריב שלך', look: 'ido' },
  judge0: { name: 'ד״ר אסתר גולן', role: 'מועצה · 🫀 קרדיולוגיה', look: 'judge0' },
  judge1: { name: 'ד״ר יונתן בר', role: 'מועצה · 🧠 נוירולוגיה', look: 'judge1' },
  judge2: { name: 'ד״ר מיכל אדר', role: 'מועצה · 💊 פרמקולוגיה', look: 'judge2' },
  judge3: { name: 'פרופ׳ שמעון נחום', role: 'מועצה · 🧓 גרונטולוגיה', look: 'judge3' },
  champion: { name: 'פרופ׳ דבורה אלמוג', role: 'יו״רית מועצת המומחים', look: 'champion' },
};

const TRAINER_LINES = {
  noam: { intro: ['רגע, רגע! לפני שאת/ה ממשיך/ה — יש לי מקרה מהלילה.', 'עצור/י! אני צריך דעה שנייה, מהר.'], win: ['טוב, השתכנעתי. אני הולך לבדוק את זה שוב.', 'אוקיי, זה היה חד. תודה.'], done: 'ד״ר נועם שקוע בהזמנת בדיקות. הוא מהנהן אליך.' },
  yael: { intro: ['אחות קהילה? בבית אין מוניטור — יש עיניים, שאלות ומשפחה. בוא/י נבדוק את שלך.', 'רגע! מטופלת שלי שוחררה אתמול. מה היית בודק/ת קודם?'], win: ['יפה. בקהילה זה בדיוק מה שמציל.', 'את/ה תהיה/י אחות/אח קהילה מצוין/ת.'], done: 'יעל ממהרת לביקור הבית הבא.' },
  moshe: { intro: ['אשתי חזרה מבית החולים ואני לבד איתה. תעזור/י לי להבין משהו?', 'סליחה! אתה/את מבית החולים? יש לי שאלה על אשתי.'], win: ['תודה. עכשיו אני יודע למה לשים לב.', 'הסברת יותר טוב מהמכתב שחרור.'], done: 'משה ממהר הביתה לאשתו.' },
  avi: { intro: ['בוא/י נראה אם את/ה מוכן/ה למשמרת. שאלה אחת.', 'אח/ות טוב/ה לא עובר/ת ליד אירוע. מה היית עושה?'], win: ['ככה עובדים. לך/י, המטופלים מחכים.', 'יפה. שומר/ת על הראש קר.'], done: 'אבי מסדר את עגלת התרופות ומחייך.' },
};

const PAGER_INTROS = ['📟 הביפר מצפצף! קריאה מחדר {r}.', '🔔 פעמון קריאה מחדר {r} — מישהו צריך אותך.', '📟 “אחות, את/ה יכול/ה לבוא רגע?” — חדר {r}.'];
const COMMUNITY_INTROS = ['📞 טלפון מבת משפחה: “אבא שלי לא נשמע כמו תמיד…”', '📞 המטפלת של שכנה מתקשרת: “יש לי שאלה דחופה”', '📞 שיחה מהמוקד הקהילתי: מטופלת שוחררה אתמול ומשהו השתנה'];
const BATTLE_INTROS = ['{n} — האירוע מתחיל.', 'משהו לא מסתדר: {n}', 'המטופל/ת לא “כמו תמיד”. {n}'];
const LEVEL_TITLES = [[1, 'אח/ות מתחיל/ה'], [3, 'אח/ות ליד המיטה'], [6, 'אח/ות אחראי/ת משמרת'], [10, 'אח/ות מומחה/ית בהכשרה'], [15, 'אח/ות מומחה/ית קליני/ת'], [20, 'מנטור/ית גריאטרי/ת']];

const COFFEE_PEARLS = [
  'בגריאטריה “חולשה” היא תיאור — לא אבחנה. חפש/י מה השתנה מה-baseline.',
  'דליריום היפואקטיבי שקט — ולכן מוחמץ. “רגוע מדי” הוא גם ממצא.',
  'כל תרופה חדשה היא חשודה עד שהוכח אחרת. מפל מרשמים מתחיל בתופעת לוואי שמטופלת בתרופה.',
  'קריאטינין “תקין” במטופל רזה ושרירי-מעט יכול להסתיר פינוי כלייתי ירוד.',
  'נפילה היא אירוע רב-מערכתי: לחץ דם בעמידה, תרופות, ראייה, סוכר, שתן וסביבה.',
  'Teach-back: אם המטפל/ת לא יכול/ה להסביר את התכנית במילים שלו/ה — היא עוד לא עברה.',
  'מטרת הטיפול נקבעת עם המטופל — לא רק בשבילו.',
];

/* The journey: what each chapter teaches (shown on the journey map and chapter cards). */
const ACT_INFO = [
  { story: 'היום הראשון במחלקה. לפני תרופות מתקדמות — לומדים לראות: מה השתנה מה-baseline, ומה המספרים באמת אומרים.',
    goals: ['לזהות אורתוסטזיס ונפילה שנגרמת מתרופה', 'לפרש אנמיה: Hb, MCV, RDW, ferritin ו-retic יחד', 'לחפש גורם הפיך לאי-שקט לפני שמוסיפים תרופה', 'להתאים מינון לפינוי כליה במבוגר עם מסת שריר נמוכה', 'לזהות פגיעת לחץ מוקדמת'] },
  { story: 'המוח המבוגר מגיב לכל דבר — זיהום, תרופה, כאב. הפרק מלמד להבחין בין “סתם בלבול” לבין חירום נוירולוגי.',
    goals: ['להפעיל מסלול שבץ: LKW, גלוקוז, חסר מוקדי', 'לזהות דליריום היפואקטיבי — השקט שמטעה', 'לפתוח differential כשההכרה לא חוזרת אחרי פרכוס', 'לסקור בליעה לפני אכילה אחרי שבץ'] },
  { story: 'לב וריאות במבוגר: מספר “סביר” יכול להסתיר מטופל לא יציב. לומדים לשאול קודם “האם יציב?”.',
    goals: ['להבחין בין דופק חריג לבין חוסר יציבות המודינמית', 'לזהות גודש ב-HF וטיפול-יתר במשתנים', 'להבין ש-SpO₂ אינו אוורור (COPD והיפרקפניה)', 'לחשוד ב-PE לפי דפוס ולא לפי בדיקה אחת'] },
  { story: 'מים, מלחים וסוכר: בגריאטריה התיקון עצמו יכול להזיק. הפרק עוסק בקצב, בזהירות ובתרופות שמאחורי המספר.',
    goals: ['לנהל היפרקלמיה עם שינויי ECG לפי סדר עדיפויות', 'לתקן היפו/היפרנתרמיה בקצב בטוח', 'לזהות טיפול-יתר בסוכרת ו-euglycemic DKA', 'לקרוא חומצה-בסיס שלמה ו-refeeding'] },
  { story: 'זיהום במבוגר לא תמיד בא עם חום. כאן לומדים לזהות פגיעה באיברים, דימום סמוי ותגובות לטיפול.',
    goals: ['לזהות ספסיס לפי תפקוד איברים — לא לפי WBC', 'לפרש DIC, המוליזה ודימום סמוי', 'לפעול מהר בנויטרופניה עם חום ובתגובת עירוי', 'לשלב stewardship, מינון ובקרת זיהומים'] },
  { story: 'כאב, נפילות ובטן: איך מקלים בלי להזיק, ואיך לא מפספסים חירום שמתחבא מאחורי “עוד כאב”.',
    goals: ['לנהל חבלת ראש במטופל על נוגד קרישה', 'להקל כאב בבטחה — אופיואידים, NSAIDs ודימום', 'לזהות תסמונת מדור וחסימת מעי', 'לטפל בדליריום ובתפקוד אחרי שבר ירך ובקוצר נשימה פליאטיבי'] },
  { story: 'הפרק של המומחה/ית: אין הנחיה אחת שפותרת הכל. מאזנים סיכון, מטרות ותפקוד — ומכינים את הבית.',
    goals: ['לבצע deprescribing מובנה במטופל עם ריבוי תרופות', 'לפרש טרופונין וסיכון QT בהקשר', 'לבנות תכנית שמתאימה למטרות המטופל/ת', 'להכין שחרור בטוח: התאמת תרופות ומטפלים מוכנים'] },
];

/* How an expert thinks at each decision (Tanner: noticing → interpreting → responding → reflecting). */
const STAGE_TIP = {
  q: 'איך חושבים: מה השתנה מה-baseline? איזה מנגנון אחד מסביר את רוב הממצאים הקריטיים?',
  g: 'איך חושבים: מטרה היא מה צריך לקרות למטופל — בטיחות, פרפוזיה ותפקוד — לא שם של פעולה.',
  x: 'איך חושבים: פעולה טובה מטפלת בגורם, בטוחה לגוף מבוגר ושברירי, וכוללת ניטור.',
  r: 'איך חושבים: איזה ממצא מדיד יראה בוודאות שהתכנית עובדת — ושהמטופל/ת חוזר/ת לתפקוד?',
};

/* First visit to each room: what it is for. */
const ROOM_INTRO = {
  staff: 'חדר הצוות — הבסיס שלך: לוקר, לוח המשמרת, מכונת הקפה ושולה מהקפיטריה. הספה כאן מסיימת משמרת.',
  hall: 'מסדרון המחלקה. רבקה בעמדת האחיות במרכז. החדרים למעלה, המעבדה בקצה, חדר הישיבות למטה. מתמחים וביפר יעצרו אותך לשאלות חזרה.',
  room1: 'חדר 1. לחץ/י על מיטה כדי לגשת למטופלת. ❗ מעל מיטה = יש אירוע חדש.',
  lab: 'המעבדה של טל: סבבי מעבדה קריטיים (קריאת פאנל שלם) והמעבדון — 78 בדיקות לזהות. המחשב כאן פותח את המעבדון.',
  conf: 'חדר הישיבות: כאן מתקיים הביקור הגדול של כל פרק. ניצחון = תג, ותג פותח את הפרק הבא אצל כל המטופלים.',
};

/* The interdisciplinary team — the party you recruit. Each is "super effective" against the clinical
   types that match their scope of practice, and each fact is evidence-based. */
const TEAM = {
  maya: { name: 'מאיה', role: 'פיזיותרפיסטית', icon: '🦿', strong: ['func', 'neuro'], move: 'הערכת ניידות ושיווי משקל', where: 'מכון השיקום',
    fact: 'Timed Up and Go של 12 שניות ומעלה מצביע על סיכון לנפילה (CDC STEADI). אימון כוח ושיווי משקל מפחית את שיעור הנפילות בכ-23% (Cochrane 2019).', src: ['steadi', 'sherrington2019'] },
  ron: { name: 'רון', role: 'מרפא בעיסוק', icon: '🏠', strong: ['func', 'goals'], move: 'התאמת סביבה ותפקוד', where: 'מכון השיקום',
    fact: 'הערכת מפגעים בבית והפחתתם מונעת כ-343 נפילות לכל 1,000 מבוגרים בסיכון בשנה — ויותר בקרב מי שכבר נפל (Cochrane 2023).', src: ['clemson2023'] },
  shira: { name: 'שירה', role: 'קלינאית תקשורת', icon: '🗣️', strong: ['neuro', 'infect'], move: 'הערכת בליעה', where: 'מסדרון המחלקה',
    fact: 'סקר בליעה לפני כל אכילה, שתייה או תרופה פומית אחרי שבץ (AHA/ASA 2019); מרקמי מזון ונוזלים מתוארים לפי מסגרת IDDSI.', src: ['aha_stroke2019', 'iddsi'] },
  noa: { name: 'נועה', role: 'דיאטנית קלינית', icon: '🥗', strong: ['renal', 'labs'], move: 'הערכה תזונתית', where: 'מבואת בית החולים',
    fact: 'MNA-SF הוא כלי סקר מתוקף לתת-תזונה במבוגרים (Kaiser 2009). בסיכון ל-refeeding מתחילים לאט ומנטרים זרחן, אשלגן ומגנזיום (NICE CG32).', src: ['mnasf', 'nice_cg32'] },
  omer: { name: 'עומר', role: 'רוקח קליני', icon: '💊', strong: ['meds', 'cardio', 'renal'], move: 'סקירת תרופות מובנית', where: 'בית המרקחת',
    fact: 'סקירת תרופות לפי STOPP/START v3 ו-Beers 2023 מזהה מרשמים לא מתאימים; התאמת מינון לפינוי כליה היא חלק מכל סקירה.', src: ['stopp2023', 'beers2023'] },
  dana: { name: 'דנה', role: 'עובדת סוציאלית', icon: '🤝', strong: ['goals'], move: 'שיחת מטרות ותמיכה במטפלים', where: 'מבואת בית החולים',
    fact: 'תכנון השחרור מתחיל בקבלה ומשלב את המטופל/ת והמטפלים (NICE NG27); שיחה על מטרות מיישרת את הטיפול עם מה שחשוב לאדם.', src: ['nice_ng27', 'ahrq_teachback'] },
};
const TEAM_ORDER = ['shira', 'maya', 'ron', 'noa', 'omer', 'dana'];

/* Leah's home: five fall hazards to find (CDC STEADI home checklist; Cochrane 2023 home-hazard reduction). */
const HAZARDS = {
  hz_rug: { t: 'שטיח קטן ומתקפל', fix: 'מסירים שטיחים קטנים או מקבעים אותם עם גב מונע החלקה — מכשול מעידה שכיח.' },
  hz_light: { t: 'תאורה חלשה', fix: 'מגבירים תאורה בחדרים ובמעברים ומוסיפים מתג נגיש ליד הכניסה — ראייה טובה מפחיתה מעידות.' },
  hz_pills: { t: 'קופסאות תרופות מפוזרות', fix: 'רשימה אחת מעודכנת וקופסת תרופות שבועית; תרופות מרדימות ולחץ דם הן גורמי סיכון לנפילה — סקירה עם הרוקח.' },
  hz_reach: { t: 'מדף גבוה מדי במטבח', fix: 'מעבירים חפצים בשימוש יומיומי לגובה המותניים — בלי לטפס על כיסא או שרפרף.' },
  hz_night: { t: 'הדרך לשירותים בלילה', fix: 'תאורת לילה בין המיטה לשירותים, מיטה בגובה שמאפשר לשבת עם כפות רגליים על הרצפה, וקימה בשלבים.' },
};

const RIVAL_LINES = [
  { intro: 'היי, את/ה החדש/ה! גם אני התחלתי השבוע. בוא/י נראה מי מבינינו קורא/ת מטופל יותר מהר!', win: 'אוקיי… זה היה טוב. אבל אני אתאמן. נתראה במחלקה!', lose: 'חה! עוד תלמד/י. בהצלחה עם רבקה!' },
  { intro: 'כבר שלושה תגים? גם אני! בקהילה זה שונה — אין מוניטור, יש רק את העיניים שלך. נבדוק?', win: 'בבית של מטופל רואים דברים שאין בתיק. אני מתחיל/ה להבין את זה.', lose: 'נראה לי שצריך לחזור לבסיס. ניפגש שוב.' },
  { intro: 'שבעה תגים. זה הרגע. לפני המועצה — סבב אחד אחרון ביננו. בלי הנחות.', win: 'לך/י. המועצה מחכה לך. ו… תודה. למדתי ממך יותר משחשבתי.', lose: 'עוד לא. תתכונן/י ותחזור/י.' },
];

const COUNCIL = [
  { id: 'judge0', pillar: 'cardio', acts: [2], intro: 'ברוך/ה הבא/ה למועצה. ארבעה שופטים, ארבעה תחומי ליבה, בלי מנוחה. אני בוחנת קרדיולוגיה גריאטרית: לב שלא תמיד כואב.' },
  { id: 'judge1', pillar: 'neuro', acts: [1], intro: 'נוירולוגיה. דליריום, שבץ, פרקינסון ודמנציה — המוח המבוגר מדבר בשקט. נראה אם את/ה מקשיב/ה.' },
  { id: 'judge2', pillar: 'pharm', acts: [3], intro: 'פרמקולוגיה גריאטרית. מינון, אינטראקציות, Beers ו-deprescribing. כל כדור הוא החלטה.' },
  { id: 'judge3', pillar: 'geron', acts: [0, 6], intro: 'גרונטולוגיה. שבריריות, תפקוד, הסתמנות לא טיפוסית וכבוד. הזקנה איננה מחלה — אבל היא משנה הכל.' },
  { id: 'champion', pillar: null, acts: [0, 1, 2, 3, 4, 5, 6], intro: 'הגעת עד אליי. אני לא בוחנת תחום — אני בוחנת אח/ות מומחה/ית קליני/ת בגריאטריה. כל ארבעת התחומים, ברצף.' },
];
