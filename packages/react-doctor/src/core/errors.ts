export interface ReactDoctorErrorInfo {
  name: string;
  message: string;
  code: string;
  cause?: ReactDoctorErrorInfo;
}

export interface ReactDoctorErrorOptions extends ErrorOptions {
  code?: string;
}

export class ReactDoctorError extends Error {
  override readonly name: string = "ReactDoctorError";
  readonly code: string;

  constructor(message: string, options: ReactDoctorErrorOptions = {}) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = options.code ?? "react-doctor/error";
  }
}

export class ReactDoctorCancelledError extends ReactDoctorError {
  override readonly name: string = "ReactDoctorCancelledError";

  constructor(message = "React Doctor run was cancelled.", options?: ErrorOptions) {
    super(message, { ...options, code: "react-doctor/cancelled" });
  }
}

export class ReactDoctorConfigError extends ReactDoctorError {
  override readonly name: string = "ReactDoctorConfigError";

  constructor(message: string, options: ReactDoctorErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? "react-doctor/config-error" });
  }
}

export class ReactDoctorConfigNotFoundError extends ReactDoctorConfigError {
  override readonly name: string = "ReactDoctorConfigNotFoundError";

  constructor(message = "React Doctor config was not found.", options?: ErrorOptions) {
    super(message, { ...options, code: "react-doctor/config-not-found" });
  }
}

export class ReactDoctorInvalidConfigError extends ReactDoctorConfigError {
  override readonly name: string = "ReactDoctorInvalidConfigError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, { ...options, code: "react-doctor/invalid-config" });
  }
}

export class ReactDoctorProjectError extends ReactDoctorError {
  override readonly name: string = "ReactDoctorProjectError";
  readonly rootDirectory: string;

  constructor(rootDirectory: string, message: string, options: ReactDoctorErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? "react-doctor/project-error" });
    this.rootDirectory = rootDirectory;
  }
}

export class ReactDoctorProjectNotFoundError extends ReactDoctorProjectError {
  override readonly name: string = "ReactDoctorProjectNotFoundError";

  constructor(rootDirectory: string, options?: ErrorOptions) {
    super(rootDirectory, `No React project found in ${rootDirectory}.`, {
      ...options,
      code: "react-doctor/project-not-found",
    });
  }
}

export class ReactDoctorPackageJsonNotFoundError extends ReactDoctorProjectError {
  override readonly name: string = "ReactDoctorPackageJsonNotFoundError";

  constructor(rootDirectory: string, options?: ErrorOptions) {
    super(rootDirectory, `No package.json found in ${rootDirectory}.`, {
      ...options,
      code: "react-doctor/package-json-not-found",
    });
  }
}

export class ReactDoctorNoReactDependencyError extends ReactDoctorProjectError {
  override readonly name: string = "ReactDoctorNoReactDependencyError";

  constructor(rootDirectory: string, options?: ErrorOptions) {
    super(rootDirectory, `No React dependency found in ${rootDirectory}.`, {
      ...options,
      code: "react-doctor/no-react-dependency",
    });
  }
}

export class ReactDoctorAmbiguousProjectError extends ReactDoctorProjectError {
  override readonly name: string = "ReactDoctorAmbiguousProjectError";
  readonly candidates: readonly string[];

  constructor(rootDirectory: string, candidates: readonly string[], options?: ErrorOptions) {
    super(
      rootDirectory,
      `Multiple React projects found in ${rootDirectory}: ${candidates.join(", ")}.`,
      { ...options, code: "react-doctor/ambiguous-project" },
    );
    this.candidates = candidates;
  }
}

export class ReactDoctorCheckError extends ReactDoctorError {
  override readonly name: string = "ReactDoctorCheckError";
  readonly checkId: string;

  constructor(checkId: string, message: string, options: ReactDoctorErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? "react-doctor/check-error" });
    this.checkId = checkId;
  }
}

export class ReactDoctorCheckFailedError extends ReactDoctorCheckError {
  override readonly name: string = "ReactDoctorCheckFailedError";

  constructor(checkId: string, message: string, options?: ErrorOptions) {
    super(checkId, message, { ...options, code: "react-doctor/check-failed" });
  }
}

export class ReactDoctorCheckSkippedError extends ReactDoctorCheckError {
  override readonly name: string = "ReactDoctorCheckSkippedError";

  constructor(checkId: string, message: string, options?: ErrorOptions) {
    super(checkId, message, { ...options, code: "react-doctor/check-skipped" });
  }
}

export class ReactDoctorRunnerUnavailableError extends ReactDoctorCheckError {
  override readonly name: string = "ReactDoctorRunnerUnavailableError";

  constructor(checkId: string, message: string, options?: ErrorOptions) {
    super(checkId, message, { ...options, code: "react-doctor/runner-unavailable" });
  }
}

export class ReactDoctorUnsupportedRuntimeError extends ReactDoctorError {
  override readonly name: string = "ReactDoctorUnsupportedRuntimeError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, { ...options, code: "react-doctor/unsupported-runtime" });
  }
}

export class ReactDoctorTimeoutError extends ReactDoctorError {
  override readonly name: string = "ReactDoctorTimeoutError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, { ...options, code: "react-doctor/timeout" });
  }
}

export class ReactDoctorReportError extends ReactDoctorError {
  override readonly name: string = "ReactDoctorReportError";

  constructor(message: string, options?: ErrorOptions) {
    super(message, { ...options, code: "react-doctor/report-error" });
  }
}

export const isReactDoctorError = (value: unknown): value is ReactDoctorError =>
  value instanceof ReactDoctorError;

const toReactDoctorErrorInfoWithVisited = (
  error: unknown,
  visited: Set<unknown>,
): ReactDoctorErrorInfo => {
  if (visited.has(error)) {
    return {
      name: "Error",
      message: "Cycle detected in error cause chain.",
      code: "react-doctor/cause-cycle",
    };
  }
  if (error instanceof Error) visited.add(error);

  const toCause = (cause: unknown): ReactDoctorErrorInfo | undefined =>
    cause === undefined ? undefined : toReactDoctorErrorInfoWithVisited(cause, visited);

  if (error instanceof ReactDoctorError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      cause: toCause(error.cause),
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || error.name || "Unknown error",
      code: "react-doctor/unknown-error",
      cause: toCause(error.cause),
    };
  }

  return {
    name: "Error",
    message: String(error),
    code: "react-doctor/unknown-error",
  };
};

export const toReactDoctorErrorInfo = (error: unknown): ReactDoctorErrorInfo =>
  toReactDoctorErrorInfoWithVisited(error, new Set());
