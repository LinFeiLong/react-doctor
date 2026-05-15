import type { PackageJson } from "@react-doctor/types";

const I18N_PACKAGES = new Set([
  "i18next",
  "react-i18next",
  "next-i18next",
  "next-intl",
  "next-translate",
  "react-intl",
  "@formatjs/intl",
  "@lingui/react",
  "@lingui/core",
  "@lingui/macro",
  "gatsby-plugin-react-i18next",
]);

export const hasI18n = (packageJson: PackageJson): boolean => {
  const allDependencies = {
    ...packageJson.peerDependencies,
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  return Object.keys(allDependencies).some((packageName) => I18N_PACKAGES.has(packageName));
};
