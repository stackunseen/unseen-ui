import { describe, expect, it } from 'vitest';

import { modelSettingsIssues, policyAssessment, supportsTemperature } from '@stackunseen/ui-core';
import {
  modelCapabilitiesSchema,
  modelSettingsSchema,
  modelUsageSchema,
  contextInspectionSchema,
  connectionInfoSchema,
  policyChecksSchema,
} from '@stackunseen/ui-core/schema';
import {
  connectionInfo,
  contextInspection,
  modelCapabilities,
  modelSettings,
  modelUsage,
  policyChecks,
} from '../../../apps/docs/lib/inspection-fixtures';

describe('model capability contracts', () => {
  it('accepts bounded host fixtures and rejects ambiguous or invalid capability payloads', () => {
    expect(modelCapabilitiesSchema.safeParse(modelCapabilities).success).toBe(true);
    expect(
      modelCapabilitiesSchema.safeParse({
        ...modelCapabilities,
        models: [...modelCapabilities.models, modelCapabilities.models[0]],
      }).success,
    ).toBe(false);
    expect(modelCapabilitiesSchema.safeParse({ ...modelCapabilities, tools: [] }).success).toBe(
      false,
    );
    expect(
      modelCapabilitiesSchema.safeParse({
        ...modelCapabilities,
        models: Array.from({ length: 101 }, (_, i) => ({
          ...modelCapabilities.models[0],
          id: `model-${i}`,
        })),
      }).success,
    ).toBe(false);
    expect(
      modelSettingsSchema.safeParse({ ...modelSettings, modelId: 'unadvertised' }).success,
    ).toBe(true);
    expect(
      modelSettingsIssues(modelCapabilities, { ...modelSettings, modelId: 'unadvertised' }),
    ).not.toHaveLength(0);
    expect(modelUsageSchema.safeParse({ ...modelUsage, inputTokens: Infinity }).success).toBe(
      false,
    );
  });
  it('rejects off-step/non-finite temperatures and preserves valid fractional steps', () => {
    const model = modelCapabilities.models[0]!;
    expect(supportsTemperature(model, 0.3)).toBe(true);
    for (const value of [NaN, Infinity, -1, 1.1, 0.35])
      expect(supportsTemperature(model, value)).toBe(false);
    expect(
      modelSettingsIssues(modelCapabilities, { ...modelSettings, modelId: 'missing' }),
    ).toEqual(['The selected model is not in the current capability list.']);
  });
});

describe('policy provenance', () => {
  it('never treats incomplete or stale attestations as current passes', () => {
    const check = policyChecks[0]!;
    expect(policyAssessment({ ...check, attestation: undefined })).toBe('unknown');
    expect(
      policyAssessment({ ...check, attestation: { ...check.attestation!, checkedAt: '2026' } }),
    ).toBe('unknown');
    expect(policyAssessment({ ...check, freshness: 'stale' })).toBe('stale');
    expect(policyAssessment({ ...check, freshness: 'unknown' })).toBe('unknown');
    expect(
      policyAssessment({
        ...check,
        attestation: { ...check.attestation!, checkedAt: '2026-02-30T12:00:00Z' },
      }),
    ).toBe('unknown');
  });
});

describe('context inspection', () => {
  it('validates standalone context, recovery and policy records without inventing missing attestations', () => {
    expect(contextInspectionSchema.safeParse(contextInspection).success).toBe(true);
    expect(connectionInfoSchema.safeParse(connectionInfo).success).toBe(true);
    expect(policyChecksSchema.safeParse(policyChecks).success).toBe(true);
    expect(
      contextInspectionSchema.safeParse({
        ...contextInspection,
        items: [contextInspection.items[0], contextInspection.items[0]],
      }).success,
    ).toBe(false);
    expect(connectionInfoSchema.safeParse({ ...connectionInfo, recovery: 'resumed' }).success).toBe(
      false,
    );
    const unattested = policyChecksSchema.parse([{ ...policyChecks[0], attestation: undefined }]);
    expect(policyAssessment(unattested[0]!)).toBe('unknown');
  });
});
