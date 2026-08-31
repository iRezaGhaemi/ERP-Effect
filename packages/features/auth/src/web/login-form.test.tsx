import { ApiError } from "@effect-erp/contracts";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm, type LoginAuthClient } from "./login-form.js";

const challengeId = "e8292771-e347-4f55-ad5f-ed813cfa42b5";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function client(overrides: Partial<LoginAuthClient> = {}): LoginAuthClient {
  return {
    requestOtp: vi.fn().mockResolvedValue({
      accepted: true,
      challengeId,
      retryAfterSeconds: 60,
    }),
    verifyOtp: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

describe("LoginForm", () => {
  it("normalizes Persian digits and moves from phone to six-digit OTP", async () => {
    const fakeClient = client();
    const user = userEvent.setup();
    render(<LoginForm client={fakeClient} />);

    await user.type(screen.getByLabelText("شماره موبایل"), "۰۹۱۲۱۲۳۴۵۶۷");
    await user.click(screen.getByRole("button", { name: "دریافت کد تأیید" }));

    expect(fakeClient.requestOtp).toHaveBeenCalledWith({ phone: "09121234567" });
    expect(await screen.findAllByLabelText(/رقم/)).toHaveLength(6);
  });

  it("shows the API error message below the phone field", async () => {
    const fakeClient = client({
      requestOtp: vi.fn().mockRejectedValue(
        new ApiError({
          code: "RATE_LIMITED",
          message: "لطفاً کمی بعد دوباره تلاش کنید.",
          fields: {},
          requestId: "request-1",
        }),
      ),
    });
    const user = userEvent.setup();
    render(<LoginForm client={fakeClient} />);

    await user.type(screen.getByLabelText("شماره موبایل"), "09121234567");
    await user.click(screen.getByRole("button", { name: "دریافت کد تأیید" }));

    expect((await screen.findByRole("alert")).textContent).toContain("لطفاً کمی بعد دوباره تلاش کنید.");
  });

  it("counts down before enabling resend", async () => {
    vi.useFakeTimers();
    const fakeClient = client({
      requestOtp: vi.fn().mockResolvedValue({
        accepted: true,
        challengeId,
        retryAfterSeconds: 2,
      }),
    });
    render(<LoginForm client={fakeClient} />);

    fireEvent.change(screen.getByLabelText("شماره موبایل"), { target: { value: "09121234567" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "دریافت کد تأیید" })); });

    expect(screen.getByText("ارسال مجدد تا ۲ ثانیه").textContent).toBe("ارسال مجدد تا ۲ ثانیه");
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(screen.getByRole("button", { name: "ارسال مجدد کد" })).not.toHaveProperty("disabled", true);
  });

  it("submits a pasted six-digit code", async () => {
    const fakeClient = client();
    const user = userEvent.setup();
    render(<LoginForm client={fakeClient} />);

    await user.type(screen.getByLabelText("شماره موبایل"), "09121234567");
    await user.click(screen.getByRole("button", { name: "دریافت کد تأیید" }));
    await screen.findAllByLabelText(/رقم/);
    await user.click(screen.getByLabelText("رقم ۱"));
    await user.paste("۱۲۳۴۵۶");

    await waitFor(() =>
      expect(fakeClient.verifyOtp).toHaveBeenCalledWith({
        challengeId,
        code: "123456",
      }),
    );
  });

  it("submits a complete code with Enter", async () => {
    const fakeClient = client();
    const user = userEvent.setup();
    render(<LoginForm client={fakeClient} />);

    await user.type(screen.getByLabelText("شماره موبایل"), "09121234567");
    await user.click(screen.getByRole("button", { name: "دریافت کد تأیید" }));
    const digits = await screen.findAllByLabelText(/رقم/);
    for (const [index, input] of digits.entries()) await user.type(input, String(index + 1));
    await user.keyboard("{Enter}");

    await waitFor(() => expect(fakeClient.verifyOtp).toHaveBeenCalledTimes(1));
  });

  it("disables duplicate submits while an OTP request is pending", async () => {
    let resolveRequest: ((value: { accepted: true; challengeId: string; retryAfterSeconds: number }) => void) | undefined;
    const fakeClient = client({
      requestOtp: vi.fn().mockImplementation(
        () => new Promise((resolve) => { resolveRequest = resolve; }),
      ),
    });
    const user = userEvent.setup();
    render(<LoginForm client={fakeClient} />);

    await user.type(screen.getByLabelText("شماره موبایل"), "09121234567");
    await user.click(screen.getByRole("button", { name: "دریافت کد تأیید" }));

    expect(screen.getByRole("button", { name: "در حال ارسال…" })).toHaveProperty("disabled", true);
    resolveRequest?.({ accepted: true, challengeId, retryAfterSeconds: 60 });
    expect(await screen.findAllByLabelText(/رقم/)).toHaveLength(6);
  });

  it("calls onAuthenticated after successful verification", async () => {
    const onAuthenticated = vi.fn();
    const fakeClient = client();
    const user = userEvent.setup();
    render(<LoginForm client={fakeClient} onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByLabelText("شماره موبایل"), "09121234567");
    await user.click(screen.getByRole("button", { name: "دریافت کد تأیید" }));
    const digits = await screen.findAllByLabelText(/رقم/);
    for (const [index, input] of digits.entries()) await user.type(input, String(index + 1));
    await user.click(screen.getByRole("button", { name: "تأیید و ورود" }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledOnce());
  });
});
