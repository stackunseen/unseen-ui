'use client';
import { useLocale } from '../../providers/locale/locale.js';
import { type ComponentProps, useId } from 'react';
import type { ModelCapabilities, ModelSettings, ModelUsage } from '@stackunseen/ui-core';
import {
  modelSettingsIssues,
  supportsTemperature,
  validCount,
  validTimestamp,
} from '@stackunseen/ui-core';
import { Select } from '../select/select.js';
import { Accordion } from '../accordion/accordion.js';
import { Button } from '../button/button.js';
import { Panel } from '../panel/panel.js';
import { IconButton } from '../icon-button/icon-button.js';
import { Skeleton } from '../skeleton/skeleton.js';
import { ObservationTime } from '../../shared/observation-time/observation-time.js';
import type { VariantProps } from '../../shared/variants.js';
import s from '../../shared/styles/styles.module.css';
import local from './model-controls.module.css';

export interface ModelControlsProps
  extends VariantProps<'ModelControls'>, ComponentProps<'section'> {
  capabilities?: ModelCapabilities;
  value: ModelSettings;
  onValueChange: (settings: ModelSettings) => void;
  status?: 'loading' | 'ready' | 'failed';
  stale?: boolean;
  disabled?: boolean;
  error?: string;
  usage?: ModelUsage;
  onRefresh?: () => void;
  /** Added to the root element, after the component's own classes. */
  className?: string;
}
function UsageDetails({ value, modelId }: { value?: ModelUsage; modelId: string }) {
  const locale = useLocale();
  if (!value) return <p className={s.muted}>Usage and cost have not been reported.</p>;
  const hasProvenance = !!value.source.trim() && validTimestamp(value.observedAt);
  const validCost =
    value.cost &&
    hasProvenance &&
    Number.isFinite(value.cost.amount) &&
    value.cost.amount >= 0 &&
    /^[A-Z]{3}$/.test(value.cost.currency) &&
    !!value.cost.basis.trim();
  const money = validCost
    ? new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: value.cost!.currency,
        maximumFractionDigits: 4,
      }).format(value.cost!.amount)
    : 'Unknown';
  return (
    <div data-part="usage">
      {value.modelId !== modelId && (
        <p className={s.warning}>This usage belongs to {value.modelId}, not the selected model.</p>
      )}
      <div className={s.metricGrid}>
        <div>
          <span className={s.muted}>
            {value.kind === 'estimated' ? 'Estimated input tokens' : 'Input tokens'}
          </span>
          <strong>
            {hasProvenance && validCount(value.inputTokens)
              ? value.inputTokens.toLocaleString(locale)
              : 'Unknown'}
          </strong>
        </div>
        <div>
          <span className={s.muted}>
            {value.kind === 'estimated' ? 'Estimated output tokens' : 'Output tokens'}
          </span>
          <strong>
            {hasProvenance && validCount(value.outputTokens)
              ? value.outputTokens.toLocaleString(locale)
              : 'Unknown'}
          </strong>
        </div>
        <div>
          <span className={s.muted}>
            {value.kind === 'estimated' ? 'Estimated cost' : 'Reported cost'}
          </span>
          <strong>{money}</strong>
        </div>
      </div>
      {value.cost?.basis && <p className={s.muted}>Cost basis: {value.cost.basis}</p>}
      <p className={s.muted}>
        {value.source || 'Source not supplied'} · <ObservationTime value={value.observedAt} />
      </p>
    </div>
  );
}
export function ModelControls({
  capabilities,
  value,
  onValueChange,
  variant = 'panel',
  status = 'ready',
  stale = false,
  disabled = false,
  error,
  usage,
  onRefresh,
  className = '',
  ...rest
}: ModelControlsProps) {
  const id = useId();
  const model = capabilities?.models.find((candidate) => candidate.id === value.modelId);
  const provenance =
    capabilities &&
    !!capabilities.source.trim() &&
    !!capabilities.revision.trim() &&
    validTimestamp(capabilities.observedAt);
  const locked = disabled || stale || status !== 'ready' || !provenance;
  const availableModels = capabilities?.models.some((candidate) => candidate.available);
  const issues = capabilities ? modelSettingsIssues(capabilities, value) : [];
  const modes = model?.modes ?? [];
  const modeKnown = !value.modeId || modes.some((mode) => mode.id === value.modeId);
  const temperature = model?.temperature;
  const rangeValid =
    temperature &&
    Number.isFinite(temperature.min) &&
    Number.isFinite(temperature.max) &&
    Number.isFinite(temperature.step) &&
    temperature.max > temperature.min &&
    temperature.step > 0;
  const hasTemperature =
    !!model && value.temperature !== undefined && supportsTemperature(model, value.temperature);
  function change(next: ModelSettings) {
    if (!locked) onValueChange(next);
  }
  function clearUnsupported() {
    if (!model || !capabilities) return;
    change({
      ...value,
      modeId: modeKnown ? value.modeId : undefined,
      toolIds: value.toolIds.filter(
        (toolId) =>
          model.toolIds.includes(toolId) &&
          capabilities.tools.some((tool) => tool.id === toolId && tool.available),
      ),
      temperature: hasTemperature ? value.temperature : undefined,
    });
  }
  const selection = (
    <div className={`${s.modelFields} ${local.fields}`}>
      <label className={s.field}>
        Model
        <Select
          value={value.modelId}
          disabled={locked || !availableModels}
          aria-describedby={!availableModels ? `${id}-model-availability` : undefined}
          onValueChange={(modelId) => change({ ...value, modelId })}
          options={[
            ...(!model && value.modelId
              ? [{ value: value.modelId, label: `${value.modelId} (unavailable)`, disabled: true }]
              : []),
            ...(capabilities?.models.map((candidate) => ({
              value: candidate.id,
              label: `${candidate.label} · ${candidate.provider}${candidate.available ? '' : ' (unavailable)'}`,
              disabled: !candidate.available,
            })) ?? []),
          ]}
          placeholder="Choose a model"
        />
      </label>
      <label className={s.field}>
        Mode
        <Select
          value={value.modeId ? `mode:${value.modeId}` : 'default'}
          disabled={locked || !model?.available || !modes.length}
          onValueChange={(modeId) =>
            change({ ...value, modeId: modeId === 'default' ? undefined : modeId.slice(5) })
          }
          options={[
            { value: 'default', label: 'Model default' },
            ...(!modeKnown && value.modeId
              ? [
                  {
                    value: `mode:${value.modeId}`,
                    label: `${value.modeId} (unsupported)`,
                    disabled: true,
                  },
                ]
              : []),
            ...modes.map((mode) => ({ value: `mode:${mode.id}`, label: mode.label })),
          ]}
        />
      </label>
      {!availableModels && (
        <p id={`${id}-model-availability`} className={`${s.muted} ${local.availability}`}>
          {!capabilities
            ? 'Model availability has not been reported.'
            : !capabilities.models.length
              ? 'No models are available.'
              : 'No models are currently available.'}
        </p>
      )}
      {model?.unavailableReason && <p className={s.warning}>{model.unavailableReason}</p>}
      {rangeValid && (
        <div className={`${s.temperatureControl} ${local.temperature}`}>
          <label className={`${local.toolChoice} ${local.choice}`}>
            <input
              type="checkbox"
              checked={hasTemperature}
              disabled={locked || !model?.available}
              onChange={(event) =>
                change({
                  ...value,
                  temperature: event.target.checked ? temperature.min : undefined,
                })
              }
            />
            Override temperature
          </label>
          <div className={s.field}>
            <label htmlFor={`${id}-temperature-control`}>
              Temperature
              <span aria-hidden="true">
                {' '}
                · {hasTemperature ? value.temperature : 'Model default'}
              </span>
            </label>
            <input
              id={`${id}-temperature-control`}
              type="range"
              aria-describedby={`${id}-temperature`}
              aria-valuetext={hasTemperature ? String(value.temperature) : 'Model default'}
              min={temperature.min}
              max={temperature.max}
              step={temperature.step}
              value={hasTemperature ? value.temperature : temperature.min}
              disabled={locked || !model?.available || !hasTemperature}
              onChange={(event) => change({ ...value, temperature: Number(event.target.value) })}
            />
            <span id={`${id}-temperature`} className={s.muted}>
              {hasTemperature
                ? 'Explicit value'
                : 'Turn on an override to choose a value; otherwise the default applies.'}{' '}
              · Supported range {temperature.min}–{temperature.max}
            </span>
          </div>
        </div>
      )}
    </div>
  );
  const tools = (
    <fieldset className={`${s.toolChoices} ${local.tools}`} disabled={locked || !model?.available}>
      <legend className={variant === 'accordion' ? s.srOnly : undefined}>Tools</legend>
      {!capabilities?.tools.length && !value.toolIds.length && (
        <p className={s.muted}>No tools are available.</p>
      )}
      {capabilities?.tools.map((tool, index) => {
        const checked = value.toolIds.includes(tool.id);
        const supported = !!model?.toolIds.includes(tool.id) && tool.available;
        return (
          <label className={`${local.toolChoice} ${local.choice}`} key={tool.id}>
            <input
              type="checkbox"
              checked={checked}
              aria-labelledby={`${id}-tool-${index}`}
              aria-describedby={!supported ? `${id}-tool-${index}-hint` : undefined}
              disabled={!supported && !checked}
              onChange={(event) =>
                change({
                  ...value,
                  toolIds: event.target.checked
                    ? [...value.toolIds, tool.id]
                    : value.toolIds.filter((toolId) => toolId !== tool.id),
                })
              }
            />
            <span>
              <strong id={`${id}-tool-${index}`}>{tool.label}</strong>
              {!supported && (
                <small id={`${id}-tool-${index}-hint`}>
                  {tool.unavailableReason || 'Not supported by the selected model.'}
                </small>
              )}
            </span>
          </label>
        );
      })}
      {value.toolIds
        .filter((toolId) => !capabilities?.tools.some((tool) => tool.id === toolId))
        .map((toolId, index) => (
          <label className={`${local.toolChoice} ${local.choice}`} key={toolId}>
            <input
              type="checkbox"
              checked
              aria-labelledby={`${id}-removed-tool-${index}`}
              aria-describedby={`${id}-removed-tool-${index}-hint`}
              onChange={() =>
                change({ ...value, toolIds: value.toolIds.filter((id) => id !== toolId) })
              }
            />
            <span>
              <strong id={`${id}-removed-tool-${index}`}>{toolId}</strong>
              <small id={`${id}-removed-tool-${index}-hint`}>
                No longer advertised. Uncheck to remove.
              </small>
            </span>
          </label>
        ))}
    </fieldset>
  );
  return (
    <Panel
      {...rest}
      className={`${s.modelControls} ${local.root} ${className}`}
      data-variant={variant}
    >
      <div className={s.row}>
        <strong className={s.grow}>Model controls</strong>
        {onRefresh && (
          <IconButton
            icon="retry"
            label="Refresh capabilities"
            onClick={onRefresh}
            disabled={status === 'loading'}
          />
        )}
      </div>
      <p className={s.muted}>
        Set up the next request. Model and tool access are checked when it runs.
      </p>
      {stale && (
        <p className={s.warning}>Capabilities are stale. Refresh before changing settings.</p>
      )}
      {status === 'failed' && (
        <p role="alert" className={s.error}>
          {error || 'Unable to load model capabilities.'}
        </p>
      )}
      {error && status !== 'failed' && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {status === 'loading' ? (
        <Skeleton shape="card" label="Loading model capabilities" />
      ) : (
        <>
          {!provenance && (
            <p className={s.warning}>Capability metadata is incomplete. Settings are read-only.</p>
          )}
          {!!issues.length && (
            <div className={local.settingsIssues} role="status">
              <strong>Review unsupported settings</strong>
              <ul>
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
              {model?.available && (
                <Button size="sm" variant="outline" disabled={locked} onClick={clearUnsupported}>
                  Clear unsupported settings
                </Button>
              )}
            </div>
          )}
          {variant === 'accordion' ? (
            <Accordion
              region={false}
              type="multiple"
              defaultValue={['model']}
              items={[
                { value: 'model', title: 'Model and generation settings', content: selection },
                {
                  value: 'tools',
                  title: `Tools · ${value.toolIds.length} selected`,
                  content: tools,
                },
                {
                  value: 'usage',
                  title: 'Usage and cost',
                  content: <UsageDetails value={usage} modelId={value.modelId} />,
                },
              ]}
            />
          ) : (
            <div className={local.modelBody}>
              {selection}
              {tools}
              <UsageDetails value={usage} modelId={value.modelId} />
            </div>
          )}
          {capabilities && (
            <p className={s.muted}>
              Capabilities {capabilities.revision} · {capabilities.source || 'Source not supplied'}{' '}
              · <ObservationTime value={capabilities.observedAt} />
            </p>
          )}
        </>
      )}
    </Panel>
  );
}
