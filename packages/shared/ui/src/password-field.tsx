"use client";

import { useState } from "react";

import { TextField, type TextFieldProps } from "./text-field.js";

export function PasswordField({ label, disabled, ...props }: Omit<TextFieldProps, "type">) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="effect-password-field">
      <TextField {...props} label={label} disabled={disabled} type={revealed ? "text" : "password"} />
      <button type="button" className="effect-password-toggle" aria-label={`${revealed ? "پنهان کردن" : "نمایش"} ${label}`} aria-pressed={revealed} disabled={disabled} onClick={() => setRevealed((value) => !value)}>{revealed ? "پنهان" : "نمایش"}</button>
    </div>
  );
}
