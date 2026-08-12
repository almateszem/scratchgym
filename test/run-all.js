/* Az összes teszt futtatása:  node test/run-all.js
   Nem kell npm install — csak Node.js. */

const { execFileSync } = require('child_process');
const path = require('path');

const suites = [
  'interpreter.test.js',
  'preview-export.test.js',
  'loader.test.js'
];

let failed = 0;

for (const suite of suites) {
  console.log('\n────────────────────────────────────────');
  console.log('  ' + suite);
  console.log('────────────────────────────────────────');
  try {
    const out = execFileSync(process.execPath, [path.join(__dirname, suite)], {
      encoding: 'utf8'
    });
    process.stdout.write(out);
  } catch (err) {
    failed++;
    if (err.stdout) process.stdout.write(err.stdout);
    if (err.stderr) process.stderr.write(err.stderr);
  }
}

console.log('\n════════════════════════════════════════');
console.log(failed ? `  ${failed} teszt-csomag hibás` : '  Minden teszt-csomag zöld');
console.log('════════════════════════════════════════');
process.exit(failed ? 1 : 0);
