import * as Sentry from "@sentry/node";

// Sentry metric attributes accept primitives; `null`/`undefined` denote an
// absent signal and are dropped so a missing value never becomes a misleading
// `"null"` attribute (mirrors `toSpanAttributes` for spans).
export interface MetricAttributes {
  [attributeName: string]: string | number | boolean | null | undefined;
}

interface MetricOptions {
  readonly unit?: string;
  readonly attributes?: MetricAttributes;
}

const cleanAttributes = (
  attributes: MetricAttributes | undefined,
): Record<string, string | number | boolean> | undefined => {
  if (!attributes) return undefined;
  const cleaned: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== null && value !== undefined) cleaned[key] = value;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};

/**
 * Emits a Sentry counter. A guarded, swallow-on-throw no-op unless the CLI's
 * Sentry SDK is live, so it's inert under `--no-score`, tests, and the
 * programmatic `@react-doctor/api` library (none of which initialize Sentry).
 * Metrics flow independently of performance tracing, so counters are still
 * recorded when `SENTRY_TRACES_SAMPLE_RATE=0`. Run + project context rides
 * along automatically via the global scope attributes set in `instrument.ts`
 * and `recordSentryProjectContext`.
 */
export const recordCount = (name: string, value = 1, attributes?: MetricAttributes): void => {
  if (!Sentry.isInitialized()) return;
  try {
    Sentry.metrics.count(name, value, { attributes: cleanAttributes(attributes) });
  } catch {}
};

/**
 * Emits a Sentry distribution (value ranges — durations, sizes, scores). Same
 * gating and anonymized-attribute handling as {@link recordCount}.
 */
export const recordDistribution = (
  name: string,
  value: number,
  options: MetricOptions = {},
): void => {
  if (!Sentry.isInitialized()) return;
  try {
    Sentry.metrics.distribution(name, value, {
      unit: options.unit,
      attributes: cleanAttributes(options.attributes),
    });
  } catch {}
};
