"use client";

import { ApiError } from "@effect-erp/contracts";
import { Button, PasswordField, TextField } from "@effect/ui";
import type { UserDto } from "@effect/users/contracts";
import { type FormEvent, useEffect, useRef, useState } from "react";

import { AuthClient } from "./auth-client.js";

export type CredentialAdminClient = Pick<AuthClient, "setupCredentials" | "resetPassword">;
type CredentialTarget = Pick<UserDto, "id" | "username" | "credentialsReady" | "mustChangePassword">;

export function CredentialAdminForm({ target, client = new AuthClient(), onSaved }: {
  target: CredentialTarget;
  client?: CredentialAdminClient;
  onSaved?: (credentials: Pick<UserDto, "username" | "credentialsReady" | "mustChangePassword">) => void;
}) {
  const setup = !target.credentialsReady;
  const title = setup ? "تنظیم اطلاعات ورود" : "بازنشانی گذرواژه";
  const secretLabel = setup ? "گذرواژه اولیه" : "گذرواژه جدید";
  const confirmationLabel = setup ? "تکرار گذرواژه اولیه" : "تکرار گذرواژه جدید";
  const [username, setUsername] = useState(target.username ?? "");
  const [secret, setSecret] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [actorPassword, setActorPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  function clearSecrets() {
    setSecret("");
    setConfirmation("");
    setActorPassword("");
    form.current?.querySelectorAll<HTMLInputElement>("input[data-password]").forEach((input) => { input.value = ""; });
  }

  useEffect(() => {
    const inputs = form.current?.querySelectorAll<HTMLInputElement>("input[data-password]");
    return () => inputs?.forEach((input) => { input.value = ""; });
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!secret || !actorPassword || (setup && !username)) {
      setError("همه اطلاعات ورود را کامل کنید.");
      return;
    }
    if (secret !== confirmation) {
      setError(`تکرار گذرواژه با ${secretLabel} یکسان نیست.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (setup) {
        await client.setupCredentials(target.id, { username, initialPassword: secret, actorPassword });
        clearSecrets();
        onSaved?.({ username: username.trim().toLowerCase(), credentialsReady: true, mustChangePassword: true });
      } else {
        await client.resetPassword(target.id, { newPassword: secret, actorPassword });
        clearSecrets();
        onSaved?.({ username: target.username, credentialsReady: true, mustChangePassword: true });
      }
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "ذخیره اطلاعات ورود ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="effect-access-section" aria-label={title}>
    <h3>{title}</h3>
    <p>{setup ? "برای این کاربر نام کاربری و گذرواژه موقت تعیین کنید." : "با تأیید گذرواژه خود، یک گذرواژه موقت جدید تعیین کنید."}</p>
    <form ref={form} className="effect-form effect-credential-form" onSubmit={(event) => void submit(event)} noValidate>
      {setup ? <TextField id={`credential-username-${target.id}`} label="نام کاربری" autoComplete="off" dir="ltr" value={username} disabled={saving} onChange={(event) => { setUsername(event.target.value); setError(""); }} required /> : null}
      <PasswordField data-password id={`credential-secret-${target.id}`} label={secretLabel} autoComplete="new-password" dir="ltr" value={secret} disabled={saving} hint="حداقل ۱۵ نویسه و غیرتکراری" onChange={(event) => { setSecret(event.target.value); setError(""); }} required />
      <PasswordField data-password id={`credential-confirm-${target.id}`} label={confirmationLabel} autoComplete="new-password" dir="ltr" value={confirmation} disabled={saving} onChange={(event) => { setConfirmation(event.target.value); setError(""); }} required />
      <PasswordField data-password id={`credential-actor-${target.id}`} label="گذرواژه مدیر" autoComplete="current-password" dir="ltr" value={actorPassword} disabled={saving} onChange={(event) => { setActorPassword(event.target.value); setError(""); }} required />
      {error ? <p className="effect-form-error" role="alert">{error}</p> : null}
      <Button type="submit" disabled={saving}>{saving ? "در حال ذخیره…" : title}</Button>
    </form>
  </section>;
}
