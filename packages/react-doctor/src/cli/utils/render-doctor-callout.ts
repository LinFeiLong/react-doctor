import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import {
  getSkillAgentConfig,
  isSkillInstalledForAgent,
  type SkillAgentType,
} from "agent-install";
import { highlighter, SKILL_NAME } from "@react-doctor/core";
import { detectAvailableAgents } from "./detect-agents.js";

const CALLOUT_INSTALL_COMMAND = "npx react-doctor@latest install";

const findAgentsWithInstalledSkill = async (
  agents: ReadonlyArray<SkillAgentType>,
): Promise<SkillAgentType[]> => {
  const checks = await Promise.all(
    agents.map(async (agent) => {
      try {
        const installed = await isSkillInstalledForAgent(SKILL_NAME, agent);
        return installed ? agent : null;
      } catch {
        return null;
      }
    }),
  );
  return checks.filter((agent): agent is SkillAgentType => agent !== null);
};

const formatAgentList = (agents: ReadonlyArray<SkillAgentType>): string =>
  agents.map((agent) => getSkillAgentConfig(agent).displayName).join(", ");

interface CalloutShape {
  readonly headlineLeft: string;
  readonly headlineRight: string;
  readonly subLines: ReadonlyArray<string>;
}

const buildCallout = (
  installedAgents: ReadonlyArray<SkillAgentType>,
  hasAnyAgent: boolean,
): CalloutShape => {
  if (installedAgents.length > 0) {
    return {
      headlineLeft: "▸ Next:",
      headlineRight: `run ${highlighter.bold(highlighter.info("/doctor"))} in ${formatAgentList(installedAgents)} to fix these with React Doctor.`,
      subLines: [],
    };
  }
  if (hasAnyAgent) {
    return {
      headlineLeft: "▸ Next:",
      headlineRight: `install the ${highlighter.bold("React Doctor")} skill so your coding agent can fix these for you.`,
      subLines: [`   ${highlighter.bold(highlighter.info(CALLOUT_INSTALL_COMMAND))}`],
    };
  }
  return {
    headlineLeft: "▸ Tip:",
    headlineRight: `install React Doctor for your coding agent (Claude Code, Cursor, Codex, ...).`,
    subLines: [`   ${highlighter.bold(highlighter.info(CALLOUT_INSTALL_COMMAND))}`],
  };
};

const printCalloutBlock = (shape: CalloutShape): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Console.log("");
    yield* Console.log(
      `  ${highlighter.bold(highlighter.info(shape.headlineLeft))} ${shape.headlineRight}`,
    );
    for (const subLine of shape.subLines) {
      yield* Console.log(`  ${subLine}`);
    }
    yield* Console.log("");
  });

export interface PrintDoctorCalloutOptions {
  /** Test seam: skip the live filesystem detection. */
  readonly detectedAgents?: ReadonlyArray<SkillAgentType>;
}

export const printDoctorCallout = (
  options: PrintDoctorCalloutOptions = {},
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const detected =
      options.detectedAgents ?? (yield* Effect.promise(() => detectAvailableAgents()));
    const installed = yield* Effect.promise(() => findAgentsWithInstalledSkill(detected));
    yield* printCalloutBlock(buildCallout(installed, detected.length > 0));
  });
