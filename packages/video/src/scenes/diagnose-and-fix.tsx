import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  BACKGROUND_COLOR,
  CURSOR_BLINK_FRAMES,
  DIAGNOSTICS,
  ERROR_BADGE_BACKGROUND_COLOR,
  ERROR_BADGE_TEXT_COLOR,
  ERROR_ROW_BACKGROUND_COLOR,
  FILE_ROW_GAP_PX,
  FILE_ROW_HORIZONTAL_PADDING_PX,
  FILE_ROW_VERTICAL_PADDING_PX,
  GREEN_COLOR,
  MUTED_COLOR,
  PERFECT_SCORE,
  RED_COLOR,
  SCORE_BAR_WIDTH,
  SEVERITY_BADGE_RADIUS_PX,
  SEVERITY_BADGE_SIZE_PX,
  TARGET_SCORE,
  TEXT_COLOR,
  WARNING_BADGE_BACKGROUND_COLOR,
  YELLOW_COLOR,
} from "../constants";
import { fontFamily } from "../utils/font";
import { getScoreColor, getScoreLabel } from "../utils/score-display";

const VISIBLE_DIAGNOSTICS = DIAGNOSTICS.slice(0, 15);

const COMMAND = "/react-doctor fix my code";
const SLASH_COMMAND_PREFIX = "/react-doctor";
const CHAR_FRAMES = 2;
const TYPING_INITIAL_DELAY_FRAMES = 8;
const TYPING_POST_PAUSE_FRAMES = 8;
const TYPING_END_FRAME =
  TYPING_INITIAL_DELAY_FRAMES + COMMAND.length * CHAR_FRAMES + TYPING_POST_PAUSE_FRAMES;

const ZOOM_SCALE = 1.8;
const ZOOM_OUT_DURATION_FRAMES = 28;
const ZOOM_OUT_START_FRAME = TYPING_END_FRAME;
const ZOOM_OUT_END_FRAME = ZOOM_OUT_START_FRAME + ZOOM_OUT_DURATION_FRAMES;

const SCAN_START_FRAME = ZOOM_OUT_END_FRAME - 4;
const SCAN_FRAMES_PER_ISSUE = 5;
const SCAN_FADE_IN_FRAMES = 5;
const SCAN_END_FRAME = SCAN_START_FRAME + VISIBLE_DIAGNOSTICS.length * SCAN_FRAMES_PER_ISSUE;

const VERDICT_APPEAR_FRAME = SCAN_END_FRAME + 5;
const VERDICT_HOLD_FRAMES = 45;

const VERDICT_ZOOM_SCALE = 1.3;
const VERDICT_ZOOM_DURATION_FRAMES = 20;

const FIX_START_FRAME = VERDICT_APPEAR_FRAME + VERDICT_HOLD_FRAMES;
const FIX_INTERVAL_FRAMES = 5;
const FIX_FADE_FRAMES = 3;
const ALL_FIXED_FADE_FRAMES = 8;

const SCORE_APPEAR_FRAME = VERDICT_APPEAR_FRAME;
const SCORE_FADE_FRAMES = 8;
const SCORE_ANIMATION_FRAMES = 15;

const SCENE_HORIZONTAL_PADDING_PX = 80;
const SCENE_TOP_PADDING_PX = 60;
const PROMPT_TOP_PX = 280;
const STATUS_TOP_PX = 380;
const ITEMS_TOP_PX = 460;

const BADGE_TOP_PX = 840;
const BADGE_LEFT_PX = 80;
const BADGE_NUMBER_FONT_SIZE_PX = 64;
const BADGE_LABEL_FONT_SIZE_PX = 40;
const BADGE_BAR_FONT_SIZE_PX = 32;
const BADGE_GAP_PX = 16;

const LOGO_FONT_SIZE_PX = 32;
const ZOOMED_PROMPT_FONT_SIZE_PX = 56;
const NORMAL_PROMPT_FONT_SIZE_PX = 44;
const DIAGNOSTIC_FONT_SIZE_PX = 32;
const DIAGNOSTIC_ROW_HEIGHT_PX = DIAGNOSTIC_FONT_SIZE_PX * 1.7;
const STATUS_FONT_SIZE_PX = 44;
const VERDICT_FONT_SIZE_PX = 48;

const CLAUDE_LOGO_COLOR = "#d77757";

const SPINNER_CHARS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_SPEED = 3;
const SPINNER_COLOR = "#d77757";

const SCAN_FONT_SIZE_PX = 34;
const SCAN_LINE_HEIGHT = 1.6;
const SCAN_ROW_HEIGHT_PX =
  SCAN_FONT_SIZE_PX * SCAN_LINE_HEIGHT + FILE_ROW_VERTICAL_PADDING_PX * 2;

export const DiagnoseAndFix = () => {
  const frame = useCurrentFrame();

  const typedCharCount = Math.min(
    COMMAND.length,
    Math.max(0, Math.floor((frame - TYPING_INITIAL_DELAY_FRAMES) / CHAR_FRAMES)),
  );
  const isTypingDone = typedCharCount >= COMMAND.length;
  const isTypingActive = frame >= TYPING_INITIAL_DELAY_FRAMES && !isTypingDone;

  const cursorOpacity = isTypingActive
    ? 1
    : interpolate(
        frame % CURSOR_BLINK_FRAMES,
        [0, CURSOR_BLINK_FRAMES / 2, CURSOR_BLINK_FRAMES],
        [1, 0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );

  const initialZoom = interpolate(
    frame,
    [0, ZOOM_OUT_START_FRAME, ZOOM_OUT_END_FRAME],
    [ZOOM_SCALE, ZOOM_SCALE, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
  );

  const verdictZoom = interpolate(
    frame,
    [VERDICT_APPEAR_FRAME, VERDICT_APPEAR_FRAME + VERDICT_ZOOM_DURATION_FRAMES],
    [1, VERDICT_ZOOM_SCALE],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
  );

  const zoomScale = initialZoom * verdictZoom;

  const zoomProgress = interpolate(
    frame,
    [ZOOM_OUT_START_FRAME, ZOOM_OUT_END_FRAME],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
  );
  const promptFontSize =
    ZOOMED_PROMPT_FONT_SIZE_PX +
    (NORMAL_PROMPT_FONT_SIZE_PX - ZOOMED_PROMPT_FONT_SIZE_PX) * zoomProgress;

  const spinnerCharIndex = Math.floor(frame / SPINNER_SPEED) % SPINNER_CHARS.length;
  const spinnerChar = SPINNER_CHARS[spinnerCharIndex];

  const isScanning = frame >= SCAN_START_FRAME && frame < VERDICT_APPEAR_FRAME;
  const scanDoneIssueCount = Math.min(
    VISIBLE_DIAGNOSTICS.length,
    Math.max(0, Math.floor((frame - SCAN_START_FRAME) / SCAN_FRAMES_PER_ISSUE)),
  );

  const fixedDiagnosticCount = Math.max(
    0,
    Math.min(
      VISIBLE_DIAGNOSTICS.length,
      Math.floor((frame - FIX_START_FRAME) / FIX_INTERVAL_FRAMES) + 1,
    ),
  );
  const isFixing = frame >= FIX_START_FRAME;
  const allFixed = fixedDiagnosticCount >= VISIBLE_DIAGNOSTICS.length;
  const allFixedFrame = FIX_START_FRAME + VISIBLE_DIAGNOSTICS.length * FIX_INTERVAL_FRAMES;

  const allFixedOpacity = interpolate(
    frame,
    [allFixedFrame, allFixedFrame + ALL_FIXED_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  const verdictOpacity = interpolate(
    frame,
    [VERDICT_APPEAR_FRAME, VERDICT_APPEAR_FRAME + 8],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const verdictScale = interpolate(
    frame,
    [VERDICT_APPEAR_FRAME, VERDICT_APPEAR_FRAME + 10],
    [0.8, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const isVerdictVisible =
    frame >= VERDICT_APPEAR_FRAME && frame < FIX_START_FRAME;
  const isFixingPhase = frame >= FIX_START_FRAME;

  const scoreBlockOpacity = interpolate(
    frame,
    [SCORE_APPEAR_FRAME, SCORE_APPEAR_FRAME + SCORE_FADE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  let displayScore: number;
  if (frame < FIX_START_FRAME) {
    displayScore = Math.round(
      interpolate(
        frame,
        [SCORE_APPEAR_FRAME, SCORE_APPEAR_FRAME + SCORE_ANIMATION_FRAMES],
        [0, TARGET_SCORE],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
      ),
    );
  } else {
    displayScore =
      TARGET_SCORE +
      Math.round(
        (PERFECT_SCORE - TARGET_SCORE) *
          (fixedDiagnosticCount / VISIBLE_DIAGNOSTICS.length),
      );
  }
  const scoreColor = getScoreColor(displayScore);
  const filledBarCount = Math.round((displayScore / PERFECT_SCORE) * SCORE_BAR_WIDTH);

  const slashCommandCharCount = Math.min(typedCharCount, SLASH_COMMAND_PREFIX.length);
  const remainingCharCount = Math.max(0, typedCharCount - SLASH_COMMAND_PREFIX.length);
  const slashCommandText = SLASH_COMMAND_PREFIX.slice(0, slashCommandCharCount);
  const remainingText = COMMAND.slice(
    SLASH_COMMAND_PREFIX.length,
    SLASH_COMMAND_PREFIX.length + remainingCharCount,
  );

  const scanListOpacity = interpolate(
    frame,
    [SCAN_START_FRAME, SCAN_START_FRAME + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const scanListHeight = interpolate(
    frame,
    [VERDICT_APPEAR_FRAME, VERDICT_APPEAR_FRAME + 10],
    [500, 350],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
  );
  const scanScrollY = interpolate(
    frame,
    [SCAN_START_FRAME, SCAN_END_FRAME],
    [0, Math.max(0, VISIBLE_DIAGNOSTICS.length * SCAN_ROW_HEIGHT_PX - 500)],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND_COLOR }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${zoomScale})`,
          transformOrigin: `${interpolate(
            frame,
            [VERDICT_APPEAR_FRAME, VERDICT_APPEAR_FRAME + VERDICT_ZOOM_DURATION_FRAMES],
            [0, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
          )}% ${interpolate(
            frame,
            [VERDICT_APPEAR_FRAME, VERDICT_APPEAR_FRAME + VERDICT_ZOOM_DURATION_FRAMES],
            [0, 100],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
          )}%`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: SCENE_TOP_PADDING_PX,
            left: SCENE_HORIZONTAL_PADDING_PX,
            fontFamily,
            fontSize: LOGO_FONT_SIZE_PX,
            lineHeight: 1.6,
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          <Img
            src={staticFile("claudecode-color.svg")}
            style={{ width: 160, height: 160 }}
          />
          <div>
            <div style={{ color: "white", fontWeight: 500 }}>Claude Code</div>
            <div style={{ color: MUTED_COLOR }}>/Developer/react-project</div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: PROMPT_TOP_PX,
            left: SCENE_HORIZONTAL_PADDING_PX,
            right: SCENE_HORIZONTAL_PADDING_PX,
            fontFamily,
            fontSize: promptFontSize,
            color: TEXT_COLOR,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
            padding: "8px 0",
          }}
        >
          <span style={{ color: MUTED_COLOR }}>❯ </span>
          <span style={{ color: YELLOW_COLOR }}>{slashCommandText}</span>
          <span style={{ color: "white" }}>{remainingText}</span>
          <span style={{ opacity: frame < ZOOM_OUT_END_FRAME ? cursorOpacity : 0 }}>▋</span>
        </div>

        <div
          style={{
            position: "absolute",
            top: STATUS_TOP_PX,
            left: SCENE_HORIZONTAL_PADDING_PX,
            fontFamily,
            fontSize: STATUS_FONT_SIZE_PX,
          }}
        >
          {isScanning && (
            <span style={{ opacity: scanListOpacity }}>
              <span style={{ color: SPINNER_COLOR }}>{spinnerChar}</span>
              <span style={{ color: SPINNER_COLOR }}>{" Scanning for issues..."}</span>
            </span>
          )}
          {isVerdictVisible && (
            <span
              style={{
                color: RED_COLOR,
                opacity: verdictOpacity,
                transform: `scale(${verdictScale})`,
                transformOrigin: "left center",
                display: "inline-block",
                fontSize: VERDICT_FONT_SIZE_PX,
                fontWeight: 700,
              }}
            >
              ✕ {VISIBLE_DIAGNOSTICS.length} issues detected
            </span>
          )}
          {isFixingPhase && !allFixed && (
            <>
              <span style={{ color: SPINNER_COLOR }}>{spinnerChar}</span>
              <span style={{ color: SPINNER_COLOR }}>{" Fixing issues..."}</span>
            </>
          )}
          {allFixed && (
            <span style={{ color: GREEN_COLOR, opacity: allFixedOpacity, fontSize: VERDICT_FONT_SIZE_PX, fontWeight: 700 }}>
              ✓ All {VISIBLE_DIAGNOSTICS.length} issues fixed
            </span>
          )}
        </div>

        {scanListOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              top: ITEMS_TOP_PX,
              left: SCENE_HORIZONTAL_PADDING_PX,
              right: SCENE_HORIZONTAL_PADDING_PX,
              height: scanListHeight,
              overflow: "hidden",
              zIndex: 10,
              opacity: scanListOpacity,
              filter: `grayscale(${interpolate(
                frame,
                [VERDICT_APPEAR_FRAME, VERDICT_APPEAR_FRAME + 8],
                [1, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              )})`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 60,
                background: `linear-gradient(to bottom, ${BACKGROUND_COLOR} 0%, transparent 100%)`,
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 60,
                background: `linear-gradient(to top, ${BACKGROUND_COLOR} 0%, transparent 100%)`,
                zIndex: 2,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                transform: `translateY(-${scanScrollY}px)`,
                padding: "12px 0",
              }}
            >
              {VISIBLE_DIAGNOSTICS.map((diagnostic, diagnosticIndex) => {
                const issueOpacity = 1;

                const itemFixFrame =
                  FIX_START_FRAME + diagnosticIndex * FIX_INTERVAL_FRAMES;
                const itemFixProgress = interpolate(
                  frame - itemFixFrame,
                  [0, FIX_FADE_FRAMES],
                  [0, 1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                    easing: Easing.out(Easing.cubic),
                  },
                );
                const isItemFixed = isFixing && diagnosticIndex < fixedDiagnosticCount;
                const showAsFixed = isItemFixed && itemFixProgress > 0.3;

                const isError = diagnostic.severity === "error";
                const isWarning = diagnostic.severity === "warning";

                return (
                  <div
                    key={diagnostic.message}
                    style={{
                      opacity: issueOpacity,
                      fontFamily,
                      fontSize: SCAN_FONT_SIZE_PX,
                      lineHeight: SCAN_LINE_HEIGHT,
                      color: showAsFixed ? MUTED_COLOR : TEXT_COLOR,
                      textDecoration: showAsFixed ? "line-through" : "none",
                      whiteSpace: "nowrap",
                      display: "flex",
                      alignItems: "center",
                      gap: FILE_ROW_GAP_PX,
                      padding: `${FILE_ROW_VERTICAL_PADDING_PX}px ${FILE_ROW_HORIZONTAL_PADDING_PX}px`,
                      backgroundColor:
                        showAsFixed
                          ? "transparent"
                          : isError
                            ? ERROR_ROW_BACKGROUND_COLOR
                            : "transparent",
                      borderRadius: 6,
                    }}
                  >
                    <span
                      style={{
                        width: SEVERITY_BADGE_SIZE_PX,
                        height: SEVERITY_BADGE_SIZE_PX,
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: SEVERITY_BADGE_RADIUS_PX,
                        backgroundColor: showAsFixed
                          ? "transparent"
                          : isError
                            ? ERROR_BADGE_BACKGROUND_COLOR
                            : isWarning
                              ? WARNING_BADGE_BACKGROUND_COLOR
                              : "transparent",
                        color: showAsFixed ? GREEN_COLOR : ERROR_BADGE_TEXT_COLOR,
                        fontSize: SCAN_FONT_SIZE_PX * 0.7,
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {showAsFixed ? "✓" : "!"}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {diagnostic.message}
                    </span>
                    <span
                      style={{
                        color: MUTED_COLOR,
                        flexShrink: 0,
                        fontSize: SCAN_FONT_SIZE_PX * 0.75,
                      }}
                    >
                      {diagnostic.file}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: BADGE_LEFT_PX,
            top: BADGE_TOP_PX,
            display: "flex",
            gap: BADGE_GAP_PX,
            alignItems: "flex-start",
            opacity: scoreBlockOpacity,
            zIndex: 5,
          }}
        >
          <div>
            <div>
              <span
                style={{
                  color: scoreColor,
                  fontWeight: 500,
                  fontSize: BADGE_NUMBER_FONT_SIZE_PX,
                  fontFamily,
                }}
              >
                {displayScore}
              </span>
              <span
                style={{
                  color: MUTED_COLOR,
                  fontSize: BADGE_LABEL_FONT_SIZE_PX,
                  fontFamily,
                }}
              >
                {` / ${PERFECT_SCORE}  `}
              </span>
              <span
                style={{
                  color: scoreColor,
                  fontSize: BADGE_LABEL_FONT_SIZE_PX,
                  fontFamily,
                }}
              >
                {getScoreLabel(displayScore)}
              </span>
            </div>
            <div
              style={{
                marginTop: 8,
                letterSpacing: 2,
                fontSize: BADGE_BAR_FONT_SIZE_PX,
                fontFamily,
              }}
            >
              <div
                style={{
                  width: 900,
                  height: BADGE_BAR_FONT_SIZE_PX,
                  backgroundColor: "#525252",
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${(filledBarCount / SCORE_BAR_WIDTH) * 100}%`,
                    height: "100%",
                    backgroundColor: scoreColor,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
