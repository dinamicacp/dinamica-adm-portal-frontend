"use client";

import { useFormStatus } from "react-dom";

type LoginFormFieldsProps = {
  hasError: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="auth-button" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export default function LoginFormFields({ hasError }: LoginFormFieldsProps) {
  const { pending } = useFormStatus();

  return (
    <>
      <div>
        <label className="auth-label" htmlFor="username">
          Usuario
        </label>
        <input
          className="auth-input"
          id="username"
          name="username"
          type="text"
          placeholder="seu.usuario"
          required
          disabled={pending}
        />
      </div>

      <div>
        <label className="auth-label" htmlFor="password">
          Senha
        </label>
        <input
          className="auth-input"
          id="password"
          name="password"
          type="password"
          placeholder="********"
          required
          disabled={pending}
        />
      </div>

      {hasError ? (
        <p className="auth-error">Credenciais inválidas. Tente novamente.</p>
      ) : null}

      <SubmitButton />
    </>
  );
}
