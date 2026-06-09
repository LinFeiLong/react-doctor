import { checkSecurityPosture as checkOxlintSecurityPosture } from "oxlint-plugin-react-doctor/security-posture";
import type { Diagnostic } from "./types/index.js";

export const checkSecurityPosture = (rootDirectory: string): Diagnostic[] => {
  return checkOxlintSecurityPosture(rootDirectory);
};
