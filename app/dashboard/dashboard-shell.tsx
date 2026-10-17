"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { logout } from "./actions";

type DashboardShellProps = {
  children: ReactNode;
};

function SidebarToggleIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={isCollapsed ? "m9 18 6-6-6-6" : "m15 18-6-6 6-6"} />
    </svg>
  );
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <div className={`portal-layout${isCollapsed ? " portal-layout--collapsed" : ""}`}>
      <aside className="sidebar" aria-label="Navegação principal">
        <div className="sidebar-brand">
          <div className="sidebar-user-menu">
            <button
              className="sidebar-brand-mark"
              type="button"
              onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
              aria-label="Abrir menu do usuário"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              title="Menu do usuário"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
              </svg>
            </button>
            {isUserMenuOpen ? (
              <form action={logout} className="sidebar-user-dropdown" role="menu">
                <button className="sidebar-user-dropdown-item" type="submit" role="menuitem">
                  Sair
                </button>
              </form>
            ) : null}
          </div>
          <Link href="/dashboard" className="sidebar-brand-link" title="Ir para o dashboard">
            <span className="sidebar-brand-name">Portal ADM</span>
          </Link>
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            aria-label={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-pressed={isCollapsed}
            title={isCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            <SidebarToggleIcon isCollapsed={isCollapsed} />
          </button>
        </div>

        <nav className="sidebar-navigation">
          <p className="sidebar-label">Gestão acadêmica</p>
          <Link
            href="/cadastro-alunos"
            className="sidebar-link"
            aria-current="page"
            title="Cadastro de alunos"
          >
            <span>Cadastro de alunos</span>
          </Link>
        </nav>

      </aside>

      <div className="portal-content">{children}</div>
    </div>
  );
}
