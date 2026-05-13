export const CANONICAL_GITHUB_URL = "https://github.com/millionco/react-doctor";
export const DEFAULT_DIRECTORY = ".";
export const EXIT_FAILURE_CODE = 1;
export const SIGINT_EXIT_CODE = 130;
export const REACT_DOCTOR_CONFIG_FILENAME = "react-doctor.config.json";
export const PACKAGE_JSON_FILENAME = "package.json";
export const PACKAGE_JSON_CONFIG_KEY = "reactDoctor";
export const PERFECT_SCORE = 100;
export const SCORE_GOOD_THRESHOLD = 75;
export const SCORE_OK_THRESHOLD = 50;
export const SCORE_BAR_WIDTH_CHARS = 50;
export const REACT_REVIEW_URL = "https://react.review";
export const SHARE_BASE_URL = "https://www.react.doctor/share";
export const ERROR_RULE_PENALTY = 1.0;
export const WARNING_RULE_PENALTY = 0.5;
export const PER_RULE_LOG_AMPLIFICATION_CAP = 4;
// Per-category penalty cap. Without this, a codebase with many distinct
// oxlint rules firing each contributes additively and crashes the score
// regardless of how "good" each individual rule's signal is. Capping each
// category turns the score from "sum of all problems" into "worst category
// dominates". 35 is calibrated so a clean repo isn't capped and a noisy
// monorepo still feels the hit but doesn't floor to 0.
export const PER_CATEGORY_PENALTY_CAP = 35;
export const SCORE_API_URL = "https://www.react.doctor/api/score";
export const FETCH_TIMEOUT_MS = 10_000;
export const MILLISECONDS_PER_SECOND = 1000;
export const SPINNER_FRAME_INTERVAL_MS = 80;
export const MAX_CATEGORY_GROUPS_SHOWN_NON_VERBOSE = 3;
export const MAX_RULE_GROUPS_PER_CATEGORY_NON_VERBOSE = 3;
// Verbose --verbose score breakdown UI tuning.
export const MAX_INLINE_SUB_RULES_SHOWN = 4;
export const MAX_SCORE_DRAINS_SHOWN = 5;
export const DEFAULT_BRANCH_CANDIDATES = ["main", "master"];
export const GIT_SHOW_MAX_BUFFER_BYTES = 50 * 1024 * 1024;
export const SOURCE_FILE_PATTERN = /\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;

export const FRAMEWORK_DISPLAY_NAMES: Record<string, string> = {
  nextjs: "Next.js",
  "react-native": "React Native",
  "tanstack-start": "TanStack Start",
  cra: "Create React App",
  expo: "Expo",
  gatsby: "Gatsby",
  remix: "Remix",
  vite: "Vite",
  react: "React",
};

export const REACT_PROJECT_DEPENDENCIES = new Set([
  "@remix-run/react",
  "@tanstack/react-start",
  "expo",
  "gatsby",
  "next",
  "react",
  "react-native",
  "react-scripts",
]);

export const FILESYSTEM_WALK_IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "storybook-static",
]);

export const SEVERITY_ORDER: Record<string, number> = { error: 0, warning: 1, info: 2 };
