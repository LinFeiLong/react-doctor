import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  BACKGROUND_COLOR,
  CHAR_FRAMES,
  COMMAND_PREFIX,
  COMMAND_TYPED_TEXT,
  CURSOR_BLINK_FRAMES,
  MUTED_COLOR,
  TEXT_COLOR,
  TYPING_FONT_SIZE_PX,
  TYPING_INITIAL_DELAY_FRAMES,
} from "../constants";
import { fontFamily } from "../utils/font";

export const TerminalTyping = () => {
  const frame = useCurrentFrame();

  const typedCharCount = Math.min(
    COMMAND_TYPED_TEXT.length,
    Math.max(0, Math.floor((frame - TYPING_INITIAL_DELAY_FRAMES) / CHAR_FRAMES)),
  );
  const typedCommand = COMMAND_TYPED_TEXT.slice(0, typedCharCount);
  const isTypingDone = typedCharCount >= COMMAND_TYPED_TEXT.length;
  const isTypingActive = frame >= TYPING_INITIAL_DELAY_FRAMES && !isTypingDone;

  const blinkingCursorOpacity = interpolate(
    frame % CURSOR_BLINK_FRAMES,
    [0, CURSOR_BLINK_FRAMES / 2, CURSOR_BLINK_FRAMES],
    [1, 0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const commandCursorOpacity = isTypingActive ? 1 : blinkingCursorOpacity;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        justifyContent: "center",
        padding: "0 80px",
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: TYPING_FONT_SIZE_PX,
          lineHeight: 1.7,
          color: TEXT_COLOR,
          whiteSpace: "nowrap",
          position: "relative",
        }}
      >
        <div>
          <span style={{ color: MUTED_COLOR }}>$ </span>
          <span style={{ color: "white" }}>{COMMAND_PREFIX}</span>
          <span style={{ color: "white" }}>{typedCommand}</span>
          <span style={{ opacity: commandCursorOpacity }}>▋</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
