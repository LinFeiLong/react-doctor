const WEB_FILE_EXTENSION_PATTERN = /\.web\.[jt]sx?$/;
const WEB_WORKSPACE_PATTERN = /\/(?:apps|packages|clients|services)\/web(?:-[a-z]+)?\//;

export const isWebOnlyPath = (filename: string): boolean =>
  WEB_FILE_EXTENSION_PATTERN.test(filename) || WEB_WORKSPACE_PATTERN.test(filename);
