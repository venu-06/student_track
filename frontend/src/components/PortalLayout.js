import React from "react";
import "../styles/Portal.css";

export function PortalIcon({ name }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  const icons = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    attendance: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 2v4M15 2v4M8 11l2 2 4-4" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M8 8l4-4 4 4" />
        <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v5h5M9 13h6M9 17h6M9 9h1" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v3a4 4 0 0 1-8 0Z" />
        <path d="M9 18h6M12 11v7M6 5H4a2 2 0 0 0 2 5h2M18 5h2a2 2 0 0 1-2 5h-2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="3.5" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.74" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
      </>
    ),
    send: (
      <>
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4Z" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    graduation: (
      <>
        <path d="m2 9 10-5 10 5-10 5Z" />
        <path d="M6 11v4c0 1.6 2.7 3 6 3s6-1.4 6-3v-4" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
        <path d="M4 5.5V19" />
      </>
    ),
    home: (
      <>
        <path d="M3 11 12 4l9 7" />
        <path d="M5 10v10h14V10" />
      </>
    )
  };

  return (
    <svg className="portal-icon-svg" aria-hidden="true" {...commonProps}>
      {icons[name] || icons.dashboard}
    </svg>
  );
}

export function PortalLayout({
  portalTitle,
  portalSubtitle,
  headerTitle,
  headerSubtitle,
  navItems,
  activeKey,
  onSelect,
  onLogout,
  children
}) {
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-brand">
          <h2>{portalTitle}</h2>
          <p>{portalSubtitle}</p>
        </div>

        <nav className="portal-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`portal-nav-item${item.key === activeKey ? " active" : ""}`}
              onClick={() => onSelect(item.key)}
            >
              <PortalIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button type="button" className="portal-logout" onClick={onLogout}>
          <PortalIcon name="logout" />
          <span>Logout</span>
        </button>
      </aside>

      <main className="portal-main">
        <header className="portal-main-header">
          <h1>{headerTitle}</h1>
          {headerSubtitle ? <p>{headerSubtitle}</p> : null}
        </header>
        <div className="portal-main-body">{children}</div>
      </main>
    </div>
  );
}

export function SectionCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`portal-card ${className}`.trim()}>
      {(title || subtitle || actions) ? (
        <div className="portal-card-head">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="portal-card-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, tone = "default" }) {
  return (
    <div className={`portal-stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function EmptyState({ text }) {
  return <p className="portal-empty">{text}</p>;
}

export function StatusBadge({ children, tone = "neutral" }) {
  return <span className={`portal-status tone-${tone}`}>{children}</span>;
}

export default PortalLayout;
