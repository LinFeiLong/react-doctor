import { describe, expect, it } from "vite-plus/test";
import {
  ReactDoctorAmbiguousProjectError,
  ReactDoctorCheckFailedError,
  ReactDoctorError,
  ReactDoctorInvalidConfigError,
  ReactDoctorNoReactDependencyError,
  isReactDoctorError,
  toReactDoctorErrorInfo,
} from "../src/sdk/index.js";

describe("SDK errors", () => {
  it("exposes stable codes for typed React Doctor errors", () => {
    const error = new ReactDoctorNoReactDependencyError("/repo");

    expect(error).toBeInstanceOf(ReactDoctorError);
    expect(error.name).toBe("ReactDoctorNoReactDependencyError");
    expect(error.code).toBe("react-doctor/no-react-dependency");
    expect(error.rootDirectory).toBe("/repo");
    expect(isReactDoctorError(error)).toBe(true);
  });

  it("preserves structured context on specialized errors", () => {
    const ambiguousProjectError = new ReactDoctorAmbiguousProjectError("/repo", [
      "apps/admin",
      "apps/web",
    ]);
    const checkFailedError = new ReactDoctorCheckFailedError("oxlint", "Oxlint failed.");

    expect(ambiguousProjectError.candidates).toEqual(["apps/admin", "apps/web"]);
    expect(checkFailedError.checkId).toBe("oxlint");
  });

  it("converts nested errors into serializable error info", () => {
    const rootError = new ReactDoctorInvalidConfigError("Invalid config.");
    const error = new ReactDoctorCheckFailedError("config", "Config check failed.", {
      cause: rootError,
    });

    expect(toReactDoctorErrorInfo(error)).toEqual({
      name: "ReactDoctorCheckFailedError",
      message: "Config check failed.",
      code: "react-doctor/check-failed",
      cause: {
        name: "ReactDoctorInvalidConfigError",
        message: "Invalid config.",
        code: "react-doctor/invalid-config",
      },
    });
  });
});
