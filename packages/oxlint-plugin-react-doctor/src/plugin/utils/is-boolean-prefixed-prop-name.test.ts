import { describe, expect, it } from "vite-plus/test";
import { isBooleanPrefixedPropName } from "./is-boolean-prefixed-prop-name.js";

describe("isBooleanPrefixedPropName", () => {
  it("matches on/off flag prefixes followed by an uppercase letter", () => {
    for (const propName of [
      "isOpen",
      "hasIcon",
      "shouldRender",
      "canEdit",
      "showHeader",
      "hideFooter",
      "enableSync",
      "disableClose",
      "withBorder",
    ]) {
      expect(isBooleanPrefixedPropName(propName)).toBe(true);
    }
  });

  it("does not match names that merely start with the prefix letters", () => {
    for (const propName of [
      "istanbul",
      "hashed",
      "withdraw",
      "shouldnt",
      "isopen",
      "is",
      "Is",
      "open",
      "status",
      "mode",
      "disabled",
    ]) {
      expect(isBooleanPrefixedPropName(propName)).toBe(false);
    }
  });
});
