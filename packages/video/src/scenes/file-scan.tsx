import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  BACKGROUND_COLOR,
  ERROR_BADGE_BACKGROUND_COLOR,
  ERROR_BADGE_TEXT_COLOR,
  ERROR_ROW_BACKGROUND_COLOR,
  FILE_ROW_GAP_PX,
  FILE_ROW_HORIZONTAL_PADDING_PX,
  FILE_ROW_VERTICAL_PADDING_PX,
  FILE_SCAN_FONT_SIZE_PX,
  LINE_NUMBER_COLUMN_WIDTH_PX,
  MUTED_COLOR,
  POINTS_LOST_COLUMN_WIDTH_PX,
  RED_COLOR,
  SCANNED_FILES,
  SCENE_FILE_SCAN_DURATION_FRAMES,
  SEVERITY_BADGE_RADIUS_PX,
  SEVERITY_BADGE_SIZE_PX,
  TEXT_COLOR,
  WARNING_BADGE_BACKGROUND_COLOR,
} from "../constants";
import { fontFamily } from "../utils/font";
import { CONTENT_ENTER_EASING, VERTICAL_MOTION_EASING } from "../utils/motion";

const LINE_HEIGHT_MULTIPLIER = 1.6;
const ROW_HEIGHT_PX =
  FILE_SCAN_FONT_SIZE_PX * LINE_HEIGHT_MULTIPLIER + FILE_ROW_VERTICAL_PADDING_PX * 2;
const VIEWPORT_HEIGHT_PX = 1080;
const CONTENT_PADDING_PX = 40;
const TITLE_FONT_SIZE_PX = 88;
const TITLE_LINE_HEIGHT = 1.4;
const TITLE_BLOCK_HEIGHT_PX = TITLE_FONT_SIZE_PX * TITLE_LINE_HEIGHT;
const TITLE_BOTTOM_MARGIN_PX = 32;
const TITLE_PIN_TOP_PX = 48;
const TOTAL_LIST_HEIGHT_PX = SCANNED_FILES.length * ROW_HEIGHT_PX;
const TOTAL_STACK_HEIGHT_PX = TITLE_BLOCK_HEIGHT_PX + TITLE_BOTTOM_MARGIN_PX + TOTAL_LIST_HEIGHT_PX;
const SCROLL_START_FRAME = 0;
const SCROLL_END_FRAME = SCENE_FILE_SCAN_DURATION_FRAMES;
const SCROLL_START_Y_PX = VIEWPORT_HEIGHT_PX;
const SCROLL_END_Y_PX = -Math.max(0, TOTAL_STACK_HEIGHT_PX - VIEWPORT_HEIGHT_PX + CONTENT_PADDING_PX);
const TITLE_ENTER_DISTANCE_PX = TITLE_BLOCK_HEIGHT_PX * 0.8;
const ROW_ENTER_DISTANCE_PX = ROW_HEIGHT_PX * 1.5;
const clampProgress = (progress: number) => Math.max(0, Math.min(1, progress));

export const FileScan = () => {
  const frame = useCurrentFrame();

  const scrollY = interpolate(
    frame,
    [SCROLL_START_FRAME, SCROLL_END_FRAME],
    [SCROLL_START_Y_PX, SCROLL_END_Y_PX],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: VERTICAL_MOTION_EASING,
    },
  );
  const titleY = Math.max(TITLE_PIN_TOP_PX, scrollY);
  const listY = scrollY + TITLE_BLOCK_HEIGHT_PX + TITLE_BOTTOM_MARGIN_PX;
  const titleEnterProgress = CONTENT_ENTER_EASING(
    clampProgress((VIEWPORT_HEIGHT_PX - scrollY) / TITLE_ENTER_DISTANCE_PX),
  );
  const titleScale = 0.92 + 0.08 * titleEnterProgress;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          padding: `0 60px`,
        }}
      >
        <div style={{ transform: `translate3d(0, ${listY}px, 0)`, willChange: "transform" }}>
          {SCANNED_FILES.map((file, fileIndex) => {
            const rowTop = listY + fileIndex * ROW_HEIGHT_PX;
            const fileEnterProgress = CONTENT_ENTER_EASING(
              clampProgress((VIEWPORT_HEIGHT_PX - rowTop) / ROW_ENTER_DISTANCE_PX),
            );
            const fileScale = 0.96 + 0.04 * fileEnterProgress;

            const hasErrors = file.errors > 0;
            const hasWarnings = file.warnings > 0;
            const lineNumberLabel = String(fileIndex + 1);
            const pointsLostLabel = file.pointsLost > 0 ? `-${file.pointsLost}` : "";

            return (
              <div
                key={file.path}
                style={{
                  opacity: fileEnterProgress,
                  fontFamily,
                  fontSize: FILE_SCAN_FONT_SIZE_PX,
                  lineHeight: LINE_HEIGHT_MULTIPLIER,
                  color: TEXT_COLOR,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: FILE_ROW_GAP_PX,
                  padding: `${FILE_ROW_VERTICAL_PADDING_PX}px ${FILE_ROW_HORIZONTAL_PADDING_PX}px`,
                  backgroundColor: hasErrors ? ERROR_ROW_BACKGROUND_COLOR : "transparent",
                  borderRadius: 6,
                  transform: `scale(${fileScale})`,
                  transformOrigin: "center center",
                  willChange: "opacity, transform",
                }}
              >
                <span
                  style={{
                    color: MUTED_COLOR,
                    width: LINE_NUMBER_COLUMN_WIDTH_PX,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {lineNumberLabel}
                </span>

                <span
                  style={{
                    width: SEVERITY_BADGE_SIZE_PX,
                    height: SEVERITY_BADGE_SIZE_PX,
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: SEVERITY_BADGE_RADIUS_PX,
                    backgroundColor: hasErrors
                      ? ERROR_BADGE_BACKGROUND_COLOR
                      : hasWarnings
                        ? WARNING_BADGE_BACKGROUND_COLOR
                        : "transparent",
                    color: ERROR_BADGE_TEXT_COLOR,
                    fontSize: FILE_SCAN_FONT_SIZE_PX * 0.7,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {hasErrors || hasWarnings ? "!" : ""}
                </span>

                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {file.path}
                </span>

                <span
                  style={{
                    width: POINTS_LOST_COLUMN_WIDTH_PX,
                    color: RED_COLOR,
                    textAlign: "right",
                    flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {pointsLostLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          top: 0,
          zIndex: 1,
          opacity: titleEnterProgress,
          transform: `translate3d(0, ${titleY}px, 0) scale(${titleScale})`,
          transformOrigin: "center center",
          willChange: "opacity, transform",
          fontFamily,
          fontSize: TITLE_FONT_SIZE_PX,
          color: "white",
          textAlign: "center",
          lineHeight: TITLE_LINE_HEIGHT,
        }}
      >
        Scan for React issues
      </div>
    </AbsoluteFill>
  );
};
