import { describe, expect, it } from 'vitest';
import manifest from '@stackunseen/ui/manifest.json';
import { catalog } from './catalog';
import { componentAnatomy } from './component-anatomy';
import { manifestProps } from './component-props';

interface Export {
  name: string;
  props?: { name: string }[];
  sameAs?: string;
}
const exports = (manifest as { entries: { exports: Export[] }[] }).entries
  .flatMap((entry) => entry.exports)
  .filter((x) => !x.sameAs);
const names = new Set<string>(catalog.map((entry) => entry.name));

describe('component anatomy', () => {
  for (const [name, anatomy] of Object.entries(componentAnatomy))
    it(`${name} names only real components, parts and props`, () => {
      const entry = catalog.find((item) => item.name === name);
      expect(entry, 'has a component page').toBeDefined();
      const own = new Set(manifestProps(entry!).props.map((prop) => prop.name));
      for (const part of anatomy.parts) {
        for (const component of part.builtFrom ?? [])
          expect(names.has(component), `${part.name} built from ${component}`).toBe(true);
        if (anatomy.kind === 'regions') {
          for (const prop of part.props ?? []) expect(own.has(prop), `${name}.${prop}`).toBe(true);
          expect(anatomy.figure?.areas.join(' ').split(/\s+/), part.name).toContain(part.area);
        } else {
          expect(part.render, `${part.name} says what to render`).toBeTruthy();
          // `Card.Header` is exported as CardHeader; parts like ToolCall.Summary take no props.
          const exported = exports.find((x) => x.name === part.render!.replace('.', ''));
          const props = new Set((exported?.props ?? []).map((prop) => prop.name));
          for (const prop of part.props ?? [])
            expect(props.has(prop), `${part.render} ${prop}`).toBe(true);
        }
      }
      for (const way of anatomy.connection ?? [])
        for (const prop of way.props) expect(own.has(prop), `${name}.${prop}`).toBe(true);
    });
});
