const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const {pathToFileURL} = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const APP_PATH = path.join(ROOT, 'effect-erp.html');
const APP_URL = pathToFileURL(APP_PATH).href;
const artifactPath = name => path.join(ROOT, name);
const TEST_ARTIFACT_DIR = path.join(os.tmpdir(), 'effect-erp-test-artifacts');
const testArtifactPath = name => {
  fs.mkdirSync(TEST_ARTIFACT_DIR, {recursive: true});
  return path.join(TEST_ARTIFACT_DIR, name);
};

module.exports = {ROOT, APP_PATH, APP_URL, artifactPath, testArtifactPath};
