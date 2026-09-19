# طراحی انتشار عملیاتی اولیه Effect ERP

تاریخ: ۱۴۰۵/۰۶/۲۸ (2026-09-19)

وضعیت: طراحی گفت‌وگویی تأیید شده؛ در انتظار بازبینی سند

شاخهٔ تحویل: `codex/foundation-identity`

## ۱. هدف

این انتشار باید پس از ورود کاربر، یک ERP روزمره و قابل‌استفاده ارائه کند. پوستهٔ اصلی، داشبورد، مشتریان، فضاهای کاری، پروژه‌ها، تسک‌ها، فایل‌ها و اعلان‌های سیستمی به API واقعی NestJS و PostgreSQL متصل می‌شوند. ظاهر و تعامل‌های موفق prototype حفظ می‌شوند، اما هیچ صفحهٔ عملیاتی با آرایه‌های درون‌حافظه‌ای یا دادهٔ نمایشی اجباری کار نمی‌کند.

خروجی انتشار به‌ترتیب زیر تحویل می‌شود:

1. پوستهٔ اصلی و داشبورد متصل؛
2. مشتری، مخاطب، فضای کاری و پروژه؛
3. تسک، کارهای من، لیست، کانبان، چک‌لیست و کامنت؛
4. فایل و اعلان سیستمی؛
5. پذیرش یکپارچه و انتشار اولیه.

هر خروجی migration، API، UI، RBAC، audit، تست، مستندات، commit و push مستقل دارد.

## ۲. محدوده و موارد خارج از محدوده

### در محدوده

- یک شرکت و یک پایگاه داده؛
- رابط فارسی، RTL و responsive؛
- CRUD و آرشیو مشتری، مخاطب، فضای کاری و پروژه؛
- عضویت کاربران در فضای کاری و پروژه؛
- تسک چندمسئولی با وضعیت، اولویت، سررسید، ترتیب کانبان، چک‌لیست و کامنت؛
- فایل‌های پروژه، تسک و کامنت با ذخیره‌سازی S3-compatible؛
- اعلان‌های درون‌محصولی و وضعیت خوانده‌شده؛
- داشبورد تجمیعی مبتنی بر دادهٔ واقعی؛
- seed نمونه فقط در محیط توسعه یا دمو.

### خارج از محدوده

- چندشرکتی یا multi-tenant؛
- چت و پیام‌رسان؛
- ایمیل، پیامک و push notification؛
- مالی، تقویم جامع، جلسات، مرخصی، CRM پیشرفته، برند، محتوا و webhook؛
- ویرایش یا حذف کامنت در انتشار اول؛
- نسخه‌بندی فایل و ویرایش هم‌زمان متن؛
- نمایش اعداد مالی ساختگی در داشبورد.

## ۳. معماری

محصول یک modular monolith باقی می‌ماند:

```text
Next.js page/component
        ↓ HTTPS/JSON
NestJS controller + guard + Zod validation
        ↓
domain service in feature package
        ↓
TypeORM transaction
        ↓
PostgreSQL
```

پکیج‌های دامنه:

- `packages/features/customers`
- `packages/features/workspaces`
- `packages/features/projects`
- `packages/features/tasks`
- `packages/features/files`
- `packages/features/notifications`

هر پکیج فقط از مسیرهای public پکیج‌های دیگر استفاده می‌کند و entry pointهای `contracts`، `server` و `web` دارد. کد مرورگر نباید NestJS یا TypeORM را import کند. اعتبارسنجی شناسه‌های دامنهٔ دیگر از طریق interfaceهای تزریق‌شده انجام می‌شود؛ import مستقیم فایل خصوصی یا repository دامنهٔ دیگر مجاز نیست.

داشبورد state مستقل ندارد. query آن در composition layer برنامه، خروجی queryهای عمومی دامنه‌ها را تجمیع می‌کند. audit موجود برای mutationها استفاده می‌شود و اعلان درون همان transaction تغییر دامنه نوشته می‌شود تا تغییر موفق بدون اعلان متناظر باقی نماند.

## ۴. مدل داده

همهٔ شناسه‌ها UUID، همهٔ زمان‌ها `timestamptz` و همهٔ جدول‌های mutable دارای `created_at`، `updated_at` و `version` برای optimistic concurrency هستند. رشته‌های کاربر پیش از ذخیره trim می‌شوند. عنوان‌های خالی پذیرفته نمی‌شوند.

### مشتری و مخاطب

`customers`:

- `id`
- `name`؛ نام نمایشی، اجباری، حداکثر 160 نویسه
- `legal_name`؛ اختیاری، حداکثر 200 نویسه
- `status`؛ `ACTIVE | INACTIVE | ARCHIVED`
- `owner_user_id`؛ کاربر مسئول داخلی
- `phone` و `email`؛ اختیاری
- `notes`؛ اختیاری، حداکثر 4000 نویسه
- `archived_at`؛ اختیاری

`customer_contacts`:

- `id`, `customer_id`
- `first_name`, `last_name`
- `job_title`, `phone`, `email`
- `is_primary`

در هر مشتری حداکثر یک مخاطب اصلی با index شرطی تضمین می‌شود. مشتری دارای فضای کاری یا پروژه حذف سخت نمی‌شود و فقط آرشیو خواهد شد.

### فضای کاری و پروژه

`workspaces`:

- `id`, `customer_id`
- `name`
- `status`؛ `ACTIVE | ARCHIVED`
- `archived_at`

`workspace_members`:

- `workspace_id`, `user_id`
- `role`؛ `MANAGER | MEMBER | VIEWER`

`projects`:

- `id`, `workspace_id`
- `name`, `description`
- `status`؛ `PLANNED | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED`
- `start_date`, `due_date`
- `archived_at`

`project_members`:

- `project_id`, `user_id`
- `role`؛ `MANAGER | MEMBER | VIEWER`

تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد. آرشیو فضای کاری، پروژه‌ها را حذف یا آرشیو خودکار نمی‌کند و تا وجود پروژهٔ غیرآرشیوی مسدود می‌شود.

### تسک

`tasks`:

- `id`, `project_id`
- `title`, `description`
- `status`؛ `BACKLOG | TODO | IN_PROGRESS | REVIEW | DONE`
- `priority`؛ `LOW | MEDIUM | HIGH | URGENT`
- `due_date`
- `board_order`؛ عدد اعشاری برای مرتب‌سازی پایدار کارت‌ها
- `created_by_user_id`
- `completed_at`, `archived_at`

`task_assignees`:

- `task_id`, `user_id`

`task_checklist_items`:

- `id`, `task_id`
- `title`, `is_completed`, `item_order`
- `completed_at`, `completed_by_user_id`

`task_comments`:

- `id`, `task_id`, `author_user_id`
- `body`, `created_at`

هر تسک می‌تواند چند مسئول داشته باشد. کامنت در این انتشار append-only است. تغییر وضعیت به `DONE` زمان تکمیل را ثبت می‌کند و خروج از `DONE` آن را پاک می‌کند. جابه‌جایی کانبان با `version` از overwrite هم‌زمان جلوگیری می‌کند.

`DELETE /tasks/:id` در این انتشار حذف سخت انجام نمی‌دهد و فقط `archived_at` را ثبت می‌کند. تسک آرشیوشده در لیست‌ها و داشبورد عادی نمایش داده نمی‌شود، اما audit و روابط تاریخی آن باقی می‌مانند.

### فایل

`files`:

- `id`
- `storage_key`؛ یکتا و غیرقابل حدس
- `original_name`, `content_type`, `size_bytes`, `sha256`
- `uploaded_by_user_id`, `created_at`
- `deleted_at`

`file_links`:

- `id`, `file_id`
- دقیقاً یکی از `project_id`, `task_id`, `comment_id`

باینری داخل PostgreSQL ذخیره نمی‌شود. MinIO در Compose توسعه استفاده می‌شود و production از endpoint سازگار با S3 بهره می‌گیرد. upload دو مرحله‌ای است: API مجوز و URL امضاشده می‌دهد، کلاینت upload می‌کند و سپس API با `storage_key`، اندازه و checksum ثبت نهایی را انجام می‌دهد. فایل ثبت‌نشده با cleanup دوره‌ای حذف می‌شود. حداکثر اندازهٔ اولیه 25 MiB است و allowlist نوع فایل در config تعریف می‌شود.

### اعلان

`notifications`:

- `id`, `recipient_user_id`
- `type`؛ `TASK_ASSIGNED | TASK_STATUS_CHANGED | TASK_COMMENTED | CHECKLIST_COMPLETED | PROJECT_UPDATED | FILE_ATTACHED`
- `title`, `body`
- `entity_type`, `entity_id`
- `read_at`, `created_at`

اعلان فقط برای دریافت‌کننده قابل خواندن یا تغییر است. اعلان به معنی پیام‌رسان نیست و reply، thread یا ارسال دلخواه ندارد.

## ۵. API

همهٔ endpointها زیر `/api/v1`، با cookie session فعلی، CSRF برای mutation و Origin check فعلی اجرا می‌شوند.

### مشتری، فضای کاری و پروژه

```text
GET    /customers
POST   /customers
GET    /customers/:id
PATCH  /customers/:id
POST   /customers/:id/archive
GET    /customers/:id/contacts
POST   /customers/:id/contacts
PATCH  /customers/:id/contacts/:contactId
DELETE /customers/:id/contacts/:contactId

GET    /workspaces
POST   /workspaces
GET    /workspaces/:id
PATCH  /workspaces/:id
POST   /workspaces/:id/archive
PUT    /workspaces/:id/members

GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
POST   /projects/:id/archive
PUT    /projects/:id/members
```

### تسک

```text
GET    /tasks
POST   /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
PUT    /tasks/:id/assignees
POST   /tasks/:id/move
GET    /tasks/:id/checklist
POST   /tasks/:id/checklist
PATCH  /tasks/:id/checklist/:itemId
DELETE /tasks/:id/checklist/:itemId
GET    /tasks/:id/comments
POST   /tasks/:id/comments
```

### فایل، اعلان و داشبورد

```text
POST   /files/uploads
POST   /files/complete
GET    /files/:id/download
DELETE /files/:id
GET    /files/recent

GET    /notifications
POST   /notifications/:id/read
POST   /notifications/read-all

GET    /dashboard/summary
```

لیست‌ها از قرارداد مشترک زیر استفاده می‌کنند:

- `page` از 1؛
- `pageSize` پیش‌فرض 25 و حداکثر 100؛
- `search` حداکثر 120 نویسه؛
- sort فقط از allowlist هر endpoint؛
- فیلترها با enum یا UUID معتبر؛
- پاسخ شامل `items`, `page`, `pageSize`, `total` است.

mutationهای موجودیت mutable باید `version` مورد انتظار را ارسال کنند. اختلاف نسخه پاسخ `409 CONCURRENT_UPDATE` می‌دهد. شناسهٔ ناشناخته `404`، ورودی نامعتبر `400`، نبود session برابر `401` و نبود permission برابر `403` است.

## ۶. دسترسی و audit

کلیدهای permission:

```text
customers:read
customers:manage
workspaces:read
workspaces:manage
projects:read
projects:manage
tasks:read
tasks:create
tasks:edit
tasks:delete
tasks:comment
files:read
files:upload
files:delete
```

اعلان‌ها permission عمومی ندارند؛ هر کاربر فقط اعلان خود را می‌بیند. دسترسی به موجودیت‌های کاری علاوه بر permission، عضویت فضای کاری یا پروژه را بررسی می‌کند؛ system administrator از محدودیت عضویت مستثناست.

ایجاد، ویرایش، آرشیو، تغییر اعضا، جابه‌جایی تسک، تغییر مسئول، تغییر چک‌لیست، افزودن کامنت، ثبت یا حذف فایل audit می‌شود. متن کامل کامنت و محتوای فایل وارد audit metadata نمی‌شود؛ فقط شناسه‌ها و فیلدهای غیرحساس تغییر‌یافته ثبت می‌شوند.

## ۷. رابط کاربری

پوستهٔ Next.js جای مسیر عملیاتی prototype را می‌گیرد:

- سایدبار سمت راست، topbar، جست‌وجوی سریع، اعلان و منوی کاربر؛
- IRANSansX، زبان فارسی، RTL و رنگ اصلی `#6F6AEB`؛
- زمینهٔ روشن، کارت سفید، border ظریف، بدون gradient و shadow تزئینی؛
- focus قابل مشاهده، navigation صفحه‌کلید و reduced-motion؛
- در موبایل، سایدبار drawer و عملیات اصلی در دسترس باقی می‌ماند.

صفحات:

- `/dashboard`: پروژه‌های فعال، تسک‌های امروز، عقب‌افتاده‌ها، مشتریان فعال و اعلان‌های نیازمند اقدام؛
- `/customers`: جست‌وجو، فیلتر، pagination و drawer ایجاد/ویرایش؛
- `/customers/:id`: نمای کلی، مخاطبان، فضاهای کاری و پروژه‌ها؛
- `/workspaces/:id`: نمای کلی، اعضا و پروژه‌ها؛
- `/projects/:id`: خلاصه، اعضا، تسک‌ها و فایل‌ها؛
- `/tasks`: کانبان و لیست؛
- `/my-tasks`: تسک‌های کاربر جاری؛
- `/files`: فایل‌های اخیر؛
- `/notifications`: همهٔ اعلان‌های کاربر.

ایجاد و ویرایش موجودیت‌ها در drawer انجام می‌شود. skeleton برای loading، empty state همراه اقدام بعدی و error state با retry استفاده می‌شود. drag کانبان ابتدا در UI اعمال می‌شود؛ در خطای API به جای قبلی بازمی‌گردد و پیام قابل‌اقدام نشان داده می‌شود.

## ۸. دادهٔ توسعه و production

seed پایهٔ امنیتی موجود همیشه system administrator و permissionهای لازم را idempotent نگه می‌دارد. seed دادهٔ عملیاتی با متغیر صریح `SEED_DEMO_DATA=true` فعال می‌شود و شامل مشتری، مخاطب، فضای کاری، پروژه، تسک، چک‌لیست، کامنت و اعلان نمونه است.

`SEED_DEMO_DATA` در Compose production تنظیم نمی‌شود. محیط production پس از bootstrap فقط اطلاعات هویتی ضروری دارد و هیچ مشتری یا تسک ساختگی ایجاد نمی‌کند.

## ۹. خطا، تراکنش و سازگاری

- mutation دامنه، audit و اعلان متناظر در یک transaction اجرا می‌شوند؛
- عملیات S3 و PostgreSQL با جریان دو مرحله‌ای upload از transaction توزیع‌شده اجتناب می‌کند؛
- تکمیل upload نامعتبر یا منقضی idempotent رد می‌شود؛
- حذف فایل ابتدا دسترسی و linkها را بررسی می‌کند، سپس soft-delete می‌کند و حذف object به cleanup قابل‌تکرار سپرده می‌شود؛
- خطاهای داخلی جزئیات SQL، storage key، token یا stack trace را به client برنمی‌گردانند؛
- endpointهای جست‌وجو و upload rate-limit مستقل دارند؛
- queryهای لیست index متناسب با فیلتر و sort دارند.

## ۱۰. راهبرد تست

برای هر رفتار چرخهٔ RED، GREEN و refactor اجرا می‌شود.

- unit: schema، transition وضعیت، permission و mapping؛
- integration: service و migration روی PostgreSQL Testcontainer؛
- API E2E: auth، CSRF، RBAC، عضویت، pagination، concurrency و rollback audit/notification؛
- component: loading، empty، error، permission-hidden و form validation؛
- Playwright: ایجاد مشتری، فضای کاری و پروژه؛ ایجاد و جابه‌جایی تسک؛ چک‌لیست و کامنت؛ upload/download/delete فایل؛ دریافت و خواندن اعلان؛
- visual acceptance: desktop، tablet و mobile، RTL، keyboard، focus و نبود overflow؛
- release gate: lint، typecheck، unit، integration، API E2E، build، Compose health و Playwright روی دیتابیس خالی.

تست‌های Testcontainer به‌صورت سریالی اجرا می‌شوند تا مصرف Docker قابل‌کنترل بماند. تست upload از MinIO موقت و bucket جدا استفاده می‌کند و هر اجرا منابع خود را پاک می‌کند.

## ۱۱. ترتیب تحویل

### تحویل A — پوسته و داشبورد

پوستهٔ responsive، navigation واقعی، client مشترک API و dashboard summary بدون اعداد ساختگی.

### تحویل B — مشتری، فضای کاری و پروژه

سه پکیج دامنه، migrationها، permissionها، APIها، صفحات و seed توسعه.

### تحویل C — تسک

پکیج task، کانبان و لیست، کارهای من، مسئولان، چک‌لیست، کامنت و اعلان‌های مرتبط.

### تحویل D — فایل و اعلان

MinIO توسعه، abstraction سازگار با S3، upload دو مرحله‌ای، فایل‌های اخیر، dropdown و صفحهٔ اعلان.

### تحویل E — پذیرش انتشار

Playwright سرتاسری، OpenAPI نهایی، راهنمای اجرا و deployment، Compose تازه، commit و push نهایی انتشار.

## ۱۲. معیار پذیرش

انتشار عملیاتی اولیه زمانی کامل است که:

1. کاربر مجاز بتواند از UI واقعی مشتری، فضای کاری و پروژه بسازد؛
2. کاربر بتواند تسک چندمسئولی بسازد، در کانبان جابه‌جا کند و در لیست ببیند؛
3. چک‌لیست و کامنت در PostgreSQL پایدار بمانند؛
4. فایل از storage سازگار با S3 بارگذاری و دریافت شود؛
5. رویدادهای مشخص اعلان درون‌محصولی تولید کنند؛
6. داشبورد فقط از دادهٔ واقعی محاسبه شود؛
7. RBAC، عضویت، CSRF، audit و concurrency در API enforce شوند؛
8. production بدون دادهٔ دمو بالا بیاید؛
9. همهٔ release gateها روی دیتابیس و storage تازه پاس شوند؛
10. هر تحویل commit و روی شاخهٔ تأییدشده push شده باشد.
