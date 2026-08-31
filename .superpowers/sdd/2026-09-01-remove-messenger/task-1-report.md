# Task 1 — Messenger removal report

## RED

Command:

```sh
PATH=/Users/rezaghaemi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --test-name-pattern='messenger' .testenv/ui-regressions.test.js
```

Result: failed as intended (2/2 focused tests). The dashboard assertion found
the sidebar entry `پیام‌رسان`; the permissions drawer assertion found the
`پیام‌رسان` category marked as an individual override.

## GREEN

Implemented removal of the messenger module, build input, navigation/unread
branch, RBAC module/defaults/override/route mapping, task share control,
profile message control, messenger styles, browser QA routes, and generated
artifact. The independent task-comment regression remains intact. QA25 now
checks feature absence and task comments; its individual-override check uses
the real `reports` module, which is absent from the e9 base role.

Commands and results:

```sh
./build.sh
# passed: JS syntax OK; generated effect-erp.html

node --test .testenv/ui-regressions.test.js
# passed: 5 tests

npm test --prefix .testenv
# passed: 6 regression tests, smoke routes/flows, and leak check
```

Static review:

```sh
rg -n -i 'messenger|CHATS|taskShare|پیام‌رسان' src build.sh .testenv README.md effect-erp.html
```

Remaining matches are only negative regression/QA assertions. No source or
generated executable messenger code remains.

## Browser QA

Focused QA25, QA26, and containment were attempted. Playwright could not keep
the configured headless Google Chrome process open (`browserType.launch:
Target page, context or browser has been closed`), before QA25 executed.
They are therefore not claimed as passed.

## Review and files

`git diff --check` passed. Reviewed the task diff for unrelated removals.
Deleted `src/24b-messenger.js`; it remains recoverable from Git history.

Task files changed:

- `.testenv/containment.js`
- `.testenv/qa25.js`
- `.testenv/qa26.js`
- `.testenv/ui-regressions.test.js`
- `README.md`
- `build.sh`
- `effect-erp.html`
- `src/04-features.css`
- `src/12-rbac.js`
- `src/15-shell.js`
- `src/18-tasks.js`
- `src/24-team.js`
- deleted `src/24b-messenger.js`

Concern: configured browser QA could not run because Chrome closed at launch.

## Round 1 QA fix

Recorded browser failure: QA25 reached the permission matrix and found 17
rows after messenger removal, while its stale assertion required 18 and still
labelled the matrix as `18 modules × actions`.

The check now compares rendered `.perm-row` elements to runtime `MODS.length`.
This asserts the UI renders every configured RBAC module and avoids another
stale count when modules are intentionally added or removed.

Verification:

```sh
node --test .testenv/ui-regressions.test.js
# passed: 5 tests

node .testenv/qa25.js
# passed outside the sandbox: 32 checks, including 17/17 permission rows

git diff --check
# passed
```
