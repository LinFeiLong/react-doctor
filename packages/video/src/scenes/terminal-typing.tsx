import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  GH_BACKGROUND_COLOR,
  GH_MONO_FONT_FAMILY,
  GH_MUTED_COLOR,
  GH_TEXT_COLOR,
  TYPING_CHAR_FRAMES,
  TYPING_COMMAND_PREFIX,
  TYPING_COMMAND_TEXT,
  TYPING_CURSOR_BLINK_FRAMES,
  TYPING_FONT_SIZE_PX,
  TYPING_INITIAL_DELAY_FRAMES,
} from "../constants";

export const TerminalTyping = () => {
  const frame = useCurrentFrame();

  const typedCharCount = Math.min(
    TYPING_COMMAND_TEXT.length,
    Math.max(0, Math.floor((frame - TYPING_INITIAL_DELAY_FRAMES) / TYPING_CHAR_FRAMES)),
  );
  const typedCommand = TYPING_COMMAND_TEXT.slice(0, typedCharCount);
  const isTypingDone = typedCharCount >= TYPING_COMMAND_TEXT.length;
  const isTypingActive = frame >= TYPING_INITIAL_DELAY_FRAMES && !isTypingDone;

  const blinkingCursorOpacity = interpolate(
    frame % TYPING_CURSOR_BLINK_FRAMES,
    [0, TYPING_CURSOR_BLINK_FRAMES / 2, TYPING_CURSOR_BLINK_FRAMES],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cursorOpacity = isTypingActive ? 1 : blinkingCursorOpacity;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: GH_BACKGROUND_COLOR,
        justifyContent: "center",
        padding: "0 90px",
        fontSynthesis: "none",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div
        style={{
          fontFamily: GH_MONO_FONT_FAMILY,
          fontSize: TYPING_FONT_SIZE_PX,
          lineHeight: 1.7,
          color: GH_TEXT_COLOR,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: GH_MUTED_COLOR }}>{"$ "}</span>
        <span style={{ color: "#ffffff" }}>{TYPING_COMMAND_PREFIX}</span>
        <span style={{ color: "#ffffff" }}>{typedCommand}</span>
        <span style={{ opacity: cursorOpacity }}>{"▋"}</span>
      </div>
    </AbsoluteFill>
  );
};
