const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build.sh');
const OUTPUT = path.join(ROOT, 'effect-erp.html');

test('build runs directly from outside the checkout and emits a complete app', () => {
  const run = spawnSync(BUILD, [], {
    cwd: os.tmpdir(),
    encoding: 'utf8',
  });

  assert.equal(
    run.status,
    0,
    `build failed\nstdout:\n${run.stdout || ''}\nstderr:\n${run.stderr || run.error || ''}`,
  );

  const html = fs.readFileSync(OUTPUT, 'utf8');
  assert.doesNotMatch(html, /__[A-Z0-9_]+__/);
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0][1], {filename: 'effect-erp-inline.js'}));
});
