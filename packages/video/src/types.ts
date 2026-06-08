export interface CheckFile {
  path: string;
  note: string;
}

export interface CheckItem {
  name: string;
  durationLabel: string;
  passScore: number;
  failScore: number;
  cleanFiles: CheckFile[];
  issues: CheckFile[];
}

export type CheckOutcome = "fail" | "pass";
export type CheckState = "pending" | "fail" | "pass";

export interface ChecksTiming {
  firstOpenFrame: number;
  slotFrames: number;
  scanFrames: number;
  expandFrames: number;
  scoreCountFrames: number;
  headerPassFrame: number;
  durationFrames: number;
}
