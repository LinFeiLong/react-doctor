import {
  BARREL_EXPORT_THRESHOLD_COUNT,
  BARREL_IMPORTER_THRESHOLD_COUNT,
  REACT_ARCHITECTURE_CHECK_ID,
  REACT_CLIENT_DIRECTIVE,
  REACT_SERVER_DIRECTIVE,
  SERVER_ONLY_PACKAGE_NAME,
} from "./analyzer/constants.js";
import { runCodebaseAnalysis } from "./analyzer/index.js";
import type {
  ImportRecord,
  ModuleGraph,
  ModuleGraphNode,
  ProjectFile,
  ResolvedImport,
} from "./analyzer/index.js";
import { defineRule } from "../registry.js";
import type { ReactDoctorIssue } from "../../types.js";

export const REACT_ARCHITECTURE_RULE_ID = REACT_ARCHITECTURE_CHECK_ID;

interface BoundaryViolationFinding {
  file: ProjectFile;
  targetFile?: ProjectFile;
  importRecord: ImportRecord;
}

interface CircularDependencyFinding {
  files: ProjectFile[];
}

interface BarrelHotspotFinding {
  file: ProjectFile;
  exportCount: number;
  importerCount: number;
}

interface StronglyConnectedComponentState {
  index: number;
  stack: number[];
  indexByFileId: Map<number, number>;
  lowLinkByFileId: Map<number, number>;
  fileIdsOnStack: Set<number>;
  components: number[][];
}

const createCodebaseIssue = (
  issue: Omit<ReactDoctorIssue, "severity" | "category"> & {
    severity?: ReactDoctorIssue["severity"];
    category?: string;
  },
): ReactDoctorIssue => ({
  severity: issue.severity ?? "warning",
  category: issue.category ?? "Architecture",
  ...issue,
});

const sortIssues = (issues: ReactDoctorIssue[]): ReactDoctorIssue[] =>
  issues.sort((first, second) => {
    const firstPath = first.location?.filePath ?? "";
    const secondPath = second.location?.filePath ?? "";
    return (
      firstPath.localeCompare(secondPath) ||
      (first.location?.line ?? 0) - (second.location?.line ?? 0) ||
      first.id.localeCompare(second.id)
    );
  });

const isClientNode = (node: ModuleGraphNode): boolean =>
  node.directives.has(REACT_CLIENT_DIRECTIVE);

const isServerOnlyTarget = (graph: ModuleGraph, resolvedImport: ResolvedImport): boolean => {
  if (resolvedImport.packageName === SERVER_ONLY_PACKAGE_NAME) return true;
  return false;
};

const isServerActionBoundary = (graph: ModuleGraph, resolvedImport: ResolvedImport): boolean => {
  if (resolvedImport.targetKind !== "internal" || !resolvedImport.targetFilePath) return false;
  const targetFileId = graph.pathToFileId.get(resolvedImport.targetFilePath);
  if (typeof targetFileId !== "number") return false;
  const targetNode = graph.nodes.get(targetFileId);
  return Boolean(targetNode?.directives.has(REACT_SERVER_DIRECTIVE));
};

const collectClientBoundaryViolations = (graph: ModuleGraph): BoundaryViolationFinding[] => {
  const findings: BoundaryViolationFinding[] = [];
  for (const node of graph.nodes.values()) {
    if (!isClientNode(node)) continue;
    const pending: Array<{ currentNode: ModuleGraphNode; firstImport: ResolvedImport | null }> = [
      { currentNode: node, firstImport: null },
    ];
    const visited = new Set<number>();
    while (pending.length > 0) {
      const item = pending.pop();
      if (!item || visited.has(item.currentNode.file.id)) continue;
      visited.add(item.currentNode.file.id);
      for (const resolvedImport of item.currentNode.imports) {
        if (resolvedImport.importRecord.isTypeOnly) continue;
        const firstImport = item.firstImport ?? resolvedImport;
        if (isServerOnlyTarget(graph, resolvedImport)) {
          findings.push({
            file: node.file,
            targetFile: resolvedImport.targetFilePath
              ? graph.nodes.get(graph.pathToFileId.get(resolvedImport.targetFilePath) ?? -1)?.file
              : undefined,
            importRecord: firstImport.importRecord,
          });
          continue;
        }
        if (isServerActionBoundary(graph, resolvedImport)) continue;
        if (resolvedImport.targetKind === "internal" && resolvedImport.targetFilePath) {
          const targetNode = graph.nodes.get(
            graph.pathToFileId.get(resolvedImport.targetFilePath) ?? -1,
          );
          if (targetNode) pending.push({ currentNode: targetNode, firstImport });
        }
      }
    }
  }
  return findings;
};

const collectBarrelHotspots = (graph: ModuleGraph): BarrelHotspotFinding[] =>
  [...graph.nodes.values()]
    .filter(
      (node) =>
        node.exports.size >= BARREL_EXPORT_THRESHOLD_COUNT &&
        node.importedBy.size >= BARREL_IMPORTER_THRESHOLD_COUNT,
    )
    .map((node) => ({
      file: node.file,
      exportCount: node.exports.size,
      importerCount: node.importedBy.size,
    }));

const getInternalImportTargets = (graph: ModuleGraph, node: ModuleGraphNode): number[] =>
  [
    ...new Set(
      node.imports
        .filter(
          (resolvedImport) =>
            resolvedImport.targetKind === "internal" &&
            resolvedImport.targetFilePath &&
            !resolvedImport.importRecord.isTypeOnly,
        )
        .map((resolvedImport) => graph.pathToFileId.get(resolvedImport.targetFilePath ?? ""))
        .filter((fileId): fileId is number => typeof fileId === "number"),
    ),
  ].sort((first, second) => {
    const firstPath = graph.nodes.get(first)?.file.relativePath ?? "";
    const secondPath = graph.nodes.get(second)?.file.relativePath ?? "";
    return firstPath.localeCompare(secondPath);
  });

const sortFileIdsByPath = (graph: ModuleGraph, fileIds: number[]): number[] =>
  [...fileIds].sort((first, second) => {
    const firstPath = graph.nodes.get(first)?.file.relativePath ?? "";
    const secondPath = graph.nodes.get(second)?.file.relativePath ?? "";
    return firstPath.localeCompare(secondPath);
  });

const visitStronglyConnectedComponent = (
  graph: ModuleGraph,
  fileId: number,
  state: StronglyConnectedComponentState,
): void => {
  state.indexByFileId.set(fileId, state.index);
  state.lowLinkByFileId.set(fileId, state.index);
  state.index++;
  state.stack.push(fileId);
  state.fileIdsOnStack.add(fileId);

  const node = graph.nodes.get(fileId);
  if (node) {
    for (const targetFileId of getInternalImportTargets(graph, node)) {
      if (!state.indexByFileId.has(targetFileId)) {
        visitStronglyConnectedComponent(graph, targetFileId, state);
        state.lowLinkByFileId.set(
          fileId,
          Math.min(
            state.lowLinkByFileId.get(fileId) ?? 0,
            state.lowLinkByFileId.get(targetFileId) ?? 0,
          ),
        );
      } else if (state.fileIdsOnStack.has(targetFileId)) {
        state.lowLinkByFileId.set(
          fileId,
          Math.min(
            state.lowLinkByFileId.get(fileId) ?? 0,
            state.indexByFileId.get(targetFileId) ?? 0,
          ),
        );
      }
    }
  }

  if (state.lowLinkByFileId.get(fileId) !== state.indexByFileId.get(fileId)) return;

  const component: number[] = [];
  while (state.stack.length > 0) {
    const stackedFileId = state.stack.pop();
    if (typeof stackedFileId !== "number") break;
    state.fileIdsOnStack.delete(stackedFileId);
    component.push(stackedFileId);
    if (stackedFileId === fileId) break;
  }
  if (component.length > 1) state.components.push(sortFileIdsByPath(graph, component));
};

const collectCircularImports = (graph: ModuleGraph): CircularDependencyFinding[] => {
  const state: StronglyConnectedComponentState = {
    index: 0,
    stack: [],
    indexByFileId: new Map(),
    lowLinkByFileId: new Map(),
    fileIdsOnStack: new Set(),
    components: [],
  };

  for (const fileId of sortFileIdsByPath(graph, [...graph.nodes.keys()])) {
    if (!state.indexByFileId.has(fileId)) {
      visitStronglyConnectedComponent(graph, fileId, state);
    }
  }

  return state.components.map((cycle) => ({
    files: cycle.flatMap((fileId) => {
      const file = graph.nodes.get(fileId)?.file;
      return file ? [file] : [];
    }),
  }));
};

const toCircularDependencyIssue = (finding: CircularDependencyFinding): ReactDoctorIssue =>
  createCodebaseIssue({
    id: `${REACT_ARCHITECTURE_CHECK_ID}/circular/${finding.files.map((file) => file.relativePath).join(">")}`,
    title: "Circular import",
    message: `These files form a cycle: ${finding.files.map((file) => file.relativePath).join(" -> ")}.`,
    location: { filePath: finding.files[0]?.relativePath ?? "" },
    recommendation: "Extract shared code or invert one dependency edge.",
    source: { checkId: REACT_ARCHITECTURE_CHECK_ID, ruleId: "circular-import" },
  });

const toBoundaryIssue = (finding: BoundaryViolationFinding): ReactDoctorIssue =>
  createCodebaseIssue({
    id: `${REACT_ARCHITECTURE_CHECK_ID}/client-server/${finding.file.relativePath}/${finding.importRecord.source}`,
    title: "Client module reaches server-only code",
    message: `The client graph reaches server-only import "${finding.importRecord.source}".`,
    severity: "error",
    location: {
      filePath: finding.file.relativePath,
      line: finding.importRecord.position.line,
      column: finding.importRecord.position.column,
    },
    recommendation: "Move the import behind a server component boundary or split shared code.",
    source: { checkId: REACT_ARCHITECTURE_CHECK_ID, ruleId: "client-server-boundary" },
  });

const toBarrelIssue = (finding: BarrelHotspotFinding): ReactDoctorIssue =>
  createCodebaseIssue({
    id: `${REACT_ARCHITECTURE_CHECK_ID}/barrel/${finding.file.relativePath}`,
    title: "Barrel import hotspot",
    message: `This module exports ${finding.exportCount} symbols and is imported by ${finding.importerCount} modules.`,
    location: { filePath: finding.file.relativePath },
    recommendation: "Prefer direct imports when the barrel inflates the dependency graph.",
    source: { checkId: REACT_ARCHITECTURE_CHECK_ID, ruleId: "barrel-hotspot" },
  });

const inspectReactArchitecture = (graph: ModuleGraph): ReactDoctorIssue[] =>
  sortIssues([
    ...collectClientBoundaryViolations(graph).map(toBoundaryIssue),
    ...collectCircularImports(graph).map(toCircularDependencyIssue),
    ...collectBarrelHotspots(graph).map(toBarrelIssue),
  ]);

export const reactArchitectureRule = defineRule({
  metadata: {
    id: REACT_ARCHITECTURE_RULE_ID,
    name: "Codebase React architecture",
    description:
      "Builds a project module graph and reports React architecture boundary and dependency issues.",
    category: "react-architecture",
    severity: "warning",
    defaultEnabled: false,
    tags: ["codebase", "react-architecture", "oxc"],
  },
  run: async ({ rootDirectory, includePaths, excludePatterns, signal, getCodebaseAnalysis }) => {
    const analysis =
      getCodebaseAnalysis?.() ??
      runCodebaseAnalysis({ rootDirectory, includePaths, excludePatterns, signal });
    return {
      issues: inspectReactArchitecture((await analysis).graph),
    };
  },
});
