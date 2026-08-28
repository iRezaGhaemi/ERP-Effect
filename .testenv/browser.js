const fs = require('node:fs');

const candidates = [
  process.env.EFFECT_ERP_BROWSER_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const executablePath = candidates.find(candidate => fs.existsSync(candidate));
const browserLaunchOptions = (options = {}) => executablePath
  ? {...options, executablePath}
  : options;

module.exports = {browserLaunchOptions, executablePath};
