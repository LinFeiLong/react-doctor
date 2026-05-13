import {
  ERROR_RULE_PENALTY,
  PER_CATEGORY_PENALTY_CAP,
  PER_RULE_LOG_AMPLIFICATION_CAP,
  PERFECT_SCORE,
  SCORE_GOOD_THRESHOLD,
  SCORE_OK_THRESHOLD,
  WARNING_RULE_PENALTY,
} from "../constants.js";

/**
 * Log-scaled per rule, capped per category. One issue still costs; 1000
 * issues don't zero a big repo. Categories cap so a single noisy area
 * (oxlint, codebase) can't single-handedly tank the score.
 */
export interface ScoreDiagnostic {
  plugin: string;
  rule: string;
  category: string;
  severity: "error" | "warning";
}

export interface CalculateScoreOptions {
  perfectScore?: number;
  perCategoryCap?: number;
}

export interface ScoreCategoryBreakdown {
  category: string;
  rawPenalty: number;
  cappedPenalty: number;
  ruleKeys: number;
}

export interface ScoreBreakdown {
  score: number;
  totalRawPenalty: number;
  totalCappedPenalty: number;
  perCategory: ScoreCategoryBreakdown[];
}

export const getScoreLabel = (score: number): string => {
  if (score >= SCORE_GOOD_THRESHOLD) return "Great";
  if (score >= SCORE_OK_THRESHOLD) return "Needs work";
  return "Critical";
};

export const rulePenalty = (severity: "error" | "warning", count: number): number => {
  const base = severity === "error" ? ERROR_RULE_PENALTY : WARNING_RULE_PENALTY;
  const amplification = Math.min(1 + Math.log2(count), PER_RULE_LOG_AMPLIFICATION_CAP);
  return base * amplification;
};

export const calculateScoreBreakdown = (
  diagnostics: ScoreDiagnostic[],
  options: CalculateScoreOptions = {},
): ScoreBreakdown => {
  const perfectScore = options.perfectScore ?? PERFECT_SCORE;
  const perCategoryCap = options.perCategoryCap ?? PER_CATEGORY_PENALTY_CAP;
  if (diagnostics.length === 0) {
    return { score: perfectScore, totalRawPenalty: 0, totalCappedPenalty: 0, perCategory: [] };
  }

  const ruleCounts = new Map<string, number>();
  const ruleSeverities = new Map<string, "error" | "warning">();
  const ruleCategories = new Map<string, string>();

  for (const diagnostic of diagnostics) {
    const ruleKey = `${diagnostic.plugin}/${diagnostic.rule}`;
    ruleCounts.set(ruleKey, (ruleCounts.get(ruleKey) ?? 0) + 1);
    if (diagnostic.severity === "error" || !ruleSeverities.has(ruleKey)) {
      ruleSeverities.set(ruleKey, diagnostic.severity);
    }
    if (!ruleCategories.has(ruleKey)) {
      ruleCategories.set(ruleKey, diagnostic.category);
    }
  }

  const categoryAggregates = new Map<string, { rawPenalty: number; ruleKeys: number }>();
  for (const [ruleKey, count] of ruleCounts) {
    const severity = ruleSeverities.get(ruleKey) ?? "warning";
    const category = ruleCategories.get(ruleKey) ?? "uncategorized";
    const penalty = rulePenalty(severity, count);
    const existing = categoryAggregates.get(category) ?? { rawPenalty: 0, ruleKeys: 0 };
    existing.rawPenalty += penalty;
    existing.ruleKeys += 1;
    categoryAggregates.set(category, existing);
  }

  const perCategory: ScoreCategoryBreakdown[] = [...categoryAggregates.entries()]
    .map(([category, aggregate]) => ({
      category,
      rawPenalty: aggregate.rawPenalty,
      cappedPenalty: Math.min(aggregate.rawPenalty, perCategoryCap),
      ruleKeys: aggregate.ruleKeys,
    }))
    .toSorted((first, second) => second.cappedPenalty - first.cappedPenalty);

  const totalRawPenalty = perCategory.reduce((total, entry) => total + entry.rawPenalty, 0);
  const totalCappedPenalty = perCategory.reduce((total, entry) => total + entry.cappedPenalty, 0);
  const score = Math.max(0, Math.min(perfectScore, Math.round(perfectScore - totalCappedPenalty)));

  return { score, totalRawPenalty, totalCappedPenalty, perCategory };
};

export const calculateScore = (
  diagnostics: ScoreDiagnostic[],
  options: CalculateScoreOptions = {},
): number => calculateScoreBreakdown(diagnostics, options).score;
