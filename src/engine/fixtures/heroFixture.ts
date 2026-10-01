import type { GameData } from '../../data/gameData';
import { fighterFixture } from './fighterFixture';

/** Invented names and component prose; numbered destinations exercise all d20 outcomes. */
export function heroFixture(): GameData {
  const data = fighterFixture();
  for (let number = 5; number <= 20; number++) {
    const id = `room-${number}`;
    data.board.locations.push({ id, number, kind: 'numbered', name: `Test room ${number}` });
    data.board.edges.push({ from: number === 5 ? 'd' : `room-${number - 1}`, to: id, kind: 'ordinary' });
  }
  const outcomes = [
    { min: 1, max: 1, effect: 'Synthetic fail' },
    { min: 2, max: 8, effect: 'Synthetic low' },
    { min: 9, max: 15, effect: 'Synthetic middle' },
    { min: 16, max: 19, effect: 'Synthetic high' },
    { min: 20, max: 20, effect: 'Synthetic critical' },
  ];
  data.heroes = ['bard', 'cleric', 'fighter', 'rogue', 'wizard'].map((role, index) => ({
    id: `hero-${role}`, name: `Test ${role}`, actions: 4, start: ['b', 'b', 'b', 'b', 'b'][index],
    specialAction: 'Synthetic ability', outcomes: structuredClone(outcomes),
  }));
  return data;
}
