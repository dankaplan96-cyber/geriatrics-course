/* המשמרת — ליבת המומחיות.
   The game exists to verify the knowledge expected of an expert geriatric clinical nurse in four pillars:
   cardiology, gerontology, neurology and pharmacology. This file:
   1. defines the pillars and maps every clinical episode to them;
   2. adds expert-level episodes where the legacy content was thin (neurology, pharmacology, gerontology);
   3. holds a bank of evidence-linked knowledge checks used by pagers, trainers, the rival, drills and the Expert Council;
   4. computes pillar mastery (episodes + spaced knowledge checks). */
'use strict';

const PILLARS = {
  cardio: { name: 'קרדיולוגיה', full: 'קרדיולוגיה גריאטרית', icon: '🫀', color: '#e2556b', examiner: 'leader2', who: 'ד״ר הדס לוי',
    scope: 'אי-ספיקת לב, פרפור פרוזדורים ונוגדי קרישה, ACS בהסתמנות לא טיפוסית, הפרעות קצב והולכה, מסתמים, לחץ דם ואורתוסטזיס.' },
  geron: { name: 'גרונטולוגיה', full: 'גרונטולוגיה וגריאטריה', icon: '🧓', color: '#0e9f8f', examiner: 'leader0', who: 'ד״ר נגה אורן',
    scope: 'פיזיולוגיה של הזדקנות, שבריריות וסרקופניה, הערכה גריאטרית כוללנית, הסתמנות לא טיפוסית, נפילות, עור, תזונה, התעללות והזנחה.' },
  neuro: { name: 'נוירולוגיה', full: 'נוירולוגיה ובריאות הנפש בזקנה', icon: '🧠', color: '#7c5cd6', examiner: 'leader1', who: 'ד״ר עמית רז',
    scope: 'דליריום, דמנציה ו-BPSD, שבץ ו-TIA, פרקינסון, פרכוסים, חבלת ראש, NPH ודיכאון בזקנה.' },
  pharm: { name: 'פרמקולוגיה', full: 'פרמקולוגיה גריאטרית', icon: '💊', color: '#d99a12', examiner: 'omer', who: 'עומר, רוקח קליני',
    scope: 'פרמקוקינטיקה בזקנה, Beers ו-STOPP/START, עומס אנטיכולינרגי, מינון כלייתי, נוגדי קרישה, אינטראקציות, מפל מרשמים ו-deprescribing.' },
};
const PILLAR_ORDER = ['cardio', 'geron', 'neuro', 'pharm'];

/* ---------- new sources (citations only; links are PubMed searches or official pages) ---------- */
Object.assign(SOURCES, {
  acb2008: { t: 'Anticholinergic Cognitive Burden scale', c: 'Boustani M, et al. Impact of anticholinergics on the aging brain: a review and practical application. Aging Health 2008;4(3):311–320.', u: pm('Boustani anticholinergic cognitive burden aging brain 2008') },
  hunter2003: { t: 'Hunter Serotonin Toxicity Criteria', c: 'Dunkley EJC, et al. The Hunter Serotonin Toxicity Criteria. QJM 2003;96(9):635–642.', u: pm('Dunkley Hunter serotonin toxicity criteria 2003') },
  boyer2005: { t: 'The serotonin syndrome (NEJM 2005)', c: 'Boyer EW, Shannon M. The serotonin syndrome. N Engl J Med 2005;352:1112–1120.', u: pm('Boyer Shannon serotonin syndrome N Engl J Med 2005') },
  ehra2021: { t: 'EHRA Practical Guide on NOACs 2021', c: 'Steffel J, et al. 2021 European Heart Rhythm Association Practical Guide on the use of non-vitamin K antagonist oral anticoagulants in AF. Europace 2021;23:1612–1676.', u: pm('2021 European Heart Rhythm Association practical guide NOAC atrial fibrillation Steffel') },
  manson1999: { t: 'Anticoagulation in elders who fall (1999)', c: 'Man-Son-Hing M, et al. Choosing antithrombotic therapy for elderly patients with atrial fibrillation who are at risk for falls. Arch Intern Med 1999;159:677–685.', u: pm('Man-Son-Hing antithrombotic therapy elderly atrial fibrillation risk for falls') },
  alexander2007: { t: 'Acute coronary care in the elderly (AHA 2007)', c: 'Alexander KP, et al. Acute coronary care in the elderly, part I: non-ST-segment-elevation ACS. Circulation 2007;115:2549–2569.', u: pm('Alexander acute coronary care in the elderly part I Circulation 2007') },
  acs2025: { t: 'ACC/AHA ACS Guideline 2025', c: 'Rao SV, et al. 2025 ACC/AHA/ACEP/NAEMSP/SCAI Guideline for the Management of Patients With Acute Coronary Syndromes. Circulation 2025.', u: pm('2025 ACC/AHA/ACEP/NAEMSP/SCAI guideline acute coronary syndromes') },
  vhd2020: { t: 'ACC/AHA Valvular Heart Disease 2020', c: 'Otto CM, et al. 2020 ACC/AHA Guideline for the Management of Patients With Valvular Heart Disease. Circulation 2021;143:e72–e227.', u: pm('2020 ACC/AHA guideline management valvular heart disease Otto') },
  nice_ng71: { t: 'NICE NG71 Parkinson’s disease', c: 'National Institute for Health and Care Excellence. Parkinson’s disease in adults (NG71), 2017.', u: 'https://www.nice.org.uk/guidance/ng71' },
  pd_time: { t: 'Parkinson’s UK — Get It On Time', c: 'Parkinson’s UK. Get It On Time: time-critical Parkinson’s medication in hospital.', u: 'https://www.parkinsons.org.uk/get-involved/get-it-on-time' },
  dice2014: { t: 'DICE approach to BPSD (2014)', c: 'Kales HC, Gitlin LN, Lyketsos CG. Management of neuropsychiatric symptoms of dementia in clinical settings: recommendations from a multidisciplinary expert panel. J Am Geriatr Soc 2014;62:762–769.', u: pm('Kales Gitlin Lyketsos management neuropsychiatric symptoms dementia expert panel 2014') },
  schneider2005: { t: 'Antipsychotics in dementia — mortality (JAMA 2005)', c: 'Schneider LS, Dagerman KS, Insel P. Risk of death with atypical antipsychotic drug treatment for dementia. JAMA 2005;294:1934–1943.', u: pm('Schneider risk of death atypical antipsychotic dementia meta-analysis JAMA 2005') },
  easton2009: { t: 'AHA/ASA — Definition & evaluation of TIA', c: 'Easton JD, et al. Definition and evaluation of transient ischemic attack. Stroke 2009;40:2276–2293.', u: pm('Easton definition and evaluation of transient ischemic attack Stroke 2009') },
  johnston2007: { t: 'ABCD2 score (Lancet 2007)', c: 'Johnston SC, et al. Validation and refinement of scores to predict very early stroke risk after TIA. Lancet 2007;369:283–292.', u: pm('Johnston ABCD2 validation very early stroke risk transient ischaemic attack Lancet 2007') },
  gds1982: { t: 'Geriatric Depression Scale', c: 'Yesavage JA, et al. Development and validation of a geriatric depression screening scale. J Psychiatr Res 1982;17:37–49.', u: pm('Yesavage development validation geriatric depression screening scale') },
  dazzi2014: { t: 'Asking about suicide does not induce it (2014)', c: 'Dazzi T, et al. Does asking about suicide and related behaviours induce suicidal ideation? Psychol Med 2014;44:3361–3363.', u: pm('Dazzi does asking about suicide induce suicidal ideation') },
  conwell2011: { t: 'Suicide in older adults (2011)', c: 'Conwell Y, Van Orden K, Caine ED. Suicide in older adults. Psychiatr Clin North Am 2011;34:451–468.', u: pm('Conwell suicide in older adults Psychiatr Clin North Am 2011') },
  acp_insomnia2016: { t: 'ACP Chronic insomnia 2016', c: 'Qaseem A, et al. Management of chronic insomnia disorder in adults: a clinical practice guideline from the ACP. Ann Intern Med 2016;165:125–133.', u: pm('Qaseem management chronic insomnia disorder adults ACP guideline 2016') },
  empower2014: { t: 'EMPOWER — benzodiazepine deprescribing (2014)', c: 'Tannenbaum C, et al. Reduction of inappropriate benzodiazepine prescriptions among older adults through direct patient education. JAMA Intern Med 2014;174:890–898.', u: pm('Tannenbaum EMPOWER benzodiazepine direct patient education JAMA Intern Med 2014') },
  rockwood2005: { t: 'Clinical Frailty Scale (2005)', c: 'Rockwood K, et al. A global clinical measure of fitness and frailty in elderly people. CMAJ 2005;173:489–495.', u: pm('Rockwood global clinical measure of fitness and frailty CMAJ 2005') },
  fried2001: { t: 'Frailty phenotype (Fried 2001)', c: 'Fried LP, et al. Frailty in older adults: evidence for a phenotype. J Gerontol A Biol Sci Med Sci 2001;56:M146–M156.', u: pm('Fried frailty in older adults evidence for a phenotype 2001') },
  clegg2013: { t: 'Frailty in elderly people (Lancet 2013)', c: 'Clegg A, et al. Frailty in elderly people. Lancet 2013;381:752–762.', u: pm('Clegg frailty in elderly people Lancet 2013') },
  ewgsop2: { t: 'EWGSOP2 Sarcopenia 2019', c: 'Cruz-Jentoft AJ, et al. Sarcopenia: revised European consensus on definition and diagnosis. Age Ageing 2019;48:16–31.', u: pm('Cruz-Jentoft sarcopenia revised European consensus definition diagnosis 2019') },
  ellis2017: { t: 'Cochrane 2017 — CGA in hospital', c: 'Ellis G, et al. Comprehensive geriatric assessment for older adults admitted to hospital. Cochrane Database Syst Rev 2017;9:CD006211.', u: pm('Ellis comprehensive geriatric assessment older adults admitted to hospital Cochrane 2017') },
  kortebein2007: { t: '10 days of bed rest in older adults (JAMA 2007)', c: 'Kortebein P, et al. Effect of 10 days of bed rest on skeletal muscle in healthy older adults. JAMA 2007;297:1772–1774.', u: pm('Kortebein effect of 10 days of bed rest skeletal muscle healthy older adults') },
  idsa_asb2019: { t: 'IDSA Asymptomatic bacteriuria 2019', c: 'Nicolle LE, et al. Clinical Practice Guideline for the Management of Asymptomatic Bacteriuria: 2019 Update by the IDSA. Clin Infect Dis 2019;68:e83–e110.', u: pm('Nicolle asymptomatic bacteriuria 2019 update IDSA guideline') },
  high2009: { t: 'IDSA — Fever & infection in long-term care', c: 'High KP, et al. Clinical practice guideline for the evaluation of fever and infection in older adult residents of long-term care facilities: 2008 update by the IDSA. Clin Infect Dis 2009;48:149–171.', u: pm('High evaluation of fever and infection older adult residents long-term care IDSA 2008 update') },
  yon2017: { t: 'Elder abuse prevalence (Lancet GH 2017)', c: 'Yon Y, et al. Elder abuse prevalence in community settings: a systematic review and meta-analysis. Lancet Glob Health 2017;5:e147–e156.', u: pm('Yon elder abuse prevalence community settings systematic review meta-analysis 2017') },
  easi2008: { t: 'Elder Abuse Suspicion Index (EASI)', c: 'Yaffe MJ, et al. Development and validation of a tool to improve physician identification of elder abuse: the EASI. J Elder Abuse Negl 2008;20:276–300.', u: pm('Yaffe elder abuse suspicion index EASI development validation') },
  cockcroft1976: { t: 'Cockcroft–Gault (1976)', c: 'Cockcroft DW, Gault MH. Prediction of creatinine clearance from serum creatinine. Nephron 1976;16:31–41.', u: pm('Cockcroft Gault prediction of creatinine clearance from serum creatinine') },
  lapi2013: { t: '“Triple whammy” & AKI (BMJ 2013)', c: 'Lapi F, et al. Concurrent use of diuretics, ACE inhibitors, and angiotensin receptor blockers with NSAIDs and risk of acute kidney injury. BMJ 2013;346:e8525.', u: pm('Lapi concurrent use diuretics ACE inhibitors NSAIDs acute kidney injury BMJ 2013') },
  rochon1997: { t: 'The prescribing cascade (BMJ 1997)', c: 'Rochon PA, Gurwitz JH. Optimising drug treatment for elderly people: the prescribing cascade. BMJ 1997;315:1096–1099.', u: pm('Rochon Gurwitz prescribing cascade BMJ 1997') },
  relkin2005: { t: 'Idiopathic NPH guidelines (2005)', c: 'Relkin N, et al. Diagnosing idiopathic normal-pressure hydrocephalus. Neurosurgery 2005;57(3 Suppl):S4–S16.', u: pm('Relkin diagnosing idiopathic normal-pressure hydrocephalus Neurosurgery 2005') },
  mangoni2004: { t: 'Age-related PK/PD changes (2004)', c: 'Mangoni AA, Jackson SHD. Age-related changes in pharmacokinetics and pharmacodynamics: basic principles and practical applications. Br J Clin Pharmacol 2004;57:6–14.', u: pm('Mangoni Jackson age-related changes pharmacokinetics pharmacodynamics 2004') },
});

/* ---------- pillar map of every episode (primary first) ---------- */
const EP_PILLARS = {
  'orthostasis': ['cardio', 'pharm'], 'iron': ['geron'], 'retention-delirium': ['neuro', 'pharm'], 'creatinine': ['pharm', 'geron'],
  'stroke': ['neuro'], 'seizure-postictal': ['neuro'], 'dysphagia': ['neuro', 'geron'],
  'copd': ['cardio', 'geron'], 'unstable-af': ['cardio'], 'hf-congestion': ['cardio'], 'aspiration-pneumonia': ['geron', 'neuro'],
  'hyperk': ['cardio', 'pharm'], 'hypona': ['neuro', 'pharm'], 'hypoglycemia': ['pharm', 'neuro'], 'hhs': ['geron', 'pharm'],
  'sepsis': ['geron'], 'dic': ['geron'], 'occult-bleed': ['pharm', 'geron'],
  'head': ['neuro', 'pharm'], 'gi-bleed': ['pharm', 'cardio'], 'opioid': ['pharm', 'neuro'],
  'grand': ['geron'], 'troponin': ['cardio'], 'discharge': ['geron', 'pharm'],
  'b12-neuro': ['neuro', 'geron'], 'hypoactive-delirium': ['neuro', 'geron'], 'pe-suspicion': ['cardio'], 'digoxin-brady': ['pharm', 'cardio'],
  'mixed-acidbase': ['geron'], 'hypernatremia': ['geron', 'neuro'], 'renal-antibiotic': ['pharm'], 'opioid-ileus': ['pharm', 'geron'],
  'goals-hf': ['cardio', 'geron'], 'qt-stack': ['pharm', 'cardio'], 'pressure-injury': ['geron'], 'symptomatic-brady': ['cardio', 'pharm'],
  'pulmonary-edema': ['cardio'], 'refeeding': ['geron'], 'dka-sglt2': ['pharm'], 'hypercalcemia': ['geron', 'neuro'],
  'cdiff': ['pharm', 'geron'], 'neutropenic-fever': ['geron'], 'transfusion-reaction': ['geron'], 'line-sepsis': ['geron'],
  'compartment': ['geron'], 'hip-delirium': ['neuro', 'geron'], 'palliative-dyspnea': ['geron', 'pharm'], 'bowel-obstruction': ['geron'],
  'med-reconciliation': ['pharm'], 'caregiver-capacity': ['geron'],
  'mixed-anemia-v21': ['geron'], 'ckd-iron-v21': ['geron', 'pharm'], 'overdiuresis-v21': ['cardio', 'pharm'], 'raas-nsaid-v21': ['pharm', 'cardio'],
  'brady-stack-v21': ['cardio', 'pharm'], 'amlodipine-edema-v21': ['pharm', 'cardio'], 'acute-bloodloss-v21': ['geron'], 'hemolysis-v21': ['geron'],
};
function epPillars(e) { return EP_PILLARS[e.id] || [{ 1: 'neuro', 2: 'cardio', 3: 'pharm' }[e.a] || 'geron']; }

/* ---------- expert episodes (same schema as the legacy content) ---------- */
const CORE_EPISODES = [
  // ---- cardiology
  { id: 'as-syncope', a: 2, p: 'david', pl: ['cardio', 'pharm'], t: 'התעלף בדרך לשירותים', st: 'דוד איבד הכרה לכמה שניות כשהלך מהר לשירותים. התאושש מיד. הצוות רוצה לתת לו nitrate בגלל “לחץ בחזה”.',
    tags: ['סינקופה', 'מסתמים', 'לב'], v: ['BP 104/78 (pulse pressure צר)', 'HR 82 סדיר', 'אוושה סיסטולית 3/6 המקרינה לקרוטידים'],
    c: [['אוושה', 'crescendo–decrescendo בבסיס הלב, מקרינה לצוואר', 2], ['הקשר למאמץ', 'התעלף בזמן מאמץ, לא בשכיבה', 2], ['תסמינים קודמים', 'לחץ בחזה וקוצר נשימה בהליכה בחודשים האחרונים', 2], ['ECG', 'LVH ללא שינויי ST חדשים', 1], ['סוכר', '142', 0], ['חום', '36.8', 0]],
    q: ['סינקופה וזוגלית תמימה', 'היצרות מסתם אאורטלי משמעותית עם סינקופת מאמץ', 'היפוגליקמיה', 'פרכוס'], qc: 1,
    g: ['להוריד afterload מהר', 'לשמור על preload ו-perfusion, למנוע סינקופה חוזרת ולהשלים בירור', 'להגביר פעילות כדי “לחזק את הלב”', 'להמתין למעקב שגרתי'], gc: 1,
    x: ['להימנע מוואזודילטורים ומהתייבשות, ניטור, ECG ודיווח לרופא לאקו לב ולהערכה קרדיולוגית (TAVI/SAVR)', 'nitroglycerin תת-לשוני ללחץ בחזה', 'Furosemide כדי “לייבש” את הריאות', 'שחרור עם הנחיה לשתות יותר'], xc: 0,
    r: ['ללא סינקופה חוזרת, BP יציב, אקו מתוכנן והפניה קרדיולוגית', 'BP 78/40 אחרי nitrate', 'נפילה נוספת בדרך לשירותים'], rc: 0,
    risk: 'ב-AS קשה ה-cardiac output קבוע; ואזודילציה או ירידה ב-preload עלולות לגרום לקריסה. סינקופה, אנגינה ואי-ספיקת לב הן סימני אזהרה של מחלה מתקדמת.',
    pe: 'סינקופת מאמץ + אוושה סיסטולית שמקרינה לקרוטידים = AS עד שיוכח אחרת. לא נותנים nitrate בלי לחשוב על המסתם.' },
  { id: 'atypical-acs', a: 2, p: 'ruth', pl: ['cardio', 'geron'], t: 'רק עייפה ובחילה', st: 'רות מתלוננת שהיא “סתם חלשה” ויש לה בחילה. אין כאב בחזה. היא מזיעה וקצרת נשימה.',
    tags: ['ACS', 'הסתמנות לא טיפוסית', 'לב'], v: ['HR 104', 'BP 138/84', 'SpO₂ 93%', 'RR 22'],
    c: [['ECG', 'ירידות ST ב-V4–V6', 2], ['טרופונין', 'hs-troponin עולה בין שתי בדיקות', 2], ['תסמינים', 'קוצר נשימה, הזעה ובחילה בלי כאב בחזה', 2], ['גיל ומין', '84, אישה — קבוצה שבה הסתמנות לא טיפוסית שכיחה', 1], ['תיאבון', 'ירוד כבר חודש', 0], ['Hb', '11.8 יציב', 0]],
    q: ['גסטרואנטריטיס', 'תסמונת כלילית חריפה בהסתמנות לא טיפוסית (NSTE-ACS)', 'חרדה', 'עייפות של גיל'], qc: 1,
    g: ['להרגיע ולתת נוגד בחילה בלבד', 'זיהוי מהיר של איסכמיה ושמירה על perfusion ובטיחות', 'להמתין לכאב בחזה לפני הערכה', 'לדחות ECG לבוקר'], gc: 1,
    x: ['ECG בתוך 10 דקות והשוואה לקודם, טרופונין סדרתי, ניטור, דיווח מיידי לרופא והכנה לטיפול לפי פרוטוקול ACS', 'Metoclopramide ומעקב', 'IV fluids בלבד', 'לחכות לצילום חזה'], xc: 0,
    r: ['ECG ו-troponin מנוטרים, טיפול ACS התחיל, הסימפטומים פוחתים והמטופלת יציבה', 'כאב חזה מופיע שעתיים אחר כך', 'VF בניטור'], rc: 0,
    risk: 'במבוגרים, ובעיקר מעל 85, קוצר נשימה, חולשה, בחילה ובלבול שכיחים יותר מכאב חזה טיפוסי. החמצה מעכבת טיפול מציל חיים.',
    pe: '“אין כאב בחזה” לא שולל ACS בזקנה. קוצר נשימה הוא התסמין הלא-טיפוסי השכיח ביותר.' },
  { id: 'af-falls-anticoag', a: 2, p: 'miriam', pl: ['cardio', 'pharm'], t: '“תפסיקו לה את המדלל”', st: 'אחרי נפילה קלה בלי חבלת ראש, הבן של מרים מבקש להפסיק לה את ה-apixaban “כי היא נופלת”.',
    tags: ['AF', 'נוגדי קרישה', 'נפילות'], v: ['CHA₂DS₂-VASc 6', 'שבץ איסכמי לפני שנה', 'נפילה אחת בחצי שנה'],
    c: [['CHA₂DS₂-VASc', '6 — סיכון גבוה מאוד לשבץ', 2], ['היסטוריה', 'שבץ קרדיואמבולי קודם', 2], ['הנפילה', 'החלקה בלילה בדרך לשירותים, ללא חבלת ראש', 1], ['תרופות', 'Zolpidem לשינה', 2], ['תיאבון', 'טוב', 0], ['ויטמין D', 'לא נבדק', 1]],
    q: ['הנפילה מחייבת הפסקת נוגד קרישה', 'סיכון שבץ גבוה שעולה על סיכון הדימום מנפילות; יש לטפל בגורמי הנפילה', 'אין צורך לעשות דבר', 'יש לעבור לאספירין'], qc: 1,
    g: ['להוריד את הסיכון לדימום בכל מחיר', 'למנוע שבץ חוזר ובמקביל להפחית נפילות', 'להרגיע את המשפחה ולשנות נושא', 'להשאיר את מרים במיטה'], gc: 1,
    x: ['להמשיך נוגד קרישה במינון נכון, לבצע הערכת נפילות רב-גורמית (כולל הפסקת Zolpidem), ולשתף את המשפחה בהחלטה עם הצוות', 'להפסיק apixaban עד הודעה חדשה', 'להחליף לאספירין', 'להוסיף מעקות למיטה ולקשור'], xc: 0,
    r: ['המשפחה מבינה את האיזון, Zolpidem הופסק, תכנית מניעת נפילות פעילה ונוגד הקרישה נמשך', 'שבץ חוזר אחרי הפסקה', 'נפילה מהמיטה עם מעקות'], rc: 0,
    risk: 'הפסקת נוגד קרישה בגלל נפילות בלבד חושפת לשבץ קרדיואמבולי, שלרוב גורם לנכות קשה או למוות. אספירין אינו תחליף יעיל ב-AF.',
    pe: 'נפילות לבדן אינן סיבה להפסיק נוגד קרישה ב-AF. מטפלים בגורמי הנפילה, בודקים מינון ומשתפים בהחלטה.' },
  // ---- neurology
  { id: 'parkinson-time', a: 1, p: 'yosef', pl: ['neuro', 'pharm'], t: 'הכדור שאיחר', st: 'ליוסף יש גם פרקינסון. הוא בצום לקראת בדיקה, ה-levodopa לא ניתן כבר 6 שעות. הוא נוקשה, לא מצליח לבלוע ומבולבל. הוצע haloperidol לאי-שקט.',
    tags: ['פרקינסון', 'תרופות בזמן', 'דליריום'], v: ['T 37.9', 'HR 96', 'נוקשות מוגברת', 'GCS 14'],
    c: [['תרופות', 'levodopa/carbidopa כל 4 שעות — 2 מנות הוחמצו', 2], ['נוקשות', 'rigidity חדשה ו-akinesia', 2], ['בליעה', 'לא מצליח לבלוע רוק', 2], ['חום', '37.9 בלי מוקד ברור', 1], ['כאב', 'ללא', 0], ['צילום חזה', 'ללא תסנין', 0]],
    q: ['החמרת דמנציה', 'החמרה חריפה בפרקינסון מהחמצת levodopa, בסיכון לתסמונת דמוית-NMS', 'שבץ חדש בוודאות', 'אי-שקט שמחייב אנטיפסיכוטי'], qc: 1,
    g: ['להרגיע את האי-שקט מהר', 'להחזיר טיפול דופמינרגי בזמן ולמנוע סיבוכים (אספירציה, NMS-like)', 'להמשיך צום עד אחרי הבדיקה', 'לחכות לנוירולוג מחר'], gc: 1,
    x: ['לדווח מיד, לתת levodopa בזמן דרך חלופית לפי הוראה (זונדה/תכשיר מסיס/מדבקת rotigotine), להימנע מ-haloperidol ו-metoclopramide, וניטור חום/בליעה', 'Haloperidol 1 mg IM', 'Metoclopramide לבחילה ולשמור בצום', 'להפסיק את כל התרופות עד שיתאושש'], xc: 0,
    r: ['הנוקשות פוחתת, בליעה משתפרת, חום יורד והתרופות ניתנות בזמן', 'נוקשות קיצונית וחום 39.5 אחרי haloperidol', 'אספירציה'], rc: 0,
    risk: 'levodopa היא תרופה תלוית-זמן. איחור או הפסקה גורמים להחמרה מוטורית, דיספגיה ואספירציה, ובמקרים קשים לתסמונת parkinsonism-hyperpyrexia. אנטגוניסטים לדופמין מחמירים.',
    pe: 'בפרקינסון: “Get It On Time” — בתוך 30 דקות מהשעה שנקבעה. צום לבדיקה אינו סיבה לדלג על levodopa.' },
  { id: 'bpsd-sundowning', a: 1, p: 'avraham', pl: ['neuro', 'pharm'], t: 'צועק בכל ערב', st: 'אברהם, עם דמנציה, צועק ומנסה לקום בכל ערב. המשמרת מבקשת “משהו להרגעה”.',
    tags: ['דמנציה', 'BPSD', 'כאב'], v: ['PAINAD 6/10', 'יציאה אחרונה לפני 4 ימים', 'שתן: 180 mL ב-8 שעות'],
    c: [['כאב', 'מעווה פנים כשמזיזים את הרגל המנותחת', 2], ['עצירות', 'אין יציאה 4 ימים', 2], ['זמן', 'מתחיל עם החושך והחלפת משמרת', 1], ['שמיעה', 'מכשיר השמיעה במגירה', 2], ['חום', '36.9', 0], ['נתרן', '138', 0]],
    q: ['החמרה בלתי נמנעת של הדמנציה', 'BPSD מונע מצרכים לא מסופקים: כאב, עצירות, חסך חושי', 'פסיכוזה ראשונית', 'התנהגות מכוונת'], qc: 1,
    g: ['שקט במחלקה', 'לזהות ולטפל בגורם להתנהגות ולשמור על בטיחות וכבוד', 'הגבלה פיזית למניעת נפילה', 'סדציה לילית קבועה'], gc: 1,
    x: ['גישת DICE: תיאור ההתנהגות, טיפול בכאב (אומדן PAINAD) ובעצירות, החזרת מכשיר שמיעה, שגרה ותאורה; אנטיפסיכוטי רק בסכנה ממשית ובמינון נמוך', 'Haloperidol קבוע בערב', 'קשירה למיטה', 'Lorazepam לפי צורך'], xc: 0,
    r: ['PAINAD יורד, יציאה, ערב רגוע יותר בלי תרופה מרגיעה', 'נפילה אחרי benzodiazepine', 'ישנוני ושואף אחרי haloperidol'], rc: 0,
    risk: 'אנטיפסיכוטיים בדמנציה מעלים תמותה (בערך פי 1.5) וסיכון לשבץ; benzodiazepines מעלים נפילות ודליריום. כאב לא מטופל הוא גורם שכיח לאי-שקט.',
    pe: 'התנהגות בדמנציה היא תקשורת. קודם מחפשים צורך: כאב, עצירות, אצירה, חסך חושי, פחד.' },
  { id: 'tia-transient', a: 1, p: 'leah', pl: ['neuro', 'cardio'], t: 'זה עבר אחרי עשרים דקות', st: 'לאה לא מצאה מילים ויד ימין הייתה חלשה. אחרי 20 דקות הכל עבר. היא מבקשת “לא לעשות עניין”.',
    tags: ['TIA', 'AF', 'נוירו'], v: ['BP 168/92', 'AF, HR 88', 'סוכר 118'],
    c: [['תסמינים', 'אפזיה וחולשת יד חולפות — מוקדי', 2], ['קצב', 'AF ידוע, לא מטופלת בנוגד קרישה', 2], ['משך', '20 דקות, חזרה מלאה', 1], ['גיל ולחץ דם', '87, BP ≥140/90', 1], ['סוכר', '118', 0], ['חום', '36.6', 0]],
    q: ['אירוע חולף בלי משמעות', 'TIA — סיכון גבוה לשבץ בימים הקרובים, עם AF כמקור אמבולי אפשרי', 'היפוגליקמיה', 'מיגרנה'], qc: 1,
    g: ['להרגיע ולחכות', 'למנוע שבץ: בירור דחוף וטיפול במקור', 'רק להוריד לחץ דם', 'לדחות למרפאה בעוד חודש'], gc: 1,
    x: ['דיווח מיידי, הערכה נוירולוגית (NIHSS/BE-FAST), הדמיה דחופה ובירור, ותכנון מניעה שניונית כולל נוגד קרישה בגלל AF', 'רישום “חלף” ומעקב שגרתי', 'להוריד BP ל-110 מיד', 'אספירין ושחרור הביתה'], xc: 0,
    r: ['הדמיה ובירור הושלמו, נוגד קרישה הוחל לפי החלטת הצוות, ללא אירוע חוזר', 'שבץ מלא למחרת', 'נפילה בלילה'], rc: 0,
    risk: 'הסיכון לשבץ אחרי TIA הוא הגבוה ביותר ב-48 השעות הראשונות. ב-AF המקור הוא לרוב אמבולי ומניעה יעילה היא נוגד קרישה.',
    pe: 'TIA הוא מצב חירום, לא “הקלה”. חלוף התסמינים לא מוריד את הסיכון.' },
  // ---- pharmacology
  { id: 'anticholinergic-burden', a: 3, p: 'miriam', pl: ['pharm', 'neuro'], t: 'שלוש תרופות קטנות', st: 'מרים מבולבלת, עצורה ופיה יבש. לאחרונה הוסיפו לה oxybutynin לדחיפות במתן שתן ו-diphenhydramine לשינה.',
    tags: ['אנטיכולינרגי', 'Beers', 'דליריום'], v: ['שארית שתן 420 mL', 'HR 98', '4AT 6'],
    c: [['תרופות', 'oxybutynin + diphenhydramine + paroxetine', 2], ['אצירה', 'שארית 420 mL בסורק שלפוחית', 2], ['קוגניציה', '4AT 6 — דליריום אפשרי', 2], ['עצירות', '5 ימים', 1], ['שתן לתרבית', 'לוקח', 0], ['ויטמין D', '24', 0]],
    q: ['זיהום בדרכי השתן', 'עומס אנטיכולינרגי מצטבר הגורם לדליריום, אצירה ועצירות', 'החמרת דמנציה', 'שבץ חדש'], qc: 1,
    g: ['להוסיף תרופה לאי-שקט', 'להפחית עומס אנטיכולינרגי ולטפל בתוצאותיו', 'לחכות לתרבית', 'להגביל שתייה'], gc: 1,
    x: ['לחשב עומס אנטיכולינרגי, להמליץ להפסיק/להחליף (Beers/STOPP), לנקז את השלפוחית, לטפל בעצירות ולמדוד 4AT שוב', 'אנטיביוטיקה אמפירית', 'Haloperidol לבלבול', 'עוד מנת diphenhydramine בלילה'], xc: 0,
    r: ['4AT 0 תוך יומיים, שארית שתן קטנה ויציאה', 'נפילה אחרי עוד diphenhydramine', 'אצירה חוזרת'], rc: 0,
    risk: 'כל תרופה “קטנה” מוסיפה עומס. אנטיכולינרגיים חזקים (diphenhydramine, oxybutynin, paroxetine) מופיעים ב-Beers 2023 כתרופות להימנע מהן בזקנה.',
    pe: 'עומס אנטיכולינרגי הוא סכום. ציון ACB של 3 ומעלה נחשב משמעותי קלינית.' },
  { id: 'serotonin-tramadol', a: 5, p: 'sara', pl: ['pharm', 'neuro'], t: 'רועדת וחמה', st: 'לשרה, שמקבלת sertraline, הוסיפו tramadol לכאב ו-ondansetron לבחילה. אחרי יממה היא חסרת מנוחה, מזיעה ורועדת.',
    tags: ['סרוטונין', 'אינטראקציות', 'כאב'], v: ['T 38.6', 'HR 118', 'BP 162/94', 'אישונים מורחבים'],
    c: [['קלונוס', 'קלונוס מושרה בקרסוליים, היפר-רפלקסיה', 2], ['תרופות', 'sertraline + tramadol + ondansetron', 2], ['תסמינים', 'שלשול, הזעה ואי-שקט', 1], ['זמן', 'התחיל בתוך 24 שעות מהוספת tramadol', 2], ['נוקשות', 'אין rigidity “צינור עופרת”', 1], ['Hb', '10.9', 0]],
    q: ['אלח דם', 'תסמונת סרוטונינית (Hunter: קלונוס + היפרתרמיה)', 'NMS', 'גמילה מאופיואידים'], qc: 1,
    g: ['להוריד חום בלבד', 'להפסיק את הגורם ולמנוע החמרה (היפרתרמיה, אי-יציבות אוטונומית)', 'להעלות מינון tramadol לכאב', 'לחכות לתוצאות תרביות'], gc: 1,
    x: ['דיווח מיידי, עצירת התרופות הסרוטונרגיות לפי הוראה, טיפול תומך וקירור, benzodiazepine לאי-שקט לפי הוראה, ניטור צמוד', 'Paracetamol ומעקב', 'עוד tramadol לכאב', 'Haloperidol לאי-שקט'], xc: 0,
    r: ['תוך 24 שעות: קלונוס פוחת, חום ודופק יורדים, כאב מטופל בחלופה', 'חום 40.5 ורבדומיוליזיס', 'פרכוס'], rc: 0,
    risk: 'tramadol, ondansetron, linezolid, fentanyl ו-triptans מצטרפים ל-SSRI. בזקנה מוסיפים גם tramadol → היפונתרמיה ופרכוסים.',
    pe: 'אי-שקט + חום + קלונוס אחרי תרופה סרוטונרגית חדשה = תסמונת סרוטונינית. NMS איטי יותר, עם נוקשות וברדיקינזיה.' },
  { id: 'doac-dose', a: 3, p: 'leah', pl: ['pharm', 'cardio'], t: 'המינון שלא נבדק', st: 'לאה (87, 54 ק״ג) מקבלת apixaban 5 mg פעמיים ביום. הקריאטינין 1.6 mg/dL. היא מדממת מהחניכיים.',
    tags: ['DOAC', 'מינון כלייתי', 'AF'], v: ['Cr 1.6 mg/dL', 'משקל 54 ק״ג', 'Hb 11.2 (היה 12.1)'],
    c: [['גיל', '87 (≥80)', 2], ['משקל', '54 ק״ג (≤60)', 2], ['קריאטינין', '1.6 (≥1.5)', 2], ['דימום', 'דימום חניכיים, שטפי דם', 1], ['ECG', 'AF, HR 84', 0], ['TSH', 'תקין', 0]],
    q: ['המינון מתאים', 'מינון יתר: עומדת ב-3 מתוך 3 קריטריונים להפחתת apixaban ל-2.5 mg פעמיים ביום', 'יש להפסיק נוגד קרישה לצמיתות', 'יש להחליף ל-warfarin מיד'], qc: 1,
    g: ['להפחית את הסיכון לדימום בלי לאבד הגנה משבץ', 'להפסיק כל טיפול', 'להעלות מינון להגנה טובה יותר', 'לחכות לביקורת'], gc: 0,
    x: ['לדווח ולהמליץ על התאמת מינון (2.5 mg × 2), לחשב CrCl לפי Cockcroft-Gault, לנטר דימום ו-Hb ולהדריך', 'להפסיק apixaban ולתת אספירין', 'להמשיך 5 mg × 2 כי “זה המינון הרגיל”', 'לתת vitamin K'], xc: 0,
    r: ['מינון הותאם, הדימום נפסק, Hb יציב וההדרכה הובנה', 'דימום GI', 'שבץ אחרי הפסקה'], rc: 0,
    risk: 'מינון DOAC שגוי (יתר או חסר) שכיח מאוד בזקנה. apixaban 2.5 mg × 2 ניתן כשיש לפחות 2 מ-3: גיל ≥80, משקל ≤60 ק״ג, קריאטינין ≥1.5 mg/dL.',
    pe: 'נוגדי קרישה בזקנה: בודקים מינון לפי גיל, משקל ותפקוד כליה בכל אשפוז, ולא “מורידים ליתר ביטחון” בלי קריטריון.' },
  { id: 'benzo-night-fall', a: 5, p: 'yosef', pl: ['pharm', 'geron'], t: 'כדור שינה ונפילה', st: 'יוסף (COPD) קיבל lorazepam לשינה. בלילה קם לבד, נפל ונמצא ישנוני עם SpO₂ 86%.',
    tags: ['Benzodiazepines', 'נפילות', 'Beers'], v: ['SpO₂ 86%', 'RR 10', 'GCS 13', 'פצע בגבה'],
    c: [['תרופה', 'lorazepam 1 mg לשינה, ניתן ב-23:00', 2], ['נשימה', 'RR 10, SpO₂ 86% ב-COPD', 2], ['נפילה', 'קם לבד לשירותים', 1], ['ראש', 'פצע בגבה, לא על נוגדי קרישה', 1], ['חום', '36.7', 0], ['סוכר', '128', 0]],
    q: ['דליריום מזיהום', 'דיכוי נשימתי ונפילה מ-benzodiazepine במטופל עם COPD', 'שבץ', 'היפוגליקמיה'], qc: 1,
    g: ['שינה לילית טובה בכל מחיר', 'בטיחות נשימתית, מניעת נפילה חוזרת ושינה ללא benzodiazepine', 'להגדיל מינון כדי שלא יקום', 'להחליף ל-diphenhydramine'], gc: 1,
    x: ['הערכה מיידית, חמצן מבוקר (יעד 88–92%), דיווח, הערכה נוירולוגית אחרי הנפילה, הפסקת lorazepam והתערבות שינה לא תרופתית', 'עוד מנת lorazepam להרגעה', 'Diphenhydramine במקום', 'מעקות ורצועות'], xc: 0,
    r: ['SpO₂ 90% במסגרת היעד, ער ומתמצא, ללא נפילה חוזרת והפסקת benzodiazepine', 'היפרקפניה ונמנום', 'נפילה שנייה'], rc: 0,
    risk: 'Beers 2023: להימנע מ-benzodiazepines בזקנה (דליריום, נפילות, שברים, דיכוי נשימתי). Z-drugs אינם חלופה בטוחה.',
    pe: 'לשינה בזקנה — קודם CBT-I והיגיינת שינה. הפסקה של שימוש ממושך — הדרגתית.' },
  // ---- gerontology
  { id: 'frailty-cfs', a: 0, p: 'sara', pl: ['geron'], t: 'מספר אחד שמשנה תכנית', st: 'לקראת החלטה על טיפול אונקולוגי נוסף, הצוות שואל: “עד כמה היא שברירית באמת?”',
    tags: ['שבריריות', 'CGA', 'מטרות'], v: ['TUG 18 שניות', 'כוח אחיזה 13 ק״ג', 'ירידה של 5 ק״ג בחצי שנה'],
    c: [['תפקוד', 'צריכה עזרה ברחצה ובקניות, עצמאית בהליכה עם הליכון', 2], ['ניידות', 'TUG 18 שניות', 2], ['משקל', 'ירידה לא מכוונת 5 ק״ג', 2], ['כוח', 'אחיזה 13 ק״ג (נמוך)', 1], ['גיל', '79', 0], ['מצב רוח', 'טוב, רוצה לטייל עם הנכדים', 1]],
    q: ['לא שברירית כי היא הולכת', 'שבריריות בינונית (CFS בערך 6) שמשפיעה על סבילות לטיפול ועל תכנון', 'גיל 79 קובע את ההחלטה', 'השבריריות לא רלוונטית לטיפול'], qc: 1,
    g: ['למנוע טיפול בגלל גיל', 'להתאים את התכנית לשבריריות ולמטרות המטופלת', 'לטפל כמו בבן 50', 'להשאיר את ההחלטה למשפחה'], gc: 1,
    x: ['לתעד CFS והערכה גריאטרית כוללנית (תפקוד, תזונה, קוגניציה, מצב רוח, תרופות), לשתף את הצוות ולשוחח על מטרות', 'לרשום “מבוגרת” בתיק', 'להמליץ לא לטפל', 'לבקש רק בדיקות דם'], xc: 0,
    r: ['תכנית מותאמת: תזונה, פיזיותרפיה וטיפול במינון מותאם, שתואמת את מטרותיה', 'אשפוז חוזר מרעילות', 'החלטה בלי שיתוף המטופלת'], rc: 0,
    risk: 'גיל כרונולוגי הוא מדד גרוע. שבריריות מנבאת סיבוכים, נפילות, אשפוז ותמותה, ומשנה את יחס התועלת-סיכון.',
    pe: 'CFS 1–9 מבוסס על המצב שבועיים לפני המחלה החריפה. 5 ומעלה = שבריריות. משתמשים בו לתכנון, לא כדי לשלול טיפול.' },
  { id: 'asb-delirium', a: 4, p: 'miriam', pl: ['geron', 'neuro'], t: 'הסטיק חיובי', st: 'מרים מבולבלת מאתמול. בבדיקת סטיק שתן יש לויקוציטים וניטריטים. רופא תורן שואל אם להתחיל אנטיביוטיקה.',
    tags: ['ASB', 'דליריום', 'Stewardship'], v: ['T 36.9', 'HR 80', 'BP 132/76', 'שתן עכור'],
    c: [['תסמינים', 'אין דיזוריה, אין חום, אין כאב מותני', 2], ['סטיק', 'לויקוציטים וניטריטים', 1], ['שינוי תרופתי', 'tramadol הוחל אתמול', 2], ['שתייה', 'שותה מעט מאוד, Na 146', 2], ['ריח שתן', 'חזק', 0], ['צבע שתן', 'עכור', 0]],
    q: ['זיהום בדרכי השתן — חייבים אנטיביוטיקה', 'בקטריוריה אסימפטומטית; הדליריום מוסבר כנראה בגורם אחר (תרופה, התייבשות)', 'פיילונפריטיס', 'אלח דם'], qc: 1,
    g: ['לטפל בסטיק', 'לזהות את הגורם האמיתי לדליריום ולהימנע מאנטיביוטיקה מיותרת', 'להגביל שתייה', 'להחדיר קטטר'], gc: 1,
    x: ['לא לטפל ב-ASB, לחפש גורמים אחרים (תרופות, נוזלים, עצירות, כאב), לדווח על tramadol, לעודד שתייה ולנטר סימני זיהום מערכתי', 'Ciprofloxacin אמפירי', 'קטטר קבוע לדגימה', 'להמתין בלי לעשות דבר'], xc: 0,
    r: ['אחרי הפסקת tramadol ונוזלים: 4AT תקין, Na 140, ללא אנטיביוטיקה', 'שלשול C. diff אחרי אנטיביוטיקה מיותרת', 'נפילה'], rc: 0,
    risk: 'בקטריוריה אסימפטומטית שכיחה מאוד בזקנה. טיפול בה לא משפר דליריום או נפילות, ומעלה תופעות לוואי, C. difficile ועמידות.',
    pe: 'שתן עכור או מסריח ובדיקת סטיק חיובית אינם אבחנה. בלי תסמינים מקומיים או סימנים מערכתיים — מחפשים סיבה אחרת.' },
  { id: 'late-depression', a: 6, p: 'avraham', pl: ['geron', 'neuro'], t: '“אני רק נטל”', st: 'אברהם לא אוכל, מסרב לפיזיותרפיה ואומר: “בשביל מה? אני רק נטל על כולם”.',
    tags: ['דיכאון', 'אובדנות', 'שיקום'], v: ['GDS-15: 9', 'ירידה במשקל 3 ק״ג', 'שינה: מתעורר ב-4:00'],
    c: [['אמירה', '“אני רק נטל” — ייאוש', 2], ['GDS-15', '9 (≥5 תומך בדיכאון)', 2], ['גורמי סיכון', 'גבר, אלמן, אחרי שבר עם אובדן עצמאות', 2], ['קוגניציה', '4AT 0 — ללא דליריום', 1], ['כאב', 'מבוקר היטב', 0], ['TSH', 'תקין', 0]],
    q: ['עצב טבעי של גיל', 'דיכאון בזקנה עם סיכון אובדני שיש להעריך', 'דמנציה', 'דליריום היפואקטיבי'], qc: 1,
    g: ['לעודד “לחשוב חיובי”', 'בטיחות, הערכת סיכון אובדני וטיפול בדיכאון כחלק מהשיקום', 'לוותר על השיקום', 'להמתין שזה יעבור'], gc: 1,
    x: ['לשאול ישירות על מחשבות אובדניות, לדווח לצוות לשם הערכה פסיכיאטרית/פסיכוגריאטרית, לשתף עו״ס ומשפחה ולשמור על סביבה בטוחה', 'לא לשאול על אובדנות כדי לא “להכניס רעיון”', 'Lorazepam לחרדה', 'להפסיק פיזיותרפיה'], xc: 0,
    r: ['סיכון הוערך, תכנית טיפול ותמיכה פעילה, חוזר לאכול ומשתתף בשיקום', 'ניסיון אובדני', 'שחרור בלי מעקב'], rc: 0,
    risk: 'לגברים מבוגרים יש שיעור אובדנות מהגבוהים ביותר. דיכאון בזקנה מתבטא לעיתים בתסמינים גופניים, ירידה תפקודית ונסיגה.',
    pe: 'דיכאון אינו חלק נורמלי מההזדקנות. שאלה ישירה על אובדנות לא מגבירה סיכון — היא מצילה.' },
  { id: 'elder-neglect', a: 6, p: 'ruth', pl: ['geron'], t: 'שטפי דם בגילים שונים', st: 'רות התקבלה מיובשת ותת-תזונתית. יש לה שטפי דם בצבעים שונים על הזרועות. המטפל שלה עונה במקומה ולא נותן לה להישאר לבד עם הצוות.',
    tags: ['התעללות', 'הזנחה', 'חובת דיווח'], v: ['Na 151', 'אלבומין 2.6', 'BMI 17', 'פצע לחץ דרגה 3 בעכוז'],
    c: [['חבלות', 'שטפי דם בשלבי החלמה שונים על הזרועות הפנימיות', 2], ['התנהגות', 'המטפל עונה במקומה ומונע שיחה פרטית', 2], ['הזנחה', 'התייבשות, תת-תזונה ופצע לחץ מתקדם', 2], ['תרופות', 'לא נלקחו שבועות', 1], ['קוגניציה', 'ירידה קלה', 0], ['חום', '36.8', 0]],
    q: ['חבלות רגילות של גיל', 'חשד להתעללות או הזנחה של אדם חסר ישע', 'בעיה תזונתית בלבד', 'מחלה המטולוגית'], qc: 1,
    g: ['לא להתערב בענייני משפחה', 'בטיחות המטופלת, תיעוד ודיווח לפי חוק', 'לעמת את המטפל מיד', 'לחכות לשחרור'], gc: 1,
    x: ['לשוחח עם רות לבד, לתעד בדקדוק (מיקום, גודל, צבע), לטפל בהתייבשות ובפצע, לערב עו״ס ולדווח לפי חובת הדיווח על פגיעה בחסר ישע', 'לשאול את המטפל מה קרה בנוכחותה', 'לשחרר הביתה עם המטפל', 'לרשום “חבלות” בלבד'], xc: 0,
    r: ['שיחה פרטית, עו״ס ודיווח בוצעו, תכנית בטיחות לשחרור', 'חזרה לאותו מצב אחרי שחרור', 'החמרה בפצע'], rc: 0,
    risk: 'כ-1 מכל 6 מבוגרים בקהילה חווה צורה של התעללות או הזנחה. בישראל חלה חובת דיווח על פגיעה בחסר ישע (חוק העונשין, סעיף 368ד).',
    pe: 'רמזים: פער בין ההסבר לממצא, חבלות בשלבים שונים, הזנחה, מטפל שולט. שיחה פרטית היא חובה, לא נימוס.' },
  { id: 'bed-rest-deconditioning', a: 0, p: 'avraham', pl: ['geron'], t: '“שיישאר במיטה, ליתר ביטחון”', st: 'שלושה ימים אחרי ניתוח שבר בירך, אברהם עדיין במיטה “כדי שלא ייפול”. המשפחה מרוצה מהשקט.',
    tags: ['ניידות', 'סרקופניה', 'בטיחות'], v: ['TUG לא בוצע', 'אישור דריכה מלאה מהאורתופד', 'כאב 3/10 עם אנלגזיה'],
    c: [['אישור דריכה', 'מותר לדרוך מלא מאתמול', 2], ['ימי מיטה', '3 ימים ללא קימה', 2], ['סיכונים', 'עצירות, אכילה ירודה ותחילת אדמומיות בעקב', 2], ['כאב', 'מבוקר', 1], ['Hb', '10.8 יציב', 0], ['חום', '36.7', 0]],
    q: ['מנוחה היא הטיפול הבטוח', 'דה-קונדישנינג מאשפוז: מנוחה במיטה מאבדת שריר ותפקוד מהר', 'סיכון הנפילה מחייב ריתוק', 'אין כאן בעיה'], qc: 1,
    g: ['למנוע כל נפילה דרך ריתוק', 'לשמור על תפקוד וניידות בבטחה', 'לחכות שירצה לקום', 'להמתין לשחרור לשיקום'], gc: 1,
    x: ['ניידות מוקדמת ומודרגת עם פיזיותרפיה ועזרים, אנלגזיה לפני הקימה, תזונה, מניעת פצעי לחץ ושיתוף המשפחה', 'קטטר קבוע ובד מיטה', 'מעקות מורמים וריסון', 'רק תרגילים במיטה בעוד שבוע'], xc: 0,
    r: ['יושב בכיסא ומתהלך עם הליכון ביום 3, אוכל טוב יותר והעור שלם', 'פצע לחץ בעקב', 'דליריום מהשכיבה'], rc: 0,
    risk: 'עשרה ימי מנוחה במיטה גורמים לאובדן של כקילוגרם מסת שריר ברגליים אצל מבוגרים בריאים. אובדן תפקוד באשפוז שכיח ולעיתים לא הפיך.',
    pe: 'במיטה = לא בטוח. ניידות מוקדמת היא התערבות סיעודית מרכזית נגד ירידה תפקודית, דליריום ופצעי לחץ.' },
];

Object.assign(EP_EVIDENCE, {
  'as-syncope': { s: ['vhd2020'], k: 'ACC/AHA 2020: AS קשה סימפטומטית (סינקופה, אנגינה, קוצר נשימה) היא התוויה להחלפת מסתם (TAVI או ניתוח). לפני כך — להימנע מהתייבשות ומוואזודילטורים.' },
  'atypical-acs': { s: ['alexander2007', 'acs2025'], k: 'מעל גיל 85, פחות ממחצית מהמטופלים עם NSTE-ACS מתלוננים על כאב בחזה; קוצר נשימה הוא התסמין החלופי השכיח. ECG בתוך 10 דקות וטרופונין סדרתי.' },
  'af-falls-anticoag': { s: ['af2023', 'manson1999', 'falls2022'], k: 'ניתוח החלטה קלאסי: מטופל עם AF צריך ליפול כ-295 פעמים בשנה כדי שסיכון ה-subdural יעלה על תועלת נוגד הקרישה. נפילות אינן סיבה להפסקה.' },
  'parkinson-time': { s: ['nice_ng71', 'pd_time', 'beers2023'], k: 'NICE NG71: לא להפסיק levodopa בפתאומיות (סיכון לתסמונת דמוית-NMS). להימנע מאנטגוניסטים לדופמין (haloperidol, metoclopramide). במצב NPO — דרך חלופית.' },
  'bpsd-sundowning': { s: ['dice2014', 'schneider2005', 'beers2023'], k: 'DICE: Describe, Investigate, Create, Evaluate. מטא-אנליזה: אנטיפסיכוטיים אטיפיים בדמנציה מעלים תמותה (OR ≈1.5). הטיפול הראשון אינו תרופתי.' },
  'tia-transient': { s: ['easton2009', 'johnston2007', 'af2023'], k: 'TIA מוגדר רקמתית (ללא אוטם), לא לפי משך. הסיכון לשבץ גבוה במיוחד ב-48 השעות הראשונות; ABCD2 מסייע אך אינו מחליף בירור דחוף. AF → נוגד קרישה.' },
  'anticholinergic-burden': { s: ['acb2008', 'beers2023', 'stopp2023'], k: 'ACB: כל תרופה מקבלת 1–3 נקודות; סכום ≥3 משמעותי קלינית ומקושר לירידה קוגניטיבית. Beers 2023: להימנע מאנטיכולינרגיים חזקים ומשילובם.' },
  'serotonin-tramadol': { s: ['hunter2003', 'boyer2005', 'beers2023'], k: 'קריטריוני Hunter (רגישות 84%, סגוליות 97%): עם תרופה סרוטונרגית — קלונוס ספונטני, קלונוס מושרה/עיני עם אי-שקט או הזעה, רעד והיפר-רפלקסיה, או היפרטוניה עם חום >38 וקלונוס.' },
  'doac-dose': { s: ['ehra2021', 'af2023', 'cockcroft1976'], k: 'apixaban ב-AF: 2.5 mg × 2 אם ≥2 מתוך: גיל ≥80, משקל ≤60 ק״ג, קריאטינין ≥1.5 mg/dL. מינון DOAC מחושב לפי CrCl (Cockcroft-Gault), לא לפי eGFR בלבד.' },
  'benzo-night-fall': { s: ['beers2023', 'acp_insomnia2016', 'empower2014', 'bts_o2_2017'], k: 'ACP 2016: CBT-I הוא טיפול הקו הראשון לנדודי שינה. EMPOWER: חוברת הסבר לבד הביאה 27% מהמבוגרים להפסיק benzodiazepines (לעומת 5%).' },
  'frailty-cfs': { s: ['rockwood2005', 'clegg2013', 'ellis2017'], k: 'CFS: 1 (כשיר מאוד) עד 9 (מחלה סופנית). ציון ≥5 = שבריריות. Cochrane 2017: הערכה גריאטרית כוללנית באשפוז מעלה את הסיכוי להיות בחיים ובבית אחרי 3–12 חודשים.' },
  'asb-delirium': { s: ['idsa_asb2019', 'nice_delirium'], k: 'IDSA 2019: במבוגר עם דליריום או נפילה וללא תסמינים מקומיים או סימנים מערכתיים — לא לסקור ולא לטפל בבקטריוריה; להעריך גורמים אחרים ולעקוב.' },
  'late-depression': { s: ['gds1982', 'conwell2011', 'dazzi2014'], k: 'GDS-15: ציון ≥5 מחשיד לדיכאון. שאלה ישירה על מחשבות אובדניות אינה מעלה סיכון (Dazzi 2014). גברים מבוגרים — מקבוצות הסיכון הגבוהות לאובדנות.' },
  'elder-neglect': { s: ['yon2017', 'easi2008'], k: 'מטא-אנליזה: 15.7% מהמבוגרים בקהילה דיווחו על התעללות בשנה האחרונה. EASI — 6 שאלות סקר. בישראל: חובת דיווח על פגיעה בחסר ישע (חוק העונשין 368ד).' },
  'bed-rest-deconditioning': { s: ['kortebein2007', 'nice_cg124', 'npiap2019'], k: 'Kortebein 2007: 10 ימי מנוחה במיטה הובילו לאובדן ממוצע של כ-1 ק״ג מסת שריר ברגליים אצל מבוגרים בריאים. NICE: לגייס אחרי שבר ירך עד יום אחרי הניתוח.' },
});

/* ---------- knowledge checks: what an expert geriatric clinical nurse must know ---------- */
// { id, p: pillar, q, a: [answers], c: correct index, e: explanation, s: sources }
const KNOW = [
  // ---- cardiology
  { id: 'k-ortho', p: 'cardio', q: 'מהי ההגדרה של תת-לחץ דם אורתוסטטי?', a: ['ירידה ≥20 mmHg סיסטולי או ≥10 דיאסטולי בתוך 3 דקות עמידה', 'ירידה ≥10 mmHg סיסטולי או ≥5 דיאסטולי בתוך 10 דקות עמידה', 'עלייה בדופק ≥30 לדקה בתוך 3 דקות עמידה, בלי ירידה בלחץ הדם', 'BP סיסטולי מתחת ל-90 mmHg בעמידה, בלי קשר לערך בשכיבה'], c: 0, e: 'מודדים אחרי 5 דקות שכיבה ובדקה 1 ו-3 של עמידה. ביתר לחץ דם בשכיבה, ירידה סיסטולית ≥30 מקובלת כמשמעותית.', s: ['freeman2011'] },
  { id: 'k-acs-atyp', p: 'cardio', q: 'מה התסמין הלא-טיפוסי השכיח ביותר של ACS בבני 85 ומעלה?', a: ['קוצר נשימה', 'כאב אפיגסטרי ממוקד', 'סינקופה במנוחה', 'כאב בכתף שמאל בלבד'], c: 0, e: 'בזקנה תסמינים כמו קוצר נשימה, חולשה, בחילה, הזעה ובלבול שכיחים. לכן ECG מוקדם הוא חובה גם ללא כאב בחזה.', s: ['alexander2007'] },
  { id: 'k-ecg10', p: 'cardio', q: 'בחשד ל-ACS, תוך כמה זמן יש לבצע ולפענח ECG בעל 12 חלוקות?', a: ['10 דקות מהגעה או מהופעת התסמינים', '30 דקות, אחרי תוצאת הטרופונין הראשונה', 'שעה, אם המטופל יציב המודינמית', 'מיד אחרי הערכת הרופא, ללא יעד זמן'], c: 0, e: 'זהו יעד מקובל בכל הנחיות ה-ACS. ECG ראשון תקין אינו שולל — חוזרים עליו ובודקים טרופונין סדרתי.', s: ['acs2025'] },
  { id: 'k-af-falls', p: 'cardio', q: 'מטופל עם AF ו-CHA₂DS₂-VASc 5 נופל מדי פעם. מה נכון?', a: ['להמשיך נוגד קרישה ולטפל בגורמי הנפילה', 'להחליף לאספירין, שבטוח יותר בנפילות', 'להפסיק נוגד קרישה עד שהנפילות ייפסקו', 'להפחית לחצי מינון כדי לאזן את הסיכון'], c: 0, e: 'התועלת במניעת שבץ גוברת בדרך כלל על סיכון הדימום התוך-גולגולתי מנפילות. אספירין לא יעיל מספיק ב-AF, ומינון חסר ללא קריטריון — מסוכן.', s: ['af2023', 'manson1999'] },
  { id: 'k-hfweight', p: 'cardio', q: 'מה המדד הביתי החשוב ביותר לזיהוי מוקדם של החמרה באי-ספיקת לב?', a: ['שקילה יומית בבוקר, באותם תנאים', 'מדידת סטורציה יומית במנוחה ובמאמץ', 'מדידת היקף קרסול פעמיים בשבוע', 'ספירת דופק בבוקר ובערב לפני שינה'], c: 0, e: 'עלייה מהירה במשקל (כמה ק״ג בימים ספורים) מקדימה לעיתים קוצר נשימה ובצקות. ההדרכה כוללת מתי לפנות.', s: ['hf2022'] },
  { id: 'k-nsaid-hf', p: 'cardio', q: 'איזו תרופה ללא מרשם מחמירה אי-ספיקת לב ויש להימנע ממנה?', a: ['NSAIDs (למשל ibuprofen, naproxen)', 'Paracetamol במינון של עד 3 גרם ליום', 'תכשירי אומגה 3 ושמן דגים', 'לקסטיבים אוסמוטיים (lactulose)'], c: 0, e: 'NSAIDs גורמים לאגירת נתרן ומים, מחלישים משתנים ומעלים סיכון לאשפוז ול-AKI. ב-HF הם ברשימת ה-“Harm”.', s: ['hf2022', 'beers2023'] },
  { id: 'k-as-triad', p: 'cardio', q: 'מהי השלישייה הקלאסית של היצרות מסתם אאורטלי סימפטומטית?', a: ['אנגינה, סינקופה ואי-ספיקת לב', 'דפיקות לב, בצקות ושיעול לילי', 'סחרחורת, כאב ראש וטשטוש ראייה', 'כאב חזה, חום ושפשוף פריקרדיאלי'], c: 0, e: 'הופעת תסמינים מסמנת מחלה מתקדמת ופרוגנוזה גרועה ללא החלפת מסתם. במטופל כזה נזהרים מוואזודילטורים ומהתייבשות.', s: ['vhd2020'] },
  { id: 'k-atropine', p: 'cardio', q: 'ברדיקרדיה סימפטומטית לא יציבה: מהו מינון ה-atropine הראשוני לפי ACLS 2020?', a: ['1 mg IV, חזרה כל 3–5 דקות עד 3 mg', '0.5 mg IV, חזרה כל 3–5 דקות עד 3 mg', '1 mg IV פעם אחת, ואז קיצוב מיידי', '0.04 mg/kg IV כמנה יחידה'], c: 0, e: 'אם אין תגובה — קיצוב חיצוני או עירוי דופמין/אדרנלין. בזקנה חפשו גם גורם תרופתי (חוסמי β, digoxin, verapamil/diltiazem).', s: ['acls2020'] },
  { id: 'k-hyperk-ecg', p: 'cardio', q: 'K 7.0 עם גלי T מחודדים. מה מטרת ה-calcium gluconate?', a: ['ייצוב ממברנת שריר הלב; לא מוריד K', 'הזזת אשלגן לתוך התאים והורדת רמתו', 'הגברת הפרשת האשלגן בשתן דרך הכליה', 'קשירת אשלגן במעי והוצאתו בצואה'], c: 0, e: 'הורדת K מושגת באינסולין עם גלוקוז, β-agonist, ובהמשך בהוצאה מהגוף. ניטור ECG רציף וסוכר אחרי אינסולין.', s: ['ukka_k'] },
  { id: 'k-dig-tox', p: 'cardio', q: 'מה מגביר סיכון לרעילות digoxin?', a: ['היפוקלמיה, ירידה בתפקוד הכליה ו-amiodarone', 'היפרקלמיה, תפקוד כליה תקין ו-furosemide', 'היפרנתרמיה, השמנה ו-metformin', 'היפרקלצמיה בלבד, ללא קשר לכליה'], c: 0, e: 'סימנים: בחילה, אובדן תיאבון, הפרעות ראייה (צהוב-ירוק), בלבול והפרעות קצב. Beers: להימנע ממינון >0.125 mg ליום.', s: ['beers2023'] },
  { id: 'k-af-rate', p: 'cardio', q: 'מהו יעד בקרת קצב “מקל” מקובל ב-AF כשאין תסמינים?', a: ['דופק במנוחה מתחת ל-110', 'דופק במנוחה מתחת ל-80 בכל מקרה', 'דופק במנוחה מתחת ל-60', 'דופק במאמץ מתחת ל-90'], c: 0, e: 'בקרה מקלה (<110) לא הייתה נחותה מבקרה קפדנית במחקר RACE II, ובזקנה היא מפחיתה ברדיקרדיה ונפילות.', s: ['af2023'] },
  { id: 'k-bp-old', p: 'cardio', q: 'לפני העלאת מינון נוגדי יתר לחץ דם במטופל בן 88 — מה חובה לבדוק?', a: ['לחץ דם בעמידה ותסמיני סחרחורת', 'לחץ דם בשתי הזרועות בשכיבה בלבד', 'ממוצע לחץ הדם בניטור של הלילה האחרון', 'דופק ו-ECG בלבד, בלי מדידות נוספות'], c: 0, e: 'ESC 2024: בבני 85 ומעלה ובשבריריים — יעד מותאם אישית וטיפול שנסבל, בעיקר ללא אורתוסטזיס.', s: ['esc_htn2024', 'freeman2011'] },
  // ---- gerontology
  { id: 'k-fried', p: 'geron', q: 'פנוטיפ השבריריות של Fried כולל 5 קריטריונים. כמה מהם מגדירים שבריריות?', a: ['3 ומעלה', '2 ומעלה', '4 ומעלה', 'כל ה-5'], c: 0, e: 'ירידה במשקל, תשישות, פעילות נמוכה, איטיות בהליכה וחולשת אחיזה. 1–2 = טרום-שבריריות.', s: ['fried2001'] },
  { id: 'k-cfs', p: 'geron', q: 'Clinical Frailty Scale מוערך לפי המצב...', a: ['כשבועיים לפני המחלה החריפה', 'ביום הקבלה לאשפוז', 'ביום השחרור מהאשפוז', 'ביום הקשה ביותר של האשפוז'], c: 0, e: 'המטרה לשקף את ה-baseline. ציון 5 ומעלה = שבריריות. הכלי לא תוקף לגילאים צעירים או לנכות יציבה.', s: ['rockwood2005'] },
  { id: 'k-sarc', p: 'geron', q: 'לפי EWGSOP2, מה מדד הסקר הראשון לסרקופניה?', a: ['כוח שריר: אחיזה או קימה מכיסא', 'מסת שריר בבדיקת DEXA או BIA', 'מהירות הליכה על פני 4 מטרים', 'היקף שוק, BMI ואלבומין בדם'], c: 0, e: 'ספי כוח אחיזה: פחות מ-27 ק״ג בגברים ופחות מ-16 ק״ג בנשים. אחר כך מאשרים במסת שריר, ומדרגים חומרה לפי ביצוע (מהירות הליכה).', s: ['ewgsop2'] },
  { id: 'k-bedrest', p: 'geron', q: 'מה הראה מחקר של 10 ימי מנוחה במיטה במבוגרים בריאים?', a: ['אובדן של כ-1 ק״ג שריר ברגליים וירידה בכוח', 'ירידה במשקל השומן בלבד, בלי פגיעה בשריר', 'ירידה קלה בכוח שחזרה לגמרי תוך יומיים', 'אובדן מסת עצם משמעותי, בלי שינוי בשריר'], c: 0, e: 'לכן ניידות מוקדמת היא התערבות סיעודית מרכזית באשפוז.', s: ['kortebein2007'] },
  { id: 'k-cga', p: 'geron', q: 'מה הוכיחה הערכה גריאטרית כוללנית (CGA) במטופלים מאושפזים?', a: ['יותר מטופלים בחיים ובביתם אחרי 3–12 חודשים', 'קיצור משמעותי של משך האשפוז בכל המחלקות', 'פחות נפילות במהלך האשפוז, בלי השפעה אחריו', 'ירידה בתמותה בתוך האשפוז, בלי השפעה תפקודית'], c: 0, e: 'CGA הוא תהליך רב-מקצועי: תפקוד, קוגניציה, מצב רוח, תזונה, תרופות, סביבה ומטרות.', s: ['ellis2017'] },
  { id: 'k-fever', p: 'geron', q: 'הגדרת חום במבוגר במוסד סיעודי (IDSA) כוללת:', a: ['פה >37.8 פעם אחת, חוזר >37.2, או +1.1°C מה-baseline', 'חום פה מעל 38.3 פעמיים, בהפרש של שעה לפחות', 'חום רקטלי מעל 38.5, או צמרמורות עם רעד', 'חום אוזן מעל 38.0 שנמשך יותר מ-24 שעות'], c: 0, e: 'במבוגרים תגובת החום מוחלשת, ולכן הספים נמוכים יותר. גם ירידה תפקודית או בלבול יכולים להיות הסימן היחיד.', s: ['high2009'] },
  { id: 'k-asb', p: 'geron', q: 'מבוגרת עם נפילה, ללא חום וללא תסמיני שתן. תרבית שתן חיובית. מה נכון?', a: ['לא לטפל בבקטריוריה; לחפש גורם אחר לנפילה', 'לטפל אנטיביוטית 3 ימים כי מדובר באישה', 'לטפל רק אם יש ניטריטים חיוביים בסטיק', 'לחזור על התרבית ולטפל אם תהיה חיובית שוב'], c: 0, e: 'טיפול ב-ASB אינו משפר נפילות או דליריום, ומעלה סיכון ל-C. difficile ולעמידות.', s: ['idsa_asb2019'] },
  { id: 'k-pi2', p: 'geron', q: 'פצע עם אובדן עור בעובי חלקי, בסיס ורוד-אדום לח וללא רקמה נמקית — איזו דרגה?', a: ['דרגה 2', 'דרגה 1', 'דרגה 3', 'פגיעת רקמה עמוקה (DTI)'], c: 0, e: 'דרגה 1 — אדמומיות שלא מלבינה בעור שלם. דרגה 3 — אובדן עור בעובי מלא עם שומן גלוי. סדק לח מאי-שליטה (IAD) אינו פצע לחץ.', s: ['npiap2019'] },
  { id: 'k-mna', p: 'geron', q: 'איזה כלי מתוקף לסקר תת-תזונה בזקנה?', a: ['MNA-SF', 'Braden', 'MUST בשילוב אלבומין', 'Morse Fall Scale'], c: 0, e: 'MNA-SF: 6 שאלות; 12–14 תקין, 8–11 בסיכון, 0–7 תת-תזונה. אלבומין לבדו מושפע מדלקת ואינו מדד תזונה טוב.', s: ['mnasf'] },
  { id: 'k-abuse', p: 'geron', q: 'אחות חושדת שמטופל מבוגר חסר ישע עובר התעללות. מה מחייב החוק בישראל?', a: ['דיווח לרשויות (עו״ס לפי חוק או משטרה)', 'שיחה עם המשפחה, ודיווח רק אם החשד יאושש', 'תיעוד בתיק בלבד, בלי דיווח חיצוני', 'דיווח רק בהסכמת המטופל בכתב'], c: 0, e: 'סעיף 368ד לחוק העונשין מטיל חובת דיווח על אנשי מקצוע, כולל אחיות. מתעדים בדקדוק ומשוחחים עם המטופל ביחידות.', s: ['yon2017', 'easi2008'] },
  { id: 'k-pkage', p: 'geron', q: 'שינוי פיזיולוגי בהזדקנות: עלייה ברקמת שומן וירידה במים בגוף. מה המשמעות?', a: ['תרופות ליפופיליות (כמו diazepam) מצטברות וזמן מחצית החיים מתארך', 'תרופות ליפופיליות מתפנות מהר יותר בגלל עלייה בזרימת הדם לכבד', 'תרופות הידרופיליות מגיעות לריכוזים נמוכים יותר בדם', 'אין שינוי משמעותי בפיזור תרופות; רק הפינוי הכלייתי משתנה'], c: 0, e: 'במקביל, תרופות הידרופיליות (כמו digoxin ו-lithium) מגיעות לריכוז גבוה יותר בנפח חלוקה קטן.', s: ['mangoni2004'] },
  { id: 'k-cr-muscle', p: 'geron', q: 'מדוע קריאטינין “תקין” יכול להטעות במטופלת בת 90 ורזה?', a: ['מסת שריר נמוכה מייצרת פחות קריאטינין, ולכן התפקוד מוערך ביתר', 'בזקנה הכליה מפרישה יותר קריאטינין, ולכן הערך נמוך', 'התייבשות מורידה קריאטינין ולכן הוא נראה תקין', 'קריאטינין לא מושפע מגיל, ולכן ערך תקין מעיד על כליה תקינה'], c: 0, e: 'לכן מחשבים פינוי (Cockcroft-Gault) לצורך מינון תרופות.', s: ['cockcroft1976', 'mangoni2004'] },
  // ---- neurology
  { id: 'k-delir-core', p: 'neuro', q: 'מהו מאפיין הליבה המבדיל דליריום מדמנציה?', a: ['הופעה חריפה ותנודתית עם הפרעה בקשב', 'ירידה הדרגתית בזיכרון קצר טווח', 'הפרעה בשפה ובמציאת מילים', 'הזיות ראייה בלבד, בלי ירידה בערנות'], c: 0, e: 'דליריום יכול להופיע על רקע דמנציה. כל שינוי חריף מה-baseline מחייב חיפוש גורם.', s: ['nice_delirium'] },
  { id: 'k-4at', p: 'neuro', q: 'ב-4AT, איזה ציון מחשיד לדליריום?', a: ['4 ומעלה', '1 ומעלה', '2 ומעלה', '7 ומעלה'], c: 0, e: '1–3 — חשד לפגיעה קוגניטיבית. הכלי קצר (פחות מ-2 דקות) ולא דורש הכשרה מיוחדת. רגישות וסגוליות של כ-88%.', s: ['tieges2021'] },
  { id: 'k-hypo-delir', p: 'neuro', q: 'איזה סוג דליריום הוא השכיח ביותר בזקנה, וגם המוחמץ ביותר?', a: ['היפואקטיבי', 'היפראקטיבי', 'מעורב', 'פוסט-איקטלי'], c: 0, e: 'מטופל “שקט”, ישנוני ואוכל מעט. הפרוגנוזה שלו גרועה לפחות כמו של דליריום היפראקטיבי.', s: ['nice_delirium', 'tieges2021'] },
  { id: 'k-help', p: 'neuro', q: 'מה הראתה תכנית HELP למניעת דליריום?', a: ['התערבויות לא תרופתיות: אוריינטציה, שינה, ניידות, חושים', 'haloperidol מניעתי במינון נמוך לכל המטופלים בסיכון', 'melatonin קבוע לכל המאושפזים מעל גיל 70 בלילה', 'ריסון רך בלילה למטופלים שמנסים לקום מהמיטה'], c: 0, e: 'במחקר המקורי שיעור הדליריום ירד מ-15% ל-9.9%.', s: ['inouye1999'] },
  { id: 'k-tpa', p: 'neuro', q: 'מהו חלון הזמן לטיפול תרומבוליטי IV בשבץ איסכמי, ומה יעד ה-BP לפני מתן?', a: ['עד 4.5 שעות מ“נראה תקין לאחרונה”; BP מתחת ל-185/110', 'עד 6 שעות מ“נראה תקין לאחרונה”; BP מתחת ל-160/100', 'עד 4.5 שעות מגילוי התסמינים; BP מתחת ל-220/120', 'עד 3 שעות בלבד מעל גיל 80; BP מתחת ל-140/90'], c: 0, e: 'גיל מבוגר לבדו אינו התווית נגד. בחסימת כלי גדול — תרומבקטומיה בחלון רחב יותר במטופלים נבחרים.', s: ['aha_stroke2019'] },
  { id: 'k-tia', p: 'neuro', q: 'מתי הסיכון לשבץ אחרי TIA הוא הגבוה ביותר?', a: ['ב-48 השעות הראשונות', 'בשבוע השני', 'אחרי חודש', 'אחרי שלושה חודשים'], c: 0, e: 'לכן TIA הוא מצב חירום — בירור ומניעה שניונית בהקדם.', s: ['johnston2007', 'easton2009'] },
  { id: 'k-head-ac', p: 'neuro', q: 'מטופל על נוגד קרישה נפל וחבט בראש, ללא סימנים נוירולוגיים. לפי NICE 2023:', a: ['CT ראש בתוך 8 שעות מהפגיעה', 'CT רק אם GCS יורד מתחת ל-13', 'CT בתוך 24 שעות אם מופיע כאב ראש', 'מעקב נוירולוגי בלבד, ללא CT'], c: 0, e: 'שטף דם תת-דורלי בזקנה יכול להופיע באיחור ובהדרגה. ממשיכים מעקב נוירולוגי (GCS ואישונים) לפי פרוטוקול.', s: ['nice_ng232'] },
  { id: 'k-pd-time', p: 'neuro', q: 'מטופל עם פרקינסון ב-NPO לפני בדיקה. מה עושים עם ה-levodopa?', a: ['לא מדלגים; מבקשים דרך חלופית בזמן', 'מדלגים על המנה ומחזירים אחרי הבדיקה', 'נותנים מנה כפולה מיד אחרי הבדיקה', 'מחליפים זמנית ל-haloperidol להרגעה'], c: 0, e: 'איחור של יותר מ-30 דקות מחמיר תפקוד ובליעה. הפסקה פתאומית עלולה לגרום לתסמונת דמוית-NMS.', s: ['nice_ng71', 'pd_time'] },
  { id: 'k-pd-avoid', p: 'neuro', q: 'איזה נוגד בחילה אסור בפרקינסון?', a: ['Metoclopramide', 'Domperidone', 'Ondansetron', 'Trimethobenzamide'], c: 0, e: 'Metoclopramide, haloperidol ו-prochlorperazine חוסמים דופמין במוח ומחמירים פרקינסוניזם.', s: ['nice_ng71', 'beers2023'] },
  { id: 'k-bpsd', p: 'neuro', q: 'מהו הצעד הראשון באי-שקט של מטופל עם דמנציה?', a: ['לחפש צורך לא מסופק: כאב, עצירות, אצירה, פחד', 'אנטיפסיכוטי במינון נמוך לפי צורך, לפני כל דבר', 'העברה לחדר שקט וחשוך עם מעקות מורמים', 'הגבלת ביקורי משפחה כדי להפחית גירוי בערב'], c: 0, e: 'אנטיפסיכוטיים בדמנציה מעלים תמותה ושבץ. שמורים לסכנה ממשית ולפרק זמן קצר.', s: ['dice2014', 'schneider2005'] },
  { id: 'k-nph', p: 'neuro', q: 'מהי השלישייה הקלינית של NPH?', a: ['הפרעת הליכה, אי-שליטה במתן שתן וירידה קוגניטיבית', 'רעד במנוחה, נוקשות וברדיקינזיה', 'כאב ראש, הקאות ובצקת בפפילה', 'ירידה בזיכרון, הזיות ראייה ותנודתיות בערנות'], c: 0, e: 'הפרעת ההליכה (“מגנטית”) מופיעה בדרך כלל ראשונה. חשוב לזהות כי זו סיבה שעשויה להיות הפיכה (ניקוז).', s: ['relkin2005'] },
  { id: 'k-gds', p: 'neuro', q: 'GDS-15: איזה ציון מחשיד לדיכאון?', a: ['5 ומעלה', '3 ומעלה', '8 ומעלה', '10 ומעלה'], c: 0, e: 'דיכאון אינו חלק נורמלי מההזדקנות. בכל חשד שואלים ישירות על מחשבות אובדניות.', s: ['gds1982', 'dazzi2014'] },
  // ---- pharmacology
  { id: 'k-beers', p: 'pharm', q: 'מה Beers Criteria 2023?', a: ['רשימת תרופות שעדיף להימנע מהן בזקנה או לתת בזהירות', 'רשימת תרופות חיוניות שיש להתחיל אצל כל מבוגר', 'כלי לחישוב מינון לפי משקל, גיל ותפקוד הכליה', 'רשימת אינטראקציות בין תרופות למזון בלבד'], c: 0, e: 'הרשימה של ה-AGS כוללת גם אינטראקציות ותרופות שיש להתאים לתפקוד הכליה. היא כלי עזר לשיקול דעת, לא איסור גורף.', s: ['beers2023'] },
  { id: 'k-acb', p: 'pharm', q: 'איזה צירוף מעמיס הכי הרבה עומס אנטיכולינרגי?', a: ['Oxybutynin + diphenhydramine + paroxetine', 'Mirabegron + melatonin + sertraline', 'Tamsulosin + trazodone + citalopram', 'Solifenacin + mirtazapine + escitalopram'], c: 0, e: 'שלוש תרופות עם 3 נקודות כל אחת ב-ACB. השלכות: דליריום, אצירה, עצירות, טכיקרדיה ונפילות.', s: ['acb2008', 'beers2023'] },
  { id: 'k-cg', p: 'pharm', q: 'אישה, 87, 54 ק״ג, קריאטינין 1.3 mg/dL. מהו CrCl משוער (Cockcroft-Gault)?', a: ['כ-26 mL/min', 'כ-38 mL/min', 'כ-45 mL/min', 'כ-55 mL/min'], c: 0, e: '(140−87)×54 ÷ (72×1.3) × 0.85 ≈ 26. קריאטינין “כמעט תקין” מסתיר פינוי נמוך מאוד.', s: ['cockcroft1976'] },
  { id: 'k-apix', p: 'pharm', q: 'apixaban ב-AF מופחת ל-2.5 mg פעמיים ביום כאשר יש לפחות שניים מ:', a: ['גיל ≥80, משקל ≤60 ק״ג, קריאטינין ≥1.5 mg/dL', 'גיל ≥75, משקל ≤50 ק״ג, eGFR מתחת ל-50', 'גיל ≥80, נפילות חוזרות, Hb מתחת ל-10', 'גיל ≥65, CrCl מתחת ל-50, שימוש באספירין'], c: 0, e: 'הפחתה בלי קריטריון (“ליתר ביטחון”) מעלה סיכון לשבץ. בודקים קריטריונים בכל אשפוז.', s: ['ehra2021'] },
  { id: 'k-dabi', p: 'pharm', q: 'איזה DOAC תלוי ביותר בפינוי כלייתי?', a: ['Dabigatran (כ-80% כלייתי)', 'Apixaban (כ-27% כלייתי)', 'Rivaroxaban (כ-35% כלייתי)', 'Edoxaban (כ-50% כלייתי)'], c: 0, e: 'לכן ב-CKD מתקדם dabigatran מצטבר מהר ביותר. apixaban תלוי פחות בכליה (כ-27%).', s: ['ehra2021'] },
  { id: 'k-triple', p: 'pharm', q: 'מהי ה-“Triple whammy”?', a: ['ACEi/ARB + משתן + NSAID — סיכון גבוה ל-AKI', 'Statin + macrolide + calcium channel blocker — מיופתיה', 'SSRI + NSAID + נוגד קרישה — דימום GI', 'Digoxin + amiodarone + verapamil — ברדיקרדיה'], c: 0, e: 'הסיכון גבוה במיוחד ב-30 הימים הראשונים לשילוב. במבוגרים מעדיפים paracetamol לכאב.', s: ['lapi2013'] },
  { id: 'k-cascade', p: 'pharm', q: 'מטופל על amlodipine מפתח בצקות ברגליים ומקבל furosemide. מה זה?', a: ['מפל מרשמים: תופעת לוואי טופלה כמחלה', 'החמרה של אי-ספיקת לב שמחייבת משתן', 'אינטראקציה בין amlodipine ל-furosemide', 'תגובה אלרגית מאוחרת ל-amlodipine'], c: 0, e: 'בצקת מחוסמי תעלות סידן תלויה במינון ואינה מגיבה טוב למשתנים. הפתרון — לשקול הורדת מינון או החלפה.', s: ['rochon1997'] },
  { id: 'k-ss', p: 'pharm', q: 'מה הממצא הקליני החשוב ביותר באבחון תסמונת סרוטונינית (Hunter)?', a: ['קלונוס (ספונטני, מושרה או עיני)', 'נוקשות “צינור עופרת” וברדיקינזיה', 'חום מעל 40 לבדו', 'עור יבש ואישונים צרים'], c: 0, e: 'NMS מתפתח לאט (ימים), עם נוקשות וברדיקינזיה. תסמונת סרוטונינית מתפתחת מהר (שעות), עם קלונוס והיפר-רפלקסיה.', s: ['hunter2003', 'boyer2005'] },
  { id: 'k-benzo', p: 'pharm', q: 'מטופלת על lorazepam לשינה כבר שנתיים. מה נכון?', a: ['הפסקה הדרגתית ומודרכת יחד עם CBT-I', 'הפסקה מיידית ומעקב אחר תסמינים', 'מעבר ל-zolpidem, שבטוח יותר בזקנה', 'מעבר ל-diphenhydramine לשינה'], c: 0, e: 'הפסקה פתאומית עלולה לגרום לתסמיני גמילה ופרכוסים. חומר הסבר למטופל לבדו הביא 27% להפסיק (EMPOWER).', s: ['empower2014', 'beers2023', 'acp_insomnia2016'] },
  { id: 'k-metformin', p: 'pharm', q: 'מתי metformin אסור במתן?', a: ['eGFR מתחת ל-30', 'eGFR מתחת ל-60', 'גיל מעל 80', 'HbA1c מתחת ל-7%'], c: 0, e: 'בין 30 ל-45 לא מתחילים ושוקלים הפחתת מינון. מפסיקים זמנית במחלה חריפה עם סיכון ל-AKI או בחומר ניגוד.', s: ['ada2025', 'kdigo_ckd2024'] },
  { id: 'k-ppi', p: 'pharm', q: 'לפי Beers 2023, מה נכון לגבי PPI?', a: ['להימנע מעבר ל-8 שבועות ללא התוויה', 'בטוח לשימוש ממושך אצל כל מבוגר', 'מומלץ למניעה בכל מטופל על אספירין', 'להפסיק מיד ללא הדרגה אצל כל מבוגר'], c: 0, e: 'שימוש ממושך קשור ל-C. difficile, שברים, חסר B12 ומגנזיום נמוך. במקרים מתאימים עושים deprescribing מודרג.', s: ['beers2023'] },
  { id: 'k-opioid-lax', p: 'pharm', q: 'בעת התחלת אופיואיד במבוגר, מה צריך להתחיל במקביל?', a: ['משלשל מניעתי ומעקב יציאות', 'תוסף סיבים תזונתיים בלבד', 'נוגד בחילה קבוע לשבוע הראשון', 'Naloxone במינון נמוך לפי צורך'], c: 0, e: 'לעצירות מאופיואידים אין סבילות. Start low, go slow; מעקב אחרי סדציה ונשימה.', s: ['cdc_opioid2022'] },
  { id: 'k-sglt2', p: 'pharm', q: 'מטופל על SGLT2i בצום ובהקאות. מה הסיכון המיוחד?', a: ['DKA אאוגליקמי', 'היפוגליקמיה קשה', 'מצב היפראוסמולרי (HHS)', 'חמצת לקטית'], c: 0, e: 'לפי “sick day rules” מפסיקים זמנית SGLT2i במחלה חריפה, בצום או לפני ניתוח. בודקים קטונים גם אם הסוכר תקין.', s: ['umpierrez2024', 'ada2025'] },
];

/* ---------- mastery ---------- */
const Core = {
  episodes(p) { return C.episodes.filter(e => epPillars(e).includes(p)); },
  items(p) { return KNOW.filter(k => k.p === p); },
  record(id, ok) {
    const r = S.know[id] || (S.know[id] = { n: 0, ok: 0, last: 0 });
    r.n++; if (ok) r.ok++; r.last = S.shift; r.miss = ok ? 0 : (r.miss || 0) + 1;
  },
  mastered(id) { const r = S.know[id]; return !!(r && r.ok >= 1 && !r.miss); },
  // 50% the cases in that pillar (stars), 50% knowledge checks answered right the last time
  mastery(p) {
    const eps = this.episodes(p), its = this.items(p);
    const ep = eps.length ? eps.reduce((s, e) => s + ((S.episodes[e.id] || {}).stars || 0), 0) / (eps.length * 3) : 0;
    const kn = its.length ? its.filter(k => this.mastered(k.id)).length / its.length : 0;
    return Math.round((ep * .5 + kn * .5) * 100);
  },
  level(m) { return m >= 90 ? 'מומחה/ית' : m >= 70 ? 'מיומן/ת' : m >= 40 ? 'מתקדם/ת' : m >= 15 ? 'מתחיל/ה' : 'טרם נבדק'; },
  weakest() { return PILLAR_ORDER.slice().sort((a, b) => this.mastery(a) - this.mastery(b))[0]; },
  overall() { return Math.round(PILLAR_ORDER.reduce((s, p) => s + this.mastery(p), 0) / PILLAR_ORDER.length); },
  // spaced retrieval: unseen and missed items first, then the ones seen longest ago
  pickItem(p) {
    const pool = KNOW.filter(k => !p || k.p === p);
    const score = k => { const r = S.know[k.id]; if (!r) return 0; if (r.miss) return 1; return 2 + Math.max(0, 4 - (S.shift - r.last)) + Math.random(); };
    return pool.slice().sort((a, b) => score(a) - score(b) + (Math.random() - .5) * .8)[0];
  },
  chips(e) { return epPillars(e).map(p => `<span class="pl-chip" style="--pc:${PILLARS[p].color}">${PILLARS[p].icon} ${PILLARS[p].name}</span>`).join(''); },
  // mixed council/drill question list: knowledge items and decision stages from the pillar's cases
  questions(p, n, maxAct) {
    const its = shuffle(KNOW.filter(k => !p || k.p === p));
    let eps = (p ? this.episodes(p) : C.episodes).filter(e => maxAct == null || e.a <= maxAct);
    if (!eps.length) eps = p ? this.episodes(p) : C.episodes;
    eps = shuffle(eps);
    const out = [];
    for (let i = 0; out.length < n; i++) out.push(i % 2 === 0 ? { k: its[(i / 2) % its.length] } : { e: eps[i % eps.length], st: STAGES[(i + 1) % 4] });
    return out;
  },
};

CORE_EPISODES.forEach(e => { EP_PILLARS[e.id] = e.pl; if (!C.episodes.some(x => x.id === e.id)) C.episodes.push(e); });
