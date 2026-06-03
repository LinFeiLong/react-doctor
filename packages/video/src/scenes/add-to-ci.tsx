import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  BACKGROUND_COLOR,
  BUTTON_BORDER_COLOR,
  BUTTON_FONT_FAMILY,
  BUTTON_GREEN_COLOR,
  BUTTON_SHADOW,
  BUTTON_TEXT_COLOR,
} from "../constants";
import { Cursor } from "../components/cursor";

const BUTTON_SCALE = 6;
const BUTTON_HEIGHT_PX = 32 * BUTTON_SCALE;
const BUTTON_HORIZONTAL_PADDING_PX = 12 * BUTTON_SCALE;
const BUTTON_GAP_PX = 8 * BUTTON_SCALE;
const BUTTON_RADIUS_PX = 6 * BUTTON_SCALE;
const BUTTON_BORDER_WIDTH_PX = 1 * BUTTON_SCALE;
const BUTTON_FONT_SIZE_PX = 14 * BUTTON_SCALE;

const CANVAS_CENTER_X_PX = 960;
const CANVAS_CENTER_Y_PX = 540;

const CURSOR_WIDTH_PX = 80;
const CURSOR_TIP_OFFSET_PX = (CURSOR_WIDTH_PX * 5) / 19;
const CURSOR_START_X_PX = 1500;
const CURSOR_START_Y_PX = 950;
const CURSOR_TARGET_X_PX = CANVAS_CENTER_X_PX + 60;
const CURSOR_TARGET_Y_PX = CANVAS_CENTER_Y_PX + 18;

const CURSOR_TRAVEL_START_FRAME = 4;
const CURSOR_TRAVEL_END_FRAME = 40;
const CLICK_FRAME = 42;
const CLICK_DURATION_FRAMES = 12;
const CLICK_DEPTH_SCALE = 0.92;
const CURSOR_PRESS_NUDGE_PX = 10;
const ZOOM_START_FRAME = 60;
const ZOOM_END_FRAME = 76;
const ZOOM_TARGET_SCALE = 8;
const ZOOM_MAX_BLUR_PX = 14;
const ZOOM_MAX_DARKEN_OPACITY = 0.7;
const CURSOR_FADE_START_FRAME = 50;
const CURSOR_FADE_END_FRAME = 58;

export const AddToCi = () => {
  const frame = useCurrentFrame();

  const clickScale = interpolate(
    frame,
    [CLICK_FRAME, CLICK_FRAME + CLICK_DURATION_FRAMES / 2, CLICK_FRAME + CLICK_DURATION_FRAMES],
    [1, CLICK_DEPTH_SCALE, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const zoomScale = interpolate(frame, [ZOOM_START_FRAME, ZOOM_END_FRAME], [1, ZOOM_TARGET_SCALE], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  const zoomBlurPx = interpolate(frame, [ZOOM_START_FRAME, ZOOM_END_FRAME], [0, ZOOM_MAX_BLUR_PX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });

  const zoomDarkenOpacity = interpolate(
    frame,
    [ZOOM_START_FRAME, ZOOM_END_FRAME],
    [0, ZOOM_MAX_DARKEN_OPACITY],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) },
  );

  const buttonScale = clickScale;

  const cursorTravelProgress = interpolate(
    frame,
    [CURSOR_TRAVEL_START_FRAME, CURSOR_TRAVEL_END_FRAME],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
  );
  const cursorPressNudge = interpolate(
    frame,
    [CLICK_FRAME, CLICK_FRAME + CLICK_DURATION_FRAMES / 2, CLICK_FRAME + CLICK_DURATION_FRAMES],
    [0, CURSOR_PRESS_NUDGE_PX, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cursorTipX =
    CURSOR_START_X_PX + (CURSOR_TARGET_X_PX - CURSOR_START_X_PX) * cursorTravelProgress;
  const cursorTipY =
    CURSOR_START_Y_PX +
    (CURSOR_TARGET_Y_PX - CURSOR_START_Y_PX) * cursorTravelProgress +
    cursorPressNudge;
  const cursorOpacity = interpolate(
    frame,
    [CURSOR_FADE_START_FRAME, CURSOR_FADE_END_FRAME],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
        fontSynthesis: "none",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${zoomScale})`,
          transformOrigin: "center center",
          filter: `blur(${zoomBlurPx / zoomScale}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: BUTTON_GAP_PX,
            height: BUTTON_HEIGHT_PX,
            padding: `0 ${BUTTON_HORIZONTAL_PADDING_PX}px`,
            backgroundColor: BUTTON_GREEN_COLOR,
            border: `${BUTTON_BORDER_WIDTH_PX}px solid ${BUTTON_BORDER_COLOR}`,
            borderRadius: BUTTON_RADIUS_PX,
            boxShadow: BUTTON_SHADOW,
            transform: `scale(${buttonScale})`,
          }}
        >
          <div
            style={{
              color: BUTTON_TEXT_COLOR,
              fontFamily: BUTTON_FONT_FAMILY,
              fontSize: BUTTON_FONT_SIZE_PX,
              fontWeight: 500,
              lineHeight: "150%",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            Add GitHub Action
          </div>
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: cursorTipX - CURSOR_TIP_OFFSET_PX,
          top: cursorTipY - CURSOR_TIP_OFFSET_PX,
          opacity: cursorOpacity,
        }}
      >
        <Cursor widthPx={CURSOR_WIDTH_PX} />
      </div>

      <AbsoluteFill
        style={{ backgroundColor: BACKGROUND_COLOR, opacity: zoomDarkenOpacity, pointerEvents: "none" }}
      />
    </AbsoluteFill>
  );
};
