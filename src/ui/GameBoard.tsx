import type { RefObject } from 'react';
import { useMemo } from 'react';
import type { GameData } from '../data/gameData';
import type { GameView } from '../engine/horrifiedGame';
import { BOARD_HEIGHT, BOARD_WIDTH, NODE_HEIGHT, NODE_WIDTH, boardPassages, boardPositions, boardRoutes, hasIllustratedLayout, isPhysicalBoard } from './boardLayout';
import illustratedBoard from './assets/illustrated-board-v2.png';
import { PieceArtwork } from './TabletopPieces';
import './gameBoard.css';

interface Props {
  data: GameData;
  game: GameView;
  moving: boolean;
  locked: boolean;
  onMove: (destination: string) => void;
  buttonRefs: RefObject<Map<string, HTMLButtonElement>>;
  onInspect?: (id: string) => void;
  inspectedLocation?: string | null;
  choiceDestinations?: readonly string[];
  chosenDestination?: string | null;
  onChooseDestination?: (id: string) => void;
}

const regions = [
  { label: 'WATERDEEP', x: 500, y: 25, className: 'waterdeep' },
  { label: 'ARCANE CHAMBERS', x: 295, y: 475, className: 'arcane' },
  { label: 'DUNGEON LEVEL', x: 850, y: 628, className: 'dungeon' },
  { label: 'SKULLPORT', x: 320, y: 975, className: 'skullport' },
  { label: 'WYLLOWWOOD', x: 820, y: 684, className: 'wyllowwood' },
];

function routePath(points: { x: number; y: number }[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
}

export function GameBoard({ data, game, moving, locked, onMove, buttonRefs, onInspect, inspectedLocation,
  choiceDestinations = [], chosenDestination, onChooseDestination }: Props) {
  const positions = useMemo(() => boardPositions(data), [data]);
  const routes = useMemo(() => boardRoutes(data, positions), [data, positions]);
  const targets = new Set(game.moveDestinations);
  const choices = new Set(choiceDestinations);
  const current = game.hero.location;
  const heroName = data.heroes.find(hero => hero.id === game.hero.definitionId)?.name ?? 'Hero';
  const showTeleport = moving && !!current;
  const physical = isPhysicalBoard(data);
  const illustrated = hasIllustratedLayout(data);
  const wizardDestination = game.pending?.destination ?? null;
  const passages = new Map<string, string[]>();
  boardPassages(data).forEach(({ from, to, label }) => {
    for (const id of [from, to]) passages.set(id, [...passages.get(id) ?? [], label]);
  });

  return <div className={`game-board h-game-board${illustrated ? ' illustrated' : ' schematic'}`} role="group" aria-label="Game board">
    <svg className="game-board-svg" role="group" viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-label="Board locations and paths">
      <rect className="game-board-bg" x="1" y="1" width={BOARD_WIDTH - 2} height={BOARD_HEIGHT - 2} rx="22" />
      {illustrated && <image className="game-board-art" href={illustratedBoard} x="0" y="35" width={BOARD_WIDTH} height={BOARD_HEIGHT} preserveAspectRatio="none" aria-hidden="true" />}
      {physical && <>
        {!illustrated && <>
          <path className="game-board-zone waterdeep" d="M0 35H1000V332L933 363L865 329L659 364L535 393L403 452L269 409L158 379L0 398Z" />
          <path className="game-board-zone arcane" d="M0 401L166 379L271 412L405 453L567 409L588 461L556 699L366 735L0 717Z" />
          <path className="game-board-zone dungeon" d="M623 348L831 337L1000 330V663L802 667L627 651L560 598L575 441Z" />
          <path className="game-board-zone skullport" d="M0 728L211 683L364 730L542 677L583 1000H0Z" />
          <path className="game-board-zone wyllowwood" d="M581 698L672 666L837 666L1000 643V1000H583L568 847Z" />
        </>}
        {regions.map(region => <text key={region.label} className={`game-board-region ${region.className}`} x={region.x} y={region.y} textAnchor="middle">{region.label}</text>)}
      </>}
      <g className="game-board-routes" aria-hidden="true">
        {routes.filter(route => route.kind === 'ordinary' || (showTeleport && (route.from === current || route.to === current))).map((route, index) => {
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
        const canChoose = !locked && choices.has(location.id) && !!onChooseDestination;
        const isChosen = chosenDestination === location.id;
        const isInspected = inspectedLocation === location.id;
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
        const displayName = location.name;
        const captionWidth = Math.min(154, Math.max(110, displayName.length * 5.6));
        const captionX = Math.max(4, Math.min(BOARD_WIDTH - captionWidth - 4, position.x - captionWidth / 2));
        const passageLabels = passages.get(location.id)?.join('/');
        const title = `${location.name}${passageLabels ? `. Secret passage ${passageLabels}` : ''}${details.length ? `. ${details.join(', ')}` : ''}${isWizardDestination ? '. Wizard Monster destination' : ''}${canMove ? '. Reachable Move destination' : ''}${canChoose ? '. Available Wizard destination' : ''}${isChosen ? '. Selected destination, awaiting confirmation' : ''}`;
        return <g key={location.id}>
          <ellipse className={`game-board-floor ${location.kind}${isCurrent ? ' current' : ''}${canMove ? ' reachable' : ''}${isWizardDestination ? ' wizard-destination' : ''}${choices.has(location.id) ? ' choice-available' : ''}${isChosen ? ' choice-selected' : ''}${isInspected ? ' inspected' : ''}`} cx={position.x} cy={position.y} rx={NODE_WIDTH / 2 - 2} ry={NODE_HEIGHT / 2 - 1} aria-hidden="true" />
          {location.kind === 'circle' && <ellipse className="game-board-portal-runes" cx={position.x} cy={position.y} rx={NODE_WIDTH / 2 - 7} ry={NODE_HEIGHT / 2 - 6} aria-hidden="true" />}
          <foreignObject x={position.x - NODE_WIDTH / 2} y={position.y - NODE_HEIGHT / 2} width={NODE_WIDTH} height={NODE_HEIGHT}>
          <button type="button" className={`h-location game-board-node ${location.kind}${displayName.length > 15 ? ' long-name' : ''}${passageLabels ? ' has-passage' : ''}${isCurrent ? ' current' : ''}${canMove ? ' reachable' : ''}${isWizardDestination ? ' wizard-destination' : ''}`}
            data-location-id={location.id} data-passage-label={passageLabels} data-move-enabled={canMove} data-choice-enabled={canChoose}
            ref={element => { if (element) buttonRefs.current.set(location.id, element); else buttonRefs.current.delete(location.id); }}
            aria-label={title} aria-disabled={!canMove && !canChoose && !onInspect} title={title}
            onClick={() => { if (canChoose) onChooseDestination?.(location.id); else if (canMove) onMove(location.id); else onInspect?.(location.id); }}>
            {passageLabels && <span className="game-board-passage-badge" aria-hidden="true">{passageLabels}</span>}
            {location.number ? <b className="game-board-number" aria-hidden="true">{location.number}</b> : null}
            {isChosen && <span className="game-board-selected" aria-hidden="true">✓</span>}
            <span className="game-board-pieces" aria-hidden="true">
              {isCurrent && <span className="piece piece-hero"><PieceArtwork kind="hero" variant={game.hero.definitionId} /></span>}
              {hasBeholder && <span className="piece piece-beholder"><PieceArtwork kind="beholder" /></span>}
              {hasDisplacer && <span className="piece piece-displacer"><PieceArtwork kind="displacer" /></span>}
              {itemCount > 0 && <span className="piece piece-item" data-count={itemCount}><PieceArtwork kind="item" /><b className="piece-count">×{itemCount}</b></span>}
              {citizens > 0 && <span className="piece piece-citizen" data-count={citizens}><PieceArtwork kind="citizen" />{citizens > 1 && <b className="piece-count">×{citizens}</b>}</span>}
              {lair && <span className={`piece piece-lair${lair.revealed ? ' revealed' : ''}`}><PieceArtwork kind="lair" revealed={lair.revealed} /></span>}
            </span>
          </button>
          </foreignObject>
          <foreignObject data-caption-for={location.id} x={captionX} y={position.y + 20} width={captionWidth} height="42" className="game-board-caption" aria-hidden="true">
            <span className={`h-node-name${location.kind === 'circle' ? ' portal-caption' : ''}`}>{displayName}</span>
          </foreignObject>
        </g>;
      })}
    </svg>
    <div className="h-map-key game-board-key" aria-label="Board key">
      <span><i className="key-line" /> Ordinary route</span>
      <span><i className="key-passage">A</i> Paired secret passages</span>
      <span><i className="key-circle" /> Teleport network</span>
      <span><i className="key-current" /> Your Hero</span>
      <span><i className="key-reachable" /> Move destination</span>
      {wizardDestination && <span><i className="key-wizard-destination" /> Wizard destination</span>}
      <span><i className="piece piece-hero"><PieceArtwork kind="hero" /></i> Hero</span>
      <span><i className="piece piece-beholder"><PieceArtwork kind="beholder" /></i> Beholder</span>
      <span><i className="piece piece-displacer"><PieceArtwork kind="displacer" /></i> Displacer Beast</span>
      <span><i className="piece piece-item"><PieceArtwork kind="item" /></i> Items × quantity</span>
      <span><i className="piece piece-citizen"><PieceArtwork kind="citizen" /></i> Citizens</span>
      <span><i className="piece piece-lair"><PieceArtwork kind="lair" /></i> Lair</span>
    </div>
  </div>;
}
