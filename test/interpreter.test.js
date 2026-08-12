/* Interpreter teszt Blockly nélkül, mock blokkokkal. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = global;
for (const f of ['js/data/exercises.js', 'js/core/progression.js', 'js/core/interpreter.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { filename: f });
}

/* ---- mock blokk ---- */
function B(type, fields, inputs, next) {
  const b = {
    type,
    fields: fields || {},
    inputs: inputs || {},
    _next: next || null,
    getFieldValue(n) { return b.fields[n]; },
    getNextBlock() { return b._next; },
    getInputTargetBlock(n) { return b.inputs[n] || null; },
    isEnabled() { return b.enabled !== false; },
    isShadow() { return false; },
    isInsertionMarker() { return false; },
  };
  return b;
}
function ws(tops) {
  return { getTopBlocks: () => tops };
}
function ex(o) {
  return B('gym_exercise', Object.assign({
    EXERCISE: 'guggolas', CUSTOM_NAME: 'Saját gyakorlat', SETS: 4, REPS: '5',
    WEIGHT_MODE: 'progressive', WEIGHT: 60, INCREMENT: 5, REST: 120,
  }, o.fields), {}, o.next);
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ', name); }
  else { fail++; console.log('  FAIL ', name, extra !== undefined ? JSON.stringify(extra) : ''); }
}

/* =========== 1. Alap: ciklus + nap + két progresszív gyakorlat =========== */
console.log('\n1) Ciklus, két eltérő progresszióval');
{
  const bench = ex({ fields: { EXERCISE: 'fekvenyomas', WEIGHT: 40, INCREMENT: 2.5, SETS: 4, REPS: '8-12', REST: 90 } });
  const squat = ex({ fields: { EXERCISE: 'guggolas', WEIGHT: 60, INCREMENT: 5 }, next: bench });
  const day = B('gym_day', { DAY: 'monday' }, { ACTIVITIES: squat });
  const repeat = B('gym_repeat_weeks', { WEEKS: 8 }, { WEEK_TEMPLATE: day });
  const p = SG.Interpreter.computeProgram(ws([repeat]));

  check('weeksTotal = 8', p.weeksTotal === 8, p.weeksTotal);
  check('8 feloldott hét', p.resolvedWeeks.length === 8);
  check('7 nap a sablonban', p.template.days.length === 7);

  const w1 = p.resolvedWeeks[0].days.find(d => d.dayOfWeek === 'monday').activities;
  const w3 = p.resolvedWeeks[2].days.find(d => d.dayOfWeek === 'monday').activities;
  check('1. hét guggolás 60kg', w1[0].weightKg === 60, w1[0].weightKg);
  check('1. hét fekvenyomás 40kg', w1[1].weightKg === 40, w1[1].weightKg);
  check('3. hét guggolás 70kg (+5/hét)', w3[0].weightKg === 70, w3[0].weightKg);
  check('3. hét fekvenyomás 45kg (+2.5/hét)', w3[1].weightKg === 45, w3[1].weightKg);
  check('név feloldva', w1[0].exerciseName === 'Guggolás', w1[0].exerciseName);
  check('nincs figyelmeztetés', p.warnings.length === 0, p.warnings);
  check('üres napok is benne', p.template.days.filter(d => d.activities.length === 0).length === 6);
}

/* =========== 2. Beágyazott körök =========== */
console.log('\n2) Kör a körben (tetszőleges mélység)');
{
  const inner = B('gym_circuit', { ROUNDS: 2, CIRCUIT_REST: 30 }, { DO: ex({ fields: { EXERCISE: 'plank', WEIGHT_MODE: 'bodyweight' } }) });
  const outer = B('gym_circuit', { ROUNDS: 3, CIRCUIT_REST: 60 }, { DO: inner });
  const day = B('gym_day', { DAY: 'wednesday' }, { ACTIVITIES: outer });
  const p = SG.Interpreter.computeProgram(ws([day]));

  const acts = p.resolvedWeeks[0].days.find(d => d.dayOfWeek === 'wednesday').activities;
  check('külső kör', acts[0].type === 'circuit' && acts[0].rounds === 3);
  check('belső kör', acts[0].activities[0].type === 'circuit' && acts[0].activities[0].rounds === 2);
  check('legbelső gyakorlat', acts[0].activities[0].activities[0].exerciseName === 'Plank');
  check('testsúly -> weightKg null', acts[0].activities[0].activities[0].weightKg === null);
  check('testsúly flag', acts[0].activities[0].activities[0].isBodyweight === true);
  check('ciklus nélkül weeksTotal=1', p.weeksTotal === 1);
}

/* =========== 3. Deload: negatív növekmény 0-nál megáll =========== */
console.log('\n3) Negatív növekmény 0-ra vágása');
{
  const e = ex({ fields: { WEIGHT: 20, INCREMENT: -10 } });
  const day = B('gym_day', { DAY: 'friday' }, { ACTIVITIES: e });
  const repeat = B('gym_repeat_weeks', { WEEKS: 6 }, { WEEK_TEMPLATE: day });
  const p = SG.Interpreter.computeProgram(ws([repeat]));
  const w = n => p.resolvedWeeks[n - 1].days.find(d => d.dayOfWeek === 'friday').activities[0].weightKg;
  check('1. hét 20', w(1) === 20, w(1));
  check('3. hét 0', w(3) === 0, w(3));
  check('6. hét nem negatív', w(6) === 0, w(6));
}

/* =========== 4. Saját gyakorlat =========== */
console.log('\n4) Saját gyakorlat');
{
  const e = ex({ fields: { EXERCISE: '__CUSTOM__', CUSTOM_NAME: '  Farmer séta  ', WEIGHT_MODE: 'fixed', WEIGHT: 32 } });
  const day = B('gym_day', { DAY: 'tuesday' }, { ACTIVITIES: e });
  const p = SG.Interpreter.computeProgram(ws([day]));
  const a = p.resolvedWeeks[0].days.find(d => d.dayOfWeek === 'tuesday').activities[0];
  check('név trimmelve', a.exerciseName === 'Farmer séta', a.exerciseName);
  check('isCustomExercise', a.isCustomExercise === true);
  check('exerciseId null', a.exerciseId === null);
  check('fix súly minden héten', a.weightKg === 32);

  const e2 = ex({ fields: { EXERCISE: '__CUSTOM__', CUSTOM_NAME: '   ' } });
  const p2 = SG.Interpreter.computeProgram(ws([B('gym_day', { DAY: 'tuesday' }, { ACTIVITIES: e2 })]));
  check('üres saját név -> fallback',
    p2.resolvedWeeks[0].days.find(d => d.dayOfWeek === 'tuesday').activities[0].exerciseName === 'Névtelen gyakorlat');
}

/* =========== 5. Figyelmeztetések =========== */
console.log('\n5) Figyelmeztetések');
{
  const dup2 = B('gym_day', { DAY: 'monday' }, { ACTIVITIES: ex({}) });
  const dup1 = B('gym_day', { DAY: 'monday' }, { ACTIVITIES: ex({}) }, dup2);
  const p = SG.Interpreter.computeProgram(ws([dup1]));
  check('duplikált nap figyelmeztetés', p.warnings.some(w => w.includes('többször')), p.warnings);
  check('duplikált nap gyakorlatai összefűzve',
    p.template.days.find(d => d.dayOfWeek === 'monday').activities.length === 2);

  const emptyCircuit = B('gym_circuit', { ROUNDS: 3, CIRCUIT_REST: 60 }, {});
  const p2 = SG.Interpreter.computeProgram(ws([B('gym_day', { DAY: 'monday' }, { ACTIVITIES: emptyCircuit })]));
  check('üres kör figyelmeztetés', p2.warnings.some(w => w.includes('üres kör')), p2.warnings);
  check('üres kör megmarad', p2.template.days.find(d => d.dayOfWeek === 'monday').activities[0].activities.length === 0);

  const p3 = SG.Interpreter.computeProgram(ws([ex({})]));
  check('árva gyakorlat figyelmeztetés', p3.warnings.some(w => w.includes('nincs egyetlen napban')), p3.warnings);

  const r1 = B('gym_repeat_weeks', { WEEKS: 4 }, {});
  const r2 = B('gym_repeat_weeks', { WEEKS: 9 }, {});
  const p4 = SG.Interpreter.computeProgram(ws([r1, r2]));
  check('több ciklusblokk figyelmeztetés', p4.warnings.some(w => w.includes('Több')), p4.warnings);
  check('az első ciklus számít', p4.weeksTotal === 4, p4.weeksTotal);

  const p5 = SG.Interpreter.computeProgram(ws([B('gym_day', { DAY: 'monday' }, { ACTIVITIES: ex({}) })]));
  check('progresszív ciklus nélkül figyelmeztetés', p5.warnings.some(w => w.includes('egyhetes')), p5.warnings);
}

/* =========== 6. Letiltott blokk kihagyása =========== */
console.log('\n6) Letiltott blokk');
{
  const b = ex({ fields: { EXERCISE: 'fekvenyomas' } });
  const a = ex({ fields: { EXERCISE: 'guggolas' }, next: b });
  a.enabled = false;
  const p = SG.Interpreter.computeProgram(ws([B('gym_day', { DAY: 'monday' }, { ACTIVITIES: a })]));
  const acts = p.template.days.find(d => d.dayOfWeek === 'monday').activities;
  check('letiltott kihagyva, a lánc folytatódik', acts.length === 1 && acts[0].exerciseName === 'Fekvőnyomás',
    acts.map(x => x.exerciseName));
}

/* =========== 7. Üres workspace =========== */
console.log('\n7) Üres workspace');
{
  const p = SG.Interpreter.computeProgram(ws([]));
  check('nem dob hibát', p.weeksTotal === 1 && p.resolvedWeeks.length === 1);
  check('7 üres nap', p.template.days.every(d => d.activities.length === 0));
  const p2 = SG.Interpreter.computeProgram(null);
  check('null workspace kezelve', p2.weeksTotal === 1);
}

/* =========== 8. computeWeek =========== */
console.log('\n8) computeWeek');
{
  const day = B('gym_day', { DAY: 'monday' }, { ACTIVITIES: ex({ fields: { WEIGHT: 100, INCREMENT: 2.5 } }) });
  const repeat = B('gym_repeat_weeks', { WEEKS: 5 }, { WEEK_TEMPLATE: day });
  const w = SG.Interpreter.computeWeek(ws([repeat]), 4);
  check('4. hét 107.5kg', w.days.find(d => d.dayOfWeek === 'monday').activities[0].weightKg === 107.5,
    w.days.find(d => d.dayOfWeek === 'monday').activities[0].weightKg);
  const over = SG.Interpreter.computeWeek(ws([repeat]), 99);
  check('túlcímzett hét levágva', over.week === 5, over.week);
  const under = SG.Interpreter.computeWeek(ws([repeat]), 0);
  check('0. hét levágva 1-re', under.week === 1, under.week);
}

/* =========== 9. Lebegőpontos kerekítés =========== */
console.log('\n9) Kerekítés');
{
  const day = B('gym_day', { DAY: 'monday' }, { ACTIVITIES: ex({ fields: { WEIGHT: 0.1, INCREMENT: 0.2 } }) });
  const repeat = B('gym_repeat_weeks', { WEEKS: 3 }, { WEEK_TEMPLATE: day });
  const p = SG.Interpreter.computeProgram(ws([repeat]));
  const v = p.resolvedWeeks[1].days.find(d => d.dayOfWeek === 'monday').activities[0].weightKg;
  check('0.1 + 0.2 = 0.3 (nem 0.30000000000000004)', v === 0.3, v);
}

console.log(`\n===== ${pass} ok, ${fail} hiba =====`);
process.exit(fail ? 1 : 0);
