/* preview.js és export.js teszt fake DOM-mal. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { makeDocument } = require('./fake-dom.js');

const ROOT = path.join(__dirname, '..');

const doc = makeDocument(['weekGrid', 'warnings', 'weekControl', 'weekSlider', 'weekReadout', 'weekNote', 'saveStatus']);
global.window = global;
global.document = doc;
global.navigator = {};

for (const f of ['js/data/exercises.js', 'js/core/progression.js', 'js/core/interpreter.js',
                 'js/preview/preview.js', 'js/export/export.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
}

/* ---- mock blokkok (mint az interpreter tesztben) ---- */
function B(type, fields, inputs, next) {
  const b = {
    type, fields: fields || {}, inputs: inputs || {}, _next: next || null,
    getFieldValue: n => b.fields[n],
    getNextBlock: () => b._next,
    getInputTargetBlock: n => b.inputs[n] || null,
    isEnabled: () => true, isShadow: () => false, isInsertionMarker: () => false,
  };
  return b;
}
const ws = tops => ({ getTopBlocks: () => tops });
const ex = f => B('gym_exercise', Object.assign({
  EXERCISE: 'guggolas', CUSTOM_NAME: 'Saját', SETS: 4, REPS: '5',
  WEIGHT_MODE: 'progressive', WEIGHT: 60, INCREMENT: 5, REST: 120,
}, f.fields), {}, f.next);

let pass = 0, fail = 0;
const check = (n, c, e) => c ? (pass++, console.log('  ok   ', n))
  : (fail++, console.log('  FAIL ', n, e !== undefined ? JSON.stringify(e) : ''));

/* =============== Program felépítése =============== */
const plank = ex({ fields: { EXERCISE: 'plank', WEIGHT_MODE: 'bodyweight', SETS: 3, REPS: '60mp', REST: 45 } });
const circuit = B('gym_circuit', { ROUNDS: 3, CIRCUIT_REST: 90 }, { DO: plank });
const bench = ex({ fields: { EXERCISE: 'fekvenyomas', WEIGHT: 40, INCREMENT: 2.5, REPS: '8-12', REST: 90 }, next: circuit });
const squat = ex({ fields: { EXERCISE: 'guggolas', WEIGHT: 60, INCREMENT: 5 }, next: bench });
const wed = B('gym_day', { DAY: 'wednesday' }, { ACTIVITIES: ex({ fields: { EXERCISE: 'huzodzkodas', WEIGHT_MODE: 'fixed', WEIGHT: 0, SETS: 5, REPS: '5', REST: 120 } }) });
const mon = B('gym_day', { DAY: 'monday' }, { ACTIVITIES: squat }, wed);
const repeat = B('gym_repeat_weeks', { WEEKS: 6 }, { WEEK_TEMPLATE: mon });
const program = SG.Interpreter.computeProgram(ws([repeat]));

console.log('\n1) Preview init + render');
SG.Preview.init();
SG.Preview.update(program);

const grid = doc.getElementById('weekGrid');
check('7 napkártya', grid.children.length === 7, grid.children.length);
check('csúszka látszik (6 hét)', doc.getElementById('weekControl').hidden === false);
check('csúszka max = 6', doc.getElementById('weekSlider').max === '6', doc.getElementById('weekSlider').max);
check('kijelző "1 / 6"', doc.getElementById('weekReadout').textContent === '1 / 6', doc.getElementById('weekReadout').textContent);
check('nincs figyelmeztetés-sáv', doc.getElementById('warnings').hidden === true);
check('üres nap jelölve', grid.children[1].classList.contains('is-empty'));
check('hétfő nem üres', !grid.children[0].classList.contains('is-empty'));

const monText = grid.children[0].textContent;
check('hétfő fejléc', monText.includes('Hétfő'));
check('guggolás 60 kg az 1. héten', monText.includes('60 kg'), monText);
check('fekvenyomás 40 kg', monText.includes('40 kg'));
check('kör fejléc', monText.includes('Kör × 3'), monText);
check('kör pihenő percben', monText.includes('1:30 perc'), monText);
check('testsúly felirat', monText.includes('testsúly'));
check('gyakorlat pihenő 2 perc', monText.includes('2 perc'), monText);

console.log('\n2) Hét-csúszka');
const slider = doc.getElementById('weekSlider');
slider.value = '5';
slider.dispatch('input');
const monWeek5 = doc.getElementById('weekGrid').children[0].textContent;
check('5. hét guggolás 80 kg', monWeek5.includes('80 kg'), monWeek5);
check('5. hét fekvenyomás 50 kg', monWeek5.includes('50 kg'));
check('kijelző "5 / 6"', doc.getElementById('weekReadout').textContent === '5 / 6');
check('fix súlyú húzódzkodás nem változik',
  doc.getElementById('weekGrid').children[2].textContent.includes('0 kg'));

console.log('\n3) Progresszív súly kiemelése');
const weights = doc.getElementById('weekGrid').children[0].querySelectorAll('.weight');
check('van kiemelt progresszív súly', weights.some(w => w.classList.contains('is-progressive')));
check('testsúly nincs kiemelve',
  weights.filter(w => w.textContent === 'testsúly').every(w => !w.classList.contains('is-progressive')));

console.log('\n4) Figyelmeztetések renderelése');
const warnProgram = SG.Interpreter.computeProgram(ws([ex({})]));
SG.Preview.update(warnProgram);
const warnEl = doc.getElementById('warnings');
check('figyelmeztetés-sáv látszik', warnEl.hidden === false);
check('van listaelem', warnEl.querySelectorAll('li').length > 0);
check('egyhetes -> csúszka rejtve', doc.getElementById('weekControl').hidden === true);
check('egyhetes megjegyzés', doc.getElementById('weekNote').textContent.includes('Egyhetes'));
warnEl.querySelector('.dismiss').click();
check('elrejthető', warnEl.hidden === true);

console.log('\n5) Váltás vissza többhetesre');
SG.Preview.update(program);
check('csúszka újra látszik', doc.getElementById('weekControl').hidden === false);
check('kijelentkezett hét visszavágva', Number(doc.getElementById('weekSlider').value) <= 6);
check('figyelmeztetés-sáv újra rejtve', doc.getElementById('warnings').hidden === true);

console.log('\n6) XSS: saját gyakorlatnév nem lesz markup');
{
  const evil = ex({ fields: { EXERCISE: '__CUSTOM__', CUSTOM_NAME: '<img src=x onerror=alert(1)>' } });
  const p = SG.Interpreter.computeProgram(ws([B('gym_day', { DAY: 'monday' }, { ACTIVITIES: evil })]));
  SG.Preview.update(p);
  const names = doc.getElementById('weekGrid').children[0].querySelectorAll('.ex-name');
  check('a név szövegként jelenik meg', names[0].textContent === '<img src=x onerror=alert(1)>');
  check('nem jött létre img elem', doc.getElementById('weekGrid').querySelectorAll('IMG').length === 0);
}

console.log('\n7) Export JSON');
{
  const json = SG.Export.buildExportJson(program);
  check('schemaVersion 1', json.schemaVersion === 1);
  check('generatedAt ISO', /^\d{4}-\d{2}-\d{2}T/.test(json.generatedAt), json.generatedAt);
  check('weeksTotal 6', json.weeksTotal === 6);
  check('template 7 nap', json.template.days.length === 7);
  check('resolvedWeeks 6', json.resolvedWeeks.length === 6);

  const tplMon = json.template.days.find(d => d.dayOfWeek === 'monday');
  check('dayLabelHu megvan', tplMon.dayLabelHu === 'Hétfő');
  check('sablon progressziós szabály',
    tplMon.activities[0].weight.mode === 'progressive' &&
    tplMon.activities[0].weight.startKg === 60 &&
    tplMon.activities[0].weight.incrementKgPerWeek === 5, tplMon.activities[0].weight);
  check('sablon kör rekurzív', tplMon.activities[2].type === 'circuit' && tplMon.activities[2].activities.length === 1);
  check('testsúly sablon', tplMon.activities[2].activities[0].weight.mode === 'bodyweight');

  const resMon = json.resolvedWeeks[2].days.find(d => d.dayOfWeek === 'monday');
  check('3. hét konkrét súly 70', resMon.activities[0].weightKg === 70, resMon.activities[0].weightKg);
  check('weightMode átjön', resMon.activities[0].weightMode === 'progressive');
  check('feloldott testsúly null', resMon.activities[2].activities[0].weightKg === null);
  check('feloldott testsúly flag', resMon.activities[2].activities[0].isBodyweight === true);

  // A README-ben dokumentált képlet egyezik az exportált értékekkel
  const rule = tplMon.activities[0].weight;
  const derived = Math.max(0, rule.startKg + rule.incrementKgPerWeek * (3 - 1));
  check('README képlet == exportált érték', derived === resMon.activities[0].weightKg, [derived, resMon.activities[0].weightKg]);

  const text = SG.Export.toText(program);
  check('szöveg parse-olható', JSON.parse(text).weeksTotal === 6);
  check('ékezetek épek', text.includes('Fekvőnyomás'));
}

console.log('\n8) Starter workspace szerializáció alakja');
{
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js/blocks/toolbox.js'), 'utf8'), { filename: 'toolbox.js' });
  const s = SG.starterWorkspace();
  check('blocks.blocks tömb', Array.isArray(s.blocks.blocks));
  check('gyökér a ciklusblokk', s.blocks.blocks[0].type === 'gym_repeat_weeks');
  check('WEEK_TEMPLATE input', !!s.blocks.blocks[0].inputs.WEEK_TEMPLATE.block);
  const day = s.blocks.blocks[0].inputs.WEEK_TEMPLATE.block;
  check('nap blokk', day.type === 'gym_day' && day.fields.DAY === 'monday');
  const first = day.inputs.ACTIVITIES.block;
  check('első gyakorlat', first.type === 'gym_exercise' && first.fields.EXERCISE === 'guggolas');
  check('lánc next-tel', first.next.block.fields.EXERCISE === 'fekvenyomas');
  check('minden mező kitöltve', ['EXERCISE','CUSTOM_NAME','SETS','REPS','WEIGHT_MODE','WEIGHT','INCREMENT','REST']
    .every(k => first.fields[k] !== undefined), Object.keys(first.fields));
  check('JSON-kerek', JSON.parse(JSON.stringify(s)).blocks.blocks[0].type === 'gym_repeat_weeks');
}

console.log(`\n===== ${pass} ok, ${fail} hiba =====`);
process.exit(fail ? 1 : 0);
