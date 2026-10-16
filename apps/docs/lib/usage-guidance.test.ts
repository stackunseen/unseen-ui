import { describe, expect, it } from 'vitest';
import { releaseCatalog } from './first-release';
import { catalog } from './catalog';
import { usageGuidance } from './usage-guidance';

describe('usage guidance', () => {
  it('covers every released component and names only real alternatives', () => {
    const names = new Set<string>(catalog.map((entry) => entry.name));
    const missing = releaseCatalog
      .map((entry) => entry.name)
      .filter((name) => !usageGuidance[name]);
    expect(missing).toEqual([]);
    for (const [name, guidance] of Object.entries(usageGuidance)) {
      expect(names.has(name), name).toBe(true);
      expect(guidance.use.length, name).toBeGreaterThan(10);
      expect(guidance.avoid.length, name).toBeGreaterThan(5);
      for (const other of guidance.instead) {
        expect(names.has(other), `${name} -> ${other}`).toBe(true);
        expect(other, name).not.toBe(name);
      }
    }
  });
});
