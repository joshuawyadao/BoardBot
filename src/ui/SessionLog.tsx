import { useId, useLayoutEffect, useRef, useState } from 'react';

interface LogEntry {
  readonly id: string | number;
  readonly turn: number;
  readonly kind: string;
  readonly message: string;
}

/** Read-only presentation of observed events; collapsing never dispatches a command. */
export function SessionLog({ entries, label = 'Session history', className = '', visible = true }: {
  entries: readonly LogEntry[]; label?: string; className?: string; visible?: boolean;
}) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const readingPosition = useRef(0);
  const [readingHistory, setReadingHistory] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element || collapsed || !visible) return;
    element.scrollTop = followLatest.current ? element.scrollHeight : readingPosition.current;
  }, [entries, collapsed, visible]);

  function trackScroll() {
    const element = viewport.current;
    if (!element || collapsed || !visible) return;
    readingPosition.current = element.scrollTop;
    followLatest.current = element.scrollHeight - element.clientHeight - element.scrollTop < 24;
    setReadingHistory(!followLatest.current);
  }

  function jumpToLatest() {
    const element = viewport.current;
    if (!element) return;
    followLatest.current = true;
    setReadingHistory(false);
    element.scrollTop = element.scrollHeight;
    readingPosition.current = element.scrollTop;
    element.focus({ preventScroll: true });
  }

  function toggle() {
    if (!collapsed && viewport.current) readingPosition.current = viewport.current.scrollTop;
    setCollapsed(value => !value);
  }

  return (
    <section className={`history-panel ${className}`} aria-labelledby={`${id}-title`}>
      <div className="history-heading">
        <h2 id={`${id}-title`}>Event log</h2>
        <button type="button" className="log-toggle" aria-expanded={!collapsed} aria-controls={`${id}-content`} onClick={toggle}>
          {collapsed ? 'Show log' : 'Hide log'}
        </button>
      </div>
      {collapsed && <p className="history-preview" aria-live="polite" title={entries.at(-1)?.message}>
        <span>Latest</span> {entries.at(-1)?.message ?? 'No events yet.'}
      </p>}
      <div id={`${id}-content`} hidden={collapsed}>
        <div className="history-viewport" ref={viewport} onScroll={trackScroll} role="log"
          aria-label={label} aria-live="polite" aria-relevant="additions" aria-atomic="false" tabIndex={0}>
          <ol className="history-messages">
            {entries.map(entry => entry.kind === 'start' ? (
              <li key={entry.id} className="history-turn"><span>TURN {entry.turn}</span><p>{entry.message}</p></li>
            ) : (
              <li key={entry.id} className="history-message">
                <div className="message-bubble"><span className="message-author">{entry.kind === 'phase' ? 'Phase' : label === 'Session history' ? 'Practice explorer' : entry.kind} <span>· Turn {entry.turn}</span></span><p>{entry.message}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="history-footer"><span>{entries.length} {entries.length === 1 ? 'event' : 'events'}</span>
          <button className="latest-button" disabled={!readingHistory} onClick={jumpToLatest}>{readingHistory ? 'Jump to latest ↓' : 'Up to date'}</button>
        </div>
      </div>
    </section>
  );
}
