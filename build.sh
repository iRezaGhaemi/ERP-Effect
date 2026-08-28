#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$PROJECT_DIR"
OUT=effect-erp.html
cat src/00-head.html > $OUT
cat src/01-base.css src/02-shell.css src/03-modules.css src/04-features.css >> $OUT
cat src/05-body.html >> $OUT
cat src/06-js-open.html >> $OUT
cat src/10-core.js src/11-icons.js src/13-data.js src/13b-data2.js src/12-rbac.js src/14-components.js src/15-shell.js \
    src/16-auth.js src/17-dashboard.js src/18-tasks.js src/19-calendar.js src/20-crm.js src/20b-cpro.js \
    src/21-finance.js src/22-leave.js src/23-social.js src/23b-social2.js src/24-team.js src/24b-messenger.js src/25-admin.js src/25b-users.js src/26-boot.js >> $OUT
cat src/99-tail.html >> $OUT
python3 - <<PY
data = open('$OUT').read()
data = data.replace('__FONT_B64__', open('fonts/Estedad-sub.b64').read().strip())
data = data.replace('__AVATAR_IMG__', 'data:image/jpeg;base64,'+open('fonts/avatar-sprite.b64').read().strip())
data = data.replace('__LOGIN_IMG__', 'data:image/jpeg;base64,'+open('fonts/login-art.b64').read().strip())
for w,p in [('400','Regular'),('500','Medium'),('600','DemiBold')]:
    data = data.replace('__ISX_'+w+'__', open(f'fonts/isx/sub-{p}.b64').read().strip())
open('$OUT','w').write(data)
print('fonts injected ✓ (IRANSansX 400/500/600 + avatars + login art + Estedad fallback)')
PY
python3 - <<PY
import re
html=open('$OUT').read()
m=re.search(r'<script>(.*?)</script>', html, re.S)
open('/tmp/app.js','w').write(m.group(1))
PY
node --check /tmp/app.js && echo "✓ JS syntax OK"
echo "SIZE: $(du -h $OUT | cut -f1)"
