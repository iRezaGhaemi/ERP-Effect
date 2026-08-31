# Effect ERP — پروتوتایپ رابط کاربری

> **وضعیت فعلی: checkpoint توسعه، نه نسخه آماده انتشار.** طبق تصمیم جدید، ورود محصول باید با نام‌کاربری و رمز عبور باشد و OTP حذف شود. این تغییر هنوز پیاده‌سازی نشده؛ کد فعلی برای حفظ پیشرفت تا این مرحله ثبت شده است. اجرای کامل پذیرش نهایی نشده و تست مرورگر فعلی یک خطای selector شناخته‌شده دارد. جزئیات در [گزارش وضعیت](docs/progress/2026-08-31-foundation-checkpoint.md).

## Foundation and identity — Phase 1

The pnpm workspace implements single-company OTP login, users, roles,
permissions/overrides, sessions, and append-only audit history.
**CRM, finance, tasks, leave, messenger, and reports remain prototype-only.**
The standalone demo below is preserved; its demo OTP is not an API credential.

### Development

Prerequisites: Node **24.x**, Corepack, Docker with Compose v2, and Git.

```bash
corepack enable
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up --build
```

Open http://localhost:3000/login. Compose starts PostgreSQL, runs a separate
migration job and idempotent initial-admin seed, then starts API and web.
Set `INITIAL_ADMIN_PHONE`, `OTP_PEPPER`, and `JWT_ACCESS_SECRET` in `.env`;
defaults are development examples only. Retrieve the local OTP with
`docker compose logs -f api`: only the explicitly development-only `[DEV OTP]`
console line contains it. The six OTP digit inputs accept typing/paste.
No SMS inspection endpoint is built into development or production.

```bash
docker compose run --rm migrate
docker compose run --rm seed
# Alternatively, after building, with host-accessible URLs in the environment:
pnpm db:migrate
pnpm db:seed
```

`DATABASE_MIGRATION_URL` uses the privileged migration role; `DATABASE_URL`
uses the restricted runtime role. API startup rejects a superuser/schema-owner
runtime connection. Never point tests at application databases.

### Release gate

```bash
pnpm --filter @effect/web exec playwright install --with-deps chromium
npm ci --prefix .testenv
docker compose -f compose.test.yml up -d --build --wait
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
./build.sh
npm test --prefix .testenv
docker compose -f compose.test.yml down -v
git diff --check
```

The test stack uses localhost ports **3100/3101** and an anonymous disposable
PostgreSQL volume. Always run its `down -v`, including after failure. Integration
and API tests create separate disposable PostgreSQL containers. Run the browser
journey on a fresh stack; it keeps the real 60-second resend policy and revokes
a second independent session. The dedicated test API image uses `NODE_ENV=test`
and fake SMS; its `/api/v1/test/sms/latest` endpoint replaces log scraping.
Failure traces contain isolated fixture credentials: never run these tests on
live accounts. CI caches only pnpm store data and uploads traces only on failure.

Generate OpenAPI with `pnpm --filter @effect/api openapi:generate` and verify
`git diff --exit-code -- apps/api/openapi.json`.

### Production images and deployment

```bash
docker build -f apps/api/Dockerfile --target runner -t effect-api:release .
docker build -f apps/web/Dockerfile --build-arg INTERNAL_API_URL=http://api:3001 -t effect-web:release .
# Inject migration credentials separately through your deployment secret store:
docker run --rm --env-file /secure/path/migration.env effect-api:release node dist/migrate.js
# Inject restricted DATABASE_URL and INITIAL_ADMIN_PHONE:
docker run --rm --env-file /secure/path/seed.env effect-api:release node dist/seed.js
```

**Take and verify a restorable PostgreSQL backup before every migration.**
Run migration once as a controlled job before replacing API replicas; API startup
never runs migrations. Keep migration credentials away from runtime replicas.
Both images run non-root with root-owned read-only application files. Deploy
with `--read-only --tmpfs /tmp`. Readiness checks database connectivity; liveness
checks the process. Web includes Next standalone output, public fonts and artwork.
`INTERNAL_API_URL` is a web build argument as well as a server-side environment
variable: build for the deployment's internal API address.

Terminate HTTPS at a trusted same-origin reverse proxy. Set `NODE_ENV=production`,
`WEB_ORIGIN` to the public HTTPS origin, secrets of at least 32 characters,
`SMS_PROVIDER=http`, `SMS_HTTP_URL`, `SMS_HTTP_TOKEN`, and
`OTP_DELIVERY_ACTIVATION_MARGIN_SECONDS=5`. Production rejects console/fake SMS
and insecure cookies. Keep `synchronize:false`; never log raw OTP, cookies or
tokens. Authentication cookies are HttpOnly/Secure, and mutations require Origin
and CSRF. Do not expose the internal API directly to browsers.

---

**سیستم‌عامل کسب‌وکار استودیو اثر** · نسخه ۲.۶ (پروتوتایپ Hi-Fi)

> **نسخه جاری ۲.۶:** تم پیش‌فرض **روشن** · رنگ برند اصلی **#6F6AEB** · فونت **IRANSansX** · مدیریت پیشرفته تسک، مسئولین چندگانه و چک‌لیست ساختاریافته

پروتوتایپ کامل و کاملاً تعاملی Effect ERP در **یک فایل مستقل**: `effect-erp.html`
بدون نیاز به اینترنت، سرور یا نصب — کافی است فایل را در مرورگر باز کنید.

---

## ورود به نسخه دمو

| مرحله | مقدار |
|---|---|
| شماره موبایل | `۰۹۱۲۱۲۳۴۵۶۷` (یا هر شماره معتبر ۰۹…) |
| کد تایید | `۱۲۳۴۵۶` |
| میان‌بر | دکمه «ورود سریع نسخه دمو» |

کاربر دمو: **رضا قایمی — مدیرعامل** (دسترسی کامل + ویجت‌های مدیریتی)

## ماژول‌ها (۳۵+ مسیر)

- **داشبورد** — ماموریت‌های امروز، پاپ‌آپ «شروع روز»، KPI مدیریتی، وضعیت تیم، قیف CRM، فاکتورهای سررسیدشده
- **کارهای من / مدیریت تسک** — برد کانبان با Drag & Drop، لیست، تقویم، Timeline، Drawer کامل تسک (چک‌لیست، کامنت، پیوست، فعالیت، وابستگی)
- **فضاهای کاری** — ۶ فضای کاری، تب‌های نمای کلی/پروژه/اعضا/تسک/فعالیت، دعوت عضو
- **تقویم شمسی** — ماه/هفته/روز/لیست، جلسات + سررسید تسک + مرخصی، ایجاد جلسه
- **CRM** — قیف فروش ۷ مرحله‌ای (DnD)، شرکت‌ها، مخاطبین، فرصت‌های وزن‌دار، فعالیت‌ها، Drawer سرنخ با تمام فیلدها
- **مشتریان** — لیست با فیلتر، پروفایل ۳۶۰ درجه (۹ تب)
- **مالی** — داشبورد (درآمد/هزینه/سود/جریان نقدی)، دریافت‌ها، پرداخت‌ها، هزینه‌ها، فاکتور و پیش‌فاکتور (پیش‌نمایش کاغذی + چاپ + ثبت پرداخت + مالیات ۱۰٪)، پرداخت پرسنل، حساب‌ها، تراکنش‌ها، گزارش سود و زیان
- **مرخصی** — گردش کار تایید/رد، مانده و تحلیل، تاریخچه
- **شبکه‌های اجتماعی** — ۶ اکانت متصل، جدول پست با متریک‌های کامل Insights، نمودارها، **گزارش‌ساز مشتری با پیش‌نمایش زنده**
- **تیم** — دیرکتوری + پروفایل ۷ تب (پروژه، تسک، مهارت، مرخصی، پرداخت، عملکرد)
- **اتصالات** — ۱۴ سرویس در ۷ دسته؛ کلید ماسک‌شده، OAuth، وب‌هوک، مصرف، لاگ API
- **نقش‌ها و دسترسی‌ها** — ماتریس RBAC تعاملی (۱۴ ماژول × ۷ سطح، ۹ نقش)
- **گزارش‌ها، مرکز اعلان‌ها، لاگ فعالیت‌ها، تنظیمات** (عمومی/اعضا/اعلان/ظاهر/امنیت/API)

## شورتکات‌ها

`⌘K / Ctrl+K` جستجوی سراسری · `⌘B` جمع‌کردن نوار کنار · `T` تسک جدید · `N` اعلان‌ها · `Esc` بستن

## نکات فنی

- **تقویم:** موتور اختصاصی هجری شمسی با داده‌های دقیق نوروز ۱۳۹۸–۱۴۱۰ (امروز: پنجشنبه ۵ شهریور ۱۴۰۵)
- **تم:** روشن به‌عنوان پیش‌فرض؛ تم تاریک از منوی کاربر در دسترس است
- **رنگ برند:** `#6F6AEB` برای دکمه‌ها، ناوبری فعال، لینک‌ها، فوکوس و نمودارها
- **فونت:** **IRANSansX** در وزن‌های ۴۰۰/۵۰۰/۶۰۰، با **Estedad** به‌عنوان fallback؛ هر دو داخل فایل خروجی تعبیه می‌شوند
- **Spacing:** مقیاس ۸px (۴/۸/۱۲/۱۶/۲۴/۳۲/۴۰/۴۸/۶۴) — همه padding/margin/gap نرمال‌سازی شده‌اند
- **مهار (Containment):** تست خودکار در ۴ بریک‌پوینت × ۴۵ مسیر، به‌همراه overlayها و drawerها
- **داده‌ها:** کاملاً واقع‌نما و سازگار درون‌ساختاری (مجموع فاکتور = اقلام − تخفیف + ۱۰٪ مالیات و…)
- **آزمون‌ها:** regressionهای build/امنیت/کامنت، smoke، leak، audit، containment، token و QA نسخه‌های ۲.۳ تا ۲.۶ در `.testenv/`

## نگهداشت و ساخت

سورس ماژولار در `src/` قرار دارد و با فرمان‌های زیر به فایل نهایی کامپایل و آزموده می‌شود:

```bash
npm ci --prefix .testenv
./build.sh
npm test --prefix .testenv
```

تست‌های مرورگری با `npm run test:browser --prefix .testenv` اجرا می‌شوند. اگر مرورگر در مسیر متداول سیستم نیست، مسیر آن را در `EFFECT_ERP_BROWSER_PATH` قرار دهید.

```
src/01-base.css        ← توکن‌های دیزاین‌سیستم (روشن پیش‌فرض، #6F6AEB، تایپ، فاصله، گاردهای مهار)
src/02-shell.css       ← پوسته: نوار کنار راست، تاپ‌بار، اورلی‌ها
src/03-modules.css     ← استایل ماژول‌ها + ریسپانسیو + پرینت
src/10-core.js         ← موتور تقویم شمسی و فرمت‌کننده‌ها
src/11-icons.js        ← آیکون‌ست SVG اختصاصی
src/13-data.js         ← داده‌های نمونه (جدا از منطق — آماده اتصال به API)
src/14-components.js   ← کامپوننت‌ها: جدول، نمودار، Drawer، Modal، DatePicker…
src/15..25-*.js        ← ماژول‌های محصول
```

### نگاشت به معماری آینده (Next.js + NestJS + PostgreSQL)

| پروتوتایپ | مقصد نهایی |
|---|---|
| آبجکت‌های `src/13-data.js` | Schema پستگرس + DTO های NestJS |
| تابع‌های `vw()` در `VIEWS` | صفحات/رoute های Next.js App Router |
| `src/14-components.js` | کتابخانه کامپوننت React + Tailwind |
| توکن‌های CSS در `01-base.css` | `tailwind.config` (theme.extend) |
| ماتریس `ROLES/PERM_CATS` | Guard های RBAC در NestJS |


---

## نسخه ۲.۳ — ارتقای قابلیت‌ها (Feature Update)

**اصل حاکم:** بدون بازطراحی — همان سیستم طراحی v2.2 (تم روشن پیش‌فرض، #5E01A4، Ravi، فاصله‌گذاری ۸px، RTL کامل، containment سخت‌گیرانه).

### فضای کاری پروژه مشتری (Customer Project Hub)
- مسیر: `#/cpro` (فهرست ۴ فضای فعال) و `#/cpro/cp1…cp4`؛ ورود از CRM/مشتریان نیز ممکن.
- ۸ تب: **نمای کلی / تسک‌ها / دارایی‌ها / برند / تقویم محتوا / گزارش‌ها / اعضا / تنظیمات**.
- نمای کلی: لوگوی رنگ برند + KPIها (تسک فعال/انجام‌شده/محتوای ماه/پیشرفت) + خلاصه چارچوب محتوا + خلاصه بریف.
- برد تسک اختصاصی ۵ ستونه (ایده‌ها/برای انجام/در حال انجام/در انتظار بررسی/انجام شده) با درگ‌انددراپ، برچسب‌ها و نوار پیشرفت چک‌لیست.
- **ساخت خودکار:** هنگام ثبت مشتری جدید با «پروژه اولیه»، فضای کاری + پروژه + برند پایه + پکیج دارایی اولیه به‌صورت خودکار ساخته و صفحه هاب باز می‌شود.

### دارایی‌ها و برند
- کتابخانه دارایی با ۱۰ پوشه استاندارد (برند/لوگو/فونت/عکس/ویدیو/قالب/راهنما/سند/قرارداد/سایر)، دراپ‌زون آپلود (کلیک + کشیدن)، پیش‌نمایش، دانلود، تغییر نام، انتقال، حذف و کپی لینک.
- Brand Kit ساختاریافته: نام برند/شرکت/شعار/توضیح/وب/اینستاگرام + پالت ۵ رنگ (Primary/Secondary/Background/Text/Accent) با HEX و color picker + فونت‌های برند + فایل راهنما.

### تقویم و چارچوب محتوا
- چارچوب ماهانه بر اساس نوع (پست/ریلز/استوری/تصویری/ویدیویی/تبلیغاتی/آموزشی/مناسبتی + انواع سفارشی) با هدف/انجام‌شده/باقی‌مانده و نوارهای پیشرفت.
- KPI ماه (هدف/تکمیل/باقی‌مانده/نرخ انتشار) + تقویم انتشار ۳۱ روزه با نشانگر روزهای دارای محتوا.

### تسک‌ها (v2.3)
- سوییچ محدوده در بالای تسک‌ها: **همه شرکت / فضای کاری فعال / پروژه‌های مشتریان / کارهای من**.
- برچسب‌های رنگی (۱۰ برچسب، ۹ رنگ) روی کارت‌ها، لیست و drawer؛ مدیریت برچسب (ساخت/ویرایش/حذف با شمارش استفاده) در تنظیمات → تب «برچسب‌ها».
- چک‌لیست کامل: افزودن/ویرایش/حذف/تغییر وضعیت/جابه‌جایی با پیشرفت «۴/۷» و نوار درصد.

### بانکی، مجوز و پروفایل
- اطلاعات بانکی کارمند (بانک/صاحب حساب/شماره حساب/کارت/شبا/توضیحات) به‌صورت **ماسک‌شده** (`6037 •••• •••• 1234`).
- مجوز RBAC «مشاهده اطلاعات بانکی پرسنل» (مدیر کل/مدیر سیستم/مالی)؛ نمایش کامل فقط با تاییدیه ثانویه؛ **لاگ حسابرسی** هر مشاهده/ویرایش.
- پروفایل کارمند با ۸ تب: شخصی/کاری/تسک‌ها/پروژه‌ها/مرخصی/پرداخت‌ها/اطلاعات بانکی/فعالیت‌ها + آپلود عکس پروفایل.

### مرخصی
- انتخاب‌گر «ارسال درخواست به»: فقط تاییدگرهای مجاز، جستجوپذیر، با عکس/نام/سمت/دپارتمان.
- مسیر تایید ۵ مرحله‌ای (ثبت → ارسال به تاییدگر → بررسی → تایید/رد → اعلام) در مودال و drawer.
- تایید با توضیح مدیر؛ رد با **دلیل الزامی**؛ جزئیات کامل درخواست در drawer.

### آیکونوگرافی و تایپوگرافی
- **صفر ایموجی** در کل محصول — همه‌جا SVG خطی (Lucide-style) با وزن stroke یکدست.
- وزن فونت سبک‌شده: بدنه ۴۰۰، لیبل/ناو ۴۰۰-۵۰۰، دکمه ۵۰۰، تیتر بخش ۵۰۰-۶۰۰، تیتر صفحه ۶۰۰ (وزن ۵۰۰ Ravi تعبیه شد).
- **صفر سایه** — سلسله‌مراتب فقط با پس‌زمینه/حاشیه ۱px/فاصله/تایپوگرافی.

### آواتارهای عکسی
- اسپرایت پرتره واقعی ۱۶ نفره (۴×۴) تزریق‌شده در build؛ اندازه‌های ۲۴-۸۰px، دایره‌ای، object-fit:cover، استک «+۲» با کلیک به پروفایل؛ fallback حروف اول برای نام‌های خارج از اسپرایت.

### تست‌ها (همه سبز)
`smoke` (۳۵ مسیر و تعامل) · `leak` (۴۱ نما) · `audit` (۳ viewport، صفر overflow، Ravi 400-800) · `containment` (۴ viewport × ۳۸ مسیر شامل تب‌های هاب + ۸ overlay) · `tokens` (#5E01A4/کارت سفید/Ravi) · `qa23` (۳۲ سناریوی قابلیت‌های جدید: هاب/دارایی/برند/برچسب/چک‌لیست/بانک/مجوز/مرخصی/صفر-ایموجی/صفر-سایه).

— ساخته‌شده به‌عنوان پروتوتایپ UI؛ بدون بک‌اند واقعی.

### تکمیلی ساختار نهایی (بخش ۱۸ و ۲۰)
- **پروفایل مشتری** با ۱۱ تب: نمای کلی / پروژه‌ها / مخاطبین / **دارایی‌ها** / **برند (Brand Kit)** / فاکتورها / پرداخت‌ها / شبکه‌های اجتماعی / گزارش‌ها / فعالیت‌ها / یادداشت‌ها.
- **مالی ← اطلاعات بانکی پرسنل**: جدول ماسک‌شده همه کارکنان (کارت `6037 •••• •••• 1234`، شبا `IR••…1234`) + لاگ حسابرسی؛ ورود بدون مجوز → صفحه «دسترسی محدود»؛ ارقام کامل فقط در پروفایل کارمند با تاییدیه ثانویه.
- **نمای کلی پروژه** با ۹ کارت خلاصه: تعداد تسک‌ها / انجام‌شده / در حال انجام / پیشرفت / محتوای تولیدشده / باقی‌مانده / پست ماه / ریلز ماه / استوری ماه.
- **انتخابگر ماه** در تقویم محتوا (۴ ماه اخیر) با به‌روزرسانی KPI و تقویم انتشار.
- **کلیک روی آواتار → پروفایل** همکار (capture-phase؛ تداخلی با اکشن کارت‌ها/سطرها ندارد).
- **جزئیات مرخصی**: «تاریخ درخواست» و «وضعیت» به فیلدهای drawer اضافه شد؛ پیام ارسال مطابق الگو: «درخواست مرخصی شما برای … ارسال شد. وضعیت: در انتظار بررسی».

**تست تکمیلی:** containment اکنون ۴ viewport × ۴۳ مسیر؛ qa23 با ۵۳ سناریو (شامل KPIهای ۹گانه، انتخابگر ماه، تب‌های مشتری، گیت مجوز مالی، ناوبری آواتار و عدم تداخل با drawer).


---

## نسخه ۲.۴ — هویت بصری جدید + گزارش‌ساز دستی

**اصل حاکم:** بدون بازطراحی — همان معماری، ناوبری، RTL، تم روشن و فاصله‌گذاری ۸px.

### هویت بصری
- **رنگ اصلی جدید: #6F6AEB** در کل محصول (دکمه‌ها/ناو فعال/تب‌ها/لینک/فوکوس/پیشرفت/چارت) با variations هم‌خانواده (hover #7D78EF، تیره #5853E0، بنفش روشن dark-mode #8B86F2)؛ صفر ردپای #5E01A4 (تست خودکار).
- **فونت IRANSansX** (دانلود از Drive مرجع → subset سه وزن 400/500/600 با پوشش کامل فارسی) در کل رابط؛ Ravi حذف شد.
- **نمودارهای میله‌ای شفاف:** همه bar chartها rgba(111,106,235,.35) + hover تا .75 + selected .92 (SVG و CSS) — سبک، داده‌محور، بدون گرادیان.

### لاگین دو ستونه
- **راست: تصویر full-bleed** (100% عرض/ارتفاع ستون، object-fit:cover، تینت #6F6AEB، بدون کارت/حاشیه).
- **چپ: باکس ورود** عمودی‌مرکز: لوگو → «به Effect ERP خوش آمدید» → ورود موبایل → OTP شش‌رقمی → «ویرایش شماره موبایل».
- ارتفاع لاگین دقیقاً ۱۰۰vh (بدون اسکرول صفحه) در همه سایزهای دسکتاپ؛ کارت با `margin:auto` مرکز است و در نمای کوتاه، فقط ستون فرم اسکرول می‌شود.
- موبایل (≤900px): تصویر مخفی، فرم تمام‌عرض.

### سایدبار
- رفع باگ جمع‌شدن: دکمه باز کردن همیشه نمایان (در حالت mini هم نمایش داده می‌شود، با بوردر/هاور/تولتیپ/aria-label و آیکون chevron با جهت صحیح RTL).

### گزارش‌ساز مشتری v2 (بدون نیاز به اکانت متصل)
- فلو ۹ مرحله‌ای: مشتری → بازه → شبکه → منبع داده → محتوا → شاخص‌ها → طراحی → پیش‌نمایش → خروجی.
- **منبع داده:** «دریافت خودکار از API» یا «ثبت دستی اطلاعات» — برای مشتری بدون اکانت، API غیرفعال و ثبت دستی کاملاً کار می‌کند.
- **ثبت دستی:** افزودن/ویرایش/حذف/مشاهده پست با نوع محتوا (پست/ریلز/کاروسل/استوری)، تمام متریک‌ها (Reach/Impressions/Likes/Comments/Saves/Shares/Profile Visits/Website Clicks/Followers + Video Views/Watch Time/Avg Watch برای ریلز) و **محاسبه خودکار ER**.
- **تحلیل کامل:** جمع ریچ/ایمپرشن/لایک/کامنت/ذخیره/اشتراک‌گذاری، میانگین ER و ریچ و تعامل هر پست، برترین/ضعیف‌ترین پست، نمودار ریچ به تفکیک پست، **مقایسه نوع محتوا (میانگین ریچ)** و **نرخ تعامل به تفکیک نوع** (هر دو با میله‌های شفاف)؛ جدول با فیلتر/مرتب‌سازی و انتخاب پست برای گزارش.
- **گزارش نهایی:** داده دستی دقیقاً مثل API (بدون تمایز بصری سمت مشتری)؛ نشان «دستی» فقط داخلی؛ ذخیره قالب قابل استفاده مجدد.

### تست‌ها (همه سبز)
smoke (شامل فلو ورود دو ستونه) · leak · audit · containment (۴vp×۴۳ مسیر) · tokens (#6F6AEB/IRANSansX) · qa23 · **qa24**: ۲۴ سناریو (لاگین دو ستونه + موبایل، دکمه expand، رنگ، فونت، شفافیت چارت، گزارش دستی e2e، صفر ایموجی/سایه).

— پروتوتایپ UI؛ بدون بک‌اند واقعی.
