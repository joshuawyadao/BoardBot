import { useId } from 'react';
import './tabletopPieces.css';

export type PieceKind = 'hero' | 'beholder' | 'displacer' | 'item' | 'citizen' | 'lair' | 'perk';

type ArtworkProps = { kind: PieceKind; variant?: string; revealed?: boolean; className?: string };
type ItemProps = { name: string; color: string; className?: string };
type DieProps = { face: number | 'hit' | 'power' | 'blank'; className?: string };

const classes = (base: string, extra?: string) => extra ? `${base} ${extra}` : base;

function Standee({ variant = 'adventurer', citizen = false, id }: { variant?: string; citizen?: boolean; id: string }) {
  const role = variant.toLowerCase().replace(/^hero-/, '');
  const cloak = citizen ? '#80918e' : ({ fighter: '#a55e47', bard: '#81659a', cleric: '#c4a66d', rogue: '#526c60', wizard: '#546f9b' }[role] ?? '#657d79');
  const trim = citizen ? '#d8bca0' : '#e4ca91';
  return <>
    <defs><linearGradient id={`${id}-cloak`} x1="0" y1="0" x2="1" y2=".18"><stop stopColor={trim} /><stop offset=".13" stopColor={cloak} /><stop offset=".58" stopColor={cloak} /><stop offset="1" stopColor="#26313a" /></linearGradient></defs>
    <ellipse cx="53" cy="104" rx="37" ry="4" fill="#101920" opacity=".37" />
    <path d="M16 91q34-10 68 0v9q-34 10-68 0z" fill={citizen ? `url(#${id}-neutral-side)` : `url(#${id}-blue-side)`} stroke="#14222b" strokeWidth="1.5" />
    <ellipse cx="50" cy="91" rx="34" ry="8" fill={citizen ? `url(#${id}-neutral-top)` : `url(#${id}-blue-top)`} stroke="#172b38" strokeWidth="2" />
    <path d="M22 91q27-8 55-1" fill="none" stroke="#e5e7db" strokeWidth="1.7" opacity=".48" />
    <path d="M47 84h6v11h-6z" fill="#ad9172" stroke="#5e5146" strokeWidth="1.5" />
    <path d="M32 82 29 65 35 44 40 35 47 33 54 33 62 37 68 62 66 82 56 87 42 87z" fill="#bba384" stroke="#514d42" strokeWidth="2" strokeLinejoin="round" />
    <path d="M33 79 36 50 42 40 59 40 65 50 67 79 55 85 43 85z" fill={`url(#${id}-cloak)`} stroke="#354148" strokeWidth="2" strokeLinejoin="round" />
    <path d="M39 47q-3 18-3 29l7 6 4-37z" fill="#fff1cc" opacity=".14" />
    <path d="M60 42q9 22 7 37l-11 6q8-20 4-43z" fill="#111b25" opacity=".28" />
    <path d="M41 48q9 6 18 0M39 76q10 4 22 0" fill="none" stroke={trim} strokeWidth="2" opacity=".8" />
    <path d="M38 41 34 55 25 63 24 69 30 71 39 62 44 45M62 42 67 55 75 63 76 68 71 70 62 61 57 45" fill={cloak} stroke="#364147" strokeWidth="2" strokeLinejoin="round" />
    <path d="M43 26q0-11 8-11 9 0 9 11l-2 9q-6 6-14 0z" fill={`url(#${id}-skin)`} stroke="#544741" strokeWidth="2" />
    <path d="M45 29q2 7 6 8" fill="none" stroke="#f7d2a4" strokeWidth="1.6" opacity=".65" />
    <path d="M42 25q1-12 10-13 9 2 9 14l-4-3-4-5-7 6z" fill={citizen ? '#665a4e' : '#3b3e43'} />
    {role === 'fighter' && !citizen && <><path d="M46 13 50 8 54 13 63 17 62 24 39 24 39 17z" fill="#abb7bb" stroke="#46535a" strokeWidth="2" /><path d="M76 38v39M70 47l6-11 6 11" fill="none" stroke="#d8dce0" strokeWidth="3" strokeLinecap="round" /></>}
    {role === 'bard' && !citizen && <><path d="M42 15q12-10 20 1l-4 6H42z" fill="#743f61" /><path d="M76 52q7 2 3 10-2 6-8 4-8-5-5-10 2-6 10-4zM72 52l6-13" fill="#c08d50" stroke="#634a36" strokeWidth="2" /></>}
    {role === 'cleric' && !citizen && <><path d="M40 18q10-12 21 0l4 29-8-10-15 0-7 10z" fill="#e1d7b2" stroke="#72674e" strokeWidth="2" /><path d="M49 48v15M44 53h10" stroke="#f0dfab" strokeWidth="3" /></>}
    {role === 'rogue' && !citizen && <><path d="M35 27q1-18 16-18 15 1 17 20L59 38l-3-15-13 0-4 15z" fill="#344b48" stroke="#263638" strokeWidth="2" /><path d="M29 60 22 72M25 61l8 8" stroke="#d0d4cd" strokeWidth="2" /></>}
    {role === 'wizard' && !citizen && <><path d="M34 26 50 4 65 26q-15 6-31 0z" fill="#324d77" stroke="#dbc890" strokeWidth="2" /><path d="M75 33v46M68 35l7-8 7 8z" fill="#c7b585" stroke="#6d6049" strokeWidth="2" /><circle cx="75" cy="26" r="4" fill="#c2d9dc" /></>}
    {(citizen || !['fighter', 'bard', 'cleric', 'rogue', 'wizard'].includes(role)) && <path d="M41 40q9 6 18 0l3 7q-12 7-24 0z" fill={trim} opacity=".75" />}
  </>;
}

function Beholder({ id }: { id: string }) {
  return <>
    <ellipse cx="53" cy="104" rx="38" ry="4" fill="#101920" opacity=".4" />
    <path d="M16 91q34-10 68 0v10q-34 10-68 0z" fill={`url(#${id}-monster-side)`} stroke="#0e171b" strokeWidth="1.5" />
    <ellipse cx="50" cy="91" rx="34" ry="8" fill={`url(#${id}-monster-top)`} stroke="#0e171b" strokeWidth="2" />
    <path d="M21 91q26-9 56-1" fill="none" stroke="#969b91" strokeWidth="1.7" opacity=".48" />
    <path d="M47 84h6v10h-6z" fill="#242c2b" />
    <g fill="none" stroke={`url(#${id}-stalk)`} strokeWidth="7" strokeLinecap="round"><path d="M27 42 19 25M37 32 31 13M48 29 49 10M61 31 70 13M71 41 83 27" /></g>
    <g fill="#d6b78d" stroke="#672e32" strokeWidth="2"><ellipse cx="18" cy="24" rx="6" ry="5"/><ellipse cx="30" cy="13" rx="6" ry="5"/><ellipse cx="49" cy="10" rx="6" ry="5"/><ellipse cx="70" cy="13" rx="6" ry="5"/><ellipse cx="83" cy="27" rx="6" ry="5"/></g>
    <g fill="#241c25"><circle cx="19" cy="24" r="2"/><circle cx="31" cy="13" r="2"/><circle cx="49" cy="10" r="2"/><circle cx="69" cy="13" r="2"/><circle cx="82" cy="27" r="2"/></g>
    <path d="M23 53q0-23 27-25 27 2 28 25-2 28-28 30-25-2-27-30z" fill={`url(#${id}-beholder-body)`} stroke="#45262c" strokeWidth="3" />
    <path d="M31 40q9-12 22-11" fill="none" stroke="#ffe1bc" strokeWidth="2" opacity=".3" />
    <path d="M28 46q9-17 27-13M30 67q8 11 23 11" fill="none" stroke="#c56b56" strokeWidth="3" opacity=".55" />
    <ellipse cx="51" cy="52" rx="18" ry="16" fill={`url(#${id}-eye)`} stroke="#583d3b" strokeWidth="3" />
    <circle cx="51" cy="52" r="9" fill="#ba7b53" /><circle cx="51" cy="52" r="5" fill="#28242c" /><circle cx="47" cy="47" r="3" fill="#fff9db" />
    <path d="M38 69q12 8 26 0l-3 7q-10 6-20 0z" fill="#351f26" /><path d="M44 72v4m7-3v5m7-6v4" stroke="#e3d5b1" strokeWidth="2" />
  </>;
}

function Displacer({ id }: { id: string }) {
  return <>
    <ellipse cx="53" cy="104" rx="39" ry="4" fill="#101920" opacity=".4" />
    <path d="M14 91q36-10 72 0v10q-36 10-72 0z" fill={`url(#${id}-monster-side)`} stroke="#0b1117" strokeWidth="1.5" />
    <ellipse cx="50" cy="91" rx="36" ry="8" fill={`url(#${id}-monster-top)`} stroke="#0b1117" strokeWidth="2" />
    <path d="M20 91q28-8 61-1" fill="none" stroke="#969b91" strokeWidth="1.7" opacity=".45" />
    <path d="M23 61Q8 35 16 25t18 18M77 60q18-27 8-36T67 43" fill="none" stroke={`url(#${id}-tentacle)`} strokeWidth="8" strokeLinecap="round" />
    <circle cx="16" cy="25" r="5" fill="#5b4869" /><circle cx="85" cy="24" r="5" fill="#5b4869" />
    <path d="M66 72q22-9 20-27" fill="none" stroke="#3e304a" strokeWidth="8" strokeLinecap="round" />
    <path d="M29 58Q39 43 61 48L75 59 68 73 61 80 54 67 41 70 33 82 25 80 27 66z" fill={`url(#${id}-displacer-body)`} stroke="#2b293b" strokeWidth="3" strokeLinejoin="round" />
    <path d="M36 51q18-9 31 6l-2 10q-9-14-29-9z" fill="#a893ae" opacity=".32" />
    <path d="M30 51 29 39 39 47 53 44 66 36 64 54 56 61 38 61z" fill={`url(#${id}-displacer-head)`} stroke="#2b293b" strokeWidth="3" strokeLinejoin="round" />
    <path d="M34 53q8-4 16-1M40 67q12-6 22 0" fill="none" stroke="#8a7193" strokeWidth="2" opacity=".7" />
    <path d="M33 55h7m13-1h7" stroke="#e1b49d" strokeWidth="3" strokeLinecap="round" /><path d="M44 60l5 5 5-5" fill="#261f2d" />
    <path d="M30 78 25 89 34 90 40 78M60 76l5 13 8-1-3-17" fill="#40334e" stroke="#292838" strokeWidth="2" />
  </>;
}

function Bag({ perk = false, id }: { perk?: boolean; id: string }) {
  return <>
    <ellipse cx="54" cy="99" rx="35" ry="5" fill="#101920" opacity=".3" />
    {perk ? <><path d="M50 13 64 31 83 36 75 56 78 79 50 87 22 79 25 56 17 36 36 31z" fill={`url(#${id}-bronze-side)`} stroke="#423a30" strokeWidth="3" strokeLinejoin="round" /><path d="M50 22 62 39 72 41 68 56 70 70 50 77 30 70 32 56 28 41 39 39z" fill={`url(#${id}-bronze-top)`} stroke="#e6d4aa" strokeWidth="2" /><path d="M50 37 54 47 64 50 55 56 57 67 50 61 43 67 45 56 36 50 46 47z" fill="#776197" /></> : <><path d="M36 26q14-7 28 0l-4 14q19 20 13 42-18 13-46 0-6-22 13-42z" fill={`url(#${id}-bag)`} stroke="#4d3a2d" strokeWidth="3" strokeLinejoin="round" /><path d="M29 78q18 12 42 1" fill="none" stroke="#eed5a7" strokeWidth="2" opacity=".32" /><path d="M31 72q17 12 40 0M34 58q16 10 32 0" fill="none" stroke="#b88d60" strokeWidth="3" opacity=".55" /><path d="M37 39q13 5 26 0l-2 8q-11 4-22 0z" fill="#6a4936" stroke="#d0aa73" strokeWidth="2" /><path d="M40 28q-7-11 1-16 7-3 11 8 6-9 12-5 6 7-4 14" fill="none" stroke="#6b4a33" strokeWidth="6" strokeLinecap="round" /><path d="M60 42q-3 8 3 17" fill="none" stroke="#d1ae73" strokeWidth="3" strokeLinecap="round" /></>}
  </>;
}

function Lair({ revealed = false, id }: { revealed?: boolean; id: string }) {
  return <>
    <ellipse cx="52" cy="101" rx="43" ry="5" fill="#101920" opacity=".31" />
    <path d="M30 11h40l21 21v43L70 98H30L9 75V32z" fill={`url(#${id}-bronze-side)`} stroke="#322b27" strokeWidth="3" />
    <path d="M31 15h38l18 18v39L69 90H31L13 72V33z" fill={revealed ? `url(#${id}-monster-top)` : `url(#${id}-bronze-top)`} stroke="#e3cfaa" strokeWidth="2" />
    <path d="M32 22h36l12 12v37L68 83H32L20 71V34z" fill={revealed ? '#3f3c46' : '#9b886d'} stroke={revealed ? '#9d8e82' : '#d8c19a'} strokeWidth="2" />
    {revealed ? <><path d="M26 67 40 44 50 56 62 34 75 69z" fill="#777180" /><path d="M36 70q14-19 28 0z" fill="#181f29" /><path d="M43 60 50 53 57 60" fill="none" stroke="#d5a66c" strokeWidth="2" /><circle cx="50" cy="70" r="2" fill="#d6af76" /></> : <><path d="M50 29 67 43 62 65 50 75 38 65 33 43z" fill="none" stroke="#ddc89d" strokeWidth="3" /><path d="M50 35v35M38 46l12 12 12-12" fill="none" stroke="#ddc89d" strokeWidth="3" strokeLinecap="round" /></>}
  </>;
}

export function PieceArtwork({ kind, variant, revealed, className }: ArtworkProps) {
  const id = useId().replace(/:/g, '');
  return <svg className={classes(`tabletop-art tabletop-art--${kind}`, className)} viewBox="0 0 100 110" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-blue-side`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#426b85" /><stop offset="1" stopColor="#102d42" /></linearGradient>
      <linearGradient id={`${id}-blue-top`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a2d0e2" /><stop offset=".43" stopColor="#598ead" /><stop offset="1" stopColor="#2c5269" /></linearGradient>
      <linearGradient id={`${id}-neutral-side`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#65767b" /><stop offset="1" stopColor="#2b3b41" /></linearGradient>
      <linearGradient id={`${id}-neutral-top`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d9e0d8" /><stop offset=".48" stopColor="#9aaaa8" /><stop offset="1" stopColor="#596d73" /></linearGradient>
      <linearGradient id={`${id}-monster-side`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#454750" /><stop offset="1" stopColor="#0c1119" /></linearGradient>
      <linearGradient id={`${id}-monster-top`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a6a49f" /><stop offset=".4" stopColor="#53545a" /><stop offset="1" stopColor="#25252d" /></linearGradient>
      <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f3d3a6" /><stop offset=".55" stopColor="#d4a780" /><stop offset="1" stopColor="#7c594c" /></linearGradient>
      <linearGradient id={`${id}-stalk`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#dd8263" /><stop offset=".35" stopColor="#943946" /><stop offset="1" stopColor="#4b2534" /></linearGradient>
      <radialGradient id={`${id}-beholder-body`} cx=".28" cy=".2" r=".83"><stop stopColor="#e29370" /><stop offset=".32" stopColor="#ab4750" /><stop offset=".72" stopColor="#762b3b" /><stop offset="1" stopColor="#301e2b" /></radialGradient>
      <radialGradient id={`${id}-eye`} cx=".3" cy=".26" r=".85"><stop stopColor="#fff9dc" /><stop offset=".58" stopColor="#e9dbb4" /><stop offset="1" stopColor="#a68f79" /></radialGradient>
      <linearGradient id={`${id}-tentacle`} x1="0" y1="0" x2="1" y2=".25"><stop stopColor="#9b80a5" /><stop offset=".4" stopColor="#584567" /><stop offset="1" stopColor="#29283c" /></linearGradient>
      <linearGradient id={`${id}-displacer-body`} x1="0" y1="0" x2=".9" y2="1"><stop stopColor="#a083ad" /><stop offset=".36" stopColor="#665074" /><stop offset="1" stopColor="#29283b" /></linearGradient>
      <linearGradient id={`${id}-displacer-head`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a48baa" /><stop offset=".45" stopColor="#614b70" /><stop offset="1" stopColor="#292638" /></linearGradient>
      <linearGradient id={`${id}-bag`} x1="0" y1="0" x2="1" y2=".1"><stop stopColor="#d5ad72" /><stop offset=".32" stopColor="#a77549" /><stop offset=".72" stopColor="#855b3d" /><stop offset="1" stopColor="#493b31" /></linearGradient>
      <linearGradient id={`${id}-bronze-side`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#a1875e" /><stop offset="1" stopColor="#3f322a" /></linearGradient>
      <linearGradient id={`${id}-bronze-top`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f1dcb0" /><stop offset=".55" stopColor="#bca478" /><stop offset="1" stopColor="#76634c" /></linearGradient>
    </defs>
    {kind === 'hero' && <Standee variant={variant} id={id} />}
    {kind === 'citizen' && <Standee citizen id={id} />}
    {kind === 'beholder' && <Beholder id={id} />}
    {kind === 'displacer' && <Displacer id={id} />}
    {kind === 'item' && <Bag id={id} />}
    {kind === 'perk' && <Bag perk id={id} />}
    {kind === 'lair' && <Lair revealed={revealed} id={id} />}
  </svg>;
}

function itemShape(name: string) {
  const value = name.toLowerCase();
  if (/mace|hammer|club/.test(value)) return <><path d="M41 45 29 29l7-15 27 1 12 15-14 18z" fill="#acb6b8" stroke="#536268" strokeWidth="3" /><path d="M50 45v39" stroke="#79513b" strokeWidth="10" strokeLinecap="round" /><path d="M40 25h23M43 18v21m14-21v21" stroke="#d4d4c4" strokeWidth="3" /></>;
  if (/staff|wand|spear|trident/.test(value)) return <><path d="M49 30v55" stroke="#86633e" strokeWidth="7" strokeLinecap="round" /><path d="M49 10 62 25 49 40 36 25z" fill="#aac4c7" stroke="#b89457" strokeWidth="4" /></>;
  if (/dagger|knife|sword|blade|rapier|axe/.test(value)) return <><path d="M51 14 61 52 53 60 45 52z" fill="#dce0d9" stroke="#657578" strokeWidth="3" /><path d="M35 57h35M49 59v25h9V59" fill="none" stroke="#6b4b37" strokeWidth="8" strokeLinecap="round" /><circle cx="53" cy="87" r="4" fill="#cda66b" /></>;
  if (/whip|rope|cord|lash/.test(value)) return <><path d="M31 75q-12-11-2-19 9-7 19 4 12 12 25-1 15-15-3-32-9-8-15-14" fill="none" stroke="#79563d" strokeWidth="8" strokeLinecap="round" /><path d="M31 75 23 87" stroke="#d0ad79" strokeWidth="5" strokeLinecap="round" /></>;
  if (/candle|torch|lantern|lamp/.test(value)) return <><path d="M47 39h12v40H47z" fill="#e5d2a7" stroke="#736149" strokeWidth="3" /><path d="M42 80h22l5 7H37z" fill="#ae8657" stroke="#624c3b" strokeWidth="2" /><path d="M53 36q-12-10-3-24 4 9 8 12 5 8-5 12z" fill="#eab66e" stroke="#aa633d" strokeWidth="2" /></>;
  if (/amulet|pendant|charm|necklace|jewel|gem/.test(value)) return <><path d="M27 23q1 31 23 35 23-4 23-35" fill="none" stroke="#d3b078" strokeWidth="4" /><path d="M50 48 64 62 50 82 36 62z" fill="#73969a" stroke="#e4cc8e" strokeWidth="4" /><path d="M50 53v23M39 62h22" stroke="#c0dde0" strokeWidth="2" /></>;
  if (/book|scroll|tome|map|letter/.test(value)) return <><path d="M25 29q14-6 25 2 11-8 25-2v48q-15-6-25 3-10-9-25-3z" fill="#dfc99c" stroke="#76583a" strokeWidth="3" /><path d="M50 31v49M31 42h13m-13 8h12m13-8h13m-13 8h12" stroke="#a6845e" strokeWidth="2" /></>;
  if (/shield|armor|helm/.test(value)) return <><path d="M50 16 74 27v25q-3 21-24 31-21-10-24-31V27z" fill="#8a9798" stroke="#d2bc8d" strokeWidth="4" /><path d="M50 23v52M31 42h38" stroke="#d4d9cc" strokeWidth="4" /></>;
  if (/potion|flask|vial|bottle|elixir/.test(value)) return <><path d="M42 16h16v14l9 11v35q-17 11-34 0V41l9-11z" fill="#a7bfc0" stroke="#52656b" strokeWidth="3" /><path d="M36 53q14 6 28 0v20q-14 8-28 0z" fill="#9f627d" /><path d="M41 15h18" stroke="#c79d69" strokeWidth="6" /></>;
  if (/key|lock/.test(value)) return <><circle cx="41" cy="36" r="16" fill="none" stroke="#d3ad6f" strokeWidth="8" /><path d="M50 48 71 73l-6 6-7-7-6 6-7-7" fill="none" stroke="#d3ad6f" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /></>;
  return <><path d="M32 33q17-12 36 0v43q-17 12-36 0z" fill="#b88855" stroke="#654b35" strokeWidth="3" /><path d="M36 41q14 7 28 0M36 68q14 7 28 0" fill="none" stroke="#e0bc81" strokeWidth="3" /><path d="M50 43 59 52 50 61 41 52z" fill="#d8cfaa" /></>;
}

export function ItemArtwork({ name, color, className }: ItemProps) {
  return <svg className={classes('tabletop-item-art', className)} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={{ '--item-color': color } as React.CSSProperties}>
    <ellipse cx="50" cy="91" rx="34" ry="5" fill="#151d21" opacity=".23" />
    <path d="M15 28 30 13h40l15 15v47L70 90H30L15 75z" fill="#5b4637" stroke="#332b27" strokeWidth="3" />
    <path d="M20 30 32 18h36l12 12v43L68 85H32L20 73z" fill="var(--item-color, #b59466)" stroke="#dac49a" strokeWidth="2" />
    <circle cx="50" cy="51" r="32" fill="#e1d2b1" opacity=".68" />
    {itemShape(name)}
  </svg>;
}

export function DieArtwork({ face, className }: DieProps) {
  const numeric = typeof face === 'number';
  return <svg className={classes('tabletop-die', className)} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <ellipse cx="50" cy="92" rx="34" ry="6" fill="#101922" opacity=".3" />
    {numeric ? <>
      <path d="M50 5 79 19 91 50 75 81 50 93 22 80 9 50 22 19z" fill="#183e67" stroke="#0d263f" strokeWidth="3" strokeLinejoin="round" />
      <path d="M50 5 22 19 35 48 50 24 65 48 79 19z" fill="#4c86ad" /><path d="M9 50 22 19 35 48 22 80zM91 50 79 19 65 48 75 81z" fill="#245b88" /><path d="M22 80 35 48 50 84 65 48 75 81 50 93z" fill="#174772" />
      <path d="M50 5v19M22 19l13 29-26 2m70-31L65 48l26 2M35 48l15-24 15 24-15 36zM22 80l13-32m40 33L65 48M50 84v9" fill="none" stroke="#9fc2d1" strokeWidth="1.5" opacity=".75" />
      <text x="50" y="59" textAnchor="middle" fill="#f5f0d9" fontFamily="Georgia, serif" fontSize="29" fontWeight="700" stroke="#143552" strokeWidth="1.5" paintOrder="stroke">{face}</text>
    </> : <>
      <path d="M19 22 36 11h47v59L66 83H19z" fill="#11191e" stroke="#090f13" strokeWidth="3" strokeLinejoin="round" />
      <path d="M19 22h47v61H19z" fill="#30353a" stroke="#697078" strokeWidth="2" /><path d="M66 22 83 11v59L66 83z" fill="#191f25" /><path d="M19 22 36 11h47L66 22z" fill="#50555a" />
      {face === 'hit' && <><path d="M31 39h23l-7 8h12l-28 23 8-16H29z" fill="#d5a570" stroke="#f4d3a0" strokeWidth="2" strokeLinejoin="round" /><circle cx="51" cy="51" r="24" fill="none" stroke="#c39563" strokeWidth="2" opacity=".6" /></>}
      {face === 'power' && <><path d="M43 34 56 47 48 53 58 62 45 72 31 54z" fill="#ba91b7" stroke="#e0c3da" strokeWidth="2" strokeLinejoin="round" /><path d="M51 33 43 46M57 58l7-8" stroke="#e0c3da" strokeWidth="4" strokeLinecap="round" /></>}
      {face === 'blank' && <><circle cx="43" cy="52" r="18" fill="none" stroke="#89929a" strokeWidth="2" /><path d="M32 63 55 40" stroke="#89929a" strokeWidth="2" /></>}
    </>}
  </svg>;
}
