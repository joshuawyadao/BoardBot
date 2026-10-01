/** UI labels for the practice table. Planned entries cannot create engine commands. */
export const trayActions = [
  { id: 'move', label: 'Move', icon: '↗', caption: 'Connected location', cost: '1 action', description: 'Select Move, then click a highlighted destination to move immediately. Costs one sample action.', unavailable: null },
  { id: 'guide', label: 'Guide', icon: '♧', caption: 'Citizen', cost: 'Planned', description: 'Citizen guidance will appear here once the game integration is available.', unavailable: 'Not implemented: the sample has no citizens.' },
  { id: 'pickup', label: 'Pick Up', icon: '◇', caption: 'Items', cost: 'Planned', description: 'Items at your location will be selectable here.', unavailable: 'Not implemented: the sample has no item inventory.' },
  { id: 'share', label: 'Share', icon: '⇄', caption: 'Exchange items', cost: 'Planned', description: 'Item exchange will be available when the game and participating heroes support it.', unavailable: 'Unavailable in this one-explorer sample; item exchange is not implemented.' },
  { id: 'advance', label: 'Advance', icon: '▤', caption: 'Challenge', cost: 'Planned', description: 'Monster challenges will check their own targets and resource requirements.', unavailable: 'Not implemented: monster challenges and their game data are pending.' },
  { id: 'defeat', label: 'Defeat', icon: '⚑', caption: 'Monster', cost: 'Planned', description: 'A finishing attempt will become available when its monster-specific requirements are met.', unavailable: 'Not implemented: the sample has no monsters to defeat.' },
  { id: 'special', label: 'Special Action', icon: '✧', caption: 'Hero ability', cost: 'Planned', description: 'The selected hero’s verified ability will appear here.', unavailable: 'Not implemented: the practice explorer has no game-specific ability.' },
  { id: 'perks', label: 'Perks', icon: '▱', caption: 'Eligible cards', cost: 'Planned · free', description: 'Eligible perks will remain usable at zero actions until you end the Hero Phase.', unavailable: 'Not implemented: the sample has no perk cards.' },
] as const;

export type TrayActionId = typeof trayActions[number]['id'];
