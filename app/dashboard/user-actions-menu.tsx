"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type UserActionsMenuProps = {
  username: string;
  enabled: boolean;
};

type MenuPosition = { top: number; right: number };
type Feedback = {
  type: "success" | "error";
  message: string;
};

export default function UserActionsMenu({ username, enabled }: UserActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingLabel, setSubmittingLabel] = useState("Atualizando status do usuario...");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSubmitting) {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }, [isSubmitting]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = setTimeout(() => {
      setFeedback(null);
    }, 2800);

    return () => clearTimeout(timeout);
  }, [feedback]);

  async function handleToggleStatus() {
    if (!username || isSubmitting) {
      return;
    }

    setSubmittingLabel("Atualizando status do usuario...");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !enabled }),
      });

      if (!response.ok) {
        const errorPayload: unknown = await response.json().catch(() => null);
        const errorMessage =
          typeof errorPayload === "object" &&
          errorPayload !== null &&
          "error" in errorPayload &&
          typeof errorPayload.error === "string"
            ? errorPayload.error
            : "Nao foi possivel atualizar o status do usuario";

        throw new Error(errorMessage);
      }

      setOpen(false);
      setFeedback({
        type: "success",
        message: enabled ? "Usuario bloqueado com sucesso." : "Usuario desbloqueado com sucesso.",
      });
      setTimeout(() => {
        router.refresh();
      }, 700);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar status";
      setFeedback({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  function openPasswordModal() {
    setOpen(false);
    setPasswordError(null);
    setNewPassword("");
    setShowPasswordModal(true);
  }

  function closePasswordModal() {
    if (isSubmitting) {
      return;
    }

    setShowPasswordModal(false);
    setPasswordError(null);
    setNewPassword("");
  }

  async function handleChangePassword() {
    const normalizedPassword = newPassword.trim();

    if (normalizedPassword.length < 3) {
      setPasswordError("A nova senha deve ter pelo menos 3 caracteres.");
      return;
    }

    if (!username || isSubmitting) {
      return;
    }

    setPasswordError(null);
    setSubmittingLabel("Alterando senha do usuario...");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: normalizedPassword }),
      });

      if (!response.ok) {
        const errorPayload: unknown = await response.json().catch(() => null);
        const errorMessage =
          typeof errorPayload === "object" &&
          errorPayload !== null &&
          "error" in errorPayload &&
          typeof errorPayload.error === "string"
            ? errorPayload.error
            : "Nao foi possivel trocar a senha do usuario";

        throw new Error(errorMessage);
      }

      setShowPasswordModal(false);
      setNewPassword("");
      setFeedback({ type: "success", message: "Senha alterada com sucesso." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao trocar senha";
      setPasswordError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openMenu() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + window.scrollY + 4,
      right: window.innerWidth - rect.right,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        className="user-actions-trigger"
        aria-label={`Acoes para ${username}`}
        aria-expanded={open}
        aria-haspopup="menu"
        type="button"
        disabled={!username || isSubmitting}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        •••
      </button>

      {isSubmitting
        ? createPortal(
            <div className="dashboard-blocking-overlay" role="status" aria-live="polite">
              <div className="dashboard-blocking-card">
                <span className="dashboard-blocking-spinner" aria-hidden="true" />
                <span>{submittingLabel}</span>
              </div>
            </div>,
            document.body,
          )
        : null}

      {open && menuPos
        ? createPortal(
            <div
              ref={menuRef}
              className="user-actions-menu"
              role="menu"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <button
                className={`user-actions-item ${enabled ? "action-block" : "action-unblock"}`}
                role="menuitem"
                type="button"
                disabled={isSubmitting}
                onClick={handleToggleStatus}
              >
                {isSubmitting ? "Processando..." : enabled ? "Bloquear" : "Desbloquear"}
              </button>

              <button
                className="user-actions-item"
                role="menuitem"
                type="button"
                disabled={isSubmitting || !username}
                onClick={openPasswordModal}
              >
                Trocar senha
              </button>
            </div>,
            document.body,
          )
        : null}

      {showPasswordModal
        ? createPortal(
            <div className="dashboard-modal-overlay" role="dialog" aria-modal="true" aria-label="Trocar senha">
              <div className="dashboard-modal-card">
                <h3 className="dashboard-modal-title">Trocar senha</h3>
                <p className="dashboard-modal-subtitle">Usuario: {username}</p>

                <label className="dashboard-modal-label" htmlFor={`new-password-${username}`}>
                  Nova senha
                </label>
                <input
                  id={`new-password-${username}`}
                  className="dashboard-modal-input"
                  type="password"
                  value={newPassword}
                  minLength={3}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    if (passwordError) {
                      setPasswordError(null);
                    }
                  }}
                  disabled={isSubmitting}
                />

                {passwordError ? <p className="dashboard-modal-error">{passwordError}</p> : null}

                <div className="dashboard-modal-actions">
                  <button
                    type="button"
                    className="pagination-link"
                    onClick={closePasswordModal}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="auth-button"
                    onClick={handleChangePassword}
                    disabled={isSubmitting}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {feedback
        ? createPortal(
            <div className={`dashboard-feedback dashboard-feedback--${feedback.type}`} role="status" aria-live="polite">
              {feedback.message}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
