import { describe, expect, it } from 'vitest';
import { canonicalJSON } from './canonicalJSON';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { dataIdentity } from '../engine/horrifiedState';

describe('canonical representation compatibility', () => {
  it('orders nested keys lexically while preserving array order, nulls, escaping and omitted fields', () => {
    expect(canonicalJSON({ z: undefined, b: [null, { z: 2, a: 'é\n"' }, 1], a: { '2': 2, '10': 10 } }))
      .toBe('{"a":{"10":10,"2":2},"b":[null,{"a":"é\\n\\\"","z":2},1]}');
    expect(canonicalJSON([undefined, null, 0])).toBe('[null,null,0]');
  });

  // Captured from the pre-extraction engine using only the existing synthetic fixture.
  it.each([
    ['boardbot-dnd-2026-09-30-v3', 'sha256:3bb9899f60f80212b9b372cd00a6559af10975419d9be636c4dd19347861a7a4'],
    ['boardbot-dnd-2026-10-02-v4', 'sha256:4d3b31b69dfd6d7462bfb879067a14820e6422887925ee273793c76f673a0dce'],
    ['boardbot-dnd-2026-10-02-v5', 'sha256:78fd7034382c8cb15f2b9a4b70941d41f06bea9d4130d55193a45835d65cc59e'],
  ])('preserves the existing content identity for %s', async (version, identity) => {
    const data = fighterFixture();
    data.interpretationVersion = version;
    expect(await dataIdentity(data)).toBe(identity);
  });
});
