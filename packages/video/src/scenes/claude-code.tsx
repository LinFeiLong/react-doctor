import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  CHECKS,
  CLAUDE_ACCENT_COLOR,
  CLAUDE_BACKGROUND_COLOR,
  CLAUDE_FIX_FADE_FRAMES,
  CLAUDE_FIX_ROW_HEIGHT_PX,
  CLAUDE_FIX_STAGGER_FRAMES,
  CLAUDE_FIX_START_FRAME,
  CLAUDE_FONT_SIZE_PX,
  CLAUDE_GREEN_COLOR,
  CLAUDE_INTRO_FRAMES,
  CLAUDE_LOGO_LINE_1,
  CLAUDE_LOGO_LINE_2,
  CLAUDE_LOGO_LINE_3,
  CLAUDE_MUTED_COLOR,
  CLAUDE_PROMPT,
  CLAUDE_SCORE_END,
  CLAUDE_SCORE_START,
  CLAUDE_TEXT_COLOR,
  CLAUDE_VISIBLE_FIX_ROWS,
  GH_MONO_FONT_FAMILY,
} from "../constants";
import { PrBadge } from "../components/pr-badge";

const FIXES = CHECKS.flatMap((check) => check.issues);
const LAST_FIX_FRAME = CLAUDE_FIX_START_FRAME + (FIXES.length - 1) * CLAUDE_FIX_STAGGER_FRAMES;
const SCROLL_START_FRAME = CLAUDE_FIX_START_FRAME + CLAUDE_VISIBLE_FIX_ROWS * CLAUDE_FIX_STAGGER_FRAMES;
const VIEWPORT_HEIGHT_PX = CLAUDE_VISIBLE_FIX_ROWS * CLAUDE_FIX_ROW_HEIGHT_PX;
const MAX_SCROLL_PX = Math.max(0, FIXES.length * CLAUDE_FIX_ROW_HEIGHT_PX - VIEWPORT_HEIGHT_PX);

const FixCheck = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: CLAUDE_FONT_SIZE_PX, height: CLAUDE_FONT_SIZE_PX, flexShrink: 0 }}
    aria-hidden="true"
  >
    <path d="M5 12 L10 17 L19 8" stroke={CLAUDE_GREEN_COLOR} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ClaudeCode = () => {
  const frame = useCurrentFrame();

  const introOpacity = interpolate(frame, [0, CLAUDE_INTRO_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const fixedCount = FIXES.filter(
    (_, fixIndex) => frame >= CLAUDE_FIX_START_FRAME + fixIndex * CLAUDE_FIX_STAGGER_FRAMES,
  ).length;
  const allFixed = frame >= LAST_FIX_FRAME + CLAUDE_FIX_FADE_FRAMES;

  const scrollOffsetPx = interpolate(frame, [SCROLL_START_FRAME, LAST_FIX_FRAME], [0, MAX_SCROLL_PX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  const score = Math.round(
    interpolate(frame, [CLAUDE_FIX_START_FRAME, LAST_FIX_FRAME], [CLAUDE_SCORE_START, CLAUDE_SCORE_END], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }),
  );

  const dotCount = (Math.floor(frame / 6) % 3) + 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: CLAUDE_BACKGROUND_COLOR,
        fontFamily: GH_MONO_FONT_FAMILY,
        fontSize: CLAUDE_FONT_SIZE_PX,
        color: CLAUDE_TEXT_COLOR,
        padding: "72px 90px",
        fontSynthesis: "none",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ position: "absolute", top: 72, right: 90, opacity: introOpacity }}>
        <PrBadge />
      </div>

      <div style={{ opacity: introOpacity, lineHeight: 1.35, whiteSpace: "pre", marginBottom: 28 }}>
        <div>
          <span style={{ color: CLAUDE_ACCENT_COLOR }}>{CLAUDE_LOGO_LINE_1}</span>
          <span style={{ color: "#ffffff" }}>{"  Claude Code"}</span>
        </div>
        <div>
          <span style={{ color: CLAUDE_ACCENT_COLOR }}>{CLAUDE_LOGO_LINE_2}</span>
          <span style={{ color: CLAUDE_MUTED_COLOR }}>{"  Opus 4.6 · Claude API"}</span>
        </div>
        <div>
          <span style={{ color: CLAUDE_ACCENT_COLOR }}>{CLAUDE_LOGO_LINE_3}</span>
          <span style={{ color: CLAUDE_MUTED_COLOR }}>{"   ~/my-app"}</span>
        </div>
      </div>

      <div style={{ opacity: introOpacity, marginBottom: 22 }}>
        <span style={{ color: CLAUDE_ACCENT_COLOR }}>{"> "}</span>
        <span style={{ color: "#ffffff" }}>{CLAUDE_PROMPT}</span>
      </div>

      <div style={{ marginBottom: 26, opacity: introOpacity }}>
        {allFixed ? (
          <span style={{ color: CLAUDE_GREEN_COLOR }}>{`All ${FIXES.length} issues fixed · score ${CLAUDE_SCORE_START} → ${score}`}</span>
        ) : (
          <span style={{ color: CLAUDE_ACCENT_COLOR }}>
            {`Fixing issues${".".repeat(dotCount)}`}
            <span style={{ color: CLAUDE_MUTED_COLOR }}>{`  ${fixedCount}/${FIXES.length} · score ${score}`}</span>
          </span>
        )}
      </div>

      <div style={{ position: "relative", height: VIEWPORT_HEIGHT_PX, overflow: "hidden" }}>
        <div style={{ transform: `translateY(-${scrollOffsetPx}px)` }}>
          {FIXES.map((fix, fixIndex) => {
            const fixFrame = CLAUDE_FIX_START_FRAME + fixIndex * CLAUDE_FIX_STAGGER_FRAMES;
            const rowOpacity = interpolate(frame, [fixFrame, fixFrame + CLAUDE_FIX_FADE_FRAMES], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={fix.path + fix.note}
                style={{ height: CLAUDE_FIX_ROW_HEIGHT_PX, display: "flex", alignItems: "center", gap: 16, opacity: rowOpacity, whiteSpace: "pre" }}
              >
                <FixCheck />
                <span style={{ color: "#ffffff" }}>{fix.path}</span>
                <span style={{ color: CLAUDE_MUTED_COLOR }}>{fix.note}</span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            background: `linear-gradient(to top, ${CLAUDE_BACKGROUND_COLOR}, transparent)`,
            pointerEvents: "none",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
