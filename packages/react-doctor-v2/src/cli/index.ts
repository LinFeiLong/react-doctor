import { Command } from "commander";
import { CANONICAL_GITHUB_URL, DEFAULT_DIRECTORY } from "../constants.js";
import { handleCliError } from "./handle-error.js";
import { highlighter } from "./highlighter.js";
import { createReactDoctor } from "../sdk/index.js";
import type { ReactDoctorResult } from "../sdk/index.js";

const VERSION = process.env.VERSION ?? "0.0.0";

interface CliFlags {
  json: boolean;
}

const printInspectionResult = (result: ReactDoctorResult, flags: CliFlags): void => {
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  console.log(`react-doctor ${highlighter.dim(`v${VERSION}`)}`);
  console.log("");
  console.log(
    `${highlighter.success("✔")} ${highlighter.bold("React Doctor v2 scaffold ready")} ${highlighter.dim(result.project.rootDirectory)}`,
  );
};

const program = new Command()
  .name("react-doctor")
  .description("Inspect React codebase health")
  .version(VERSION, "-v, --version", "display the version number")
  .argument("[directory]", "project directory to inspect", DEFAULT_DIRECTORY)
  .option("--json", "output the inspection result as JSON")
  .action(async (directory: string, flags: CliFlags) => {
    const reactDoctor = createReactDoctor({ rootDirectory: directory });
    const result = await reactDoctor.inspect();

    printInspectionResult(result, flags);
  })
  .addHelpText(
    "after",
    `
${highlighter.dim("Learn more:")}
  ${highlighter.info(CANONICAL_GITHUB_URL)}
`,
  );

program.parseAsync().catch(handleCliError);
