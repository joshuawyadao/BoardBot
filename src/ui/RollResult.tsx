import type { GameData } from '../data/gameData';
import type { D20Result } from '../engine/decisionPolicies';
import type { GameView } from '../engine/horrifiedGame';
import { DieArtwork } from './TabletopPieces';
import './rollResult.css';

type Hero = GameData['heroes'][number];

function rangeLabel(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

function signed(value: number): string {
  return value < 0 ? `−${Math.abs(value)}` : `+${value}`;
}

/** The verified local Hero data supplies both ranges and effects. */
export function SpecialActionGuide({ hero, result }: { hero: Hero; result?: number }) {
  return <section className="roll-guide" aria-label={`${hero.name} special action outcomes`} data-testid="special-action-guide">
    <p className="roll-guide-intro">{hero.specialAction}</p>
    <table>
      <caption>Special action d20 outcomes</caption>
      <thead><tr><th scope="col">Roll</th><th scope="col">Effect</th></tr></thead>
      <tbody>{hero.outcomes.map(outcome => {
        const matches = result !== undefined && result >= outcome.min && result <= outcome.max;
        return <tr key={`${outcome.min}-${outcome.max}`} className={matches ? 'roll-guide-match' : undefined}
          aria-current={matches ? 'true' : undefined}>
          <th scope="row">{rangeLabel(outcome.min, outcome.max)}</th><td>{matches && <strong className="roll-guide-applied">Applied result · </strong>}{outcome.effect}</td>
        </tr>;
      })}</tbody>
    </table>
    <p className="roll-guide-note">Modifiers can change the total. Use the effective result, limited to 1–20, to find the outcome.</p>
  </section>;
}

function matchingSpecialOutcome(hero: Hero | undefined, reason: string, result: D20Result): string | null {
  if (!hero) return null;
  const role = hero.id.replace(/^hero-/, '');
  const expectedReason = `${role[0]?.toUpperCase() ?? ''}${role.slice(1)} special action`;
  if (reason !== expectedReason) return null;
  return hero.outcomes.find(outcome => result.effectiveResult >= outcome.min && result.effectiveResult <= outcome.max)?.effect ?? null;
}

/** Shows public, already committed arithmetic; pending responses may still change it. */
export function RollResult({ game, data, compact = false }: { game: GameView; data: GameData; compact?: boolean }) {
  const pending = game.currentRoll !== null;
  const roll = game.currentRoll ?? game.rolls.at(-1);
  if (!roll) return null;

  const hero = data.heroes.find(candidate => candidate.id === game.hero.definitionId);
  const effect = matchingSpecialOutcome(hero, roll.reason, roll.result);
  return <div className={`roll-result${compact ? ' roll-result-compact' : ''}`} role="group" aria-label={compact ? 'Roll summary' : 'Roll result'} tabIndex={compact ? undefined : 0} data-testid="roll-result">
    <div className="roll-result-heading">
      <div><strong data-testid="roll-status">{pending ? 'Awaiting response' : 'Last roll'}</strong>
        <span className="roll-result-reason">{roll.reason} · Turn {roll.turn}</span></div>
      <span className="roll-result-value" role="img" aria-label={`Effective result ${roll.result.effectiveResult}`}>
        <DieArtwork face={roll.result.effectiveResult} />
        <span className="sr-only" data-testid="roll-effective">{roll.result.effectiveResult}</span>
      </span>
    </div>
    {!compact && <p className="roll-result-math" data-testid="roll-arithmetic">
      Die <strong>{roll.result.base}</strong>
      {roll.result.modifiers.map((modifier, index) => <span key={index}> {signed(modifier)}</span>)}
      <span> = <strong>{roll.result.adjustedTotal}</strong> total</span>
      <span className="roll-result-bound"> → <strong>{roll.result.effectiveResult}</strong> effective (1–20)</span>
    </p>}
    {!compact && effect && <p className="roll-result-effect" data-testid="roll-special-effect">
      <strong>{pending ? 'If kept: ' : 'Outcome: '}</strong>{effect}
    </p>}
    {!compact && effect && hero && <SpecialActionGuide hero={hero} result={roll.result.effectiveResult} />}
  </div>;
}
