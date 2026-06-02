import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface InstallGithubWorkflowResult {
  readonly status: "created" | "exists" | "failed";
  readonly workflowPath: string;
}

// The action is pinned to the floating major `@v1` (never `@main`, per the
// supply-chain guidance in AGENTS.md): `@main` would run whatever HEAD points
// to with `pull-requests: write` granted.
export const buildWorkflowContent = (): string =>
  [
    "name: React Doctor",
    "",
    "on:",
    "  pull_request:",
    "    types: [opened, synchronize, reopened, ready_for_review]",
    "",
    "permissions:",
    "  contents: read",
    "  pull-requests: write",
    "  issues: write",
    "",
    "concurrency:",
    "  group: react-doctor-${{ github.event.pull_request.number || github.ref }}",
    "  cancel-in-progress: true",
    "",
    "jobs:",
    "  react-doctor:",
    "    runs-on: ubuntu-latest",
    "    steps:",
    "      - uses: actions/checkout@v5",
    "      - uses: millionco/react-doctor@v1",
    "",
  ].join("\n");

export const getReactDoctorWorkflowPath = (projectRoot: string): string =>
  path.join(projectRoot, ".github", "workflows", "react-doctor.yml");

// Writes `.github/workflows/react-doctor.yml`, creating the workflows
// directory if needed. Returns "exists" without overwriting a workflow that's
// already there, and "failed" (rather than throwing) so callers can degrade to
// printing manual setup instructions.
export const installReactDoctorWorkflow = (projectRoot: string): InstallGithubWorkflowResult => {
  const workflowPath = getReactDoctorWorkflowPath(projectRoot);
  if (existsSync(workflowPath)) return { status: "exists", workflowPath };

  try {
    mkdirSync(path.dirname(workflowPath), { recursive: true });
    writeFileSync(workflowPath, buildWorkflowContent());
    return { status: "created", workflowPath };
  } catch {
    return { status: "failed", workflowPath };
  }
};
