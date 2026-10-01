import type { ConnectionState, Source } from './types.js';

/** Public display cursor only. Never put an authentication or resume token here. */
export interface RecoveryCursor {
  streamId: string;
  sequence: number;
}
export interface ConnectionInfo {
  state: ConnectionState;
  recovery: 'none' | 'resumed' | 'incompatible';
  /** Transport connectivity does not establish projection freshness. */
  freshness?: 'current' | 'stale' | 'unknown';
  adapter: { name: string; version: string; resume: boolean; snapshot: boolean };
  cursor?: RecoveryCursor;
  resumedAt?: string;
  detail?: string;
}
export interface ContextUsage {
  used: number;
  limit?: number;
  kind: 'measured' | 'estimated';
  model: string;
  measuredAt: string;
}
export interface InspectedContextItem {
  id: string;
  label: string;
  version: string;
  selected: boolean;
  inclusion: 'included' | 'excluded' | 'pending' | 'unknown';
  access: Source['access'];
  reason?: string;
  originalTokens?: number;
  includedTokens?: number;
  truncated?: boolean;
}
export interface ContextInspection {
  revision: string;
  source: string;
  observedAt: string;
  items: readonly InspectedContextItem[];
  usage?: ContextUsage;
  stale?: boolean;
}
export interface PolicyCheck {
  id: string;
  label: string;
  result: 'pass' | 'warn' | 'fail' | 'unknown';
  detail?: string;
  /** Freshness is supplied by the authority, which must refresh it when validity changes. */
  freshness: 'current' | 'stale' | 'unknown';
  attestation?: { source: string; scope: string; policyVersion: string; checkedAt: string };
}
export interface ModelCapability {
  id: string;
  label: string;
  provider: string;
  available: boolean;
  unavailableReason?: string;
  modes: readonly { id: string; label: string }[];
  toolIds: readonly string[];
  temperature?: { min: number; max: number; step: number };
}
export interface ModelCapabilities {
  revision: string;
  source: string;
  observedAt: string;
  models: readonly ModelCapability[];
  tools: readonly { id: string; label: string; available: boolean; unavailableReason?: string }[];
}
export interface ModelSettings {
  modelId: string;
  modeId?: string;
  toolIds: readonly string[];
  temperature?: number;
}
export interface ModelUsage {
  modelId: string;
  kind: 'measured' | 'estimated';
  source: string;
  observedAt: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: { amount: number; currency: string; basis: string };
}
export function validCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
export function validTimestamp(value: string | undefined): value is string {
  return (
    !!value &&
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) === value.slice(0, 10)
  );
}
export function supportsTemperature(model: ModelCapability, value: number): boolean {
  const range = model.temperature;
  if (
    !range ||
    !Number.isFinite(value) ||
    !Number.isFinite(range.min) ||
    !Number.isFinite(range.max) ||
    !Number.isFinite(range.step) ||
    range.max <= range.min ||
    range.step <= 0 ||
    value < range.min ||
    value > range.max
  )
    return false;
  const steps = (value - range.min) / range.step;
  return Math.abs(steps - Math.round(steps)) < 1e-8;
}
export function policyAssessment(
  check: PolicyCheck,
): 'pass' | 'warn' | 'fail' | 'unknown' | 'stale' {
  const evidence = check.attestation;
  if (
    !evidence?.source.trim() ||
    !evidence.scope.trim() ||
    !evidence.policyVersion.trim() ||
    !validTimestamp(evidence.checkedAt) ||
    check.freshness === 'unknown'
  )
    return 'unknown';
  return check.freshness === 'stale' ? 'stale' : check.result;
}
export function modelSettingsIssues(
  capabilities: ModelCapabilities,
  settings: ModelSettings,
): string[] {
  const model = capabilities.models.find((candidate) => candidate.id === settings.modelId);
  if (!model) return ['The selected model is not in the current capability list.'];
  const issues: string[] = [];
  if (!model.available)
    issues.push(model.unavailableReason || 'The selected model is unavailable.');
  if (settings.modeId && !model.modes.some((mode) => mode.id === settings.modeId))
    issues.push('The selected mode is not supported by this model.');
  const unsupported = settings.toolIds.filter(
    (id) =>
      !model.toolIds.includes(id) ||
      !capabilities.tools.some((tool) => tool.id === id && tool.available),
  );
  if (unsupported.length)
    issues.push(`Unsupported or unavailable tools: ${unsupported.join(', ')}.`);
  if (settings.temperature !== undefined) {
    if (!supportsTemperature(model, settings.temperature))
      issues.push('The selected temperature is not supported by this model.');
  }
  return issues;
}
