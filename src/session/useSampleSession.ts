import { useEffect, useReducer } from 'react';
import type { Action } from '../engine/sampleGame';
import { createSession, reduceSession } from './sampleSession';

export function useSampleSession() {
  const [session, dispatch] = useReducer(reduceSession, undefined, createSession);
  const { game, entries, turnNumber } = session;
  const resolutionId = game.pending?.id;

  useEffect(() => {
    if (resolutionId === undefined) return;
    // The outcome is already committed. This delay only makes the locked phase visible.
    const timer = window.setTimeout(() => dispatch({ type: 'finish', id: resolutionId }), 900);
    return () => window.clearTimeout(timer);
  }, [resolutionId]);

  return {
    game,
    entries,
    turnNumber,
    confirm: (action: Action) => dispatch({ type: 'confirm', action, revision: game.revision }),
    restart: () => dispatch({ type: 'restart' }),
  };
}
