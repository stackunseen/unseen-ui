export const markdownExamples: Record<string, string> = {
  'Inline citations':
    'Inactive accounts go to their owner for review after **90 days** [1]. Archive them only once the owner agrees [2].\n\nA marker inside code stays as written: `rows[1]`.',
  Markdown:
    '# Ready for review\n\nThree accounts need an **owner review**. Start with the records below, then confirm the decision.\n\n- [x] Read the current policy\n- [ ] Review the affected accounts\n- [ ] Confirm the next action\n\n> This is a synthetic example. No account changes have been made.\n\nSee the [React documentation](https://react.dev/) for component composition.',
  Code: '# Suggested query\n\nUse a read-only query to inspect the current records.\n\n```sql\nSELECT id, name, owner_id\nFROM accounts\nWHERE owner_id IS NULL\nORDER BY name;\n```\n\nReview the result before taking any action.',
  Table:
    '# Review summary\n\n| Account | Owner | Review state |\n| --- | --- | --- |\n| Acme Company | Unassigned | Needs review |\n| Northstar Research | Dana | Ready |\n| Fieldstone Studio | Unassigned | Needs review |\n\nThe table scrolls horizontally when space is limited.',
  'Incomplete Markdown':
    '# Receiving an answer\n\nThe first result is **ready for review\n\nRead [the supporting policy](https://example.com/pol',
  'Unsafe content':
    '# Untrusted content example\n\n<script>alert("example")</script>\n\n[Unsupported URL](javascript:alert%281%29)\n\n![Synthetic external image](https://example.com/not-loaded.png)\n\nHTML is displayed as text. The image is only an explicit link.',
  Footnotes:
    '# Evidence notes\n\nThe review includes two example sources.[^policy] A second note describes the fixture.[^fixture]\n\n[^policy]: Synthetic policy, version 2.\n[^fixture]: Local sample data; no production records.',
  'Long code':
    '# Long-line example\n\n```typescript\nconst review = { accountName: "Acme Company — international research and customer operations", owner: null, requiredAction: "Review the proposed assignment before continuing" };\n\nconsole.log(review.accountName);\n```\n\nInline code also wraps: `customer_review_status_pending_owner_assignment_for_international_operations`.',
  'Large content':
    'A long imported response.\n\n' + 'Example text requiring a bounded preview. '.repeat(2500),
};
export const markdownStates = Object.keys(markdownExamples).concat('Live stream');
