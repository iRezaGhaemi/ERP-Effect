import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const deploymentDirectory = mkdtempSync(resolve(tmpdir(), 'effect-api-deploy-'));

try {
  execFileSync('pnpm', ['--filter', '@effect/api', 'deploy', '--legacy', '--prod', deploymentDirectory], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  execFileSync('node', ['--input-type=module', '--eval', "import('./dist/app.module.js')"], {
    cwd: deploymentDirectory,
    stdio: 'inherit',
  });
} finally {
  rmSync(deploymentDirectory, { force: true, recursive: true });
}
