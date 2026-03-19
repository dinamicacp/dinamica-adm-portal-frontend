"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import CreateUserModal from "./create-user-modal";

type DashboardClientProps = {
  organizationalUnit: string;
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

export default function DashboardClient({ organizationalUnit }: DashboardClientProps) {
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = setTimeout(() => {
      setFeedback(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [feedback]);

  return (
    <>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowCreateUserModal(true)}
          className="auth-button"
          type="button"
        >
          Adicionar usuário
        </button>
      </div>

      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onFeedback={setFeedback}
        organizationalUnit={organizationalUnit}
      />

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
