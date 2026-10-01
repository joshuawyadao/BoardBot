import type { ReactNode } from 'react';

interface Props {
  title: string;
  titleId: string;
  budget: ReactNode;
  phaseControl: ReactNode;
  collapsed: boolean;
  busy: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
}

/** Presentation only: collapsing never submits a game command or hides required choices. */
export function ActionTray({ title, titleId, budget, phaseControl, collapsed, busy, onToggle, children, className = '' }: Props) {
  const contentId = `${titleId}-actions`;
  return <section className={`action-tray ${className}`} aria-labelledby={titleId} aria-busy={busy}>
    <div className="tray-heading">
      <div className="tray-status"><h2 id={titleId} aria-live="polite">{title}</h2>{budget}</div>
      <div className="tray-tools">
        {phaseControl}
        <button type="button" className="tray-toggle" aria-expanded={!collapsed} aria-controls={contentId} onClick={onToggle}>
          {collapsed ? 'Show actions' : 'Hide actions'}<span aria-hidden="true">{collapsed ? '＋' : '−'}</span>
        </button>
      </div>
    </div>
    <div id={contentId} hidden={collapsed}>{children}</div>
  </section>;
}
