import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  BACKGROUND_COLOR,
  ERROR_BADGE_BACKGROUND_COLOR,
  ERROR_BADGE_TEXT_COLOR,
  ERROR_ROW_BACKGROUND_COLOR,
  FILE_ROW_GAP_PX,
  FILE_ROW_HORIZONTAL_PADDING_PX,
  FILE_ROW_VERTICAL_PADDING_PX,
  FILE_SCAN_FONT_SIZE_PX,
  MUTED_COLOR,
  RULE_SCROLL_GROUPS,
  SEVERITY_BADGE_RADIUS_PX,
  SEVERITY_BADGE_SIZE_PX,
  TEXT_COLOR,
  WARNING_BADGE_BACKGROUND_COLOR,
} from "../constants";
import { fontFamily } from "../utils/font";

const LINE_HEIGHT_MULTIPLIER = 1.6;
const ROW_HEIGHT_PX =
  FILE_SCAN_FONT_SIZE_PX * LINE_HEIGHT_MULTIPLIER + FILE_ROW_VERTICAL_PADDING_PX * 2;
const CONTENT_PADDING_PX = 40;
const RULE_REPEAT_COUNT = 6;
const getRuleScrollRows = () => {
  const baseRuleRows: (typeof RULE_SCROLL_GROUPS)[number]["rows"][number][] = [];

  for (const ruleGroup of RULE_SCROLL_GROUPS) {
    baseRuleRows.push(...ruleGroup.rows);
  }

  const ruleRows: (typeof baseRuleRows)[number][] = [];
  for (let repeatIndex = 0; repeatIndex < RULE_REPEAT_COUNT; repeatIndex += 1) {
    ruleRows.push(...baseRuleRows);
  }

  return ruleRows;
};
const RULE_SCROLL_ROWS = getRuleScrollRows();
const TOTAL_LIST_HEIGHT_PX = RULE_SCROLL_ROWS.length * ROW_HEIGHT_PX;
const TYPING_SCENE_END_SCROLL_PX = Math.max(TOTAL_LIST_HEIGHT_PX - 760, 0);
const SCROLL_PX_PER_FRAME = TYPING_SCENE_END_SCROLL_PX / 190;

const FRAMES_PER_ISSUE = 2;
const FADE_IN_FRAMES = 6;

const TITLE_FONT_SIZE_PX = 201;
const TITLE_FADE_IN_START_FRAME = 5;
const TITLE_FADE_IN_FRAMES = 12;
const TITLE_LOGO_SIZE_PX = 224;

export const FileScan = () => {
  const frame = useCurrentFrame();

  const scrollStartFrame = 20;
  const scrollY = frame > scrollStartFrame ? (frame - scrollStartFrame) * SCROLL_PX_PER_FRAME : 0;

  const titleOpacity = interpolate(
    frame,
    [TITLE_FADE_IN_START_FRAME, TITLE_FADE_IN_START_FRAME + TITLE_FADE_IN_FRAMES],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BACKGROUND_COLOR,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          padding: `${CONTENT_PADDING_PX}px 60px`,
        }}
      >
        <div style={{ transform: `translateY(-${scrollY}px)` }}>
          {RULE_SCROLL_ROWS.map((ruleRow, ruleIndex) => {
            const issueOpacity = interpolate(
              frame,
              [ruleIndex * FRAMES_PER_ISSUE, ruleIndex * FRAMES_PER_ISSUE + FADE_IN_FRAMES],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            const isPurePreactRule = ruleRow.badgeText === "pure-preact";
            const message = `${ruleRow.ruleId} - ${ruleRow.source} - ${ruleRow.flags}`;

            return (
              <div
                key={`${ruleIndex}-${ruleRow.ruleId}`}
                style={{
                  opacity: issueOpacity,
                  fontFamily,
                  fontSize: FILE_SCAN_FONT_SIZE_PX,
                  lineHeight: LINE_HEIGHT_MULTIPLIER,
                  color: TEXT_COLOR,
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: FILE_ROW_GAP_PX,
                  padding: `${FILE_ROW_VERTICAL_PADDING_PX}px ${FILE_ROW_HORIZONTAL_PADDING_PX}px`,
                  backgroundColor: isPurePreactRule ? ERROR_ROW_BACKGROUND_COLOR : "transparent",
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
                    backgroundColor: isPurePreactRule
                      ? ERROR_BADGE_BACKGROUND_COLOR
                      : WARNING_BADGE_BACKGROUND_COLOR,
                    color: ERROR_BADGE_TEXT_COLOR,
                    fontSize: FILE_SCAN_FONT_SIZE_PX * 0.7,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  !
                </span>

                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {message}
                </span>

                <span
                  style={{
                    color: MUTED_COLOR,
                    flexShrink: 0,
                    fontSize: FILE_SCAN_FONT_SIZE_PX * 0.75,
                  }}
                >
                  {`${ruleRow.badgeLabel}: ${ruleRow.badgeText}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: titleOpacity,
            padding: "28px 76px",
            borderRadius: 34,
            background: "rgba(0,0,0,0.72)",
            boxShadow: "0 0 120px 78px rgba(0,0,0,0.82), 0 0 220px 120px rgba(0,0,0,0.48)",
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: TITLE_FONT_SIZE_PX,
              fontWeight: 400,
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: 28,
              lineHeight: 1.4,
              textShadow: "0 6px 36px rgba(0,0,0,1), 0 0 90px rgba(0,0,0,0.95)",
            }}
          >
            <Img
              src={staticFile("react-native-logo.png")}
              style={{
                width: TITLE_LOGO_SIZE_PX,
                height: TITLE_LOGO_SIZE_PX,
                filter:
                  "drop-shadow(0 6px 34px rgba(0,0,0,1)) drop-shadow(0 0 82px rgba(0,0,0,0.8))",
              }}
            />
            <span>React Native</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
