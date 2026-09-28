import { useEffect, useReducer } from 'react';
import { createGame, finishResolution, submitAction } from '../engine/sampleGame';
import type { Action, GameState } from '../engine/sampleGame';

type SessionCommand =
  | { type: 'confirm'; action: Action; revision: number }
  | { type: 'finish'; id: number }
  | { type: 'restart' };

function reduceSession(state: GameState, command: SessionCommand): GameState {
  switch (command.type) {
    case 'confirm': return submitAction(state, command.action, command.revision);
    case 'finish': return finishResolution(state, command.id);
    case 'restart': return state.phase === 'complete' ? createGame() : state;
  }
}

export function useSampleSession() {
  const [game, dispatch] = useReducer(reduceSession, undefined, createGame);
  const resolutionId = game.pending?.id;

  useEffect(() => {
    if (resolutionId === undefined) return;
    // The outcome is already committed. This delay only makes the locked phase visible.
    const timer = window.setTimeout(() => dispatch({ type: 'finish', id: resolutionId }), 900);
    return () => window.clearTimeout(timer);
  }, [resolutionId]);

  return {
    game,
    confirm: (action: Action) => dispatch({ type: 'confirm', action, revision: game.revision }),
    restart: () => dispatch({ type: 'restart' }),
  };
}
