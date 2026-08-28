import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('declares the application and package workspaces', () => {
  assert.equal(existsSync('package.json'), true);
  assert.equal(existsSync('pnpm-workspace.yaml'), true);
  const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
  assert.match(workspace, /apps\/\*/);
  assert.match(workspace, /packages\/features\/\*/);
  assert.match(workspace, /packages\/platform\/\*/);
  assert.match(workspace, /packages\/shared\/\*/);
});
