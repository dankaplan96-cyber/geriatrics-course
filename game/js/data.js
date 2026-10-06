/* המשמרת — game data: acts & badges, clinical types, items, maps, NPCs. */
'use strict';

const C = window.CONTENT;

/* Seven acts = seven badges (the "gyms"). Each act's episodes come from the clinical content. */
const ACTS = [
  { name: 'יסודות ליד המיטה', badge: '🩺', badgeName: 'תג המיטה', leader: 'ד״ר נגה אורן', role: 'גריאטריה', look: 'leader0' },
  { name: 'מוח והתנהגות', badge: '🧠', badgeName: 'תג המוח', leader: 'ד״ר עמית רז', role: 'נוירולוגיה', look: 'leader1' },
  { name: 'לב וריאות', badge: '🫀', badgeName: 'תג הלב', leader: 'ד״ר הדס לוי', role: 'קרדיולוגיה', look: 'leader2' },
  { name: 'כליה ומטבוליזם', badge: '💧', badgeName: 'תג הכליה', leader: 'ד״ר יואב שגיא', role: 'נפרולוגיה', look: 'leader3' },
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
    grid: ['##H#D##A##D##Q##D##H##D##A##D###', '#P............................P#', '#..............................#', '#............CCKCC.............#', 'D..............................#', '#.......y...............c......#', '#..w...........................#', '#P............................P#', '###########################D####'],
    doors: { '0,4': { to: 0, x: 10, y: 4, dir: 'left' }, '4,0': { to: 2, x: 5, y: 6, dir: 'up' }, '10,0': { to: 3, x: 5, y: 6, dir: 'up' }, '16,0': { to: 4, x: 5, y: 6, dir: 'up' }, '22,0': { to: 5, x: 5, y: 6, dir: 'up' }, '28,0': { to: 6, x: 4, y: 6, dir: 'up' }, '27,8': { to: 7, x: 5, y: 1, dir: 'down', boss: true } },
    labels: { '4,0': 'חדר 1', '10,0': 'חדר 2', '16,0': 'חדר 3', '22,0': 'חדר 4', '28,0': 'מעבדה', '27,8': 'ישיבות', '0,4': 'צוות' },
    npcs: [{ id: 'rivka', x: 14, y: 2, dir: 'down' }, { id: 'omer', x: 6, y: 6, dir: 'down', wander: [2, 5, 12, 7] }, { id: 'hana', x: 25, y: 2, dir: 'down', wander: [19, 1, 29, 3] },
      { id: 'noam', x: 8, y: 1, dir: 'down', trainer: true, sight: 3 }, { id: 'avi', x: 21, y: 7, dir: 'up', trainer: true, sight: 3 }],
    hotspots: { '15,3': 'review' } },
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
];
const BLOCK = new Set('#WOmQHAJBbCKThPSLMRFVXZIwcyk'.split(''));
const WALLISH = new Set('#WOmQHAJ'.split(''));

const NPC_INFO = {
  rivka: { name: 'רבקה', role: 'האחות האחראית', look: 'rivka' },
  shula: { name: 'שולה', role: 'קפיטריית הצוות', look: 'shula' },
  tal: { name: 'טל', role: 'טכנאית המעבדה', look: 'tal' },
  omer: { name: 'עומר', role: 'רוקח המחלקה', look: 'omer' },
  hana: { name: 'חנה', role: 'בת של מטופלת', look: 'hana' },
  noam: { name: 'ד״ר נועם', role: 'מתמחה', look: 'noam' },
  avi: { name: 'אבי', role: 'אח בכיר', look: 'avi' },
};

const TRAINER_LINES = {
  noam: { intro: ['רגע, רגע! לפני שאת/ה ממשיך/ה — יש לי מקרה מהלילה.', 'עצור/י! אני צריך דעה שנייה, מהר.'], win: ['טוב, השתכנעתי. אני הולך לבדוק את זה שוב.', 'אוקיי, זה היה חד. תודה.'], done: 'ד״ר נועם שקוע בהזמנת בדיקות. הוא מהנהן אליך.' },
  avi: { intro: ['בוא/י נראה אם את/ה מוכן/ה למשמרת. שאלה אחת.', 'אח/ות טוב/ה לא עובר/ת ליד אירוע. מה היית עושה?'], win: ['ככה עובדים. לך/י, המטופלים מחכים.', 'יפה. שומר/ת על הראש קר.'], done: 'אבי מסדר את עגלת התרופות ומחייך.' },
};

const PAGER_INTROS = ['📟 הביפר מצפצף! קריאה מחדר {r}.', '🔔 פעמון קריאה מחדר {r} — מישהו צריך אותך.', '📟 “אחות, את/ה יכול/ה לבוא רגע?” — חדר {r}.'];
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
