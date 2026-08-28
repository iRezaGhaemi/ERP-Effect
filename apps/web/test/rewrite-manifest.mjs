import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = resolve(fileURLToPath(new URL('..', import.meta.url)));
const manifest = JSON.parse(readFileSync(resolve(directory, '.next/routes-manifest.json'), 'utf8'));

assert.equal(manifest.rewrites.afterFiles.length, 1);
assert.equal(manifest.rewrites.afterFiles[0]?.source, '/api/:path*');
assert.equal(manifest.rewrites.afterFiles[0]?.destination, 'http://api:3001/api/:path*');
