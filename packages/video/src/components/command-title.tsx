import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { CHAR_FRAMES, COMMAND, CURSOR_BLINK_FRAMES, OVERLAY_GRADIENT_BOTTOM_PADDING_PX } from "../constants";
import { fontFamily } from "../utils/font";

const COMMAND_TYPE_START_FRAME = 20;
const COMMAND_FONT_SIZE_PX = 96;
const COMMAND_FADE_OUT_START_FRAME = 66;
const COMMAND_FADE_OUT_FRAMES = 12;
const COMMAND_END_FRAME = COMMAND_FADE_OUT_START_FRAME + COMMAND_FADE_OUT_FRAMES;

export const CommandTitle = () => {
  const frame = useCurrentFrame();

  if (frame < COMMAND_TYPE_START_FRAME || frame >= COMMAND_END_FRAME) {
    return null;
  }

  const typedCharCount = Math.min(
    COMMAND.length,
    Math.max(0, Math.floor((frame - COMMAND_TYPE_START_FRAME) / CHAR_FRAMES)),
  );
  const typedCommand = COMMAND.slice(0, typedCharCount);
  const isTypingActive = typedCharCount < COMMAND.length;

  const cursorOpacity = isTypingActive
    ? 1
    : interpolate(
        frame % CURSOR_BLINK_FRAMES,
        [0, CURSOR_BLINK_FRAMES / 2, CURSOR_BLINK_FRAMES],
        [1, 0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );

  const commandOpacity = interpolate(
    frame,
    [COMMAND_FADE_OUT_START_FRAME, COMMAND_FADE_OUT_START_FRAME + COMMAND_FADE_OUT_FRAMES],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) },
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: OVERLAY_GRADIENT_BOTTOM_PADDING_PX,
        pointerEvents: "none",
        zIndex: 10000,
        opacity: commandOpacity,
      }}
    >
      <div
        style={{
          fontFamily,
          fontSize: COMMAND_FONT_SIZE_PX,
          fontWeight: 400,
          color: "white",
          textAlign: "center",
          lineHeight: 1.4,
          whiteSpace: "nowrap",
          textShadow:
            "0 0 40px rgba(10,10,10,0.95), 0 0 80px rgba(10,10,10,0.9), 0 0 120px rgba(10,10,10,0.8)",
        }}
      >
        {typedCommand}
        <span style={{ opacity: cursorOpacity }}>▋</span>
      </div>
    </AbsoluteFill>
  );
};
