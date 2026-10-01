'use client';
import { useId } from 'react';
import { IconButton } from '../icon-button/icon-button.js';
import { Accordion } from '../accordion/accordion.js';
import { LoadingIndicator } from '../loading-indicator/loading-indicator.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/coding.module.css';

const RESULT_LIMIT = 300;
const DIAGNOSTIC_LIMIT = 12_000;

export interface TestResult {
  id: string;
  name: string;
  state: 'passed' | 'failed' | 'running' | 'queued' | 'skipped';
  durationMs?: number;
  detail?: string;
  file?: string;
}
export interface TestResultsProps extends VariantProps<'TestResults'> {
  results: readonly TestResult[];
  onOpenFile?: (file: string) => void;
  loading?: boolean;
}
export function TestResults({ results, onOpenFile, loading, variant = 'list' }: TestResultsProps) {
  const id = useId();
  const passed = results.filter((result) => result.state === 'passed').length,
    failed = results.filter((result) => result.state === 'failed').length;
  return (
    <div className={s.root} data-part="test-results" data-variant={variant}>
      <div className={s.header}>
        <strong>Test results</strong>
        <span className={s.muted}>
          {passed} passed · {failed} failed · {results.length} total
        </span>
      </div>
      {loading ? (
        <LoadingIndicator label="Loading test results" />
      ) : !results.length ? (
        <p className={s.notice}>No test results reported.</p>
      ) : (
        <ul className={s.list}>
          {results.slice(0, RESULT_LIMIT).map((result, index) => (
            <li key={result.id} className={s.test}>
              <div className={s.row}>
                <strong>{result.name}</strong>
                <span className={s.badge}>{result.state}</span>
                {result.durationMs !== undefined &&
                  Number.isFinite(result.durationMs) &&
                  result.durationMs >= 0 && (
                    <small className={s.muted}>{result.durationMs}ms</small>
                  )}
              </div>
              {result.detail && (
                <Accordion
                  type="single"
                  collapsible
                  region={false}
                  items={[
                    {
                      value: 'details',
                      title: `Test details: ${result.name}`,
                      content: (
                        <>
                          <pre
                            className={s.diagnostic}
                            tabIndex={0}
                            role="group"
                            aria-label={`${result.name} diagnostics`}
                            aria-describedby={
                              result.detail.length > DIAGNOSTIC_LIMIT
                                ? `${id}-truncated-${index}`
                                : undefined
                            }
                          >
                            {result.detail.slice(0, DIAGNOSTIC_LIMIT)}
                          </pre>
                          {result.detail.length > DIAGNOSTIC_LIMIT && (
                            <p className={s.muted} id={`${id}-truncated-${index}`}>
                              Showing the first 12,000 characters. Additional diagnostics were
                              omitted.
                            </p>
                          )}
                        </>
                      ),
                    },
                  ]}
                />
              )}
              {result.file && onOpenFile && (
                <div className={s.testFile}>
                  <code className={s.muted}>{result.file}</code>
                  <IconButton
                    icon="document"
                    label={`Open ${result.file}`}
                    onClick={() => onOpenFile(result.file!)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {!loading && results.length > RESULT_LIMIT && (
        <p className={s.notice}>Showing the first 300 results.</p>
      )}
    </div>
  );
}
