"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type UserActionsMenuProps = {
  username: string;
  enabled: boolean;
};

type MenuPosition = { top: number; right: number };

export default function UserActionsMenu({ username, enabled }: UserActionsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleToggleStatus() {
    if (!username || isSubmitting) {
      return;
    }

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
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar status";
      window.alert(message);
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
                onClick={() => setOpen(false)}
              >
                Trocar senha
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
