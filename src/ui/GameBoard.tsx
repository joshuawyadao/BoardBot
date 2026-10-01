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

  return <div className="game-board h-game-board" aria-label="Game board">
    <svg className="game-board-svg" viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-label="Board locations and paths">
      <rect className="game-board-bg" x="1" y="1" width={BOARD_WIDTH - 2} height={BOARD_HEIGHT - 2} rx="22" />
      {physical && <>
        <path className="game-board-zone waterdeep" d="M16 18 H984 V325 Q780 337 625 337 Q380 350 16 335 Z" />
        <path className="game-board-zone arcane" d="M16 350 Q320 330 620 350 L590 625 Q330 645 16 625 Z" />
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
        const canMove = moving && !locked && targets.has(location.id);
        const itemCount = game.boardItems[location.id]?.length ?? 0;
        const citizens = Object.values(game.citizens).filter(citizen => citizen.status === 'board' && citizen.location === location.id).length;
        const monsters = Object.entries(game.monsters).filter(([, monster]) => monster.location === location.id && !monster.defeated).map(([id]) => id === 'displacerBeast' ? 'Displacer Beast' : 'Beholder');
        const details = [
          isCurrent ? heroName : null,
          ...monsters,
          itemCount ? `${itemCount} Item${itemCount === 1 ? '' : 's'}` : null,
          citizens ? `${citizens} Citizen${citizens === 1 ? '' : 's'}` : null,
        ].filter(Boolean) as string[];
        const compactDetails = [isCurrent ? 'Hero' : null, monsters.length ? monsters.map(name => name === 'Displacer Beast' ? 'Displacer' : name).join(' + ') : null, itemCount ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : null, citizens ? `${citizens} citizen${citizens === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ');
        const displayName = location.kind === 'circle' ? 'Teleport circle' : location.name.replace('The Yawning Portal: ', '').replace('Stairway to Arcane Chambers', 'Stairway');
        const title = `${location.name}${details.length ? `. ${details.join(', ')}` : ''}${canMove ? '. Reachable Move destination' : ''}`;
        return <foreignObject key={location.id} x={position.x - NODE_WIDTH / 2} y={position.y - NODE_HEIGHT / 2} width={NODE_WIDTH} height={NODE_HEIGHT}>
          <button type="button" className={`h-location game-board-node ${location.kind}${isCurrent ? ' current' : ''}${canMove ? ' reachable' : ''}`}
            ref={element => { if (element) buttonRefs.current.set(location.id, element); else buttonRefs.current.delete(location.id); }}
            aria-label={title} aria-disabled={!canMove} title={title}
            onClick={() => { if (canMove) onMove(location.id); }}>
            <span className="h-node-name">{location.number ? <b className="game-board-number">{location.number}</b> : null}{displayName}</span>
            <span className="h-node-meta">{location.kind === 'circle' ? '◉ ' : ''}{compactDetails || (location.number ? `#${location.number}` : 'Location')}</span>
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
    </div>
  </div>;
}
