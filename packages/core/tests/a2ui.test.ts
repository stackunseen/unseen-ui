import { describe, expect, it } from 'vitest';
import { createA2UISession, mapA2UIStream } from '@stackunseen/ui-core';

const catalog = 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json';
const contactForm = [
  { version: 'v1.0', createSurface: { surfaceId: 'contact_form_1', catalogId: catalog } },
  {
    version: 'v1.0',
    updateComponents: {
      surfaceId: 'contact_form_1',
      components: [
        { id: 'root', component: 'Card', child: 'form_container' },
        {
          id: 'form_container',
          component: 'Column',
          children: [
            'header_row',
            'intro',
            'email_field',
            'pref_picker',
            'newsletter_checkbox',
            'submit_button',
          ],
        },
        { id: 'header_row', component: 'Row', children: ['header_icon', 'header_text'] },
        { id: 'header_icon', component: 'Icon', name: 'mail' },
        { id: 'header_text', component: 'Text', text: '# Contact Us' },
        {
          id: 'intro',
          component: 'Text',
          text: {
            '@call': 'formatString',
            args: { value: 'Hello ${/contact/firstName}, send us a note.' },
          },
        },
        {
          id: 'email_field',
          component: 'TextField',
          label: 'Email',
          value: { '@path': '/contact/email' },
          checks: [
            {
              condition: { '@call': 'required', args: { value: { '@path': '/contact/email' } } },
              message: 'Email is required.',
            },
          ],
        },
        {
          id: 'pref_picker',
          component: 'ChoicePicker',
          variant: 'mutuallyExclusive',
          label: 'Preferred contact',
          options: [
            { label: 'Email', value: 'email' },
            { label: 'Phone', value: 'phone' },
          ],
          value: { '@path': '/contact/preference' },
        },
        {
          id: 'newsletter_checkbox',
          component: 'CheckBox',
          label: 'Subscribe',
          value: { '@path': '/contact/subscribe' },
        },
        { id: 'submit_button_label', component: 'Text', text: 'Send Message' },
        {
          id: 'submit_button',
          component: 'Button',
          child: 'submit_button_label',
          variant: 'primary',
          action: { event: { name: 'submitContactForm', context: { formId: 'contact_form_1' } } },
        },
      ],
    },
  },
  {
    version: 'v1.0',
    updateDataModel: {
      surfaceId: 'contact_form_1',
      path: '/contact',
      value: {
        firstName: 'John',
        email: 'john@example.com',
        preference: ['email'],
        subscribe: true,
      },
    },
  },
];

describe('A2UI mapping', () => {
  it('maps the specification contact form onto a section with text and one form bound to the submit event', () => {
    const state = mapA2UIStream(contactForm, { version: '3' });
    expect(state.surfaceId).toBe('contact_form_1');
    expect(state.deleted).toBe(false);
    expect(state.surface).toEqual({
      id: 'contact_form_1',
      version: '3',
      nodes: [
        {
          id: 'form_container',
          type: 'section',
          title: 'Contact Us',
          nodes: [
            { id: 'intro', type: 'text', text: 'Hello John, send us a note.' },
            {
              id: 'form-email_field',
              type: 'form',
              title: 'Send Message',
              actionId: 'submitContactForm',
              fields: [
                { id: 'email_field', label: 'Email', type: 'text', required: true },
                {
                  id: 'pref_picker',
                  label: 'Preferred contact',
                  type: 'select',
                  options: [
                    { value: 'email', label: 'Email' },
                    { value: 'phone', label: 'Phone' },
                  ],
                },
                { id: 'newsletter_checkbox', label: 'Subscribe', type: 'checkbox' },
              ],
            },
          ],
        },
      ],
    });
    expect(state.formValues).toEqual({
      'form-email_field': {
        email_field: 'john@example.com',
        pref_picker: 'email',
        newsletter_checkbox: true,
      },
    });
    expect(state.unsupported).toEqual([]);
  });

  it('re-maps after each message, expands list templates and reports what it cannot show', () => {
    const session = createA2UISession({ version: '1' });
    expect(
      session.accept({ version: 'v1.0', updateComponents: { surfaceId: 'main', components: [] } })
        .unsupported[0],
    ).toMatchObject({ reason: 'message' });
    let state = session.accept({
      version: 'v1.0',
      createSurface: {
        surfaceId: 'main',
        components: [
          { id: 'root', component: 'Column', children: ['breeds', 'hero', 'later'] },
          { id: 'breeds', component: 'List', children: { path: '/breeds', componentId: 'breed' } },
          { id: 'breed', component: 'Text', text: { '@path': 'name' } },
          {
            id: 'hero',
            component: 'Image',
            url: 'https://example.com/a.jpg',
            description: 'A poodle',
          },
        ],
        dataModel: { breeds: [{ name: 'Poodle' }, { name: 'Labrador' }] },
      },
    });
    expect(state.surface?.nodes).toEqual([
      { id: 'breed#0', type: 'text', text: 'Poodle' },
      { id: 'breed#1', type: 'text', text: 'Labrador' },
      { id: 'hero', type: 'image', src: 'https://example.com/a.jpg', alt: 'A poodle' },
    ]);
    expect(state.unsupported.map((item) => [item.id, item.reason])).toEqual([
      ['later', 'component'],
    ]);
    state = session.accept({
      version: 'v1.0',
      updateComponents: {
        surfaceId: 'main',
        components: [
          {
            id: 'later',
            component: 'Text',
            text: { '@call': 'formatDate', args: { value: 'x', format: 'yyyy' } },
          },
        ],
      },
    });
    expect(state.surface?.nodes.map((node) => node.id)).toEqual(['breed#0', 'breed#1', 'hero']);
    expect(state.unsupported.find((item) => item.kind === 'formatDate')?.reason).toBe('function');
    state = session.accept({
      version: 'v1.0',
      updateDataModel: { surfaceId: 'main', path: '/breeds', value: [{ name: 'Beagle' }] },
    });
    expect(state.surface?.nodes[0]).toEqual({ id: 'breed#0', type: 'text', text: 'Beagle' });
    state = session.accept({
      version: 'v1.0',
      callRendererFunction: {
        functionCallId: 'f1',
        callFunction: { '@call': 'getScreenResolution', catalogId: catalog },
      },
    });
    expect(state.unsupported.some((item) => item.id === 'callRendererFunction')).toBe(true);
    state = session.accept({ version: 'v1.0', deleteSurface: { surfaceId: 'main' } });
    expect(state.surface).toBeNull();
    expect(state.deleted).toBe(true);
  });

  it('refuses other protocol versions, bad JSON lines and messages for other surfaces without guessing', () => {
    const state = mapA2UIStream(
      [
        '{"version":"v0.9","beginRendering":{"surfaceId":"x","root":"root"}}',
        'not json',
        JSON.stringify({
          version: 'v1.0',
          createSurface: {
            surfaceId: 'one',
            components: [{ id: 'root', component: 'Text', text: 'A' }],
          },
        }),
        JSON.stringify({ version: 'v1.0', updateComponents: { surfaceId: 'two', components: [] } }),
        JSON.stringify({ version: 'v1.0', createSurface: { surfaceId: 'one' } }),
      ].join('\n'),
      { version: '1' },
    );
    expect(state.surface).toEqual({
      id: 'one',
      version: '1',
      nodes: [{ id: 'root', type: 'text', text: 'A' }],
    });
    expect(state.unsupported.map((item) => item.reason)).toEqual(['message', 'message']);
    expect(state.unsupported[1]?.message).toContain('already exists');
  });

  it('keeps standalone buttons as actions and never reads prototype keys', () => {
    const state = mapA2UIStream(
      [
        {
          version: 'v1.0',
          createSurface: {
            surfaceId: 's',
            components: [
              { id: 'root', component: 'Row', children: ['go', 'name'] },
              { id: 'go_label', component: 'Text', text: 'Go' },
              {
                id: 'go',
                component: 'Button',
                child: 'go_label',
                action: { event: { name: 'go now' } },
              },
              { id: 'name', component: 'Text', text: { '@path': '/__proto__/polluted' } },
            ],
            dataModel: {},
          },
        },
        {
          version: 'v1.0',
          updateDataModel: { surfaceId: 's', path: '/__proto__/polluted', value: 'yes' },
        },
      ],
      { version: '1' },
    );
    expect(state.surface?.nodes).toEqual([
      { id: 'go', type: 'action', label: 'Go', actionId: 'go now' },
    ]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
