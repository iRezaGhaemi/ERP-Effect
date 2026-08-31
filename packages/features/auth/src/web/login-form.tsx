"use client";

import { ApiError } from "@effect-erp/contracts";
import { Button, TextField } from "@effect/ui";
import { type FormEvent, type KeyboardEvent, type ClipboardEvent, useEffect, useRef, useState } from "react";

import { AuthClient } from "./auth-client.js";

export type LoginAuthClient = Pick<AuthClient, "requestOtp" | "verifyOtp">;

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

function englishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = persianDigits.indexOf(digit);
    return String(persianIndex >= 0 ? persianIndex : arabicDigits.indexOf(digit));
  });
}

function persianNumber(value: number): string {
  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)] ?? digit);
}

function errorCopy(error: unknown): string {
  return error instanceof ApiError ? error.message : "ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.";
}

export function LoginForm({ client = new AuthClient(), onAuthenticated }: {
  client?: LoginAuthClient;
  onAuthenticated?: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState<string>();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [retryAfter, setRetryAfter] = useState(0);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!challengeId || retryAfter <= 0) return;
    const timer = window.setInterval(() => setRetryAfter((seconds) => Math.max(0, seconds - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [challengeId, retryAfter > 0]);

  async function requestCode() {
    if (requesting) return;
    const normalized = englishDigits(phone).replace(/[\s-]/g, "");
    if (!/^09\d{9}$/.test(normalized)) {
      setError("شماره موبایل معتبر نیست. مثال: ۰۹۱۲۱۲۳۴۵۶۷");
      return;
    }
    setRequesting(true);
    setError("");
    try {
      const response = await client.requestOtp({ phone: normalized });
      setChallengeId(response.challengeId);
      setRetryAfter(response.retryAfterSeconds);
      setDigits(Array(6).fill(""));
      window.setTimeout(() => inputs.current[0]?.focus(), 0);
    } catch (requestError) {
      setError(errorCopy(requestError));
    } finally {
      setRequesting(false);
    }
  }

  async function verifyCode(event?: FormEvent) {
    event?.preventDefault();
    if (!challengeId || verifying) return;
    const code = digits.join("");
    if (code.length !== 6) {
      setError("کد تأیید ۶ رقمی را کامل وارد کنید.");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      await client.verifyOtp({ challengeId, code });
      onAuthenticated?.();
    } catch (verifyError) {
      setError(errorCopy(verifyError));
    } finally {
      setVerifying(false);
    }
  }

  function updateDigit(index: number, value: string) {
    const digit = englishDigits(value).replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }

  function pasteCode(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = englishDigits(event.clipboardData.getData("text")).replace(/\D/g, "").slice(0, 6);
    const next = Array.from({ length: 6 }, (_, index) => pasted[index] ?? "");
    setDigits(next);
    setError("");
    if (pasted.length === 6) window.setTimeout(() => void verifyPastedCode(pasted), 0);
    else inputs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function verifyPastedCode(code: string) {
    if (!challengeId || verifying) return;
    setVerifying(true);
    try {
      await client.verifyOtp({ challengeId, code });
      onAuthenticated?.();
    } catch (verifyError) {
      setError(errorCopy(verifyError));
    } finally {
      setVerifying(false);
    }
  }

  function onOtpKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Backspace" && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === "Enter") void verifyCode();
  }

  if (challengeId) {
    return (
      <form className="effect-login-form" onSubmit={verifyCode} noValidate>
        <div className="effect-login-brand"><span className="effect-brand__mark">E</span><h1>کد تأیید را وارد کنید</h1></div>
        <p className="effect-login-copy">کد تأیید ۶ رقمی به شماره <b dir="ltr">{phone}</b> ارسال شد.</p>
        <div className="effect-otp-row" dir="ltr">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => { inputs.current[index] = element; }}
              aria-label={`رقم ${persianNumber(index + 1)}`}
              className="effect-otp-input"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              disabled={verifying}
              onChange={(event) => updateDigit(index, event.target.value)}
              onKeyDown={(event) => onOtpKeyDown(event, index)}
              onPaste={pasteCode}
            />
          ))}
        </div>
        {error ? <p className="effect-form-error" role="alert">{error}</p> : null}
        <Button fullWidth type="submit" disabled={verifying}>{verifying ? "در حال بررسی…" : "تأیید و ورود"}</Button>
        <div className="effect-login-actions">
          <button type="button" className="effect-link-button" onClick={() => { setChallengeId(undefined); setError(""); }}>ویرایش شماره موبایل</button>
          {retryAfter > 0 ? <span className="effect-countdown">ارسال مجدد تا {persianNumber(retryAfter)} ثانیه</span> : <button type="button" className="effect-link-button" disabled={requesting} onClick={() => void requestCode()}>ارسال مجدد کد</button>}
        </div>
      </form>
    );
  }

  return (
    <form className="effect-login-form" onSubmit={(event) => { event.preventDefault(); void requestCode(); }} noValidate>
      <div className="effect-login-brand"><span className="effect-brand__mark">E</span><h1>به Effect ERP خوش آمدید</h1></div>
      <p className="effect-login-copy">برای ورود، شماره موبایل خود را وارد کنید.</p>
      <TextField
        label="شماره موبایل"
        id="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        dir="ltr"
        value={phone}
        disabled={requesting}
        placeholder="۰۹۱۲۱۲۳۴۵۶۷"
        error={error}
        hint="شماره‌ای که با آن در سیستم ثبت نام کرده‌اید"
        prefix="۹۸+"
        onChange={(event) => { setPhone(event.target.value); setError(""); }}
      />
      <Button fullWidth type="submit" disabled={requesting}>{requesting ? "در حال ارسال…" : "دریافت کد تأیید"}</Button>
    </form>
  );
}
