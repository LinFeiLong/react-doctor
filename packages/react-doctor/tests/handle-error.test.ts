import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { buildErrorIssueUrl } from "../src/cli/utils/handle-error.js";

const OTLP_ENDPOINT_ENVIRONMENT_VARIABLE = "REACT_DOCTOR_OTLP_ENDPOINT";
const OTLP_AUTH_HEADER_ENVIRONMENT_VARIABLE = "REACT_DOCTOR_OTLP_AUTH_HEADER";

interface EnvironmentSnapshot {
  [environmentVariableName: string]: string | undefined;
}

describe("handleError", () => {
  let savedEnvironment: EnvironmentSnapshot;

  beforeEach(() => {
    savedEnvironment = {
      [OTLP_ENDPOINT_ENVIRONMENT_VARIABLE]: process.env[OTLP_ENDPOINT_ENVIRONMENT_VARIABLE],
      [OTLP_AUTH_HEADER_ENVIRONMENT_VARIABLE]: process.env[OTLP_AUTH_HEADER_ENVIRONMENT_VARIABLE],
    };
    process.env[OTLP_ENDPOINT_ENVIRONMENT_VARIABLE] = "https://otel.example.test";
    process.env[OTLP_AUTH_HEADER_ENVIRONMENT_VARIABLE] = "Bearer secret-token";
  });

  afterEach(() => {
    for (const [environmentVariableName, value] of Object.entries(savedEnvironment)) {
      if (value === undefined) {
        delete process.env[environmentVariableName];
      } else {
        process.env[environmentVariableName] = value;
      }
    }
  });

  it("builds a prefilled GitHub issue URL with redacted OTel context", () => {
    const issueUrl = new URL(buildErrorIssueUrl(new Error("boom")));
    const body = issueUrl.searchParams.get("body") ?? "";

    expect(issueUrl.origin + issueUrl.pathname).toBe(
      "https://github.com/millionco/react-doctor/issues/new",
    );
    expect(issueUrl.searchParams.get("title")).toBe("CLI error: boom");
    expect(issueUrl.searchParams.get("labels")).toBe("bug");
    expect(body).toContain("```text\nboom\n```");
    expect(body).toContain("REACT_DOCTOR_OTLP_ENDPOINT configured: yes");
    expect(body).toContain("REACT_DOCTOR_OTLP_AUTH_HEADER configured: yes (value redacted)");
    expect(body).toContain("OTLP exporter enabled: yes");
    expect(body).toContain("trace/span link, if exported:");
    expect(body).not.toContain("secret-token");
  });
});
