import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// This probe never starts or stops services. The caller must explicitly start a
// disposable project, then provide both values below.
const cwd = new URL('../../', import.meta.url);
const projectName = process.env.TASK5_COMPOSE_PROJECT_NAME;
const composeFile = process.env.TASK5_COMPOSE_FILE;
assert.match(projectName ?? '', /^effect-task5-[a-z0-9-]+$/);
assert.equal(composeFile, 'compose.test.yml');
const composeArgs = [
  'compose',
  '-p',
  projectName,
  '-f',
  composeFile,
];
const config = spawnSync('docker', [...composeArgs, 'config', '--format', 'json'], {
  cwd,
  encoding: 'utf8',
  timeout: 10_000,
});
assert.equal(config.status, 0, config.error?.message ?? config.stderr);
const { services } = JSON.parse(config.stdout);
const running = spawnSync(
  'docker',
  [...composeArgs, 'ps', '--status', 'running', '--services'],
  { cwd, encoding: 'utf8', timeout: 10_000 },
);
assert.equal(running.status, 0, running.error?.message ?? running.stderr);
const runningServices = new Set(running.stdout.trim().split(/\s+/));

for (const service of ['api', 'web']) {
  test(`${service} configured health probe succeeds inside its running container`, () => {
    assert.equal(runningServices.has(service), true, `${service} was not explicitly started`);
    const [mode, ...command] = services[service].healthcheck.test;
    assert.equal(mode, 'CMD-SHELL');
    assert.match(command.join(' '), /127\.0\.0\.1/);
    const probe = spawnSync(
      'docker',
      [...composeArgs, 'exec', '-T', service, 'sh', '-c', command.join(' ')],
      { cwd, encoding: 'utf8', timeout: 10_000 },
    );
    assert.equal(probe.status, 0, probe.error?.message ?? probe.stderr);
  });
}
