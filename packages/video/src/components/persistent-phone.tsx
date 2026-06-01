import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES,
  SCENE_FILE_SCAN_DURATION_FRAMES,
  SCENE_TYPING_DURATION_FRAMES,
  TRANSITION_DURATION_FRAMES,
} from "../constants";
import { PHONE_SCALE, PhoneMockup, getCenteredTranslateXPx } from "./phone-mockup";

const PHONE_FADE_IN_FRAMES = 5;
const PHONE_ZOOM_PEAK_SCALE = PHONE_SCALE * 1.85;
const PHONE_MOVE_FRAMES = 18;
const PHONE_RIGHT_DROP_PX = 70;
const PHONE_ZOOM_LIFT_PX = 40;
const AMOUNT_COUNT_START_FRAME = 4;
const AMOUNT_COUNT_FRAMES = 22;

// keypad key centers in the phone's local coordinate space (1-6)
const KEY_CENTERS = [
  { x: 96, y: 427 },
  { x: 214, y: 427 },
  { x: 332, y: 427 },
  { x: 96, y: 515 },
  { x: 214, y: 515 },
  { x: 332, y: 515 },
];
const TAP_INTERVAL_FRAMES = 22;
const TAP_MOVE_FRAMES = 9;

// the file-scan screen starts once scene 1 transitions out
const FILE_SCAN_START_FRAME = SCENE_TYPING_DURATION_FRAMES - TRANSITION_DURATION_FRAMES;
const ISSUE_HIGHLIGHT_STAGGER_FRAMES = 42;

// the phone stays centered + zoomed through scene 1, then slides right into the scan screen
const PHONE_MOVE_START_FRAME = FILE_SCAN_START_FRAME - PHONE_MOVE_FRAMES;

// the finger only starts tapping once the issue scan begins
const TOUCH_START_FRAME = FILE_SCAN_START_FRAME;

// the diagnose-and-fix screen starts once the file-scan transitions out
const FIX_SCREEN_START_FRAME =
  FILE_SCAN_START_FRAME + (SCENE_FILE_SCAN_DURATION_FRAMES - TRANSITION_DURATION_FRAMES);
const FIX_GREEN_START_FRAME = FIX_SCREEN_START_FRAME + 100;
const FIX_GREEN_STAGGER_FRAMES = 42;

// the phone stays on screen from the intro until the final score screen begins
const SCORE_REVEAL_START_FRAME =
  FIX_SCREEN_START_FRAME + SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES;

export const PersistentPhone = () => {
  const frame = useCurrentFrame();

  // the phone leaves with a hard cut when the score screen begins (no fade)
  if (frame >= SCORE_REVEAL_START_FRAME) {
    return null;
  }

  const opacity = interpolate(frame, [0, PHONE_FADE_IN_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // start already zoomed in (centered), then settle to 1x while sliding right
  const phoneScale = interpolate(
    frame,
    [PHONE_MOVE_START_FRAME, PHONE_MOVE_START_FRAME + PHONE_MOVE_FRAMES],
    [PHONE_ZOOM_PEAK_SCALE, PHONE_SCALE],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
  );
  const phoneMoveProgress = interpolate(
    frame,
    [PHONE_MOVE_START_FRAME, PHONE_MOVE_START_FRAME + PHONE_MOVE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) },
  );
  const phoneTranslateX = getCenteredTranslateXPx(phoneScale) * (1 - phoneMoveProgress);
  const phoneTranslateY =
    -PHONE_ZOOM_LIFT_PX * (1 - phoneMoveProgress) + PHONE_RIGHT_DROP_PX * phoneMoveProgress;

  const issueHighlightProgress = interpolate(
    frame,
    [FILE_SCAN_START_FRAME, FILE_SCAN_START_FRAME + ISSUE_HIGHLIGHT_STAGGER_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const fixedProgress = interpolate(
    frame,
    [FIX_GREEN_START_FRAME, FIX_GREEN_START_FRAME + FIX_GREEN_STAGGER_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const amountProgress = interpolate(
    frame,
    [AMOUNT_COUNT_START_FRAME, AMOUNT_COUNT_START_FRAME + AMOUNT_COUNT_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

  // a finger taps around the number keys while the app is shown
  const touchActiveFrame = Math.max(0, frame - TOUCH_START_FRAME);
  const tapIndex = Math.floor(touchActiveFrame / TAP_INTERVAL_FRAMES) % KEY_CENTERS.length;
  const prevTapIndex = (tapIndex - 1 + KEY_CENTERS.length) % KEY_CENTERS.length;
  const tapLocalFrame = touchActiveFrame % TAP_INTERVAL_FRAMES;
  const tapMoveProgress = interpolate(tapLocalFrame, [0, TAP_MOVE_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const fromKey = KEY_CENTERS[prevTapIndex];
  const toKey = KEY_CENTERS[tapIndex];
  const touchX = fromKey.x + (toKey.x - fromKey.x) * tapMoveProgress;
  const touchY = fromKey.y + (toKey.y - fromKey.y) * tapMoveProgress;
  const touchPulse = interpolate(tapLocalFrame, [TAP_MOVE_FRAMES + 1, TAP_MOVE_FRAMES + 4, TAP_MOVE_FRAMES + 11], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const touchOpacity = interpolate(
    frame,
    [TOUCH_START_FRAME, TOUCH_START_FRAME + 8, FIX_SCREEN_START_FRAME - 12, FIX_SCREEN_START_FRAME],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 9999 }}>
      <PhoneMockup
        opacity={opacity}
        translateXPx={phoneTranslateX}
        translateYPx={phoneTranslateY}
        scale={phoneScale}
        issueHighlightProgress={issueHighlightProgress}
        fixedProgress={fixedProgress}
        amountProgress={amountProgress}
        touchX={touchX}
        touchY={touchY}
        touchPulse={touchPulse}
        touchOpacity={touchOpacity}
      />
    </AbsoluteFill>
  );
};
