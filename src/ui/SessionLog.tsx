import { useLayoutEffect, useRef, useState } from 'react';
import type { SessionEntry } from '../session/sampleSession';

export function SessionLog({ entries }: { entries: readonly SessionEntry[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const [readingHistory, setReadingHistory] = useState(false);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (element && followLatest.current) element.scrollTop = element.scrollHeight;
  }, [entries]);

  function trackScroll() {
    const element = viewport.current;
    if (!element) return;
    followLatest.current = element.scrollHeight - element.clientHeight - element.scrollTop < 24;
    setReadingHistory(!followLatest.current);
  }

  function jumpToLatest() {
    const element = viewport.current;
    if (!element) return;
    followLatest.current = true;
    setReadingHistory(false);
    element.scrollTop = element.scrollHeight;
    element.focus({ preventScroll: true });
  }

  return (
    <section className="history-panel" aria-labelledby="history-title">
      <div className="history-heading">
        <div><p className="eyebrow">FIELD NOTES</p><h2 id="history-title">Session log</h2></div>
        <span className="small-label">This session only · resets on reload</span>
      </div>
      <div className="history-viewport" ref={viewport} onScroll={trackScroll} role="log"
        aria-label="Session history" aria-live="polite" aria-relevant="additions" aria-atomic="false" tabIndex={0}>
        <ol className="history-messages">
          {entries.map(entry => entry.kind === 'start' ? (
            <li key={entry.id} className="history-turn"><span>TURN {entry.turn}</span><p>{entry.message}</p></li>
          ) : (
            <li key={entry.id} className="history-message">
              <span className="message-avatar" aria-hidden="true">E</span>
              <div className="message-bubble"><span className="message-author">Practice explorer <span>· Turn {entry.turn}</span></span><p>{entry.message}</p></div>
            </li>
          ))}
        </ol>
      </div>
      <div className="history-footer"><span>Read back through your moves.</span>
        <button className="latest-button" disabled={!readingHistory} onClick={jumpToLatest}>{readingHistory ? 'Jump to latest ↓' : 'Up to date'}</button>
      </div>
    </section>
  );
}
