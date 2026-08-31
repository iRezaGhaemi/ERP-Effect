import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const deploymentDirectory = mkdtempSync(resolve(tmpdir(), 'effect-api-deploy-'));
const storeDirectory = dirname(execFileSync('pnpm', ['store', 'path'], {
  cwd: repositoryRoot, encoding: 'utf8',
}).trim());

try {
  execFileSync('pnpm', ['--filter', '@effect/api', 'deploy', '--prod', '--offline', '--store-dir', storeDirectory, deploymentDirectory], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  execFileSync('node', ['--input-type=module', '--eval', "import('./dist/app.module.js')"], {
    cwd: deploymentDirectory,
    stdio: 'inherit',
  });
  execFileSync('node', ['--input-type=module', '--eval', `
    import { registerHooks } from 'node:module';
    registerHooks({ resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@nestjs/') || ['typeorm', 'node:crypto', 'node:fs'].includes(specifier))
        throw new Error('Server dependency reached a browser entry: ' + specifier);
      return nextResolve(specifier, context);
    }});
    for (const entry of ['@effect/auth/web', '@effect/users/web', '@effect/access-control/web', '@effect/audit/web', '@effect-erp/contracts'])
      await import(entry);
    console.log('Pruned API runtime and browser import boundaries passed');
  `], { cwd: deploymentDirectory, stdio: 'inherit' });
} finally {
  rmSync(deploymentDirectory, { force: true, recursive: true });
}
