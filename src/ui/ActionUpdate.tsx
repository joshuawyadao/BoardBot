import { useState } from 'react';
import type { GameView } from '../engine/horrifiedGame';
import type { HeroAction } from '../engine/horrifiedRuntime';
import './actionFeedback.css';

const actionNames: Record<HeroAction['kind'], string> = {
  move: 'Move', guide: 'Guide', 'pick-up': 'Pick Up', advance: 'Advance challenge',
  defeat: 'Defeat Monster', reveal: 'Reveal Lair', special: 'Special Action',
  perk: 'Perk', 'end-phase': 'Monster phase', choose: 'Choice resolved',
};
const eventNames = { setup: 'Setup', action: 'Action', phase: 'Phase', effect: 'Effect', roll: 'Roll', end: 'Game over' };
const eventSymbols = { setup: '◇', action: '↗', phase: '◷', effect: '✦', roll: '⚄', end: '⚑' };

interface Props {
  revision: number;
  events: GameView['entries'];
  action?: HeroAction['kind'];
  summary?: string;
  saving: boolean;
  pendingTitle?: string;
  changedCount: number;
  onDetails: (opener: HTMLButtonElement) => void;
}

/** Manual event review is presentation only: it never plays, rolls, or advances the game. */
export function ActionFeedback({ revision, events, action, summary, saving, pendingTitle, changedCount, onDetails }: Props) {
  const initialIndex = action ? 0 : Math.max(0, events.length - 1);
  const [cursor, setCursor] = useState({ revision, index: initialIndex });
  const index = cursor.revision === revision ? Math.min(cursor.index, Math.max(0, events.length - 1)) : initialIndex;
  const entry = events[index];
  const title = saving ? 'Saving action…' : action ? actionNames[action] : revision === 0 ? 'Board ready' : 'Saved game resumed';
  const message = saving ? 'The outcome will appear here after it has been saved.'
    : (summary && entry?.kind === 'action' && entry.message === `Used ${action}.` ? summary : entry?.message) ?? (pendingTitle ? 'The saved action is waiting for your response.' : action ? 'The action was saved. Review the board for its current position.' : 'Choose an action below the board. Its outcome will appear here.');
  return <section className={`action-feedback${saving ? ' is-saving' : ''}${pendingTitle ? ' has-choice' : ''}`} aria-label="Action update" data-revision={revision}>
    <div className="action-feedback-message" role="status" aria-live="polite" aria-atomic="true">
      <span className="action-feedback-symbol" aria-hidden="true">{saving ? '◷' : entry ? eventSymbols[entry.kind] : '◇'}</span>
      <div className="action-feedback-copy">
        <div className="action-feedback-heading"><span className="action-feedback-eyebrow">Just happened</span><strong>{title}</strong>
          {!saving && entry && <span className="action-feedback-type">{eventNames[entry.kind]} · Turn {entry.turn}</span>}</div>
        <p key={`${revision}-${entry?.id ?? 'empty'}-${saving}`}>{message}</p>
        {pendingTitle && <p className="action-feedback-choice"><strong>Your choice:</strong> {pendingTitle}</p>}
      </div>
    </div>
    <div className="action-feedback-tools">
      <div className="action-feedback-navigation" role="group" aria-label="Review action events">
        <button type="button" aria-label="Previous event" disabled={saving || index === 0} onClick={() => setCursor({ revision, index: index - 1 })}>←</button>
        <span>Event {events.length ? index + 1 : 0} of {events.length}</span>
        <button type="button" aria-label="Next event" disabled={saving || index >= events.length - 1} onClick={() => setCursor({ revision, index: index + 1 })}>→</button>
      </div>
      <button className="action-feedback-details" type="button" onClick={event => onDetails(event.currentTarget)}>Full result details</button>
      {!saving && changedCount > 0 && <span className="action-feedback-changes">◎ {changedCount} location{changedCount === 1 ? '' : 's'} changed this action</span>}
    </div>
  </section>;
}
