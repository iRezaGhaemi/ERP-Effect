"use client";

import { Button, PasswordField, TextField } from "@effect/ui";
import { type FormEvent, useEffect, useRef, useState } from "react";

import type { AuthSessionResponse } from "../contracts/index.js";
import { AuthClient } from "./auth-client.js";

export type LoginAuthClient = Pick<AuthClient, "login">;

const genericLoginError = "نام کاربری یا گذرواژه صحیح نیست. دوباره تلاش کنید.";

export function LoginForm({ client = new AuthClient(), onAuthenticated }: {
  client?: LoginAuthClient;
  onAuthenticated?: (response: AuthSessionResponse) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const passwordInput = form.current?.elements.namedItem("password");
    return () => {
      if (passwordInput instanceof HTMLInputElement) passwordInput.value = "";
    };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await client.login({ username, password });
      setPassword("");
      const passwordElement = form.current?.elements.namedItem("password");
      if (passwordElement instanceof HTMLInputElement) passwordElement.value = "";
      onAuthenticated?.(response);
    } catch {
      setError(genericLoginError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={form} className="effect-login-form" onSubmit={(event) => void submit(event)} noValidate>
      <div className="effect-login-brand"><span className="effect-brand__mark">E</span><h1>به Effect ERP خوش آمدید</h1></div>
      <p className="effect-login-copy">برای ورود، نام کاربری و گذرواژه خود را وارد کنید.</p>
      <TextField
        id="username"
        label="نام کاربری"
        autoComplete="username"
        dir="ltr"
        value={username}
        disabled={pending}
        onChange={(event) => { setUsername(event.target.value); setError(""); }}
        required
      />
      <PasswordField
        id="password"
        name="password"
        label="گذرواژه"
        autoComplete="current-password"
        dir="ltr"
        value={password}
        disabled={pending}
        onChange={(event) => { setPassword(event.target.value); setError(""); }}
        required
      />
      {error ? <p className="effect-form-error" role="alert">{error}</p> : null}
      <Button fullWidth type="submit" disabled={pending}>{pending ? "در حال ورود…" : "ورود"}</Button>
    </form>
  );
}
