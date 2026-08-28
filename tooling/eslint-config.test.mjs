import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

const rootDirectory = resolve(import.meta.dirname, '..');
const fixtureDirectory = resolve(rootDirectory, 'tooling/fixtures/typed-lint');

function run(command, arguments_) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, arguments_, {
      cwd: rootDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.once('error', reject);
    child.once('close', (code) => {
      resolveRun({ code, output });
    });
  });
}

test('base preset runs type-aware lint rules for TypeScript files', async () => {
  const result = await run('pnpm', [
    'exec',
    'eslint',
    '--config',
    'tooling/fixtures/typed-lint/eslint.config.mjs',
    'tooling/fixtures/typed-lint/floating-promise.ts',
  ]);

  assert.equal(result.code, 1, result.output);
  assert.match(result.output, /@typescript-eslint\/no-floating-promises/);
  assert.doesNotMatch(result.output, /requires type information/);
});

test('next preset imports as a flat config array', async () => {
  const nextConfig = await import('../packages/shared/eslint-config/next.mjs');

  assert.equal(Array.isArray(nextConfig.default), true);
});
