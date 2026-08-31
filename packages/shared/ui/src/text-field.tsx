import type { InputHTMLAttributes, ReactNode } from "react";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: ReactNode;
  hint?: ReactNode;
  prefix?: ReactNode;
};

export function TextField({
  label,
  error,
  hint,
  prefix,
  id,
  className = "",
  ...props
}: TextFieldProps) {
  const inputId = id ?? "field";
  return (
    <div className="effect-field">
      <label className="effect-field__label" htmlFor={inputId}>{label}</label>
      <div className={`effect-field__control${error ? " effect-field__control--error" : ""}`}>
        {prefix ? <span className="effect-field__prefix">{prefix}</span> : null}
        <input id={inputId} className={`effect-field__input ${className}`} {...props} />
      </div>
      {error ? <p className="effect-field__error" role="alert">{error}</p> : null}
      {!error && hint ? <p className="effect-field__hint">{hint}</p> : null}
    </div>
  );
}
