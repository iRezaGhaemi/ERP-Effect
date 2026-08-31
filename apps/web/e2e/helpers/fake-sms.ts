import { expect, type APIRequestContext } from "@playwright/test";

export async function readFakeSmsCode(
  request: APIRequestContext,
  phone: string,
): Promise<string> {
  let code = "";
  await expect
    .poll(
      async () => {
        const response = await request.get("/api/v1/test/sms/latest", {
          params: { phone },
        });
        if (!response.ok()) return false;
        const body = (await response.json()) as { code?: unknown };
        if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code))
          return false;
        code = body.code;
        return true;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return code;
}
