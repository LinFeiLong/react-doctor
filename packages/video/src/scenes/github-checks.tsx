import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  CHECKS,
  DETAIL_PANEL_HEIGHT_PX,
  FILE_ROW_HEIGHT_PX,
  GH_BORDER_COLOR,
  GH_CANVAS_COLOR,
  GH_FONT_FAMILY,
  GH_HEADER_BG_COLOR,
  GH_MUTED_COLOR,
  GH_TEXT_COLOR,
  ICON_POP_FRAMES,
  ICON_POP_SCALE,
  SCORE_RING_COLOR,
  SCORE_RING_FAIL_COLOR,
  SPINNER_DEG_PER_FRAME,
} from "../constants";
import { CheckRow } from "../components/check-row";
import { PrBadge } from "../components/pr-badge";
import { ScoreGauge } from "../components/score-gauge";
import type { CheckOutcome, ChecksTiming } from "../types";

const HEADER_VERTICAL_PADDING_PX = 32;
const HEADER_HORIZONTAL_PADDING_PX = 90;
const HEADER_GAP_PX = 34;
const HEADLINE_FONT_SIZE_PX = 54;
const SUBTEXT_FONT_SIZE_PX = 38;

const getPopScale = (frame: number, passFrame: number) =>
  interpolate(
    frame,
    [passFrame, passFrame + ICON_POP_FRAMES / 2, passFrame + ICON_POP_FRAMES],
    [1, ICON_POP_SCALE, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

const easeRamp = (frame: number, startFrame: number, durationFrames: number) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

interface GithubChecksProps {
  outcome: CheckOutcome;
  timing: ChecksTiming;
}

export const GithubChecks = ({ outcome, timing }: GithubChecksProps) => {
  const frame = useCurrentFrame();

  const isFail = outcome === "fail";
  const spinnerRotationDeg = frame * SPINNER_DEG_PER_FRAME;
  const allResolved = frame >= timing.headerPassFrame;

  const checkStates = CHECKS.map((check, checkIndex) => {
    const openFrame = timing.firstOpenFrame + checkIndex * timing.slotFrames;
    const passFrame = openFrame + timing.scanFrames;
    const files = isFail ? check.issues : check.cleanFiles;
    const targetScore = isFail ? check.failScore : check.passScore;

    const expandProgress = easeRamp(frame, openFrame, timing.expandFrames);
    const maxScrollPx = Math.max(0, files.length * FILE_ROW_HEIGHT_PX - DETAIL_PANEL_HEIGHT_PX);
    const scrollOffsetPx = interpolate(frame, [openFrame, passFrame], [0, maxScrollPx], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    });
    const scoreProgress = interpolate(frame, [passFrame, passFrame + timing.scoreCountFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    return {
      check,
      files,
      state: frame >= passFrame ? outcome : ("pending" as const),
      expandProgress,
      scrollOffsetPx,
      iconPopScale: getPopScale(frame, passFrame),
      displayedScore: Math.round(targetScore * scoreProgress),
    };
  });

  const overallScore = Math.round(
    checkStates.reduce((sum, state) => sum + state.displayedScore, 0) / checkStates.length,
  );
  const resolvedCount = checkStates.filter((state) => state.state !== "pending").length;
  const inProgressCount = CHECKS.length - resolvedCount;

  const headline = !allResolved
    ? "Running checks…"
    : isFail
      ? "Some checks were not successful"
      : "All checks have passed";
  const subtext = !allResolved
    ? `${inProgressCount} in progress, ${resolvedCount} done`
    : isFail
      ? `${CHECKS.length} failing checks`
      : `${CHECKS.length} successful checks`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: GH_CANVAS_COLOR,
        flexDirection: "column",
        fontSynthesis: "none",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: HEADER_GAP_PX,
            padding: `${HEADER_VERTICAL_PADDING_PX}px ${HEADER_HORIZONTAL_PADDING_PX}px`,
            backgroundColor: GH_HEADER_BG_COLOR,
            borderBottom: `1px solid ${GH_BORDER_COLOR}`,
          }}
        >
          <ScoreGauge
            overallScore={overallScore}
            overallFill={overallScore / 100}
            ringColor={isFail ? SCORE_RING_FAIL_COLOR : SCORE_RING_COLOR}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontFamily: GH_FONT_FAMILY, fontSize: HEADLINE_FONT_SIZE_PX, fontWeight: 600, color: GH_TEXT_COLOR }}>
              {headline}
            </span>
            <span style={{ fontFamily: GH_FONT_FAMILY, fontSize: SUBTEXT_FONT_SIZE_PX, color: GH_MUTED_COLOR }}>
              {subtext}
            </span>
          </div>

          <div style={{ marginLeft: "auto" }}>
            <PrBadge />
          </div>
        </div>

        {checkStates.map((state, checkIndex) => (
          <CheckRow
            key={state.check.name}
            name={state.check.name}
            durationLabel={state.check.durationLabel}
            files={state.files}
            state={state.state}
            outcome={outcome}
            spinnerRotationDeg={spinnerRotationDeg}
            iconPopScale={state.iconPopScale}
            expandProgress={state.expandProgress}
            scrollOffsetPx={state.scrollOffsetPx}
            showDivider={checkIndex > 0}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
