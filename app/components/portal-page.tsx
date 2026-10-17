import type { ReactNode } from "react";

type PortalPageProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function PortalPage({
  eyebrow,
  title,
  description,
  actions,
  children,
  footer,
  className = "",
}: PortalPageProps) {
  return (
    <section className={`dashboard-card portal-page-card ${className}`.trim()}>
      <header className="portal-page-header">
        <div>
          <p className="dashboard-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="dashboard-meta">{description}</p>
        </div>
        {actions ? <div className="portal-page-actions">{actions}</div> : null}
      </header>

      {children}

      {footer ? <footer className="portal-page-footer">{footer}</footer> : null}
    </section>
  );
}
