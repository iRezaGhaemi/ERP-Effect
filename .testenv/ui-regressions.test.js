const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
const {APP_PATH} = require('./paths');

const html = fs.readFileSync(APP_PATH, 'utf8');

function loadApp(t) {
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://erp.local/',
    beforeParse(window) {
      window.scrollTo = () => {};
      window.print = () => {};
      window.Element.prototype.scrollIntoView = function () {};
      window.addEventListener('error', event => errors.push(event.error || event.message));
    },
  });
  t.after(() => dom.window.close());
  dom.window.S.authed = true;
  dom.window.S.missionSeen = true;
  return {window: dom.window, document: dom.window.document, errors};
}

test('task-authored text is rendered as text rather than executable markup', t => {
  const {window, document} = loadApp(t);
  const base = window.TASKS[0];
  const probe = {
    ...base,
    id: 'xss-probe-task',
    title: 'عنوان <img id="xss-title" src="x">',
    desc: 'توضیح <svg id="xss-desc"></svg>',
    tags: ['برچسب <i id="xss-tag">خطر</i>'],
    assignees: [...base.assignees],
    labels: [...base.labels],
    checklist: base.checklist.map(item => ({...item})),
  };
  window.TASKS.unshift(probe);
  window.location.hash = '#/tasks';
  window.render();

  assert.equal(document.getElementById('xss-title'), null, 'task title created an HTML element');
  assert.match(document.body.textContent, /عنوان <img id="xss-title" src="x">/);

  window.taskDrawer(probe.id);
  assert.equal(document.getElementById('xss-desc'), null, 'task description created an SVG element');
  assert.equal(document.getElementById('xss-tag'), null, 'task tag created an HTML element');
  assert.match(document.querySelector('.drawer').textContent, /توضیح <svg id="xss-desc"><\/svg>/);
  assert.match(document.querySelector('.drawer').textContent, /برچسب <i id="xss-tag">خطر<\/i>/);
});

test('adding a comment stores it, updates the count, and renders its text safely', t => {
  const {window, document, errors} = loadApp(t);
  const task = window.TASKS.find(item => item.id === 't1');
  const before = task.cm;
  window.taskDrawer(task.id);
  document.getElementById('cmt-in').value = 'سلام <b id="comment-probe">خطر</b>';

  assert.equal(typeof window.addCmt, 'function', 'addCmt is not defined');
  window.addCmt(task.id);

  assert.equal(task.cm, before + 1);
  assert.equal(task.comments.at(-1).text, 'سلام <b id="comment-probe">خطر</b>');
  assert.equal(document.getElementById('comment-probe'), null, 'comment created an HTML element');
  assert.match(document.querySelector('.drawer').textContent, /سلام <b id="comment-probe">خطر<\/b>/);
  assert.deepEqual(errors, []);
});

test('login branding exposes the current 2.6 version and primary color', t => {
  const {document} = loadApp(t);
  const favicon = document.querySelector('link[rel="icon"]').getAttribute('href');

  assert.match(document.querySelector('.auth-card').textContent, /نسخه ۲\.۶/);
  assert.match(favicon.toUpperCase(), /%236F6AEB/);
  assert.doesNotMatch(favicon.toUpperCase(), /%235E01A4/);
});
