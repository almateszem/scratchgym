/* A kereshető legördülő mező tesztje.
 *
 * Regressziós védelem: a Blockly valódi ES6 osztályokra fordul, ezért az
 * öröklésnek is valódi `class ... extends`-nek kell lennie. A régi ES5
 * prototípus-minta (Base.call(this, ...)) TypeError-t dob:
 *   "Class constructor cannot be invoked without 'new'"
 * Ez a teszt ugyanúgy ES6 osztályt ad ősnek, mint az igazi Blockly.
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { El } = require('./fake-dom.js');

const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const check = (n, c, e) => c ? (pass++, console.log('  ok   ', n))
  : (fail++, console.log('  FAIL ', n, e !== undefined ? JSON.stringify(e) : ''));

/* ---- ES6 osztály ős, mint a lefordított Blockly ---- */
function makeFakeBlockly(contentDiv) {
  const shownFor = [];
  class FieldDropdown {
    constructor(menuGenerator, validator, config) {
      this.menuGenerator_ = menuGenerator;
      this.validator_ = validator;
      this.config_ = config;
      this.value_ = menuGenerator && menuGenerator[0] ? menuGenerator[0][1] : null;
    }
    showEditor_(e) { shownFor.push(this); }
    getValue() { return this.value_; }
  }
  return {
    FieldDropdown,
    DropDownDiv: { getContentDiv: () => contentDiv },
    _shownFor: shownFor,
  };
}

function load(blockly, doc) {
  const ctx = { console, setTimeout, Array, String, Number, Object, Error };
  ctx.window = ctx;
  ctx.Blockly = blockly;
  ctx.document = doc;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/blocks/field-searchable-dropdown.js'), 'utf8'),
    ctx, { filename: 'field-searchable-dropdown.js' });
  return ctx;
}

function makeDoc() {
  return { createElement: (t) => new El(t) };
}

/** Menü N elemmel, ahogy a Blockly kirendereli. */
function makeMenu(labels) {
  const content = new El('div');
  labels.forEach(text => {
    const item = new El('div');
    item.className = 'blocklyMenuItem';
    item.textContent = text;
    content.appendChild(item);
  });
  return content;
}

const LABELS = [
  'Fekvőnyomás  ·  Mell', 'Húzódzkodás  ·  Hát', 'Guggolás  ·  Láb',
  'Vádliemelés  ·  Láb', 'Plank  ·  Törzs', 'Futás  ·  Cardio',
  'Kötélugrás  ·  Cardio', 'Evezőgép  ·  Cardio', 'Hasprés  ·  Törzs',
  '✏️ Saját gyakorlat…'
];

console.log('\n1) Öröklés ES6 osztály ősből (a régi ES5 minta itt bukott el)');
{
  const content = makeMenu(LABELS);
  const blockly = makeFakeBlockly(content);
  const ctx = load(blockly, makeDoc());
  ctx.SG.defineSearchableDropdown();

  let field = null, err = null;
  try { field = new ctx.SG.FieldSearchableDropdown([['A', 'a'], ['B', 'b']], null); }
  catch (e) { err = e; }

  check('példányosítható', err === null, err && err.message);
  check('a FieldDropdown leszármazottja', field instanceof blockly.FieldDropdown);
  check('az ős konstruktora lefutott', field.getValue() === 'a', field && field.getValue());
}

console.log('\n2) Gyár: kereshető mezőt ad, ha lehet');
{
  const blockly = makeFakeBlockly(makeMenu(LABELS));
  const ctx = load(blockly, makeDoc());
  ctx.SG.defineSearchableDropdown();
  const field = ctx.SG.createExerciseDropdown([['A', 'a']], null);
  check('kereshető példány', field instanceof ctx.SG.FieldSearchableDropdown);
}

console.log('\n3) Gyár: visszaesik sima legördülőre, ha a kereshető elhasal');
{
  const blockly = makeFakeBlockly(makeMenu(LABELS));
  const ctx = load(blockly, makeDoc());
  ctx.SG.defineSearchableDropdown();
  // Szimuláljuk, hogy a kereshető változat konstruktora dob
  ctx.SG.FieldSearchableDropdown = class { constructor() { throw new Error('bumm'); } };

  let field = null, err = null;
  try { field = ctx.SG.createExerciseDropdown([['A', 'a']], null); }
  catch (e) { err = e; }

  check('nem dobott tovább', err === null, err && err.message);
  check('sima FieldDropdown lett', field instanceof blockly.FieldDropdown);
}

console.log('\n4) Gyár működik akkor is, ha a defineSearchableDropdown nem futott');
{
  const blockly = makeFakeBlockly(makeMenu(LABELS));
  const ctx = load(blockly, makeDoc());
  const field = ctx.SG.createExerciseDropdown([['A', 'a']], null);
  check('sima FieldDropdown', field instanceof blockly.FieldDropdown);
}

console.log('\n5) A kereső injektálása és szűrése');
{
  const content = makeMenu(LABELS);
  const blockly = makeFakeBlockly(content);
  const ctx = load(blockly, makeDoc());
  ctx.SG.defineSearchableDropdown();
  const field = ctx.SG.createExerciseDropdown([['A', 'a']], null);

  field.showEditor_();
  check('meghívta az ős showEditor_-t', blockly._shownFor.length === 1);

  const input = content.querySelector('.sg-dropdown-search');
  check('bekerült a kereső input', !!input);
  check('a menü elejére', content.children[0] === input);

  const items = content.querySelectorAll('.blocklyMenuItem');
  check('minden elem látszik alapból', items.every(i => i.style.display !== 'none'));

  // ékezet nélkül gépelve is találjon
  input.value = 'kotel';
  input.dispatch('input');
  const visible = items.filter(i => i.style.display !== 'none').map(i => i.textContent);
  check('ékezet-független szűrés', visible.length === 1 && visible[0].includes('Kötélugrás'), visible);
  check('nincs "nincs találat" felirat', content.querySelector('.sg-dropdown-noresult').hidden === true);

  input.value = 'nincsilyen';
  input.dispatch('input');
  check('nulla találat', items.every(i => i.style.display === 'none'));
  check('"nincs találat" megjelenik', content.querySelector('.sg-dropdown-noresult').hidden === false);

  input.value = '';
  input.dispatch('input');
  check('üres kereső -> újra minden látszik', items.every(i => i.style.display !== 'none'));
}

console.log('\n6) Rövid listánál nincs kereső');
{
  const content = makeMenu(['fix', 'progresszív', 'testsúly']);
  const blockly = makeFakeBlockly(content);
  const ctx = load(blockly, makeDoc());
  ctx.SG.defineSearchableDropdown();
  ctx.SG.createExerciseDropdown([['A', 'a']], null).showEditor_();
  check('3 elemnél nem injektál', content.querySelector('.sg-dropdown-search') === null);
}

console.log('\n7) Váratlan DOM esetén sem dob hibát');
{
  const blockly = makeFakeBlockly(null); // getContentDiv() null-t ad
  const ctx = load(blockly, makeDoc());
  ctx.SG.defineSearchableDropdown();
  const field = ctx.SG.createExerciseDropdown([['A', 'a']], null);
  let err = null;
  try { field.showEditor_(); } catch (e) { err = e; }
  check('showEditor_ túlélte', err === null, err && err.message);
  check('az ős showEditor_ így is lefutott', blockly._shownFor.length === 1);
}

console.log(`\n===== ${pass} ok, ${fail} hiba =====`);
process.exit(fail ? 1 : 0);
