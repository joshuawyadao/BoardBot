import { describe, expect, it } from 'vitest';
import { defaultTablePreferences, parseTablePreferences } from './tablePreferences';

describe('table layout preferences', () => {
  it('restores valid panel sides, context placement and tray state without an inspector location', () => {
    expect(parseTablePreferences(JSON.stringify({ version: 1, open: ['inventory', 'log', 'inventory'],
      sides: { inventory: 'left', inspector: 'left' }, contextSide: 'left', actionsCollapsed: true }))).toEqual({
      version: 1, open: ['inventory', 'log'], sides: { inventory: 'left', inspector: 'left' }, contextSide: 'left', actionsCollapsed: true,
    });
  });

  it.each([
    null, '{broken', JSON.stringify({ version: 2, open: [], sides: {}, contextSide: 'right', actionsCollapsed: false }),
    JSON.stringify({ version: 1, open: ['inspector'], sides: {}, contextSide: 'right', actionsCollapsed: false }),
    JSON.stringify({ version: 1, open: [], sides: { inventory: 'middle' }, contextSide: 'right', actionsCollapsed: false }),
  ])('uses the default for missing, malformed or incompatible stored layouts', raw => {
    expect(parseTablePreferences(raw)).toEqual(defaultTablePreferences());
  });
});
