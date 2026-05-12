import type { ReactDoctorIssue } from "../types.js";

export interface ReactDoctorRuleExample {
  before: string;
  after: string;
}

export interface ReactDoctorRuleMetadata {
  id: string;
  name: string;
  description: string;
  recommendation?: string;
  examples?: ReactDoctorRuleExample[];
  category: string;
  severity: ReactDoctorIssue["severity"];
  defaultEnabled: boolean;
  tags: string[];
  docsUrl?: string;
}

export interface ReactDoctorRuleContext {
  rootDirectory: string;
  signal?: AbortSignal;
}

export interface ReactDoctorRuleResult {
  issues: ReactDoctorIssue[];
}

export interface ReactDoctorRule {
  metadata: ReactDoctorRuleMetadata;
  run: (context: ReactDoctorRuleContext) => ReactDoctorRuleResult | Promise<ReactDoctorRuleResult>;
}
