/* A Blockly CDN-fallback lánc tesztje fake script-betöltéssel. */
const fs = require('fs');
const vm = require('vm');

const ROOT = require('path').join(__dirname, '..');
const MAIN = fs.readFileSync(ROOT + '/js/main.js', 'utf8');

let pass = 0, fail = 0;
const check = (n, c, e) => c ? (pass++, console.log('  ok   ', n))
  : (fail++, console.log('  FAIL ', n, e !== undefined ? JSON.stringify(e) : ''));

/**
 * @param {(url:string)=>('ok'|'fail'|'empty')} behaviour
 *        'ok'    - betöltődik és beállítja a Blockly-t (ha core)
 *        'fail'  - onerror
 *        'empty' - onload, de nem állít be Blockly-t (pl. hibaoldal 200-nal)
 */
function run(behaviour) {
  const requested = [];
  const ctx = {
    console,
    setTimeout,
    Promise,
    Error,
    String,
    Number,
    Math,
    Date,
    JSON,
  };
  ctx.window = ctx;
  ctx.document = {
    readyState: 'loading',           // így a boot() nem indul el magától
    addEventListener() {},
    head: { appendChild(node) { node._attach(); } },
    getElementById: () => null,
    createElement(tag) {
      const node = { tagName: tag, onload: null, onerror: null };
      Object.defineProperty(node, 'src', {
        set(v) { node._src = v; },
        get() { return node._src; },
      });
      node._attach = () => {
        const url = node._src;
        requested.push(url);
        const verdict = behaviour(url);
        // aszinkron, ahogy a valódi script-betöltés is
        setTimeout(() => {
          if (verdict === 'fail') { node.onerror && node.onerror(); return; }
          if (verdict === 'ok' && url.indexOf('blockly_compressed') !== -1) {
            ctx.window.Blockly = { __fake: true, __from: url };
          }
          node.onload && node.onload();
        }, 0);
      };
      return node;
    },
  };
  vm.createContext(ctx);
  vm.runInContext(MAIN, ctx, { filename: 'main.js' });
  return { ctx, requested, promise: ctx.SG.loadBlockly() };
}

(async () => {
  console.log('\n1) Az első forrás működik');
  {
    const { ctx, requested, promise } = run(() => 'ok');
    await promise;
    check('Blockly betöltve', !!ctx.window.Blockly);
    check('az 1. forrásból', ctx.window.Blockly.__from.includes('unpkg.com/blockly@'), ctx.window.Blockly.__from);
    check('csak core + msg kérés', requested.length === 2, requested);
    check('nem próbált több CDN-t', !requested.some(u => u.includes('jsdelivr')), requested);
  }

  console.log('\n2) Az első két forrás halott, a harmadik jó');
  {
    const dead = u => u.includes('blockly@11.2.2');
    const { ctx, requested, promise } = run(u => dead(u) ? 'fail' : 'ok');
    await promise;
    check('mégis betöltött', !!ctx.window.Blockly);
    check('a 3. forrásból', ctx.window.Blockly.__from === 'https://unpkg.com/blockly/blockly_compressed.js', ctx.window.Blockly.__from);
    check('sorrendben próbálkozott',
      requested[0].includes('unpkg.com/blockly@11.2.2') &&
      requested[1].includes('jsdelivr') &&
      requested[2] === 'https://unpkg.com/blockly/blockly_compressed.js', requested);
  }

  console.log('\n3) 200-as hibaoldal (betölt, de nincs Blockly) -> továbblép');
  {
    const { ctx, requested, promise } = run(u => u.includes('unpkg.com/blockly@11.2.2') ? 'empty' : 'ok');
    await promise;
    check('nem akadt el a hamis sikeren', !!ctx.window.Blockly);
    check('a következő CDN-ről jött', ctx.window.Blockly.__from.includes('jsdelivr'), ctx.window.Blockly.__from);
  }

  console.log('\n4) A magyar nyelvi fájl hiánya nem végzetes');
  {
    const { ctx, promise } = run(u => u.includes('/msg/') ? 'fail' : 'ok');
    let rejected = false;
    await promise.catch(() => { rejected = true; });
    check('nem dobott hibát', rejected === false);
    check('a Blockly használható', !!ctx.window.Blockly);
  }

  console.log('\n5) Minden forrás halott');
  {
    const { ctx, requested, promise } = run(() => 'fail');
    let err = null;
    await promise.catch(e => { err = e; });
    check('elutasított', err !== null);
    check('nincs Blockly', !ctx.window.Blockly);
    check('mind a 4 forrást próbálta', requested.length === 4, requested);
    check('a hibaüzenet felsorolja a próbálkozásokat',
      (err.message.match(/\|/g) || []).length === 3, err && err.message);
  }

  console.log(`\n===== ${pass} ok, ${fail} hiba =====`);
  process.exit(fail ? 1 : 0);
})();
