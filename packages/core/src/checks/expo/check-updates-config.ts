import type { Diagnostic } from "../../types/index.js";
import type { ExpoCheckContext } from "./expo-check-context.js";
import { buildExpoDiagnostic } from "./utils/build-expo-diagnostic.js";
import { getNestedConfigValue, readExpoAppConfig } from "./utils/read-expo-app-config.js";

// `expo.updates.disableAntiBrickingMeasures: true` turns off the safeguards
// that let expo-updates recover from a bad update — the Expo docs state it
// "is liable to leave an app in a bricked state" and must not be used in
// production. We only flag the statically-readable `true` (JSON app config
// or a literal in a JS/TS config); a value computed at runtime in
// `app.config.js` is a documented false-negative.
export const checkExpoUpdatesConfig = (context: ExpoCheckContext): Diagnostic[] => {
  const appConfig = readExpoAppConfig(context.rootDirectory);
  const disabledInJson =
    getNestedConfigValue(appConfig.config, ["updates", "disableAntiBrickingMeasures"]) === true;
  const disabledInText = /disableAntiBrickingMeasures\s*:\s*true\b/.test(appConfig.text);
  if (!disabledInJson && !disabledInText) return [];

  return [
    buildExpoDiagnostic({
      rule: "expo-updates-no-unsafe-production-config",
      filePath: "app.json",
      message:
        "`updates.disableAntiBrickingMeasures: true` disables expo-updates' recovery safeguards and is liable to leave installed apps in a permanently bricked state — it must not be used in production.",
      help: "Remove `disableAntiBrickingMeasures` from your app config's `updates` block. See https://docs.expo.dev/versions/latest/config/app/#updates",
    }),
  ];
};
