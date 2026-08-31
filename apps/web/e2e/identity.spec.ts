import {
  expect,
  test,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { readFakeSmsCode } from "./helpers/fake-sms.js";

async function login(
  page: Page,
  request: APIRequestContext,
  phone: string,
  normalized: string,
) {
  await page.goto("/login");
  await page.getByLabel("شماره موبایل").fill(phone);
  await page.getByRole("button", { name: "دریافت کد تأیید" }).click();
  await expect(page.getByLabel("رقم ۱", { exact: true })).toBeVisible();
  const code = await readFakeSmsCode(request, normalized);
  for (const [index, digit] of [...code].entries()) {
    await page.getByLabel("رقم " + "۱۲۳۴۵۶"[index]).fill(digit);
  }
  await page.getByRole("button", { name: "تأیید و ورود", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("admin can sign in, create a user, assign access, and revoke a session", async ({
  page,
  context,
  browser,
}) => {
  await login(page, context.request, "۰۹۱۲۱۲۳۴۵۶۷", "+989121234567");
  await page.goto("/settings/roles");
  await page.getByRole("button", { name: "نقش جدید", exact: true }).click();
  await page.getByLabel("نام نقش", { exact: true }).fill("مشاهده کاربران");
  await page.getByLabel("شناسه نقش").fill("identity-reader");
  await page.getByLabel("users:read", { exact: true }).check();
  await page.getByRole("button", { name: "ذخیره نقش" }).click();
  await expect(page.getByText("نقش جدید ایجاد شد.")).toBeVisible();

  await page.goto("/settings/users");
  await page.getByRole("button", { name: "کاربر جدید" }).click();
  await page.getByLabel("نام", { exact: true }).fill("سارا");
  await page.getByLabel("نام خانوادگی").fill("احمدی");
  await page.getByLabel("شماره موبایل").fill("09121111111");
  await page.getByRole("button", { name: "ذخیره کاربر" }).click();
  await page.getByText("سارا احمدی", { exact: true }).click();
  await page.getByLabel("مشاهده کاربران", { exact: true }).check();
  await expect(page.getByText("نقش‌های کاربر به‌روزرسانی شد.")).toBeVisible();
  const overrides = page.getByRole("region", { name: "دسترسی‌های اختصاصی" });
  await overrides
    .getByRole("listitem")
    .filter({ hasText: "audit:read" })
    .getByRole("button", { name: "عدم دسترسی اختصاصی", exact: true })
    .click();
  await expect(
    page.getByText("دسترسی‌های اختصاصی به‌روزرسانی شد."),
  ).toBeVisible();
  await page.reload();
  await page.getByText("سارا احمدی", { exact: true }).click();
  await expect(
    page.getByLabel("مشاهده کاربران", { exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "بستن", exact: true }).click();

  const secondary = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    userAgent: "Identity secondary device",
  });
  try {
    // Keep the real resend policy: a second independent login is allowed after 60s.
    await expect
      .poll(
        async () => {
          const response = await secondary.request.post(
            "/api/v1/auth/otp/request",
            {
              headers: { Origin: test.info().project.use.baseURL! },
              data: { phone: "09121234567" },
            },
          );
          const body = (await response.json()) as { challengeId: string };
          const code = await readFakeSmsCode(
            secondary.request,
            "+989121234567",
          );
          const verified = await secondary.request.post(
            "/api/v1/auth/otp/verify",
            {
              headers: { Origin: test.info().project.use.baseURL! },
              data: { challengeId: body.challengeId, code },
            },
          );
          return verified.status();
        },
        { timeout: 80_000, intervals: [61_000] },
      )
      .toBe(200);
    await page.goto("/settings/sessions");
    await page
      .getByRole("listitem")
      .filter({ hasText: "Identity secondary device" })
      .getByRole("button", { name: "لغو نشست", exact: true })
      .click();
    await page.getByRole("button", { name: "بله، لغو کن" }).click();
    await expect(page.getByText("Identity secondary device")).toHaveCount(0);
    expect((await secondary.request.get("/api/v1/me")).status()).toBe(401);
  } finally {
    await secondary.close();
  }
});
