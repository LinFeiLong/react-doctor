const WEB_FILE_EXTENSION_PATTERN = /\.web\.[jt]sx?$/;
const WEB_WORKSPACE_PATTERN = /\/(?:apps|packages|clients|services)\/web(?:-[a-z]+)?\//;
const WEB_ONLY_DIRECTORY_PATTERN =
  /\/(?:docusaurus|docs|documentation|website|storybook|\.storybook|stories|__docs__)\//;

export const isWebOnlyPath = (filename: string): boolean =>
  WEB_FILE_EXTENSION_PATTERN.test(filename) ||
  WEB_WORKSPACE_PATTERN.test(filename) ||
  WEB_ONLY_DIRECTORY_PATTERN.test(filename);
