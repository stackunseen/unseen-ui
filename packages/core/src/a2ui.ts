/**
 * A partial mapping of A2UI protocol v1.0 messages (as published at a2ui.org on 2026-10-16) onto
 * the GeneratedUI vocabulary. It reads the basic catalog's components and the agent-to-renderer
 * envelope, resolves `{"@path"}` bindings and `formatString` against the surface's data model,
 * and reports everything it cannot represent instead of guessing. It runs no functions, opens
 * no URLs and keeps the host in charge of validation and actions.
 */
import type { SurfaceSnapshot } from './surface-lang.js';

export type A2UIUnsupportedReason =
  'component' | 'function' | 'binding' | 'message' | 'template' | 'version';
export interface A2UIUnsupported {
  /** Component id, function name or message key. */
  id: string;
  kind: string;
  reason: A2UIUnsupportedReason;
  message: string;
}
export interface A2UIFormValues {
  [formNodeId: string]: Record<string, string | boolean>;
}
export interface A2UIMappingState {
  surfaceId: string | null;
  /** The GeneratedUI snapshot built from the current components and data model. */
  surface: SurfaceSnapshot | null;
  /** Field values read from the data model, keyed by form node id, for the host's `forms` prop. */
  formValues: A2UIFormValues;
  unsupported: readonly A2UIUnsupported[];
  dataModel: unknown;
  deleted: boolean;
}
export interface A2UISession {
  /** Feed one envelope object or one JSONL line. Returns the state after it. */
  accept(message: unknown): A2UIMappingState;
  state(): A2UIMappingState;
}
export const a2uiProtocolVersion = 'v1.0';

type Component = { id: string; component: string } & Record<string, unknown>;
type Node = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function pointerGet(model: unknown, pointer: string): unknown {
  if (pointer === '' || pointer === '/') return model;
  const parts = pointer.replace(/^\//, '').split('/');
  let current: unknown = model;
  for (const raw of parts) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (Array.isArray(current)) current = current[Number(key)];
    else if (isRecord(current) && Object.prototype.hasOwnProperty.call(current, key))
      current = current[key];
    else return undefined;
  }
  return current;
}
function pointerSet(model: unknown, pointer: string, value: unknown): unknown {
  if (pointer === '' || pointer === '/') return value;
  const root: Record<string, unknown> = isRecord(model) ? { ...model } : {};
  const parts = pointer.replace(/^\//, '').split('/');
  let current: Record<string, unknown> = root;
  parts.forEach((raw, index) => {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (['__proto__', 'constructor', 'prototype'].includes(key)) return;
    if (index === parts.length - 1) {
      if (value === null) delete current[key];
      else current[key] = value;
      return;
    }
    const next = current[key];
    current[key] = isRecord(next) ? { ...next } : {};
    current = current[key] as Record<string, unknown>;
  });
  return root;
}
function identifier(value: string, fallback: string): string {
  const trimmed = value.trim().slice(0, 80);
  return trimmed && !['__proto__', 'constructor', 'prototype'].includes(trimmed)
    ? trimmed
    : fallback;
}
function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
}

/** Builds and keeps one A2UI surface, re-mapping after every message. */
export function createA2UISession(options: {
  /** Version stamped on the GeneratedUI snapshot; bump it when the host wants a new surface version. */
  version: string;
  /** Only this surface is mapped; messages for other surfaces are reported. Defaults to the first created. */
  surfaceId?: string;
}): A2UISession {
  const components = new Map<string, Component>();
  let dataModel: unknown = {};
  let surfaceId: string | null = options.surfaceId ?? null;
  let created = false;
  let deleted = false;
  let messageUnsupported: A2UIUnsupported[] = [];

  function report(list: A2UIUnsupported[], entry: A2UIUnsupported) {
    if (!list.some((item) => item.id === entry.id && item.message === entry.message))
      list.push(entry);
  }

  function resolve(
    value: unknown,
    scope: unknown,
    unsupported: A2UIUnsupported[],
    owner: string,
  ): unknown {
    if (!isRecord(value)) return value;
    if (typeof value['@path'] === 'string') {
      const path = value['@path'];
      return path.startsWith('/') ? pointerGet(dataModel, path) : pointerGet(scope, `/${path}`);
    }
    if (typeof value['@call'] === 'string') {
      const name = value['@call'];
      const args = isRecord(value.args) ? value.args : {};
      if (name === 'formatString' && typeof args.value === 'string') {
        return args.value.replace(/\$\{([^}]*)\}/g, (_match, expression: string) => {
          const trimmed = expression.trim();
          if (trimmed.startsWith('/')) return textOf(pointerGet(dataModel, trimmed));
          if (/^[A-Za-z0-9_/-]+$/.test(trimmed)) return textOf(pointerGet(scope, `/${trimmed}`));
          report(unsupported, {
            id: owner,
            kind: 'formatString',
            reason: 'function',
            message: `Expression "${trimmed}" is not evaluated`,
          });
          return '';
        });
      }
      report(unsupported, {
        id: owner,
        kind: name,
        reason: 'function',
        message: `Function "${name}" is not evaluated; the renderer runs no catalog functions`,
      });
      return undefined;
    }
    return value;
  }
  const str = (value: unknown, scope: unknown, unsupported: A2UIUnsupported[], owner: string) =>
    textOf(resolve(value, scope, unsupported, owner));

  function children(
    component: Component,
    key: string,
    scope: unknown,
    unsupported: A2UIUnsupported[],
  ): { id: string; scope: unknown }[] {
    const value = component[key];
    if (Array.isArray(value))
      return value
        .filter((item): item is string => typeof item === 'string')
        .map((id) => ({ id, scope }));
    if (
      isRecord(value) &&
      typeof value.componentId === 'string' &&
      typeof value.path === 'string'
    ) {
      const list = value.path.startsWith('/')
        ? pointerGet(dataModel, value.path)
        : pointerGet(scope, `/${value.path}`);
      if (!Array.isArray(list)) {
        report(unsupported, {
          id: component.id,
          kind: component.component,
          reason: 'template',
          message: `Template path "${value.path}" is not a list in the data model`,
        });
        return [];
      }
      return list.slice(0, 100).map((item, index) => ({
        id: `${value.componentId}#${index}`,
        scope: item,
      }));
    }
    return [];
  }
  function lookup(id: string): Component | undefined {
    const base = id.includes('#') ? id.slice(0, id.indexOf('#')) : id;
    return components.get(base);
  }

  function build(): {
    surface: SurfaceSnapshot | null;
    formValues: A2UIFormValues;
    unsupported: A2UIUnsupported[];
  } {
    const unsupported: A2UIUnsupported[] = [...messageUnsupported];
    const formValues: A2UIFormValues = {};
    if (!surfaceId || deleted || !created) return { surface: null, formValues, unsupported };
    const root = components.get('root');
    if (!root)
      return {
        surface: { id: surfaceId, version: options.version, nodes: [] },
        formValues,
        unsupported,
      };
    const visiting = new Set<string>();
    let serial = 0;

    const inputTypes = new Set([
      'TextField',
      'CheckBox',
      'ChoicePicker',
      'Slider',
      'DateTimeInput',
    ]);

    function buttonLabel(button: Component, scope: unknown): string {
      const child = typeof button.child === 'string' ? components.get(button.child) : undefined;
      if (child?.component === 'Text') return str(child.text, scope, unsupported, child.id);
      if (child?.component === 'Icon') return `Icon ${textOf(child.name)}`;
      return 'Button';
    }
    function actionIdOf(button: Component): string {
      const action = isRecord(button.action) ? button.action : undefined;
      const event = action && isRecord(action.event) ? action.event : undefined;
      if (event && typeof event.name === 'string') return identifier(event.name, button.id);
      if (action && isRecord(action.functionCall)) {
        report(unsupported, {
          id: button.id,
          kind: 'Button',
          reason: 'function',
          message: 'functionCall actions are not run; the button reports its id instead',
        });
      }
      return identifier(button.id, 'action');
    }
    function field(
      component: Component,
      scope: unknown,
      values: Record<string, string | boolean>,
    ): Node | undefined {
      const id = identifier(component.id, `field-${++serial}`);
      const label = str(component.label, scope, unsupported, component.id) || id;
      const required =
        Array.isArray(component.checks) &&
        component.checks.some(
          (check) =>
            isRecord(check) && isRecord(check.condition) && check.condition['@call'] === 'required',
        );
      const value = resolve(component.value, scope, unsupported, component.id);
      switch (component.component) {
        case 'TextField': {
          const variant = component.variant;
          const type =
            variant === 'longText' ? 'textarea' : variant === 'number' ? 'number' : 'text';
          if (variant === 'obscured')
            report(unsupported, {
              id: component.id,
              kind: 'TextField',
              reason: 'component',
              message: 'Obscured text fields are shown as plain text fields',
            });
          if (value !== undefined && value !== null) values[id] = textOf(value);
          const node: Node = { id, label, type };
          if (required) node.required = true;
          if (typeof component.placeholder === 'string') node.description = component.placeholder;
          return node;
        }
        case 'CheckBox': {
          if (typeof value === 'boolean') values[id] = value;
          const node: Node = { id, label, type: 'checkbox' };
          if (required) node.required = true;
          return node;
        }
        case 'ChoicePicker': {
          const options = Array.isArray(component.options)
            ? component.options
                .filter(isRecord)
                .map((option) => ({
                  value: textOf(option.value),
                  label:
                    str(option.label, scope, unsupported, component.id) || textOf(option.value),
                }))
                .filter((option) => option.value)
            : [];
          if (component.variant === 'multipleSelection')
            report(unsupported, {
              id: component.id,
              kind: 'ChoicePicker',
              reason: 'component',
              message: 'Multiple selection is shown as a single choice',
            });
          if (Array.isArray(value) && typeof value[0] === 'string') values[id] = value[0];
          const node: Node = { id, label, type: 'select', options };
          if (required) node.required = true;
          return node;
        }
        case 'Slider': {
          if (typeof value === 'number') values[id] = String(value);
          const node: Node = { id, label, type: 'number' };
          const min = typeof component.min === 'number' ? component.min : 0;
          if (typeof component.max === 'number') node.description = `${min} to ${component.max}`;
          return node;
        }
        case 'DateTimeInput': {
          if (typeof value === 'string' && value) values[id] = value;
          report(unsupported, {
            id: component.id,
            kind: 'DateTimeInput',
            reason: 'component',
            message: 'Date and time input is shown as a text field in ISO 8601 form',
          });
          return { id, label, type: 'text', description: 'ISO 8601 date or time' };
        }
        default:
          return undefined;
      }
    }

    const layoutTypes = new Set(['Row', 'Column', 'Card', 'List']);
    /** The markdown heading that opens a container, looking through a leading Row of icon plus text. */
    function leadingHeading(ids: { id: string; scope: unknown }[], hops = 0): string | undefined {
      const first = ids[0] ? lookup(ids[0].id) : undefined;
      if (!first || hops > 2) return undefined;
      if (first.component === 'Text') {
        const match = /^#{1,6}\s+(.+)$/.exec(
          str(first.text, ids[0]!.scope, unsupported, first.id).trim(),
        );
        return match ? match[1]!.slice(0, 200) : undefined;
      }
      if (!layoutTypes.has(first.component)) return undefined;
      const inner =
        first.component === 'Card'
          ? typeof first.child === 'string'
            ? [{ id: first.child, scope: ids[0]!.scope }]
            : []
          : children(first, 'children', ids[0]!.scope, unsupported).filter((child) => {
              const target = lookup(child.id);
              return target && target.component !== 'Icon' && target.component !== 'Divider';
            });
      // Only a container whose text is the heading alone counts; other content stays visible.
      if (inner.length !== 1) return undefined;
      return leadingHeading(inner, hops + 1);
    }
    function nodesOf(ids: { id: string; scope: unknown }[], depth: number): Node[] {
      const out: Node[] = [];
      let pendingForm: {
        fields: Node[];
        values: Record<string, string | boolean>;
        id: string;
      } | null = null;
      const flushForm = (actionId: string, title: string) => {
        if (!pendingForm || pendingForm.fields.length === 0) {
          pendingForm = null;
          return;
        }
        const nodeId = identifier(pendingForm.id, `form-${++serial}`);
        out.push({ id: nodeId, type: 'form', title, actionId, fields: pendingForm.fields });
        if (Object.keys(pendingForm.values).length) formValues[nodeId] = pendingForm.values;
        pendingForm = null;
      };
      for (const { id, scope } of ids) {
        const component = lookup(id);
        if (!component) {
          report(unsupported, {
            id,
            kind: 'reference',
            reason: 'component',
            message: `Component "${id}" has not arrived`,
          });
          continue;
        }
        if (inputTypes.has(component.component)) {
          pendingForm ??= { fields: [], values: {}, id: `form-${id}` };
          const node = field(component, scope, pendingForm.values);
          if (node) pendingForm.fields.push(node);
          continue;
        }
        if (component.component === 'Button') {
          const actionId = actionIdOf(component);
          const label = buttonLabel(component, scope);
          if (pendingForm && pendingForm.fields.length) {
            flushForm(actionId, label);
            continue;
          }
          out.push({ id: identifier(id, `action-${++serial}`), type: 'action', label, actionId });
          continue;
        }
        flushForm('submit', 'Form');
        out.push(...nodeOf(component, id, scope, depth));
      }
      flushForm('submit', 'Form');
      return out;
    }

    function nodeOf(component: Component, id: string, scope: unknown, depth: number): Node[] {
      if (visiting.has(component.id)) {
        report(unsupported, {
          id: component.id,
          kind: component.component,
          reason: 'component',
          message: 'Component refers to itself',
        });
        return [];
      }
      visiting.add(component.id);
      try {
        const nodeId = identifier(id, `node-${++serial}`);
        switch (component.component) {
          case 'Text': {
            const text = str(component.text, scope, unsupported, component.id);
            return text.trim() ? [{ id: nodeId, type: 'text', text }] : [];
          }
          case 'Divider':
          case 'Icon':
            return [];
          case 'Image': {
            const src = str(component.url, scope, unsupported, component.id);
            const alt = str(component.description, scope, unsupported, component.id) || 'Image';
            if (!/^https?:\/\//.test(src)) {
              report(unsupported, {
                id: component.id,
                kind: 'Image',
                reason: 'binding',
                message: 'Image URL is not an http(s) address',
              });
              return [{ id: nodeId, type: 'text', text: `Image not shown: ${alt}` }];
            }
            // The host still decides whether the origin may load through GeneratedUI's imageOrigins.
            return [{ id: nodeId, type: 'image', src, alt }];
          }
          case 'Video':
          case 'AudioPlayer': {
            const description = str(component.description, scope, unsupported, component.id);
            report(unsupported, {
              id: component.id,
              kind: component.component,
              reason: 'component',
              message: `${component.component} is not rendered; its description is shown as text`,
            });
            return [
              {
                id: nodeId,
                type: 'text',
                text: `${component.component} not shown${description ? `: ${description}` : ''}`,
              },
            ];
          }
          case 'Modal':
            report(unsupported, {
              id: component.id,
              kind: 'Modal',
              reason: 'component',
              message: 'Modal content is shown inline',
            });
            return typeof component.content === 'string'
              ? nodesOf([{ id: component.content, scope }], depth)
              : [];
          case 'Tabs': {
            const tabs = Array.isArray(component.tabs) ? component.tabs.filter(isRecord) : [];
            return tabs.flatMap((tab, index) => {
              const title = str(tab.title, scope, unsupported, component.id) || `Tab ${index + 1}`;
              const inner =
                typeof tab.child === 'string' ? nodesOf([{ id: tab.child, scope }], depth + 1) : [];
              return depth >= 3
                ? inner
                : [{ id: `${nodeId}:${index}`, type: 'section', title, nodes: inner }];
            });
          }
          case 'Card':
          case 'Column':
          case 'Row':
          case 'List': {
            const ids =
              component.component === 'Card'
                ? typeof component.child === 'string'
                  ? [{ id: component.child, scope }]
                  : []
                : children(component, 'children', scope, unsupported);
            // A leading heading inside a container (or inside its first row) titles a section.
            const heading = leadingHeading(ids);
            if (heading && depth < 3) {
              const inner = nodesOf(ids.slice(1), depth + 1);
              const node: Node = { id: nodeId, type: 'section', title: heading, nodes: inner };
              if (component.component === 'Row') node.layout = 'grid';
              return [node];
            }
            return nodesOf(ids, depth);
          }
          default:
            report(unsupported, {
              id: component.id,
              kind: component.component,
              reason: 'component',
              message: `Component "${component.component}" has no GeneratedUI equivalent`,
            });
            return [];
        }
      } finally {
        visiting.delete(component.id);
      }
    }

    const nodes = nodesOf([{ id: 'root', scope: dataModel }], 0);
    return {
      surface: { id: surfaceId, version: options.version, nodes: nodes.slice(0, 64) },
      formValues,
      unsupported,
    };
  }

  function current(): A2UIMappingState {
    const built = build();
    return {
      surfaceId,
      surface: built.surface,
      formValues: built.formValues,
      unsupported: built.unsupported,
      dataModel,
      deleted,
    };
  }

  function take(list: unknown, where: string) {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!isRecord(item) || typeof item.id !== 'string' || typeof item.component !== 'string') {
        report(messageUnsupported, {
          id: where,
          kind: 'component',
          reason: 'message',
          message: 'A component lacked id or component',
        });
        continue;
      }
      if (item.component === 'Surface') continue;
      components.set(item.id, item as Component);
    }
  }

  return {
    accept(message) {
      let envelope: unknown = message;
      if (typeof message === 'string') {
        try {
          envelope = JSON.parse(message);
        } catch {
          report(messageUnsupported, {
            id: 'stream',
            kind: 'json',
            reason: 'message',
            message: 'A line was not valid JSON',
          });
          return current();
        }
      }
      if (!isRecord(envelope)) {
        report(messageUnsupported, {
          id: 'stream',
          kind: 'envelope',
          reason: 'message',
          message: 'A message was not an object',
        });
        return current();
      }
      const version = envelope.version;
      if (version !== undefined && version !== a2uiProtocolVersion && version !== '1.0') {
        report(messageUnsupported, {
          id: 'stream',
          kind: 'version',
          reason: 'version',
          message: `Protocol version "${textOf(version)}" is not read; this mapping follows ${a2uiProtocolVersion}`,
        });
        return current();
      }
      const keys = [
        'createSurface',
        'updateComponents',
        'updateDataModel',
        'deleteSurface',
      ] as const;
      const key = keys.find((name) => isRecord(envelope[name]));
      if (!key) {
        const other = Object.keys(envelope).find((name) => name !== 'version') ?? 'unknown';
        report(messageUnsupported, {
          id: other,
          kind: 'message',
          reason: 'message',
          message: `Message "${other}" is not handled; function calls stay with the host`,
        });
        return current();
      }
      const body = envelope[key] as Record<string, unknown>;
      const target = typeof body.surfaceId === 'string' ? body.surfaceId : null;
      if (!target) {
        report(messageUnsupported, {
          id: key,
          kind: 'message',
          reason: 'message',
          message: `${key} lacked a surfaceId`,
        });
        return current();
      }
      if (surfaceId === null && key === 'createSurface') surfaceId = target;
      if (target !== surfaceId) {
        report(messageUnsupported, {
          id: target,
          kind: key,
          reason: 'message',
          message: `Messages for surface "${target}" are ignored; this session maps "${surfaceId ?? 'none yet'}"`,
        });
        return current();
      }
      if (key === 'createSurface') {
        if (created && !deleted) {
          report(messageUnsupported, {
            id: target,
            kind: 'createSurface',
            reason: 'message',
            message: 'Surface already exists; delete it before creating it again',
          });
          return current();
        }
        created = true;
        deleted = false;
        components.clear();
        messageUnsupported = [];
        dataModel = isRecord(body.dataModel) ? body.dataModel : {};
        take(body.components, 'createSurface');
      } else if (!created) {
        report(messageUnsupported, {
          id: target,
          kind: key,
          reason: 'message',
          message: `${key} arrived before createSurface`,
        });
      } else if (key === 'updateComponents') take(body.components, 'updateComponents');
      else if (key === 'updateDataModel')
        dataModel = pointerSet(
          dataModel,
          typeof body.path === 'string' ? body.path : '/',
          body.value,
        );
      else if (key === 'deleteSurface') deleted = true;
      return current();
    },
    state: current,
  };
}

/** Map a complete list of A2UI envelopes (or JSONL text) in one call. */
export function mapA2UIStream(
  messages: readonly unknown[] | string,
  options: { version: string; surfaceId?: string },
): A2UIMappingState {
  const session = createA2UISession(options);
  const items =
    typeof messages === 'string' ? messages.split('\n').filter((line) => line.trim()) : messages;
  let state = session.state();
  for (const item of items) state = session.accept(item);
  return state;
}
