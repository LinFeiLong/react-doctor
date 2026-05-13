import path from "node:path";
import { highlighter } from "./highlighter.js";
import { prompts } from "./prompts.js";

export interface DiscoveredProject {
  name: string;
  directory: string;
}

export const selectProjects = async (
  discoveredProjects: DiscoveredProject[],
  rootDirectory: string,
  projectFlag: string | undefined,
  skipPrompts: boolean,
  silent: boolean = false,
): Promise<string[]> => {
  if (discoveredProjects.length === 0) return [rootDirectory];

  if (discoveredProjects.length === 1) {
    if (!silent) {
      console.log(
        `${highlighter.success("✔")} Select projects to scan ${highlighter.dim("›")} ${discoveredProjects[0].name}`,
      );
    }
    return [discoveredProjects[0].directory];
  }

  if (projectFlag) return resolveProjectFlag(projectFlag, discoveredProjects);

  if (skipPrompts) {
    if (!silent) {
      console.log(
        `${highlighter.success("✔")} Select projects to scan ${highlighter.dim("›")} ${discoveredProjects.map((project) => project.name).join(", ")}`,
      );
    }
    return discoveredProjects.map((project) => project.directory);
  }

  return promptProjectSelection(discoveredProjects, rootDirectory);
};

const resolveProjectFlag = (
  projectFlag: string,
  discoveredProjects: DiscoveredProject[],
): string[] => {
  const requestedNames = projectFlag.split(",").map((segment) => segment.trim());
  const resolvedDirectories: string[] = [];

  for (const requestedName of requestedNames) {
    const matched = discoveredProjects.find(
      (project) =>
        project.name === requestedName || path.basename(project.directory) === requestedName,
    );

    if (!matched) {
      const availableNames = discoveredProjects.map((project) => project.name).join(", ");
      throw new Error(`Project "${requestedName}" not found. Available: ${availableNames}`);
    }

    resolvedDirectories.push(matched.directory);
  }

  return resolvedDirectories;
};

const promptProjectSelection = async (
  discoveredProjects: DiscoveredProject[],
  rootDirectory: string,
): Promise<string[]> => {
  const { selectedDirectories } = await prompts({
    type: "multiselect",
    name: "selectedDirectories",
    message: "Select projects to scan",
    choices: discoveredProjects.map((project) => ({
      title: project.name,
      description: path.relative(rootDirectory, project.directory),
      value: project.directory,
    })),
    min: 1,
  });

  return Array.isArray(selectedDirectories) ? selectedDirectories : [];
};
