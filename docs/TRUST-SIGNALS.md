# Trust signals

Four small components that show what the host measured about an answer or a run, with the meaning beside the number: how much context or budget is used, where content came from, how well calibrated a score is, and what the reader thought. They live in the base entry (`@stackunseen/ui`) and use `Measurement<T>` and `CommandReceipt` from `@stackunseen/ui-core`. None of them computes trust; each one renders what the host reports and says plainly when nothing was reported.

| Component | Data and callbacks | Styles | Critical behavior |
| --- | --- | --- | --- |
| UsageMeter | `label`, `value: Measurement<{ used; limit? }>`, `unit` (tokens, currency, count), `currency`, `warnAt` (0.8), `locale` | inline / badge / detail | A percentage appears only when the host reported a limit; without one the reading is "12,400 tokens so far · Limit not reported". `estimated` names its basis, `unknown` prints the host's reason, never zero. The detail style draws a `Progress` bar with the reading as its value text and reads "Approaching the limit" from `warnAt` and "At the limit" at 100%. Aliases: CostMeter, ContextMeter. |
| ProvenanceBadge | `origin` (model, tool, person, imported), `source`, `manifest: { issuer; verifiedBy: 'host'; at }` | soft / outline / plain | Reads "Origin: Model · name" by default. "Signed" appears only when `manifest.verifiedBy` is `'host'`, with the issuer and verification time for assistive technology; a manifest the host did not verify is reported as such. An unexpected origin reads "Unknown origin". The badge never verifies anything. |
| ConfidenceNote | `score: Measurement<number>` in [0, 1], `scope`, `method`, `at` | note / inline | Renders nothing for `unknown`, an out-of-range score or a missing scope or method, so a page without a calibration shows no confidence claim. Otherwise "Confidence: 82% of claims matched a source · eval pass rate over 40 runs · date"; an estimate reads "About 60% …(estimated from …)". Never a bare number. |
| FeedbackCapture | `target` (`{ messageId, revision }` or `{ runId, attemptId }`), controlled `value: FeedbackDraft` with `onValueChange`, `onSubmit(submission)`, `reasons`, `submission`, `receipt`, `maxLength` (2000), `label` | card / inline | Helpful and Not helpful are pressed buttons; Not helpful opens reason checkboxes; either opens an optional correction. Submit sends the draft bound to the exact target. `submission` locks the form while `submitting` and after `acknowledged`; `failed` and `outcome-unknown` keep the draft and say what to do; `receipt.message` is appended to the status line. The host stores the feedback. |

## Rules these components follow

- **Measurement, not opinion.** Every number comes in as `measured`, `estimated` (with a basis) or `unknown` (with a reason). The interface prints the kind next to the value.
- **No percentage without a denominator.** UsageMeter needs a `limit`; ConfidenceNote needs a score in [0, 1].
- **Verification belongs to the host.** ProvenanceBadge shows "Signed" only when the host says it verified the manifest. The component has no cryptography.
- **Feedback is bound.** A FeedbackSubmission carries the message id and revision, or the run and attempt, so a later edit or retry cannot inherit it. Pending is not recorded; unknown is not failure.
- **Clock and locale.** Timestamps are the host's and are printed in UTC with `Intl.DateTimeFormat` so server and client agree; pass `locale` to change the format.

## Placement

Put UsageMeter in the composer footer or RunInspector header, ProvenanceBadge beside a Message or ToolResult heading, ConfidenceNote under a Sources list or EvidenceGroup, and FeedbackCapture after MessageActions once a reply is complete. MessageActions keeps its one-click thumbs; FeedbackCapture is for hosts that want reasons and corrections recorded with receipts.
