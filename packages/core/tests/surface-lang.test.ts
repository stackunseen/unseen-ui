import { describe, expect, it } from 'vitest';
import {
  createSurfaceParser,
  describeSurfaceVocabulary,
  parseSurfaceProgram,
  surfaceExampleProgram,
  surfaceVocabulary,
} from '@stackunseen/ui-core';

const program = `# a comment
root = [summary, grid]
summary = metric("Open tickets", "3")
grid = section("Details", [tickets, assign], "grid", "What the host knows")
tickets = table("Open tickets", [{id: "title", label: "Title"}, {id: "age", label: "Days open"}], [{id: "t1", cells: {title: "Login fails", age: 9}}, {id: "t2", cells: {title: "Export \\"slow\\"", age: null}}])
assign = action("Assign", "assign-oldest", null)
`;
const options = { surfaceId: 'surface-1', version: '7' };

describe('surface line format', () => {
  it('builds the GeneratedUI snapshot from positional statements', () => {
    const result = parseSurfaceProgram(program, options);
    expect(result.problems).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.complete).toBe(true);
    expect(result.statements).toBe(4);
    expect(result.surface).toEqual({
      id: 'surface-1',
      version: '7',
      nodes: [
        { id: 'summary', type: 'metric', label: 'Open tickets', value: '3' },
        {
          id: 'grid',
          type: 'section',
          title: 'Details',
          layout: 'grid',
          description: 'What the host knows',
          nodes: [
            {
              id: 'tickets',
              type: 'table',
              caption: 'Open tickets',
              columns: [
                { id: 'title', label: 'Title' },
                { id: 'age', label: 'Days open' },
              ],
              rows: [
                { id: 't1', cells: { title: 'Login fails', age: 9 } },
                { id: 't2', cells: { title: 'Export "slow"', age: null } },
              ],
            },
            { id: 'assign', type: 'action', label: 'Assign', actionId: 'assign-oldest' },
          ],
        },
      ],
    });
  });

  it('renders what it has while lines arrive and settles to the same snapshot at every split', () => {
    const whole = parseSurfaceProgram(program, options);
    for (let split = 0; split <= program.length; split++) {
      const parser = createSurfaceParser(options);
      parser.push(program.slice(0, split));
      parser.push(program.slice(split));
      expect(parser.finish()).toEqual(whole);
    }
    const parser = createSurfaceParser(options);
    expect(parser.push('root = [summary, grid]\nsummary = metric("Open').surface).toEqual({
      id: 'surface-1',
      version: '7',
      nodes: [],
    });
    const partial = parser.push(' tickets", "3")\ngrid = section("Details", [tickets], "stack")\n');
    expect(partial.surface?.nodes.map((node) => node.id)).toEqual(['summary', 'grid']);
    expect(partial.pending).toEqual(['tickets']);
    expect(partial.complete).toBe(false);
  });

  it('keeps the surface null until root arrives and reports a missing root only at the end', () => {
    const parser = createSurfaceParser(options);
    expect(parser.push('summary = metric("Open", "3")\n').surface).toBeNull();
    expect(parser.state().problems).toEqual([]);
    const done = parser.finish();
    expect(done.surface).toBeNull();
    expect(done.problems).toEqual([{ line: 0, code: 'no-root', message: 'No root statement' }]);
  });

  it('drops unreadable, unknown, duplicate and misplaced statements and keeps the rest', () => {
    const result = parseSurfaceProgram(
      [
        'root = [a, b, c, d, e, f]',
        'a = metric("Only one")',
        'b = widget("x")',
        'c = text("fine")',
        'c = text("again")',
        'd = text(c)',
        'e = section("Loop", [e])',
        'f = text("unterminated)',
        'root = [c]',
      ].join('\n'),
      options,
    );
    expect(result.surface?.nodes.map((node) => node.id)).toEqual(['c', 'e']);
    expect(result.problems.map((item) => [item.line, item.code])).toEqual([
      [2, 'bad-arity'],
      [3, 'unknown-node'],
      [5, 'duplicate'],
      [6, 'syntax'],
      [8, 'syntax'],
      [7, 'bad-reference'],
      [9, 'duplicate'],
    ]);
    expect(result.pending).toEqual(['a', 'b', 'd', 'f']);
  });

  it('refuses reserved keys, deep nesting and oversized programs', () => {
    const reserved = parseSurfaceProgram(
      'root = [t]\nt = table("x", [{__proto__: "y"}], [])',
      options,
    );
    expect(reserved.problems[0]?.code).toBe('syntax');
    const deep = parseSurfaceProgram(
      `root = [t]\nt = text(${'['.repeat(12)}${']'.repeat(12)})`,
      options,
    );
    expect(deep.problems[0]?.message).toBe('Nesting too deep');
    const long = parseSurfaceProgram('root = [t]\nt = text("x")\n', {
      ...options,
      limits: { totalCharacters: 12 },
    });
    expect(long.problems[0]?.code).toBe('limit');
    const many = parseSurfaceProgram(['root = [a]', 'a = text("1")', 'b = text("2")'].join('\n'), {
      ...options,
      limits: { statements: 1 },
    });
    expect(many.problems.map((item) => item.code)).toEqual(['limit']);
  });

  it('describes the vocabulary from the same table and its example parses clean', () => {
    const text = describeSurfaceVocabulary();
    for (const signature of surfaceVocabulary) expect(text).toContain(`- ${signature.type}(`);
    expect(text).toContain('root = [');
    expect(text).toContain('256 statements');
    const example = parseSurfaceProgram(surfaceExampleProgram, options);
    expect(example.problems).toEqual([]);
    expect(example.pending).toEqual([]);
    expect(example.surface?.nodes).toHaveLength(4);
    expect(describeSurfaceVocabulary({ examples: false })).not.toContain('Example:');
  });
});
