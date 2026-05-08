import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  BACKGROUND_COLOR,
  BOX_BOTTOM,
  BOX_TOP,
  DIAGNOSTICS,
  GREEN_COLOR,
  MUTED_COLOR,
  PERFECT_SCORE,
  RED_COLOR,
  SCORE_ANIMATION_FRAMES,
  SCORE_BAR_WIDTH,
  TARGET_SCORE,
  TEXT_COLOR,
} from "../constants";
import { fontFamily } from "../utils/font";
import { CONTENT_ENTER_EASING, VERTICAL_MOTION_EASING } from "../utils/motion";
import { getDoctorFace, getScoreColor, getScoreLabel } from "../utils/score-display";

const HERO_FACE_FONT_SIZE_PX = 80;
const HERO_NUMBER_FONT_SIZE_PX = 96;
const HERO_LABEL_FONT_SIZE_PX = 56;
const HERO_BAR_FONT_SIZE_PX = 48;
const HERO_GAP_PX = 48;
const HERO_TOP_PX = 348;
const HERO_LEFT_PX = 300;

const BADGE_FACE_FONT_SIZE_PX = 36;
const BADGE_NUMBER_FONT_SIZE_PX = 40;
const BADGE_LABEL_FONT_SIZE_PX = 28;
const BADGE_BAR_FONT_SIZE_PX = 24;
const BADGE_GAP_PX = 28;
const BADGE_TOP_PX = 60;
const BADGE_LEFT_PX = 1170;

const SCORE_FADE_IN_FRAMES = 10;
const HERO_HOLD_END_FRAME = 50;
const TRANSITION_END_FRAME = 88;

const HEADER_FADE_START_FRAME = 70;
const HEADER_FADE_FRAMES = 14;
const HEADER_SLIDE_DOWN_PX = 30;

const PROMPT_FADE_START_FRAME = 86;
const PROMPT_FADE_FRAMES = 10;

const ITEMS_START_FRAME = 96;
const ITEM_STAGGER_FRAMES = 4;
const ITEM_FADE_FRAMES = 6;

const SPINNER_APPEAR_FRAME = 124;
const FIX_START_FRAME = 130;
const FIX_INTERVAL_FRAMES = 6;
const FIX_FADE_FRAMES = 8;
const ALL_FIXED_FADE_FRAMES = 10;

const SCENE_HORIZONTAL_PADDING_PX = 80;
const SCENE_TOP_PADDING_PX = 60;
const PROMPT_TOP_PX = 280;
const STATUS_TOP_PX = 380;
const ITEMS_TOP_PX = 460;

const LOGO_FONT_SIZE_PX = 40;
const PROMPT_FONT_SIZE_PX = 44;
const DIAGNOSTIC_FONT_SIZE_PX = 36;
const STATUS_FONT_SIZE_PX = 36;

const CLAUDE_LOGO_ART = ` ▐▛███▜▌`;
const CLAUDE_LOGO_ART_2 = `▝▜█████▛▘`;
const CLAUDE_LOGO_ART_3 = `  ▘▘ ▝▝`;
const CLAUDE_LOGO_COLOR = "#d77757";

const SPINNER_CHARS = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_SPEED = 3;
const SPINNER_COLOR = "#c084fc";

const lerpSize = (heroSize: number, smallSize: number, progress: number) =>
  heroSize + (smallSize - heroSize) * progress;

export const DiagnoseAndFix = () => {
  const frame = useCurrentFrame();

  const scoreBlockOpacity = interpolate(frame, [0, SCORE_FADE_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: CONTENT_ENTER_EASING,
  });

  const transitionProgress = interpolate(
    frame,
    [HERO_HOLD_END_FRAME, TRANSITION_END_FRAME],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: VERTICAL_MOTION_EASING,
    },
  );

  const scoreTopPx = lerpSize(HERO_TOP_PX, BADGE_TOP_PX, transitionProgress);
  const scoreLeftPx = lerpSize(HERO_LEFT_PX, BADGE_LEFT_PX, transitionProgress);
  const faceFontSize = lerpSize(
    HERO_FACE_FONT_SIZE_PX,
    BADGE_FACE_FONT_SIZE_PX,
    transitionProgress,
  );
  const numberFontSize = lerpSize(
    HERO_NUMBER_FONT_SIZE_PX,
    BADGE_NUMBER_FONT_SIZE_PX,
    transitionProgress,
  );
  const labelFontSize = lerpSize(
    HERO_LABEL_FONT_SIZE_PX,
    BADGE_LABEL_FONT_SIZE_PX,
    transitionProgress,
  );
  const barFontSize = lerpSize(HERO_BAR_FONT_SIZE_PX, BADGE_BAR_FONT_SIZE_PX, transitionProgress);
  const scoreGap = lerpSize(HERO_GAP_PX, BADGE_GAP_PX, transitionProgress);

  const headerOpacity = interpolate(
    frame,
    [HEADER_FADE_START_FRAME, HEADER_FADE_START_FRAME + HEADER_FADE_FRAMES],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: CONTENT_ENTER_EASING,
    },
  );
  const headerTranslateY = interpolate(
    frame,
    [HEADER_FADE_START_FRAME, HEADER_FADE_START_FRAME + HEADER_FADE_FRAMES],
    [-HEADER_SLIDE_DOWN_PX, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: CONTENT_ENTER_EASING,
    },
  );

  const promptOpacity = interpolate(
    frame,
    [PROMPT_FADE_START_FRAME, PROMPT_FADE_START_FRAME + PROMPT_FADE_FRAMES],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: CONTENT_ENTER_EASING,
    },
  );

  const spinnerCharIndex = Math.floor(frame / SPINNER_SPEED) % SPINNER_CHARS.length;
  const spinnerChar = SPINNER_CHARS[spinnerCharIndex];

  const fixedDiagnosticCount = Math.max(
    0,
    Math.min(DIAGNOSTICS.length, Math.floor((frame - FIX_START_FRAME) / FIX_INTERVAL_FRAMES) + 1),
  );
  const isFixing = frame >= FIX_START_FRAME;
  const allFixed = fixedDiagnosticCount >= DIAGNOSTICS.length;
  const allFixedFrame = FIX_START_FRAME + DIAGNOSTICS.length * FIX_INTERVAL_FRAMES;
  const isSpinnerVisible = frame >= SPINNER_APPEAR_FRAME && !allFixed;

  const allFixedOpacity = interpolate(
    frame,
    [allFixedFrame, allFixedFrame + ALL_FIXED_FADE_FRAMES],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: CONTENT_ENTER_EASING,
    },
  );

  let displayScore: number;
  if (frame < FIX_START_FRAME) {
    displayScore = Math.round(
      interpolate(frame, [0, SCORE_ANIMATION_FRAMES], [0, TARGET_SCORE], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: CONTENT_ENTER_EASING,
      }),
    );
  } else {
    displayScore =
      TARGET_SCORE +
      Math.round((PERFECT_SCORE - TARGET_SCORE) * (fixedDiagnosticCount / DIAGNOSTICS.length));
  }
  const scoreColor = getScoreColor(displayScore);
  const [doctorEyes, doctorMouth] = getDoctorFace(displayScore);
  const filledBarCount = Math.round((displayScore / PERFECT_SCORE) * SCORE_BAR_WIDTH);
  const emptyBarCount = SCORE_BAR_WIDTH - filledBarCount;

  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND_COLOR }}>
      <div
        style={{
          position: "absolute",
          top: SCENE_TOP_PADDING_PX,
          left: SCENE_HORIZONTAL_PADDING_PX,
          fontFamily,
          fontSize: LOGO_FONT_SIZE_PX,
          lineHeight: 1.4,
          opacity: headerOpacity,
          transform: `translateY(${headerTranslateY}px)`,
          whiteSpace: "pre",
        }}
      >
        <div>
          <span style={{ color: CLAUDE_LOGO_COLOR }}>{CLAUDE_LOGO_ART}</span>
          <span style={{ color: "white" }}> Claude Code</span>
        </div>
        <div>
          <span style={{ color: CLAUDE_LOGO_COLOR }}>{CLAUDE_LOGO_ART_2}</span>
          <span style={{ color: MUTED_COLOR }}> Opus 4.6 · Claude API</span>
        </div>
        <div>
          <span style={{ color: CLAUDE_LOGO_COLOR }}>{CLAUDE_LOGO_ART_3}</span>
          <span style={{ color: MUTED_COLOR }}> /Users/you/my-app</span>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: PROMPT_TOP_PX,
          left: SCENE_HORIZONTAL_PADDING_PX,
          right: SCENE_HORIZONTAL_PADDING_PX,
          fontFamily,
          fontSize: PROMPT_FONT_SIZE_PX,
          color: TEXT_COLOR,
          opacity: promptOpacity,
          borderTop: "1px solid rgba(255,255,255,0.15)",
          padding: "8px 0",
        }}
      >
        <span style={{ color: MUTED_COLOR }}>❯ </span>
        <span style={{ color: "white" }}>Fix these react-doctor issues</span>
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
        {isSpinnerVisible && (
          <>
            <span style={{ color: SPINNER_COLOR }}>{spinnerChar}</span>
            <span style={{ color: MUTED_COLOR }}>{" Fixing issues..."}</span>
          </>
        )}
        {allFixed && (
          <span style={{ color: GREEN_COLOR, opacity: allFixedOpacity }}>✓ All issues fixed</span>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: ITEMS_TOP_PX,
          left: SCENE_HORIZONTAL_PADDING_PX,
          right: SCENE_HORIZONTAL_PADDING_PX,
        }}
      >
        {DIAGNOSTICS.map((diagnostic, diagnosticIndex) => {
          const itemAppearStart = ITEMS_START_FRAME + diagnosticIndex * ITEM_STAGGER_FRAMES;
          const itemOpacity = interpolate(
            frame - itemAppearStart,
            [0, ITEM_FADE_FRAMES],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: CONTENT_ENTER_EASING,
            },
          );
          const itemFixFrame = FIX_START_FRAME + diagnosticIndex * FIX_INTERVAL_FRAMES;
          const itemFixProgress = interpolate(
            frame - itemFixFrame,
            [0, FIX_FADE_FRAMES],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: CONTENT_ENTER_EASING,
            },
          );
          const isItemFixed = isFixing && diagnosticIndex < fixedDiagnosticCount;
          const showAsFixed = isItemFixed && itemFixProgress > 0.3;

          return (
            <div
              key={diagnostic.message}
              style={{
                fontFamily,
                fontSize: DIAGNOSTIC_FONT_SIZE_PX,
                lineHeight: 1.7,
                color: showAsFixed ? MUTED_COLOR : TEXT_COLOR,
                textDecoration: showAsFixed ? "line-through" : "none",
                opacity: itemOpacity,
              }}
            >
              <span style={{ color: showAsFixed ? GREEN_COLOR : RED_COLOR }}>
                {showAsFixed ? " ✓" : " ✗"}
              </span>
              {` ${diagnostic.message} `}
              <span style={{ color: MUTED_COLOR }}>({diagnostic.count})</span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: scoreLeftPx,
          top: scoreTopPx,
          display: "flex",
          gap: scoreGap,
          alignItems: "flex-start",
          opacity: scoreBlockOpacity,
        }}
      >
        <pre
          style={{
            color: scoreColor,
            lineHeight: 1.2,
            fontSize: faceFontSize,
            fontFamily,
            margin: 0,
          }}
        >
          {`${BOX_TOP}\n│ ${doctorEyes} │\n│ ${doctorMouth} │\n${BOX_BOTTOM}`}
        </pre>
        <div>
          <div>
            <span
              style={{
                color: scoreColor,
                fontWeight: 500,
                fontSize: numberFontSize,
                fontFamily,
              }}
            >
              {displayScore}
            </span>
            <span
              style={{
                color: MUTED_COLOR,
                fontSize: labelFontSize,
                fontFamily,
              }}
            >
              {` / ${PERFECT_SCORE}  `}
            </span>
            <span
              style={{
                color: scoreColor,
                fontSize: labelFontSize,
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
              fontSize: barFontSize,
              fontFamily,
            }}
          >
            <span style={{ color: scoreColor }}>{"█".repeat(filledBarCount)}</span>
            <span style={{ color: "#525252" }}>{"░".repeat(emptyBarCount)}</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
