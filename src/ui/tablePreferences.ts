/** Browser-origin presentation preferences. Gameplay saves live in IndexedDB. */
export const TABLE_PREFERENCES_KEY = 'boardbot-table-layout';

export const PERSISTENT_PANELS = ['inventory', 'monsters', 'log', 'result', 'help', 'locations', 'decks'] as const;
export type PersistentPanel = typeof PERSISTENT_PANELS[number];
export type TableSide = 'left' | 'right';

export interface TablePreferences {
  version: 1;
  open: PersistentPanel[];
  sides: Partial<Record<PersistentPanel | 'inspector', TableSide>>;
  contextSide: TableSide;
  actionsCollapsed: boolean;
}

export function defaultTablePreferences(): TablePreferences {
  return { version: 1, open: [], sides: {}, contextSide: 'right', actionsCollapsed: false };
}

const isSide = (value: unknown): value is TableSide => value === 'left' || value === 'right';
const isPanel = (value: unknown): value is PersistentPanel => typeof value === 'string' && PERSISTENT_PANELS.some(panel => panel === value);

export function parseTablePreferences(raw: string | null): TablePreferences {
  if (!raw) return defaultTablePreferences();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return defaultTablePreferences();
    const candidate = value as Record<string, unknown>;
    if (candidate.version !== 1 || !Array.isArray(candidate.open) || !candidate.open.every(isPanel)
      || !candidate.sides || typeof candidate.sides !== 'object' || Array.isArray(candidate.sides)
      || !isSide(candidate.contextSide) || typeof candidate.actionsCollapsed !== 'boolean') return defaultTablePreferences();
    const sides = candidate.sides as Record<string, unknown>;
    if (Object.entries(sides).some(([panel, side]) => !(isPanel(panel) || panel === 'inspector') || !isSide(side))) return defaultTablePreferences();
    return {
      version: 1,
      open: [...new Set(candidate.open as PersistentPanel[])],
      sides: { ...sides } as TablePreferences['sides'],
      contextSide: candidate.contextSide,
      actionsCollapsed: candidate.actionsCollapsed,
    };
  } catch {
    return defaultTablePreferences();
  }
}

export function readTablePreferences(): TablePreferences {
  try { return parseTablePreferences(window.localStorage.getItem(TABLE_PREFERENCES_KEY)); }
  catch { return defaultTablePreferences(); }
}

export function writeTablePreferences(value: TablePreferences): void {
  try { window.localStorage.setItem(TABLE_PREFERENCES_KEY, JSON.stringify(value)); }
  catch { /* Browser storage can be denied; the table remains playable. */ }
}
