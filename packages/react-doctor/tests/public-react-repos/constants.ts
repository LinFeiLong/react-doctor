export interface PublicReactRepository {
  name: string;
  slug: string;
  url: string;
}

export const PUBLIC_REPO_SMOKE_ENV_VAR = "REACT_DOCTOR_PUBLIC_REPOS";
export const PUBLIC_REPO_SMOKE_ENABLED_VALUE = "1";
export const GIT_CLONE_TIMEOUT_MS = 120_000;
export const PUBLIC_REPO_SCAN_TIMEOUT_MS = 180_000;
export const PUBLIC_REPO_TEST_TIMEOUT_MS = 360_000;
export const COMMAND_MAX_BUFFER_BYTES = 10_000_000;
export const PUBLIC_REPO_TEMP_DIR_PREFIX = "react-doctor-public-repos-";

export const PUBLIC_REACT_REPOSITORIES: PublicReactRepository[] = [
  {
    name: "Diffs",
    slug: "pierrecomputer/pierre",
    url: "https://github.com/pierrecomputer/pierre.git",
  },
  {
    name: "Cal.diy",
    slug: "calcom/cal.diy",
    url: "https://github.com/calcom/cal.diy.git",
  },
  {
    name: "shadcn/ui",
    slug: "shadcn-ui/ui",
    url: "https://github.com/shadcn-ui/ui.git",
  },
  {
    name: "Dub",
    slug: "dubinc/dub",
    url: "https://github.com/dubinc/dub.git",
  },
  {
    name: "tldraw",
    slug: "tldraw/tldraw",
    url: "https://github.com/tldraw/tldraw.git",
  },
  {
    name: "Twenty",
    slug: "twentyhq/twenty",
    url: "https://github.com/twentyhq/twenty.git",
  },
  {
    name: "Formbricks",
    slug: "formbricks/formbricks",
    url: "https://github.com/formbricks/formbricks.git",
  },
  {
    name: "Trigger.dev",
    slug: "triggerdotdev/trigger.dev",
    url: "https://github.com/triggerdotdev/trigger.dev.git",
  },
  {
    name: "Novu",
    slug: "novuhq/novu",
    url: "https://github.com/novuhq/novu.git",
  },
  {
    name: "Chakra UI",
    slug: "chakra-ui/chakra-ui",
    url: "https://github.com/chakra-ui/chakra-ui.git",
  },
];
