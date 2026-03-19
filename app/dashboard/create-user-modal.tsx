"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { fetchWithAuth, SessionExpiredError } from "./fetch-with-auth";

type CreateUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onFeedback: (feedback: { type: "success" | "error"; message: string }) => void;
  organizationalUnit: string;
};

export default function CreateUserModal({ isOpen, onClose, onFeedback, organizationalUnit }: CreateUserModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setUsername("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setUsernameError(null);
    setFirstNameError(null);
    setLastNameError(null);
    setPasswordError(null);
    onClose();
  }

  function clearErrors() {
    setUsernameError(null);
    setFirstNameError(null);
    setLastNameError(null);
    setPasswordError(null);
  }

  function capitalizeFirstLetter(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  async function handleCreateUser() {
    clearErrors();

    const normalizedUsername = username.trim();
    const normalizedFirstName = firstName.trim();
    const normalizedLastName = lastName.trim();
    const normalizedPassword = password.trim();

    let hasErrors = false;

    if (!normalizedUsername) {
      setUsernameError("Nome de usuário é obrigatório");
      hasErrors = true;
    }

    if (!normalizedFirstName) {
      setFirstNameError("Nome é obrigatório");
      hasErrors = true;
    }

    if (!normalizedLastName) {
      setLastNameError("Sobrenome é obrigatório");
      hasErrors = true;
    }

    if (normalizedPassword.length < 3) {
      setPasswordError("A senha deve ter pelo menos 3 caracteres");
      hasErrors = true;
    }

    if (hasErrors) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchWithAuth("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedUsername,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          password: normalizedPassword,
          organizationalUnit,
        }),
      });

      if (!response.ok) {
        const errorPayload: unknown = await response.json().catch(() => null);
        const errorMessage =
          typeof errorPayload === "object" &&
          errorPayload !== null &&
          "error" in errorPayload &&
          typeof errorPayload.error === "string"
            ? errorPayload.error
            : "Não foi possível criar o usuário";

        throw new Error(errorMessage);
      }

      closeModal();
      onFeedback({ type: "success", message: "Usuário criado com sucesso." });
      setTimeout(() => {
        router.refresh();
      }, 700);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        router.push("/login");
        return;
      }
      const message = error instanceof Error ? error.message : "Erro ao criar usuário";
      onFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <>
      <div className="dashboard-modal-overlay" role="dialog" aria-modal="true" aria-label="Criar novo usuário">
        <div className="dashboard-modal-card">
          <h3 className="dashboard-modal-title">Criar novo usuário</h3>

          <label className="dashboard-modal-label" htmlFor="create-username">
            Nome de usuário
          </label>
          <input
            id="create-username"
            className="dashboard-modal-input"
            type="text"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (usernameError) {
                setUsernameError(null);
              }
            }}
            disabled={isSubmitting}
            placeholder="Ex: 12345"
            autoComplete="off"
          />
          {usernameError ? <p className="dashboard-modal-error">{usernameError}</p> : null}

          <label className="dashboard-modal-label" htmlFor="create-firstname">
            Nome
          </label>
          <input
            id="create-firstname"
            className="dashboard-modal-input"
            type="text"
            value={firstName}
            onChange={(event) => {
              setFirstName(capitalizeFirstLetter(event.target.value));
              if (firstNameError) {
                setFirstNameError(null);
              }
            }}
            disabled={isSubmitting}
            placeholder="Ex: João"
            autoComplete="off"
          />
          {firstNameError ? <p className="dashboard-modal-error">{firstNameError}</p> : null}

          <label className="dashboard-modal-label" htmlFor="create-lastname">
            Sobrenome
          </label>
          <input
            id="create-lastname"
            className="dashboard-modal-input"
            type="text"
            value={lastName}
            onChange={(event) => {
              setLastName(capitalizeFirstLetter(event.target.value));
              if (lastNameError) {
                setLastNameError(null);
              }
            }}
            disabled={isSubmitting}
            placeholder="Ex: Silva"
            autoComplete="off"
          />
          {lastNameError ? <p className="dashboard-modal-error">{lastNameError}</p> : null}

          <label className="dashboard-modal-label" htmlFor="create-password">
            Senha
          </label>
          <input
            id="create-password"
            className="dashboard-modal-input"
            type="password"
            value={password}
            minLength={3}
            onChange={(event) => {
              setPassword(event.target.value);
              if (passwordError) {
                setPasswordError(null);
              }
            }}
            disabled={isSubmitting}
            placeholder="Mínimo 3 caracteres"
            autoComplete="new-password"
          />
          {passwordError ? <p className="dashboard-modal-error">{passwordError}</p> : null}

          <div className="dashboard-modal-actions">
            <button
              type="button"
              className="pagination-link"
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="auth-button"
              onClick={handleCreateUser}
              disabled={isSubmitting}
            >
              Criar usuário
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
