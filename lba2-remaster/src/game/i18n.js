// All player-facing text, Hebrew + English.

export const STR = {
  he: {
    title_sub: 'רימאסטר מחווה ל־Little Big Adventure 2 (1997) · מהדורת 2026',
    continue: 'המשך משחק', new_game: 'משחק חדש', settings: 'הגדרות', controls: 'מקשים', back: 'חזרה',
    resume: 'חזרה למשחק', save_quit: 'שמירה ויציאה לתפריט', paused: 'הפסקה',
    language: 'שפה', control_scheme: 'שיטת שליטה', ctrl_modern: 'מודרנית (יחסית למצלמה)', ctrl_classic: 'קלאסית 1997 (טנק)',
    visual: 'מראה', vis_2026: '2026 – תאורה, צללים, Bloom', vis_1997: '1997 – רזולוציה נמוכה, פיקסלים',
    quality: 'איכות גרפית', q_high: 'גבוהה', q_medium: 'בינונית', q_low: 'נמוכה',
    camera: 'מצלמה', cam_modern: 'חופשית (עכבר / סטיק)', cam_classic: 'איזומטרית קלאסית',
    music: 'מוזיקה', sfx: 'אפקטים',
    disclaimer: 'פרויקט מעריצים לא מסחרי. אינו קשור ל־Adeline Software או ל־[2.21]. כל המודלים, הצלילים והמוזיקה נוצרו מחדש בקוד.',
    controls_html: `
      <tr><td>WASD / חצים</td><td>תנועה</td></tr>
      <tr><td>1 2 3 4 · Tab · Ctrl+←/→</td><td>החלפת התנהגות: רגיל · אתלטי · אגרסיבי · דיסקרטי</td></tr>
      <tr><td>רווח</td><td>פעולת ההתנהגות: (אתלטי) קפיצה · (אגרסיבי) אגרוף/בעיטה · (דיסקרטי) הסתתרות · (רגיל) דיבור/חיפוש</td></tr>
      <tr><td>E / Enter</td><td>דיבור · פתיחה · חיפוש (בכל התנהגות – שיפור 2026)</td></tr>
      <tr><td>F / קליק שמאלי</td><td>זריקת הכדור הקסום</td></tr>
      <tr><td>גרירת עכבר · Z / C</td><td>סיבוב מצלמה</td></tr>
      <tr><td>M</td><td>הולומפה</td></tr>
      <tr><td>V</td><td>מעבר מיידי בין מראה 1997 ל־2026</td></tr>
      <tr><td>Esc / P</td><td>הפסקה</td></tr>
      <tr><td>גיימפד</td><td>A פעולה · B כדור · X דיבור · Y מפה · LB/RB התנהגות · Start הפסקה</td></tr>`,
    beh_normal: 'רגיל', beh_athletic: 'אתלטי', beh_aggressive: 'אגרסיבי', beh_discreet: 'דיסקרטי',
    p_talk: 'דבר', p_search: 'חפש', p_read: 'קרא', p_open: 'פתח', p_shop: 'קנה', p_gate: 'שער',
    obj_sage: 'מצא את חכם מזג־האוויר במגדלור שבצפון',
    obj_shards: 'אסוף את שלושת שברי השמש ({n}/3)',
    obj_s1: 'צוקי הלחישה במזרח', obj_s2: 'מחנה הזקיפים בדרום', obj_s3: 'המבצר העתיק – הסוהר קרל',
    obj_return: 'חזור אל החכם במגדלור עם שלושת השברים',
    obj_done: 'הסערה נשברה! חקור את האי בחופשיות',
    toast_saved: 'המשחק נשמר', toast_clover: 'עלה תלתן הציל אותך!', toast_shard: 'מצאת שבר שמש!',
    toast_key: 'קיבלת את מפתח המבצר', toast_magic: 'רמת הקסם עלתה ל־{n}!',
    toast_nomp: 'אין מספיק קסם – הכדור חלש', toast_coins: '+{n} מטבעות',
    toast_flask: 'מצאת שיקוי קסם!', toast_clover_found: 'מצאת עלה תלתן!',
    toast_nothing: 'אין כאן כלום...', toast_stones: 'האבנים מתעוררות!',
    toast_alert: 'זוהית!', toast_gate_open: 'השער נפתח',
    hint_target: 'מטרה עתיקה... אולי כדאי לפגוע בה עם הכדור הקסום (F)',
    hint_jump: 'עבור למצב אתלטי (2) וקפוץ עם רווח',
    boss_name: 'הסוהר קרל',
    map_title: 'הולומפה · האי סולמיר', map_close: 'M / Esc לסגירה',
    gameover: 'אליו נפל...', gameover_sub: 'אין יותר עלי תלתן.', retry: 'המשך מהשמירה האחרונה',
    ending_title: 'השמש חוזרת לסולמיר',
    ending_text: 'עדשת השמש בוערת שוב. הסערה נשברת, ולראשונה מזה ארבעים יום רואה האי את השמש.<br><br>תודה ששיחקת! מחווה ל־<b>Little Big Adventure 2</b> (Adeline Software, 1997).',
    keep_exploring: 'המשך לחקור',
    shop_title: 'הדוכן של פיפה', shop_buy: 'קנה', shop_leave: 'יציאה',
    shop_magic: 'גביש קסם – רמת קסם +1 (חזק את הכדור)', shop_potion: 'שיקוי לב – מילוי חיים', shop_flask: 'בקבוק קסם – מילוי קסם', shop_clover: 'עלה תלתן – חיים נוספים',
    shop_poor: 'אין לך מספיק מטבעות!', shop_max: 'כבר בשיא!',
    intro: 'כבר ארבעים יום שסערה בולעת את האי סולמיר. עדשת השמש של המגדלור נופצה לשלושה שברים, והזקיפים האפורים משתלטים על האי...',
    sign_village: 'נמל לומן · "הכפר הכי יבש באי" (כבר לא)',
    sign_lighthouse: '↑ המגדלור הצפוני',
    sign_cliffs: '→ צוקי הלחישה · זהירות: נפילה!',
    sign_camp: '⚠ מחנה הזקיפים · הכניסה אסורה',
    sign_fort: '→ המבצר העתיק',
    gate_locked: 'השער נעול. המפתח של קרל אמור להיות אי־שם במחנה הזקיפים.',
    n_sage: 'החכם מורו', n_pippa: 'פיפה הסוחרת', n_doran: 'דורן הדייג', n_nilo: 'נילו', n_hero: 'אליו',
    d_sage_1: [
      'אליו! תודה לרוחות שבאת. הזקיפים האפורים ניפצו את עדשת השמש, והסערה ניזונה מהחושך.',
      'שלושה שברי שמש התפזרו: אחד על צוקי הלחישה ביער המזרחי, אחד נעול במחנה הזקיפים בדרום, ואת השלישי נושא הסוהר קרל בתוך המבצר העתיק.',
      'השתמש בהתנהגויות שלך, ילד: אתלטי כדי לקפוץ, דיסקרטי כדי לחמוק מהשומרים, ואגרסיבי כשמילים לא עוזרות. ואל תשכח את הכדור הקסום שלך!',
      'הבא לי את שלושת השברים והמגדלור יבער שוב.',
    ],
    d_sage_wait: ['יש לך {n} מתוך 3 שברים. הסערה מחכה, אליו.'],
    d_sage_done: ['שלושת השברים! עמוד מאחור, ילד... הגיע הזמן להחזיר את השמש!'],
    d_sage_after: ['תסתכל על השמיים, אליו. עשית את זה.'],
    d_pippa: ['טריים מהיבשת! הסערה גרועה לעסקים, אבל לך תמיד יש לי משהו. רוצה להציץ?'],
    d_doran: [
      'הצוקים במזרח? יש שם מטרה עתיקה מאבן. סבא שלי אמר שפגיעה בה מעירה את אבני המדרך.',
      'והזקיפים במחנה? הם לא רואים כלום אם מתגנבים מאחוריהם. דיסקרטי – זו המילה.',
    ],
    d_nilo: ['ידעת שאפשר לזרוק את הכדור תוך כדי ריצה? במצב אתלטי הוא עף הכי גבוה!', 'ובמצב אגרסיבי הוא עף ישר וחזק. וואו!'],
    d_shard2: ['בתוך התיבה: שבר שמש... ומפתח כבד עם סמל המבצר!'],
    d_boss: ['עוד ילד עם כדור? השבר הזה שלי. הסערה שלי!'],
  },
  en: {
    title_sub: 'A tribute remaster of Little Big Adventure 2 (1997) · 2026 Edition',
    continue: 'Continue', new_game: 'New Game', settings: 'Settings', controls: 'Controls', back: 'Back',
    resume: 'Resume', save_quit: 'Save & quit to title', paused: 'Paused',
    language: 'Language', control_scheme: 'Control scheme', ctrl_modern: 'Modern (camera-relative)', ctrl_classic: 'Classic 1997 (tank)',
    visual: 'Look', vis_2026: '2026 – lighting, shadows, bloom', vis_1997: '1997 – low-res, pixelated',
    quality: 'Graphics quality', q_high: 'High', q_medium: 'Medium', q_low: 'Low',
    camera: 'Camera', cam_modern: 'Free (mouse / stick)', cam_classic: 'Classic isometric',
    music: 'Music', sfx: 'Effects',
    disclaimer: 'Non-commercial fan project. Not affiliated with Adeline Software or [2.21]. All models, sounds and music are recreated in code.',
    controls_html: `
      <tr><td>WASD / Arrows</td><td>Move</td></tr>
      <tr><td>1 2 3 4 · Tab · Ctrl+←/→</td><td>Behaviour: Normal · Athletic · Aggressive · Discreet</td></tr>
      <tr><td>Space</td><td>Behaviour action: jump (Athletic) · punch/kick (Aggressive) · hide (Discreet) · talk/search (Normal)</td></tr>
      <tr><td>E / Enter</td><td>Talk · open · search (in any behaviour – 2026 QoL)</td></tr>
      <tr><td>F / Left click</td><td>Throw the magic ball</td></tr>
      <tr><td>Mouse drag · Z / C</td><td>Rotate camera</td></tr>
      <tr><td>M</td><td>Holomap</td></tr>
      <tr><td>V</td><td>Instantly toggle 1997 / 2026 look</td></tr>
      <tr><td>Esc / P</td><td>Pause</td></tr>
      <tr><td>Gamepad</td><td>A action · B ball · X talk · Y map · LB/RB behaviour · Start pause</td></tr>`,
    beh_normal: 'Normal', beh_athletic: 'Athletic', beh_aggressive: 'Aggressive', beh_discreet: 'Discreet',
    p_talk: 'Talk', p_search: 'Search', p_read: 'Read', p_open: 'Open', p_shop: 'Shop', p_gate: 'Gate',
    obj_sage: 'Find the Weather Sage at the northern lighthouse',
    obj_shards: 'Recover the three Sunshards ({n}/3)',
    obj_s1: 'Whispering Cliffs (east)', obj_s2: 'Sentinel camp (south)', obj_s3: 'Old fort – Warden Krell',
    obj_return: 'Bring the three shards back to the Sage',
    obj_done: 'The storm is broken! Explore freely',
    toast_saved: 'Game saved', toast_clover: 'A clover leaf saved you!', toast_shard: 'Sunshard found!',
    toast_key: 'You got the fort key', toast_magic: 'Magic level is now {n}!',
    toast_nomp: 'Not enough magic – weak throw', toast_coins: '+{n} coins',
    toast_flask: 'Found a magic flask!', toast_clover_found: 'Found a clover leaf!',
    toast_nothing: 'Nothing here...', toast_stones: 'The stones awaken!',
    toast_alert: 'Spotted!', toast_gate_open: 'The gate opens',
    hint_target: 'An ancient target... maybe hit it with your magic ball (F)',
    hint_jump: 'Switch to Athletic (2) and jump with Space',
    boss_name: 'Warden Krell',
    map_title: 'Holomap · Isle of Solmere', map_close: 'M / Esc to close',
    gameover: 'Elio has fallen...', gameover_sub: 'No clover leaves left.', retry: 'Continue from last save',
    ending_title: 'The sun returns to Solmere',
    ending_text: 'The Sun Lens blazes again. The storm breaks, and for the first time in forty days the island sees the sun.<br><br>Thanks for playing! A tribute to <b>Little Big Adventure 2</b> (Adeline Software, 1997).',
    keep_exploring: 'Keep exploring',
    shop_title: "Pippa's stall", shop_buy: 'Buy', shop_leave: 'Leave',
    shop_magic: 'Magic crystal – magic level +1 (stronger ball)', shop_potion: 'Heart potion – refill life', shop_flask: 'Magic flask – refill magic', shop_clover: 'Clover leaf – extra life',
    shop_poor: "You don't have enough coins!", shop_max: 'Already maxed!',
    intro: 'For forty days a storm has swallowed the Isle of Solmere. The lighthouse Sun Lens was shattered into three shards, and the Grey Sentinels are taking over...',
    sign_village: 'Port Lumen · "The driest village on the island" (not anymore)',
    sign_lighthouse: '↑ Northern lighthouse',
    sign_cliffs: '→ Whispering Cliffs · Mind the drop!',
    sign_camp: '⚠ Sentinel camp · Keep out',
    sign_fort: '→ Old fort',
    gate_locked: "The gate is locked. Krell's key must be somewhere in the Sentinel camp.",
    n_sage: 'Moru the Sage', n_pippa: 'Pippa the merchant', n_doran: 'Doran the fisherman', n_nilo: 'Nilo', n_hero: 'Elio',
    d_sage_1: [
      'Elio! Thank the winds you came. The Grey Sentinels shattered the Sun Lens, and the storm feeds on the darkness.',
      'Three Sunshards were scattered: one atop the Whispering Cliffs in the eastern woods, one locked in the Sentinel camp to the south, and the third is carried by Warden Krell inside the old fort.',
      'Use your behaviours, boy: Athletic to leap, Discreet to slip past guards, Aggressive when words fail. And never forget your magic ball!',
      'Bring me the three shards and the lighthouse will burn again.',
    ],
    d_sage_wait: ['You carry {n} of 3 shards. The storm is waiting, Elio.'],
    d_sage_done: ['The three shards! Stand back, boy... it is time to bring back the sun!'],
    d_sage_after: ['Look at the sky, Elio. You did it.'],
    d_pippa: ['Fresh from the mainland! The storm is bad for business, but I always have something for you. Take a look?'],
    d_doran: [
      "The cliffs in the east? There's an old stone target there. My grandad said hitting it wakes the stepping stones.",
      "And the Sentinels in the camp? They can't see a thing if you sneak up behind them. Discreet – that's the word.",
    ],
    d_nilo: ['Did you know you can throw the ball while running? In Athletic mode it flies the highest!', 'And in Aggressive mode it flies straight and hard. Whoa!'],
    d_shard2: ['Inside the chest: a Sunshard... and a heavy key bearing the fort crest!'],
    d_boss: ['Another kid with a ball? This shard is mine. The storm is mine!'],
  },
};

let lang = 'he';
export const setLang = (l) => { lang = l; };
export const getLang = () => lang;
export function t(key, vars) {
  let s = STR[lang][key] ?? STR.en[key] ?? key;
  if (vars && typeof s === 'string') for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}
