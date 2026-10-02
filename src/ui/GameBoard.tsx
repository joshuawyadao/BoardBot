import type { RefObject } from 'react';
import { useMemo } from 'react';
import type { GameData } from '../data/gameData';
import type { GameView } from '../engine/horrifiedGame';
import { BOARD_HEIGHT, BOARD_WIDTH, NODE_HEIGHT, NODE_WIDTH, boardPositions, boardRoutes, isPhysicalBoard } from './boardLayout';
import './gameBoard.css';

interface Props {
  data: GameData;
  game: GameView;
  moving: boolean;
  locked: boolean;
  onMove: (destination: string) => void;
  buttonRefs: RefObject<Map<string, HTMLButtonElement>>;
}

const regions = [
  { label: 'WATERDEEP', x: 490, y: 42, className: 'waterdeep' },
  { label: 'ARCANE CHAMBERS', x: 175, y: 367, className: 'arcane' },
  { label: 'DUNGEON LEVEL', x: 900, y: 360, className: 'dungeon' },
  { label: 'SKULLPORT', x: 330, y: 735, className: 'skullport' },
  { label: 'WYLLOWWOOD', x: 835, y: 615, className: 'wyllowwood' },
];

function routePath(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
}

export function GameBoard({ data, game, moving, locked, onMove, buttonRefs }: Props) {
  const positions = useMemo(() => boardPositions(data), [data]);
  const routes = useMemo(() => boardRoutes(data, positions), [data, positions]);
  const targets = new Set(game.moveDestinations);
  const current = game.hero.location;
  const heroName = data.heroes.find(hero => hero.id === game.hero.definitionId)?.name ?? 'Hero';
  const showTeleport = moving && !!current;
  const physical = isPhysicalBoard(data);
  const wizardDestination = game.pending?.destination ?? null;

  return <div className="game-board h-game-board" aria-label="Game board">
    <svg className="game-board-svg" viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-label="Board locations and paths">
      <rect className="game-board-bg" x="1" y="1" width={BOARD_WIDTH - 2} height={BOARD_HEIGHT - 2} rx="22" />
      {physical && <>
        <path className="game-board-zone waterdeep" d="M16 18 H984 V325 Q780 337 625 337 Q515 345 425 345 L425 450 H255 V345 Q120 340 16 335 Z" />
        <path className="game-board-zone arcane" d="M16 350 Q130 345 245 350 L245 458 H435 V350 Q530 345 620 350 L590 625 Q330 645 16 625 Z" />
        <path className="game-board-zone dungeon" d="M628 345 H984 V615 H610 Z" />
        <path className="game-board-zone skullport" d="M16 640 H595 V833 H16 Z" />
        <path className="game-board-zone wyllowwood" d="M610 625 H984 V833 H610 Z" />
        {regions.map(region => <text key={region.label} className={`game-board-region ${region.className}`} x={region.x} y={region.y} textAnchor="middle">{region.label}</text>)}
      </>}
      <g className="game-board-routes" aria-hidden="true">
        {routes.filter(route => route.kind !== 'teleport' || (showTeleport && (route.from === current || route.to === current))).map((route, index) => {
          if (!route.points.length) return null;
          const highlighted = moving && !!current && (route.from === current && targets.has(route.to) || route.to === current && targets.has(route.from));
          const kind = route.kind === 'ordinary' ? 'ordinary' : route.kind;
          const path = routePath(route.points);
          return <g key={`${route.from}-${route.to}-${index}`} className={`game-board-route ${kind}${highlighted ? ' highlighted' : ''}`}>
            <path className="route-gap" d={path} />
            <path className="route-line" d={path} />
          </g>;
        })}
      </g>
      {data.board.locations.map(location => {
        const position = positions.get(location.id);
        if (!position) return null;
        const isCurrent = current === location.id;
        const isWizardDestination = wizardDestination === location.id;
        const canMove = moving && !locked && targets.has(location.id);
        const itemCount = game.boardItems[location.id]?.length ?? 0;
        const citizens = Object.values(game.citizens).filter(citizen => citizen.status === 'board' && citizen.location === location.id).length;
        const hasBeholder = game.monsters.beholder.location === location.id && !game.monsters.beholder.defeated;
        const hasDisplacer = game.monsters.displacerBeast.location === location.id && !game.monsters.displacerBeast.defeated;
        const lair = game.lairs[location.id];
        const details = [
          isCurrent ? heroName : null,
          hasBeholder ? 'Beholder' : null,
          hasDisplacer ? 'Displacer Beast' : null,
          itemCount ? `${itemCount} Item${itemCount === 1 ? '' : 's'}` : null,
          citizens ? `${citizens} Citizen${citizens === 1 ? '' : 's'}` : null,
          lair ? `${lair.revealed ? 'Revealed' : 'Unrevealed'} Lair` : null,
        ].filter(Boolean) as string[];
        const displayName = location.kind === 'circle' ? 'Teleport circle' : location.name.replace('The Yawning Portal: ', '').replace('Stairway to Arcane Chambers', 'Stairway');
        const title = `${location.name}${details.length ? `. ${details.join(', ')}` : ''}${isWizardDestination ? '. Wizard Monster destination' : ''}${canMove ? '. Reachable Move destination' : ''}`;
        return <foreignObject key={location.id} x={position.x - NODE_WIDTH / 2} y={position.y - NODE_HEIGHT / 2} width={NODE_WIDTH} height={NODE_HEIGHT}>
          <button type="button" className={`h-location game-board-node ${location.kind}${isCurrent ? ' current' : ''}${canMove ? ' reachable' : ''}${isWizardDestination ? ' wizard-destination' : ''}`}
            ref={element => { if (element) buttonRefs.current.set(location.id, element); else buttonRefs.current.delete(location.id); }}
            aria-label={title} aria-disabled={!canMove} title={title}
            onClick={() => { if (canMove) onMove(location.id); }}>
            <span className="h-node-name">{location.number ? <b className="game-board-number">{location.number}</b> : null}{displayName}</span>
            <span className="game-board-pieces" aria-hidden="true">
              {isCurrent && <span className="piece piece-hero">H</span>}
              {hasBeholder && <span className="piece piece-beholder">B</span>}
              {hasDisplacer && <span className="piece piece-displacer">D</span>}
              {itemCount > 0 && <span className="piece piece-item">I{itemCount}</span>}
              {citizens > 0 && <span className="piece piece-citizen">C{citizens}</span>}
              {lair && <span className={`piece piece-lair${lair.revealed ? ' revealed' : ''}`}>L</span>}
            </span>
          </button>
        </foreignObject>;
      })}
    </svg>
    <div className="h-map-key game-board-key" aria-label="Board key">
      <span><i className="key-line" /> Ordinary route</span>
      <span><i className="key-line passage" /> Passage</span>
      <span><i className="key-circle" /> Teleport network</span>
      <span><i className="key-current" /> Your Hero</span>
      <span><i className="key-reachable" /> Move destination</span>
      {wizardDestination && <span><i className="key-wizard-destination" /> Wizard destination</span>}
      <span><i className="piece piece-hero">H</i> Hero</span>
      <span><i className="piece piece-beholder">B</i> Beholder</span>
      <span><i className="piece piece-displacer">D</i> Displacer Beast</span>
      <span><i className="piece piece-item">I</i> Items</span>
      <span><i className="piece piece-citizen">C</i> Citizens</span>
      <span><i className="piece piece-lair">L</i> Lair (filled = revealed)</span>
    </div>
  </div>;
}
