# Remove Messenger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the entire chat/messenger feature while preserving task comments and system notifications.

**Architecture:** The messenger is a standalone prototype module with sidebar, task-sharing, profile, permission, CSS and QA references. Remove its runtime surface and rebuild the generated HTML; do not add a backend or compatibility stub for it.

**Tech Stack:** Existing modular JavaScript/HTML/CSS build, jsdom, Node 24, Playwright QA.

**Spec:** User request on 2026-09-01: «بخش چت و پیام رسان کلا حذف کن»; `docs/progress/2026-09-01-product-roadmap.md`.

## Global Constraints

- Work only in the existing `codex/foundation-identity` linked worktree.
- Remove chat/messenger, not task comments, notifications, support ticket labels, or shared message icons used by remaining features.
- Preserve all unrelated changes and all authentication behavior; password conversion is a separate plan.
- Do not modify `.env` files, production data, historical migrations or historical design documents.
- Use `apply_patch` for source edits, and `./build.sh` for generated HTML.
- No push by implementers; the controller reviews, verifies and pushes the completed removal.

### Task 1: Remove every active messenger surface

**Files:**
- Delete: `src/24b-messenger.js`.
- Modify: `build.sh`, `src/12-rbac.js`, `src/15-shell.js`, `src/18-tasks.js`, `src/24-team.js`.
- Modify messenger-only state/data/style references, if present: `src/10-core.js`, `src/13-data.js`, `src/13b-data2.js`, `src/04-features.css`, `src/03-modules.css`, `src/26-boot.js`.
- Modify: `.testenv/qa25.js`, `.testenv/qa26.js`, `.testenv/containment.js`; keep their non-chat coverage.
- Test: `.testenv/ui-regressions.test.js`.
- Regenerate: `effect-erp.html`.
- Document: `README.md` current scope only. Keep historical release notes truthful; label superseded chat notes if needed rather than inventing history.

**Interfaces:**
- Consumes: `loadApp(t)` in the regression test; the existing `window.render()`, `window.taskDrawer(id)`, task comment and notification flows.
- Produces: no messenger navigation, routes, permissions, JS globals, sample chats, or share-to-chat buttons; existing task/comment/profile pages remain usable.

- [ ] **Step 1: Add behavioral regression coverage before deleting code.** Append this test using the existing test helper:

```js
test('the product has no messenger entry points while tasks remain usable', t => {
  const {window, document, errors} = loadApp(t);
  window.location.hash = '#/dashboard';
  window.render();
  assert.doesNotMatch(document.querySelector('.sidebar')?.textContent ?? document.body.textContent, /پیام‌رسان/);
  window.taskDrawer('t1');
  assert.doesNotMatch(document.querySelector('.drawer').textContent, /ارسال در پیام‌رسان/);
  assert.ok(document.getElementById('cmt-in'));
  window.closeDrawer();
  window.location.hash = '#/team/e2';
  window.render();
  assert.equal([...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'پیام'), false);
  window.location.hash = '#/messenger';
  window.render();
  assert.equal(document.querySelector('.msg-chat'), null);
  assert.deepEqual(errors, []);
});
```

Add a separate permission-UI assertion that no messenger permission category or override is offered. Preserve the existing regression that submits and safely renders a task comment. If the actual sidebar selector differs, resolve it from `src/15-shell.js` before running; do not weaken assertions to accommodate the old chat UI.

- [ ] **Step 2: Run RED.** `node --test --test-name-pattern='messenger' .testenv/ui-regressions.test.js` must fail because the current messenger UI is still present. Record the actual failure.
- [ ] **Step 3: Remove the feature.** Delete the module and its build input, NAV item, unread-count branch, permission category/defaults/overrides/route mapping, task-share button and profile-message button. Remove messenger-only selectors and state. Keep shared `ic('msg')` for comments. Unknown old bookmarks may use the existing safe router fallback; they must not execute chat code or throw. No empty stub functions.
- [ ] **Step 4: Replace obsolete chat-positive browser QA with absence checks.** Preserve user management, profile, bank privacy, overrides and other coverage in QA25/QA26. Where an override test previously granted messenger, grant another real module absent from the fixture's base role and retain the allow/deny assertions. Remove messenger only from containment route lists.
- [ ] **Step 5: Build and verify GREEN.** Run `./build.sh`, `node --test .testenv/ui-regressions.test.js`, and `npm test --prefix .testenv`. Then run the focused real-browser QA25/QA26 and containment when the configured browser is available; if unavailable report that explicitly rather than claiming it ran. Inspect active code with `rg -n 'messenger|CHATS|taskShare|پیام‌رسان' src build.sh .testenv README.md`, classifying any remaining matches as negative regression checks or historical notes. Build output must contain no executable chat feature.
- [ ] **Step 6: Review and commit exact files.** Use `git diff --check`, inspect the diff for unrelated deletions, and commit only this task's files with `refactor: remove messenger feature from product`. Report deleted files and recoverability via Git, commands and RED/GREEN evidence. Do not stage roadmap/password spec/compose changes owned by the controller.
