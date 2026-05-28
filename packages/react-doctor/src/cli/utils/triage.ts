import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { toRelativePath } from "@react-doctor/core";
import type { Diagnostic } from "@react-doctor/core";
import {
  TRIAGE_DEFAULT_MODEL,
  TRIAGE_MAX_DIAGNOSTICS_COUNT,
  TRIAGE_MODEL_ENV_VARIABLE,
  TRIAGE_TIMEOUT_MS,
} from "./constants.js";
import { getTriageInstructions } from "./triage-instructions.js";

const TRIAGE_PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
export type TriagePriority = (typeof TRIAGE_PRIORITIES)[number];

export interface TriageVerdict {
  readonly diagnostic: Diagnostic;
  readonly priority: TriagePriority;
  readonly title: string;
  readonly description: string;
}

export interface TriageOutcome {
  readonly kept: ReadonlyArray<TriageVerdict>;
  readonly suppressed: ReadonlyArray<Diagnostic>;
  readonly overflowed: number;
  readonly elapsedMilliseconds: number;
  readonly totalCostUsd: number | null;
  readonly model: string;
}

export type TriageProgressEvent =
  | { readonly kind: "started" }
  | { readonly kind: "tool"; readonly toolName: string; readonly summary: string }
  | { readonly kind: "thinking" };

export interface TriageRunInput {
  readonly diagnostics: ReadonlyArray<Diagnostic>;
  readonly workingDirectory: string;
  readonly onProgress?: (event: TriageProgressEvent) => void;
}

const TRIAGE_TAG_PATTERN = /<triage\s+([^>]*?)>([\s\S]*?)<\/triage>/g;
const ATTRIBUTE_PATTERN = /(\w[\w-]*)\s*=\s*"([^"]*)"/g;
const TOOL_INPUT_PATH_KEYS = ["file_path", "path", "pattern"] as const;

const isTriagePriority = (candidate: string): candidate is TriagePriority =>
  (TRIAGE_PRIORITIES as ReadonlyArray<string>).includes(candidate);

const collapseWhitespace = (value: string): string => value.replaceAll(/\s+/g, " ").trim();

const decodeXmlEntities = (value: string): string =>
  value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");

const getRuleKey = (diagnostic: Pick<Diagnostic, "plugin" | "rule">): string =>
  `${diagnostic.plugin}/${diagnostic.rule}`;

const getDiagnosticIdentity = (diagnostic: Diagnostic, workingDirectory: string): string =>
  [
    getRuleKey(diagnostic),
    toRelativePath(diagnostic.filePath, workingDirectory),
    String(diagnostic.line),
  ].join("\0");

interface ParsedTriageTag {
  readonly priority: TriagePriority;
  readonly ruleKey: string;
  readonly filePath: string;
  readonly line: number;
  readonly title: string;
  readonly description: string;
}

const parseTriageTags = (responseText: string): ParsedTriageTag[] => {
  const parsedTags: ParsedTriageTag[] = [];
  for (const [, attributesText, bodyText] of responseText.matchAll(TRIAGE_TAG_PATTERN)) {
    const attributes: Record<string, string> = {};
    for (const [, name, value] of attributesText.matchAll(ATTRIBUTE_PATTERN)) {
      attributes[name.toLowerCase()] = decodeXmlEntities(value);
    }

    const priority = (attributes.priority ?? "").trim().toUpperCase();
    const ruleKey = (attributes.rule ?? "").trim();
    const filePath = (attributes.file ?? "").trim();
    const title = (attributes.title ?? "").trim();
    const description = decodeXmlEntities(bodyText).trim();
    const line = Number.parseInt(attributes.line ?? "", 10);

    const isValidLine = Number.isInteger(line) && line > 0;
    if (
      !isTriagePriority(priority) ||
      !ruleKey ||
      !filePath ||
      !title ||
      !description ||
      !isValidLine
    ) {
      continue;
    }
    parsedTags.push({ priority, ruleKey, filePath, line, title, description });
  }
  return parsedTags;
};

const resolveDiagnosticForTag = (
  tag: ParsedTriageTag,
  diagnostics: ReadonlyArray<Diagnostic>,
  workingDirectory: string,
): Diagnostic | null => {
  const tagRelativePath = toRelativePath(tag.filePath, workingDirectory);
  return (
    diagnostics.find(
      (diagnostic) =>
        diagnostic.line === tag.line &&
        getRuleKey(diagnostic) === tag.ruleKey &&
        toRelativePath(diagnostic.filePath, workingDirectory) === tagRelativePath,
    ) ?? null
  );
};

const formatDiagnosticForPrompt = (
  diagnostic: Diagnostic,
  workingDirectory: string,
  index: number,
): string => {
  const lines = [
    `[${String(index + 1)}] (${diagnostic.severity}) ${getRuleKey(diagnostic)}`,
    `  file: ${toRelativePath(diagnostic.filePath, workingDirectory)}:${String(diagnostic.line)}`,
    `  message: ${collapseWhitespace(diagnostic.message)}`,
  ];
  if (diagnostic.help) lines.push(`  help: ${collapseWhitespace(diagnostic.help)}`);
  if (diagnostic.url) lines.push(`  docs: ${diagnostic.url}`);
  return lines.join("\n");
};

const buildUserPrompt = (
  diagnostics: ReadonlyArray<Diagnostic>,
  workingDirectory: string,
): string =>
  [
    getTriageInstructions(),
    "---",
    "",
    `Working directory: ${workingDirectory}`,
    `Total diagnostics: ${String(diagnostics.length)}`,
    "",
    "## Diagnostics",
    "",
    diagnostics
      .map((diagnostic, index) => formatDiagnosticForPrompt(diagnostic, workingDirectory, index))
      .join("\n\n"),
    "",
    "Remember: omission is the suppression mechanism — do not emit a tag for diagnostics you consider false positives, and do not emit tags for findings that are not in the list above.",
  ].join("\n");

const readStringField = (source: unknown, fieldName: string): string | null => {
  if (typeof source !== "object" || source === null || !(fieldName in source)) return null;
  const fieldValue = Reflect.get(source, fieldName);
  return typeof fieldValue === "string" && fieldValue.length > 0 ? fieldValue : null;
};

const summarizeToolInput = (toolName: string, toolInput: unknown): string => {
  for (const fieldName of TOOL_INPUT_PATH_KEYS) {
    const fieldValue = readStringField(toolInput, fieldName);
    if (fieldValue) return `${toolName}(${fieldValue})`;
  }
  return toolName;
};

const reportAssistantProgress = (
  message: Extract<SDKMessage, { type: "assistant" }>,
  onProgress: TriageRunInput["onProgress"],
): void => {
  if (!onProgress) return;
  const blocks = Array.isArray(message.message.content) ? message.message.content : [];
  for (const block of blocks) {
    if (block.type === "tool_use") {
      onProgress({
        kind: "tool",
        toolName: block.name,
        summary: summarizeToolInput(block.name, block.input),
      });
      return;
    }
    if (block.type === "text" && block.text.trim().length > 0) {
      onProgress({ kind: "thinking" });
      return;
    }
  }
};

const formatSdkErrorMessage = (subtype: string, errors: ReadonlyArray<string>): string =>
  errors.length === 0
    ? `Claude Agent SDK returned ${subtype}.`
    : `Claude Agent SDK returned ${subtype}: ${errors.join("; ")}`;

export const triageDiagnostics = async (input: TriageRunInput): Promise<TriageOutcome> => {
  const overflowed = Math.max(0, input.diagnostics.length - TRIAGE_MAX_DIAGNOSTICS_COUNT);
  const triageInput = input.diagnostics.slice(0, TRIAGE_MAX_DIAGNOSTICS_COUNT);
  const model = process.env[TRIAGE_MODEL_ENV_VARIABLE] ?? TRIAGE_DEFAULT_MODEL;

  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), TRIAGE_TIMEOUT_MS);
  const startedAtMilliseconds = Date.now();

  let responseText = "";
  let totalCostUsd: number | null = null;

  try {
    const queryStream = query({
      prompt: buildUserPrompt(triageInput, input.workingDirectory),
      options: {
        model,
        // `systemPrompt` is intentionally unset so the SDK keeps its default
        // minimal system prompt for the bundled `claude` binary. Our triage
        // rules ride in the user message (see `buildUserPrompt`).
        cwd: input.workingDirectory,
        permissionMode: "bypassPermissions",
        includePartialMessages: false,
        abortController,
        // Coding-agent settings sources (Skills, CLAUDE.md, plugins) would
        // pull in the user's local Claude Code config — that's irrelevant
        // for a one-shot triage and risks bloating the context window with
        // unrelated guidance, so we disable every filesystem source.
        settingSources: [],
      },
    });

    input.onProgress?.({ kind: "started" });

    for await (const message of queryStream) {
      if (message.type === "assistant") {
        reportAssistantProgress(message, input.onProgress);
        continue;
      }
      if (message.type !== "result") continue;
      totalCostUsd = message.total_cost_usd;
      if (message.subtype === "success") {
        responseText = message.result;
      } else {
        throw new Error(formatSdkErrorMessage(message.subtype, message.errors));
      }
    }
  } finally {
    clearTimeout(timeoutHandle);
  }

  const keptIdentities = new Set<string>();
  const kept: TriageVerdict[] = [];
  for (const tag of parseTriageTags(responseText)) {
    const diagnostic = resolveDiagnosticForTag(tag, triageInput, input.workingDirectory);
    if (!diagnostic) continue;
    const identity = getDiagnosticIdentity(diagnostic, input.workingDirectory);
    if (keptIdentities.has(identity)) continue;
    keptIdentities.add(identity);
    kept.push({
      diagnostic,
      priority: tag.priority,
      title: tag.title,
      description: tag.description,
    });
  }
  const suppressed = triageInput.filter(
    (diagnostic) => !keptIdentities.has(getDiagnosticIdentity(diagnostic, input.workingDirectory)),
  );

  return {
    kept,
    suppressed,
    overflowed,
    elapsedMilliseconds: Date.now() - startedAtMilliseconds,
    totalCostUsd,
    model,
  };
};

export const __testing = {
  buildUserPrompt,
  parseTriageTags,
  resolveDiagnosticForTag,
};
