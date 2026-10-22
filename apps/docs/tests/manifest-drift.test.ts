// The docs and llms.txt describe components from the catalog; the manifest is generated from the
// published types. This test fails when the two disagree: a documented component that is not
// exported where the docs say, or an example that passes a prop the component does not have.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { catalog } from '../lib/catalog';
import { componentImport } from '../lib/component-import';
import { behaviourNotes } from '../lib/behaviour-notes';

interface ManifestProp {
  name: string;
}
interface ManifestExport {
  name: string;
  kind: string;
  props?: ManifestProp[];
  inherits?: string[];
  parts?: string[];
  sameAs?: string;
}
interface Manifest {
  entries: { entry: string; exports: ManifestExport[] }[];
}

// Vitest runs from the repository root.
const manifest = JSON.parse(
  readFileSync(path.join(process.cwd(), 'packages/react/manifest.json'), 'utf8'),
) as Manifest;
const byEntry = new Map(
  manifest.entries.map((item) => [item.entry, new Map(item.exports.map((x) => [x.name, x]))]),
);
/** An export with its full description, following sameAs to the entry that holds it. */
function find(entry: string, name: string): ManifestExport | undefined {
  const found = byEntry.get(entry)?.get(name);
  return found?.sameAs ? byEntry.get(found.sameAs)?.get(name) : found;
}
const components = new Map<string, ManifestExport>();
for (const item of manifest.entries)
  for (const x of item.exports)
    if ((x.kind === 'component' || x.kind === 'compound') && !x.sameAs && !components.has(x.name))
      components.set(x.name, x);

/** Attributes any React element takes, whatever the component declares. */
const universal = new Set(['key', 'ref', 'className', 'style', 'id', 'children']);

/** Every `<Name attr=…>` in an example, with the attribute names it passes. */
function elements(code: string) {
  const source = ts.createSourceFile(
    'example.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: { name: string; attributes: string[]; spreads: boolean }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attributes: string[] = [];
      let spreads = false;
      for (const attribute of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(attribute)) spreads = true;
        else attributes.push(attribute.name.getText(source));
      }
      found.push({ name: node.tagName.getText(source), attributes, spreads });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('component manifest and docs', () => {
  it('exports every documented component where the docs import it from', () => {
    const missing = catalog
      .map((entry) => {
        const imported = componentImport(entry);
        const at = `@stackunseen/ui${imported.path}`;
        const found = find(at, imported.exportName);
        return found && found.kind !== 'type'
          ? undefined
          : `${entry.name}: ${imported.exportName} from ${at}`;
      })
      .filter(Boolean);
    expect(missing).toEqual([]);
  });

  it('attaches every behaviour note to a documented component', () => {
    const names = new Set(catalog.map((entry) => entry.name));
    expect(Object.keys(behaviourNotes).filter((name) => !names.has(name))).toEqual([]);
  });

  it('catches a prop the component does not have', () => {
    expect(
      unknownProps('Probe', '<Chat messages={messages} onSend={send} colour="red" />'),
    ).toEqual(['Probe: <Chat colour>']);
  });

  it('passes only real props in every documented example', () => {
    expect(catalog.flatMap((entry) => unknownProps(entry.name, entry.code))).toEqual([]);
  });
});

/** Attributes an example passes that its component does not declare. */
function unknownProps(entryName: string, code: string) {
  const wrong: string[] = [];
  for (const element of elements(code)) {
    const [base, part] = element.name.split('.');
    const component = components.get(base!);
    if (!component) continue;
    // A compound part (DropdownMenu.Item) is checked only for existing as a part.
    if (part) {
      if (component.parts && !component.parts.includes(part))
        wrong.push(`${entryName}: ${element.name} is not a part of ${base}`);
      continue;
    }
    if (component.kind !== 'component') continue;
    const props = new Set(component.props?.map((prop) => prop.name));
    const inherits = component.inherits ?? [];
    for (const attribute of element.attributes) {
      if (props.has(attribute) || universal.has(attribute)) continue;
      if (/^(aria|data)-/.test(attribute)) continue;
      // Components that pass HTML or Radix props through accept them, unlisted.
      if (inherits.length) continue;
      wrong.push(`${entryName}: <${element.name} ${attribute}>`);
    }
  }
  return wrong;
}
