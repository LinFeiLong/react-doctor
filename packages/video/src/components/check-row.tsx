import { Img, staticFile } from "remotion";
import {
  DETAIL_CHECK_COLOR,
  DETAIL_FONT_SIZE_PX,
  DETAIL_PANEL_HEIGHT_PX,
  FAIL_RED_COLOR,
  FILE_ROW_HEIGHT_PX,
  GH_BORDER_COLOR,
  GH_CANVAS_COLOR,
  GH_FONT_FAMILY,
  GH_MONO_FONT_FAMILY,
  GH_MUTED_COLOR,
  GH_TEXT_COLOR,
  ROW_ICON_SIZE_PX,
} from "../constants";
import { StatusIcon } from "./status-icon";
import type { CheckFile, CheckOutcome, CheckState } from "../types";

const ROW_VERTICAL_PADDING_PX = 40;
const ROW_HORIZONTAL_PADDING_PX = 90;
const ROW_GAP_PX = 28;
const NAME_FONT_SIZE_PX = 64;
const DESCRIPTION_FONT_SIZE_PX = 50;
const CHEVRON_SIZE_PX = 40;
const REACT_LOGO_HEIGHT_PX = 58;
const REACT_LOGO_WIDTH_PX = REACT_LOGO_HEIGHT_PX * (569 / 512);
const DETAIL_INDENT_PX = ROW_HORIZONTAL_PADDING_PX + ROW_ICON_SIZE_PX + ROW_GAP_PX + REACT_LOGO_WIDTH_PX + ROW_GAP_PX;
const PANEL_EDGE_FADE_PX = 44;
const FILE_GAP_PX = 16;

interface CheckRowProps {
  name: string;
  durationLabel: string;
  files: CheckFile[];
  state: CheckState;
  outcome: CheckOutcome;
  spinnerRotationDeg: number;
  iconPopScale: number;
  expandProgress: number;
  scrollOffsetPx: number;
  showDivider: boolean;
}

const Chevron = ({ rotationDeg, color }: { rotationDeg: number; color: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: CHEVRON_SIZE_PX, height: CHEVRON_SIZE_PX, flexShrink: 0, transform: `rotate(${rotationDeg}deg)` }}
    aria-hidden="true"
  >
    <path d="M9 5 L16 12 L9 19" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FileMarker = ({ isFail }: { isFail: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: DETAIL_FONT_SIZE_PX, height: DETAIL_FONT_SIZE_PX, flexShrink: 0 }}
    aria-hidden="true"
  >
    {isFail ? (
      <path d="M7 7 L17 17 M17 7 L7 17" stroke={FAIL_RED_COLOR} strokeWidth={3} strokeLinecap="round" />
    ) : (
      <path d="M5 12 L10 17 L19 8" stroke={DETAIL_CHECK_COLOR} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    )}
  </svg>
);

const getDescription = (state: CheckState, outcome: CheckOutcome, durationLabel: string, problemCount: number) => {
  if (state === "pending") return "Scanning…";
  if (outcome === "fail") return `${problemCount} problems found`;
  return `Successful in ${durationLabel}`;
};

export const CheckRow = ({
  name,
  durationLabel,
  files,
  state,
  outcome,
  spinnerRotationDeg,
  iconPopScale,
  expandProgress,
  scrollOffsetPx,
  showDivider,
}: CheckRowProps) => {
  const isFail = outcome === "fail";
  return (
    <div style={{ borderTop: showDivider ? `1px solid ${GH_BORDER_COLOR}` : "none" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ROW_GAP_PX,
          padding: `${ROW_VERTICAL_PADDING_PX}px ${ROW_HORIZONTAL_PADDING_PX}px`,
        }}
      >
        <StatusIcon state={state} sizePx={ROW_ICON_SIZE_PX} spinnerRotationDeg={spinnerRotationDeg} popScale={iconPopScale} />
        <Img src={staticFile("react-logo.svg")} style={{ height: REACT_LOGO_HEIGHT_PX, width: REACT_LOGO_WIDTH_PX, flexShrink: 0 }} />
        <span style={{ fontFamily: GH_FONT_FAMILY, fontSize: NAME_FONT_SIZE_PX, fontWeight: 600, color: GH_TEXT_COLOR }}>
          {name}
        </span>
        <span
          style={{
            fontFamily: GH_FONT_FAMILY,
            fontSize: DESCRIPTION_FONT_SIZE_PX,
            color: state !== "pending" && isFail ? FAIL_RED_COLOR : GH_MUTED_COLOR,
          }}
        >
          {getDescription(state, outcome, durationLabel, files.length)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <Chevron rotationDeg={expandProgress * 90} color={GH_MUTED_COLOR} />
        </div>
      </div>

      <div style={{ height: expandProgress * DETAIL_PANEL_HEIGHT_PX, overflow: "hidden" }}>
        <div
          style={{
            position: "relative",
            height: DETAIL_PANEL_HEIGHT_PX,
            overflow: "hidden",
            paddingLeft: DETAIL_INDENT_PX,
            opacity: expandProgress,
          }}
        >
          <div style={{ transform: `translateY(-${scrollOffsetPx}px)` }}>
            {files.map((file) => (
              <div key={file.path + file.note} style={{ height: FILE_ROW_HEIGHT_PX, display: "flex", alignItems: "center", gap: FILE_GAP_PX }}>
                <FileMarker isFail={isFail} />
                <span style={{ fontFamily: GH_MONO_FONT_FAMILY, fontSize: DETAIL_FONT_SIZE_PX, color: "#ffffff" }}>{file.path}</span>
                <span style={{ fontFamily: GH_FONT_FAMILY, fontSize: DETAIL_FONT_SIZE_PX, color: GH_MUTED_COLOR }}>{file.note}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: PANEL_EDGE_FADE_PX,
              background: `linear-gradient(to bottom, ${GH_CANVAS_COLOR}, transparent)`,
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: PANEL_EDGE_FADE_PX,
              background: `linear-gradient(to top, ${GH_CANVAS_COLOR}, transparent)`,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};
