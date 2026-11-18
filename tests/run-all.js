// Run every test file: node tests/run-all.js
const { readdirSync } = require('fs'); const { spawnSync } = require('child_process'); const path = require('path');
let failed = 0;
for (const f of readdirSync(__dirname).filter((x) => /^phase\d+\.test\.js$/.test(x)).sort()) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8' });
  const last = r.stdout.trim().split('\n').pop();
  console.log((r.status === 0 ? 'PASS ' : 'FAIL ') + f + '  ' + last); if (r.status !== 0) { failed++; console.log(r.stderr); }
}
process.exit(failed ? 1 : 0);
