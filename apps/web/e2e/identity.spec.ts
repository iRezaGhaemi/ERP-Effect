import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";

const adminUsername = process.env.E2E_ADMIN_USERNAME;
const bootstrapPassword = process.env.E2E_ADMIN_PASSWORD;

test.use({ trace: "off" });

function disposablePassword(): string {
  return `Aa1!${randomBytes(24).toString("base64url")}`;
}

async function login(page: Page, username: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("نام کاربری").fill(username);
  await page.getByLabel("گذرواژه", { exact: true }).fill(password);
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await expect(page).toHaveURL(/\/(?:dashboard|change-password)$/);
}

async function completeTemporaryPassword(page: Page, currentPassword: string, newPassword: string) {
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel("گذرواژه فعلی", { exact: true }).fill(currentPassword);
  await page.getByLabel("گذرواژه جدید", { exact: true }).fill(newPassword);
  await page.getByLabel("تکرار گذرواژه جدید", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "تغییر گذرواژه", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function loginRequest(request: APIRequestContext, username: string, password: string) {
  return request.post("/api/v1/auth/login", {
    headers: { Origin: test.info().project.use.baseURL! },
    data: { username, password },
  });
}

test("admin can sign in, create a user, assign access, and revoke a session", async ({ page, browser }) => {
  test.skip(!adminUsername || !bootstrapPassword, "Task 5 must provide E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD.");
  const changedAdminPassword = disposablePassword();
  const temporaryUserPassword = disposablePassword();
  await login(page, adminUsername!, bootstrapPassword!);
  let activeAdminPassword = bootstrapPassword!;
  if (new URL(page.url()).pathname === "/change-password") {
    await completeTemporaryPassword(page, bootstrapPassword!, changedAdminPassword);
    activeAdminPassword = changedAdminPassword;
  } else await expect(page).toHaveURL(/\/dashboard$/);

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
  await page.getByLabel("نام کاربری").fill("sara.ahmadi");
  await page.getByLabel("گذرواژه اولیه", { exact: true }).fill(temporaryUserPassword);
  await page.getByLabel("تکرار گذرواژه اولیه", { exact: true }).fill(temporaryUserPassword);
  await page.getByRole("button", { name: "ذخیره کاربر" }).click();
  await page.getByRole("button", { name: "جزئیات سارا احمدی" }).click();
  await page.getByLabel("مشاهده کاربران", { exact: true }).click();
  await expect(page.getByText("نقش‌های کاربر به‌روزرسانی شد.")).toBeVisible();
  const overrides = page.getByRole("region", { name: "دسترسی‌های اختصاصی" });
  await overrides.getByRole("listitem").filter({ hasText: "audit:read" }).getByRole("button", { name: "عدم دسترسی اختصاصی", exact: true }).click();
  await expect(page.getByText("دسترسی‌های اختصاصی به‌روزرسانی شد.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "جزئیات سارا احمدی" }).click();
  await expect(page.getByLabel("مشاهده کاربران", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "بستن", exact: true }).click();

  const secondary = await browser.newContext({ baseURL: test.info().project.use.baseURL, userAgent: "Identity secondary device" });
  try {
    expect((await loginRequest(secondary.request, adminUsername!, activeAdminPassword)).status()).toBe(200);
    await page.goto("/settings/sessions");
    await page.getByRole("listitem").filter({ hasText: "Identity secondary device" }).getByRole("button", { name: "لغو نشست", exact: true }).click();
    await page.getByRole("button", { name: "بله، لغو کن" }).click();
    await expect(page.getByText("Identity secondary device")).toHaveCount(0);
    expect((await secondary.request.get("/api/v1/me")).status()).toBe(401);
  } finally {
    await secondary.close();
  }
});
