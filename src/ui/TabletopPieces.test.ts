import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PieceArtwork } from './TabletopPieces';

it('gives repeated dimensional pieces independent, resolvable paint resources', () => {
  const html = renderToStaticMarkup(createElement('div', null,
    ...(['hero', 'hero', 'citizen', 'beholder', 'displacer', 'item', 'lair'] as const)
      .map((kind, index) => createElement(PieceArtwork, { kind, key: index })),
  ));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const references = [...html.matchAll(/url\(#([^\)]+)\)/g)].map(match => match[1]);
  expect(references.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
  for (const reference of references) expect(ids).toContain(reference);
});
