# طراحی فاز اول Effect ERP: زیرساخت و هویت

تاریخ: ۱۴۰۵/۰۶/۰۶ (۲۰۲۶-۰۸-۲۸)

## ۱. هدف و محدوده

هدف این فاز تبدیل پروتوتایپ تک‌فایلی Effect ERP به نخستین برش عمودی یک محصول واقعی است. خروجی باید یک monorepo ماژولار و قابل اجرا با Docker باشد که ورود OTP، کاربران، نقش‌ها، دسترسی‌ها، نشست‌ها و لاگ حسابرسی را به‌صورت end-to-end پیاده‌سازی کند.

این محصول برای یک شرکت ساخته می‌شود و در این فاز multi-tenancy ندارد. داده‌ها به‌وسیله فضای کاری، پروژه و مجوزها تفکیک خواهند شد؛ بنابراین هیچ `tenantId` عمومی به مدل‌ها افزوده نمی‌شود.

پروتوتایپ موجود (`effect-erp.html` و `src/`) تا پایان مهاجرت به‌عنوان مرجع ظاهر و رفتار حفظ می‌شود. این فاز فقط صفحات ورود، مدیریت کاربران، نقش‌ها و نشست‌ها را در Next.js بازسازی می‌کند و سایر ماژول‌های نمونه را تغییر نمی‌دهد.

## ۲. تصمیم‌های معماری

- مدیریت workspace و اجرای taskها: `pnpm workspace` و Turborepo
- فرانت‌اند: React، Next.js و TypeScript
- API: NestJS و TypeScript
- ORM: TypeORM با PostgreSQL
- API عمومی: REST نسخه‌بندی‌شده زیر `/api/v1`
- قرارداد و validation: schemaهای مشترک Zod و OpenAPI تولیدشده از همان schemaها
- اجرا: Docker Compose با سه سرویس `web`، `api` و `postgres`
- مدل استقرار: یک Next.js، یک NestJS و یک PostgreSQL؛ بدون microservice
- ارائه‌دهنده پیامک: قرارداد قابل‌تعویض با `ConsoleSmsProvider` در توسعه و آداپتور واقعی در production
- ثبت‌نام: فقط دعوت/ایجاد کاربر توسط مدیر؛ بدون ثبت‌نام عمومی

Redis در فاز اول اضافه نمی‌شود. OTP، محدودیت تلاش و نشست‌ها در PostgreSQL ذخیره می‌شوند. اگر اندازه بار یا اجرای چند replica این تصمیم را ناکافی کرد، ذخیره rate-limit و challenge می‌تواند بعداً بدون تغییر قرارداد API به Redis منتقل شود.

## ۳. ساختار monorepo

```text
apps/
  web/                         # Next.js و composition فرانت‌اند
  api/                         # NestJS و composition بک‌اند

packages/
  platform/
    config/                    # خواندن و اعتبارسنجی تنظیمات
    database/                  # DataSource و migrationهای TypeORM
    logger/                    # لاگ JSON و request correlation
    testing/                   # fixture و ابزارهای تست مشترک

  features/
    auth/                      # OTP، token و session
    users/                     # کاربر و پروفایل
    access-control/            # role، permission، guard و override

  shared/
    contracts/                 # قراردادهای عمومی و error envelope
    ui/                        # اجزای UI مشترک
    eslint-config/
    typescript-config/
```

هر feature یک workspace package مستقل است و ورودی‌های جدا برای runtimeها دارد:

```text
packages/features/auth/
  src/
    server/                    # Nest module/controller/service
    web/                       # React UI، hook و client
    contracts/                 # request/response schema
    entities/                  # TypeORM entityها
  package.json
```

هر پکیج با subpath exports فقط بخش موردنیاز مصرف‌کننده را منتشر می‌کند:

```json
{
  "exports": {
    "./server": "./src/server/index.ts",
    "./web": "./src/web/index.ts",
    "./contracts": "./src/contracts/index.ts"
  }
}
```

کد `server` هرگز از entry point بخش `web` export نمی‌شود؛ بنابراین NestJS، TypeORM و secretها وارد bundle مرورگر نمی‌شوند.

## ۴. مرز پکیج‌ها و وابستگی‌ها

### auth

مالک challengeهای OTP، صدور و چرخش token، نشست‌ها، logout و قرارداد `SmsProvider` است. این پکیج برای پیدا کردن کاربر فعال فقط از facade عمومی پکیج users استفاده می‌کند و به repository داخلی users دسترسی ندارد.

### users

مالک موجودیت کاربر، ایجاد و ویرایش پروفایل، فعال/تعلیق کردن و قوانین شماره موبایل است. این پکیج به auth وابسته نیست.

### access-control

مالک نقش، مجوز، انتساب نقش، override اختصاصی، guard و decoratorهای مجوز است. شناسه کاربر را مصرف می‌کند اما جزئیات احراز هویت را نمی‌شناسد.

### database

مالک DataSource، تنظیم اتصال و ترتیب migrationها است. Entity متعلق به feature باقی می‌ماند، ولی همه تغییرات schema با migration مرکزی، versioned و قابل بازبینی اعمال می‌شوند.

### composition root

فقط `apps/api` feature moduleها را کنار هم قرار می‌دهد. هیچ feature برای فراخوانی feature دیگر مستقیماً به implementation داخلی آن import نمی‌کند؛ ارتباط از facade و contract عمومی انجام می‌شود.

## ۵. مدل داده

همه شناسه‌ها UUID و همه زمان‌ها `timestamptz` هستند. شماره موبایل پیش از ذخیره به ارقام لاتین و قالب استاندارد ایران نرمال می‌شود.

### User

| فیلد | توضیح |
|---|---|
| `id` | کلید اصلی UUID |
| `phone` | یکتا و نرمال‌شده |
| `firstName`, `lastName` | نام نمایشی |
| `status` | `ACTIVE` یا `SUSPENDED` |
| `lastLoginAt` | آخرین ورود موفق |
| `createdAt`, `updatedAt` | زمان‌های سیستمی |

### Role و Permission

`Role` شامل `name`، `slug` یکتا و `isSystem` است. `Permission` شامل `resource`، `action` و کلید یکتای `<resource>:<action>` است. جداول واسط `user_roles` و `role_permissions` رابطه‌های چندبه‌چند را نگهداری می‌کنند.

`user_permission_overrides` یک مجوز را برای یک کاربر با `ALLOW` یا `DENY` تغییر می‌دهد. روی ترکیب `(userId, permissionId)` محدودیت یکتا وجود دارد.

### OtpChallenge

شامل شماره موبایل، hash کد، تعداد تلاش، زمان انقضا، زمان مصرف، IP درخواست و زمان ایجاد است. challenge پس از موفقیت فقط یک بار و درون transaction مصرف می‌شود.

### Session و RefreshToken

`Session` خانواده یک نشست روی یک دستگاه است و شامل کاربر، user agent، IP، زمان انقضا، زمان ابطال و آخرین استفاده است. `RefreshToken` شامل `sessionId`، hash توکن، زمان انقضا، زمان مصرف، زمان ابطال و شناسه توکن جایگزین است. نگهداری رکورد tokenهای چرخانده‌شده امکان تشخیص استفاده مجدد را فراهم می‌کند. token خام ذخیره نمی‌شود.

### AuditLog

شامل actor اختیاری، action، نوع و شناسه موجودیت، metadata از نوع `jsonb`، IP، request ID و زمان ثبت است. actor برای رخداد سیستمی یا تلاش ورود ناشناس می‌تواند null باشد. این جدول append-only است و API عمومی برای ویرایش یا حذف رکورد ندارد.

## ۶. جریان OTP و نشست

### درخواست کد

1. `POST /api/v1/auth/otp/request` شماره را دریافت و نرمال می‌کند.
2. محدودیت شماره و IP، فاصله ارسال مجدد و تعداد درخواست بررسی می‌شود.
3. پاسخ HTTP برای شماره موجود، ناموجود یا تعلیق‌شده از نظر شکل یکسان است تا وضعیت عضویت افشا نشود.
4. فقط برای کاربر فعال challenge ایجاد و پیام ارسال می‌شود.
5. کد خام ثبت نمی‌شود؛ hash با secret سمت سرور، challenge ID و کد محاسبه می‌شود.

### بررسی کد

1. `POST /api/v1/auth/otp/verify` challenge و کد را دریافت می‌کند.
2. رکورد challenge در transaction قفل می‌شود تا دوبار مصرف نشود.
3. انقضا، مصرف قبلی و سقف پنج تلاش بررسی می‌شود.
4. با موفقیت، challenge مصرف، `lastLoginAt` به‌روزرسانی و Session ایجاد می‌شود.
5. Access Token از نوع JWT با عمر پیش‌فرض ۱۵ دقیقه و Refresh Token تصادفی با عمر پیش‌فرض ۳۰ روز صادر می‌شوند؛ هر دو در cookieهای `Secure` و `HttpOnly` قرار می‌گیرند.

زمان اعتبار OTP دو دقیقه و فاصله ارسال مجدد ۶۰ ثانیه است. مقدارها configurable هستند اما production نباید تنظیم ناامن را بپذیرد.

### refresh و reuse detection

هر refresh token فقط یک بار قابل استفاده است. refresh موفق در یک transaction رکورد قبلی را مصرف‌شده علامت می‌زند، token جدیدی برای همان Session ایجاد می‌کند و رابطه جایگزینی را ثبت می‌کند. مشاهده دوباره token مصرف‌شده، Session مربوط و همه tokenهای آن را باطل و رویداد امنیتی audit می‌کند.

`logout` فقط نشست جاری و `logout-all` تمام نشست‌های فعال کاربر را باطل می‌کند. مدیر دارای مجوز می‌تواند نشست مشخص یک کاربر را باطل کند.

### محافظت مرورگر

Next.js مسیر `/api` را در همان origin به NestJS هدایت می‌کند تا cookieها به subdomain جدا وابسته نباشند. درخواست‌های تغییردهنده علاوه بر cookie احراز هویت به CSRF token و Origin مجاز نیاز دارند. CORS فقط originهای تنظیم‌شده را می‌پذیرد. cookieهای production دارای `Secure`، `HttpOnly` و `SameSite=Lax` هستند.

## ۷. RBAC

مجوزها با کلید ثابت مانند موارد زیر تعریف می‌شوند:

```text
users:read
users:create
users:update
users:suspend
roles:manage
sessions:revoke
audit:read
```

ترتیب تصمیم‌گیری مجوز:

1. کاربر غیرفعال: رد
2. override از نوع `DENY`: رد
3. override از نوع `ALLOW`: قبول
4. مجوز یکی از نقش‌ها: قبول
5. در غیر این صورت: رد

نقش سیستمی `super-admin` حذف‌پذیر نیست و سیستم اجازه حذف آخرین کاربر فعال دارای این نقش را نمی‌دهد. تغییر نقش، permission، override، وضعیت کاربر و ابطال نشست audit می‌شود.

seed اولیه catalog مجوزها، نقش `super-admin` و اولین مدیر را با شماره‌ای که از secret محیط خوانده می‌شود ایجاد می‌کند. seed تکرارپذیر و idempotent است.

## ۸. قرارداد API

```text
GET    /api/v1/health/live
GET    /api/v1/health/ready

POST   /api/v1/auth/otp/request
POST   /api/v1/auth/otp/verify
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
GET    /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:id

GET    /api/v1/me

GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
POST   /api/v1/users/:id/suspend
POST   /api/v1/users/:id/activate

GET    /api/v1/roles
POST   /api/v1/roles
PATCH  /api/v1/roles/:id
GET    /api/v1/permissions
PUT    /api/v1/users/:id/roles
PUT    /api/v1/users/:id/permission-overrides

GET    /api/v1/audit-logs
```

تمام endpointهای فهرست pagination و ترتیب پایدار دارند. قراردادهای request/response به‌صورت schemaهای Zod در بخش `contracts` هر feature تعریف می‌شوند؛ NestJS با validation pipe داخلی همان schemaها را در runtime بررسی می‌کند و Next.js نوع‌ها را با `z.infer` مصرف می‌کند. سند OpenAPI از همین schemaها در build تولید و ناسازگاری قرارداد در CI بررسی می‌شود.

خطاها status code صحیح HTTP و envelope ثابت دارند:

```json
{
  "error": {
    "code": "OTP_EXPIRED",
    "message": "کد تأیید منقضی شده است.",
    "fields": {},
    "requestId": "req_..."
  }
}
```

کلاینت بر اساس `code` تصمیم می‌گیرد و به متن فارسی وابسته نیست.

## ۹. رابط Next.js

صفحات فاز اول:

- ورود شماره موبایل و OTP با ظاهر نسخه ۲.۶
- مدیریت کاربران و وضعیت فعال/تعلیق
- نقش‌ها، مجوزها و override کاربر
- نشست‌های کاربر و «خروج از همه دستگاه‌ها»
- نمایش read-only لاگ حسابرسی برای کاربران مجاز

داده سمت سرور از API خوانده می‌شود و state سرور در store عمومی UI کپی نمی‌شود. loading، empty، validation error، permission denied و retry برای تمام صفحه‌ها تعریف می‌شود. UI فعلی از نظر RTL، فونت، رنگ و رفتار مرجع است، ولی کد تک‌فایلی مستقیماً داخل React کپی نمی‌شود.

## ۱۰. Docker و تنظیمات

`compose.yml` توسعه شامل سه سرویس است:

- `postgres`: volume پایدار و health check
- `api`: وابسته به آماده‌شدن PostgreSQL و دارای health check
- `web`: متصل به API از طریق شبکه داخلی Compose و ارائه `/api` به‌صورت same-origin

برای web و api Dockerfile چندمرحله‌ای ساخته می‌شود. image تولیدی فقط artifactها و dependencyهای production را نگه می‌دارد. secretها از environment یا secret manager وارد می‌شوند و در image، repository یا log نوشته نمی‌شوند.

در production:

- `synchronize` همیشه `false` است.
- migration با job/command جداگانه پیش از جایگزینی API اجرا می‌شود.
- `ConsoleSmsProvider` مجاز نیست و API در صورت انتخاب آن fail-fast می‌شود.
- endpointهای readiness اتصال دیتابیس و liveness حیات process را جداگانه گزارش می‌کنند.

تست‌ها از `FakeSmsProvider` قابل کنترل استفاده می‌کنند و برای دریافت OTP به خواندن log وابسته نیستند.

## ۱۱. لاگ و مشاهده‌پذیری

هر درخواست یک `requestId` دارد و لاگ‌ها JSON هستند. شماره موبایل، OTP، access token، refresh token، cookie و secret هیچ‌گاه کامل log نمی‌شوند. رویدادهای ورود موفق/ناموفق، rate limit، token reuse، تغییر مجوز و ابطال نشست با سطح و metadata مناسب ثبت می‌شوند.

Audit log محصول از log عملیاتی جداست: اولی برای پاسخ‌گویی مدیریتی و امنیتی در PostgreSQL است؛ دومی برای پایش process و عیب‌یابی به stdout نوشته می‌شود.

## ۱۲. راهبرد تست

### Unit

- نرمال‌سازی شماره موبایل
- hash و انقضای OTP
- محدودیت تلاش و ارسال مجدد
- چرخش token و reuse detection
- ترتیب تصمیم‌گیری RBAC
- قوانین فعال/تعلیق و محافظت آخرین super-admin

### Integration

- repositoryها و constraintها با PostgreSQL واقعی
- transaction مصرف challenge
- migration از دیتابیس خالی تا آخرین نسخه
- رابطه‌های user/role/permission و override

### API E2E

- request، verify، refresh، logout و logout-all
- کد نادرست، منقضی، مصرف‌شده و replay
- rate limit شماره و IP
- نشست باطل‌شده
- CSRF و Origin نامعتبر
- حالت‌های allow و deny مجوز

### Frontend

- فرم شماره و OTP
- خطاهای validation و API
- فهرست و ویرایش کاربران
- نقش‌ها و overrideها
- مشاهده و ابطال نشست‌ها

خط CI به ترتیب `lint`، `typecheck`، `unit`، `integration`، `e2e` و `build` اجرا می‌شود. شکست هر مرحله جلوی build نهایی را می‌گیرد.

## ۱۳. مدیریت خطا و پایداری

- خطاهای دامنه به error code ثابت و status code مناسب نگاشت می‌شوند.
- خطای ناشناخته با پیام عمومی به کلاینت و stack فقط در log امن ثبت می‌شود.
- عملیات چندجدولی مانند verify، تغییر نقش و token rotation transaction دارند.
- unique constraint و optimistic checks مانع challenge یا انتساب تکراری می‌شوند.
- retry خودکار فقط برای عملیات idempotent و خطاهای موقت زیرساختی انجام می‌شود.
- ارسال پیامک پس از ثبت challenge انجام می‌شود؛ شکست ارسال وضعیت challenge را نامعتبر و خطای قابل رهگیری ایجاد می‌کند.

## ۱۴. معیار پذیرش فاز اول

فاز اول زمانی تمام است که:

1. کل سیستم توسعه با یک فرمان Docker Compose اجرا شود.
2. migrationها روی PostgreSQL خالی بدون دخالت دستی اجرا شوند.
3. مدیر اولیه با seed امن ساخته شود.
4. ورود OTP با provider توسعه end-to-end کار کند.
5. کاربر، نقش، permission، override و نشست از UI مدیریت شوند.
6. refresh rotation، replay detection، CSRF و تعلیق کاربر با تست پوشش داده شوند.
7. تمام عملیات حساس audit شوند.
8. OpenAPI قابل تولید و قرارداد frontend/backend سازگار باشد.
9. lint، typecheck، unit، integration، e2e و build سبز باشند.
10. ظاهر صفحات جدید با جهت RTL و هویت بصری پروتوتایپ نسخه ۲.۶ هماهنگ باشد.

## ۱۵. خارج از محدوده

- multi-tenancy
- CRM، مالی، مرخصی، پیام‌رسان، تسک و گزارش‌های واقعی
- اتصال به ارائه‌دهنده پیامک production
- microservice، message broker، Redis یا Kubernetes
- انتقال داده‌های نمایشی پروتوتایپ به دیتابیس production
- اپلیکیشن موبایل

هر یک از ماژول‌های خارج از محدوده پس از این فاز، design و package مستقل خود را خواهد داشت.
