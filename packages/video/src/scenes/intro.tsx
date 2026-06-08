import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  GH_FONT_FAMILY,
  INTRO_INITIAL_BACKGROUND_COLOR,
  INTRO_INITIAL_TEXT_COLOR,
  INTRO_INVERTED_BACKGROUND_COLOR,
  INTRO_INVERTED_TEXT_COLOR,
  INTRO_PAN_BLUR_MAX_PX,
  INTRO_PAN_END_PX,
  INTRO_PAN_FRAMES,
  INTRO_PAN_START_PX,
  INTRO_SHIFT_START_FRAME,
  INTRO_TAIL_START_INDEX,
  INTRO_TITLE_FONT_SIZE_PX,
  INTRO_WORD_ANIM_FRAMES,
  INTRO_WORD_GAP_PX,
  INTRO_WORD_RISE_PX,
  INTRO_WORD_STAGGER_FRAMES,
  INTRO_WORDS,
} from "../constants";

const PAN_END_FRAME = INTRO_SHIFT_START_FRAME + INTRO_PAN_FRAMES;

export const Intro = () => {
  const frame = useCurrentFrame();

  const isInverted = frame >= INTRO_SHIFT_START_FRAME;
  const backgroundColor = isInverted ? INTRO_INVERTED_BACKGROUND_COLOR : INTRO_INITIAL_BACKGROUND_COLOR;
  const textColor = isInverted ? INTRO_INVERTED_TEXT_COLOR : INTRO_INITIAL_TEXT_COLOR;

  const panProgress = interpolate(frame, [INTRO_SHIFT_START_FRAME, PAN_END_FRAME], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panX = interpolate(panProgress, [0, 1], [INTRO_PAN_START_PX, INTRO_PAN_END_PX], {
    easing: Easing.inOut(Easing.cubic),
  });
  const motionBlurPx = Math.sin(Math.PI * panProgress) * INTRO_PAN_BLUR_MAX_PX;
  const isBlurring = motionBlurPx > 0.05;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        fontSynthesis: "none",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id="intro-motion-blur" x="-50%" y="-20%" width="200%" height="140%">
            <feGaussianBlur stdDeviation={`${motionBlurPx} 0`} />
          </filter>
        </defs>
      </svg>

      <div
        style={{
          display: "flex",
          gap: INTRO_WORD_GAP_PX,
          transform: `translateX(${panX}px)`,
          filter: isBlurring ? "url(#intro-motion-blur)" : "none",
          fontFamily: GH_FONT_FAMILY,
          fontSize: INTRO_TITLE_FONT_SIZE_PX,
          fontWeight: 600,
          letterSpacing: -2,
          color: textColor,
          whiteSpace: "nowrap",
        }}
      >
        {INTRO_WORDS.map((word, wordIndex) => {
          if (wordIndex >= INTRO_TAIL_START_INDEX) {
            return (
              <span key={word} style={{ display: "inline-block" }}>
                {word}
              </span>
            );
          }

          const wordStartFrame = wordIndex * INTRO_WORD_STAGGER_FRAMES;
          const wordProgress = interpolate(
            frame,
            [wordStartFrame, wordStartFrame + INTRO_WORD_ANIM_FRAMES],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
          );
          return (
            <span
              key={word}
              style={{
                display: "inline-block",
                opacity: wordProgress,
                transform: `translateY(${(1 - wordProgress) * INTRO_WORD_RISE_PX}px)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
