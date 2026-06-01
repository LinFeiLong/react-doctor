import { interpolate, interpolateColors } from "remotion";
import { VIDEO_WIDTH_PX } from "../constants";

const PHONE_GROUP_WIDTH_PX = 431;
const PHONE_GROUP_HEIGHT_PX = 864;
const PHONE_TOP_PX = 130;
const PHONE_RIGHT_PX = 80;
export const PHONE_SCALE = 1.3;

const PHONE_RIGHT_ANCHOR_X_PX = VIDEO_WIDTH_PX - PHONE_RIGHT_PX;

// translateX that keeps the phone horizontally screen-centered at a given scale
// (the group is anchored top-right, so the offset depends on the scaled width)
export const getCenteredTranslateXPx = (scale: number) =>
  VIDEO_WIDTH_PX / 2 - (PHONE_RIGHT_ANCHOR_X_PX - (PHONE_GROUP_WIDTH_PX * scale) / 2);

const APP_FONT = "'Inter', system-ui, sans-serif";
const PANEL_BG = "#f5f4f4";
const PHONE_FRAME_BG = "#ffffff";
const APP_SCREEN_BG = "#ffffff";
const SURFACE_COLOR = "#ffffff";
const ACCENT_CYAN = "#00BDFF";
const AMOUNT_COLOR = "#6b6b6b";
const SEND_TEXT_COLOR = "#5e5e5e";
const NUMBER_COLOR = "#969696";
const ICON_GRAY = "#7b7b7b";
const ISSUE_BOX_COLOR = "#ff3b30";
const FIXED_BOX_COLOR = "#34c759";
const ISSUE_GLOW_INNER = "rgba(255, 59, 48, 0.18)";
const ISSUE_GLOW_OUTER = "rgba(255, 59, 48, 0.35)";
const FIXED_GLOW_INNER = "rgba(52, 199, 89, 0.18)";
const FIXED_GLOW_OUTER = "rgba(52, 199, 89, 0.35)";
const ISSUE_BOX_STAGGER = 0.26;
const ISSUE_BOX_FADE = 0.34;

const ISSUE_BOXES = [
  { left: 168, top: 164, width: 122, height: 52, label: "Use Pressable" },
  { left: 144, top: 268, width: 132, height: 88, label: "Wrap in <Text>" },
  { left: 64, top: 388, width: 304, height: 156, label: "Virtualize list" },
];

const AMOUNT_VALUE = 40;
const AMOUNT_RISE_PX = 18;
const TOUCH_SIZE_PX = 58;

interface PhoneMockupProps {
  opacity: number;
  translateXPx: number;
  translateYPx?: number;
  scale: number;
  issueHighlightProgress?: number;
  fixedProgress?: number;
  amountProgress?: number;
  touchX?: number;
  touchY?: number;
  touchPulse?: number;
  touchOpacity?: number;
}

export const PhoneMockup = ({
  opacity,
  translateXPx,
  translateYPx = 0,
  scale,
  issueHighlightProgress = 0,
  fixedProgress = 0,
  amountProgress = 1,
  touchX = 0,
  touchY = 0,
  touchPulse = 0,
  touchOpacity = 0,
}: PhoneMockupProps) => (
  <div
    style={{
      position: "absolute",
      top: PHONE_TOP_PX,
      right: PHONE_RIGHT_PX,
      width: PHONE_GROUP_WIDTH_PX,
      height: PHONE_GROUP_HEIGHT_PX,
      transformOrigin: "top right",
      transform: `translateX(${translateXPx}px) translateY(${translateYPx}px) scale(${scale})`,
      opacity,
    }}
  >
    <div style={{ position: "absolute", left: 4, top: 73, width: 427, height: 579, borderRadius: 93, backgroundColor: PANEL_BG }} />

    <div style={{ position: "absolute", left: 0, top: 203, width: 7, height: 37, borderRadius: 999, backgroundColor: SURFACE_COLOR, outline: `1px solid #e0e0e0` }} />
    <div style={{ position: "absolute", left: 0, top: 267, width: 7, height: 51, borderRadius: 999, backgroundColor: SURFACE_COLOR, outline: `1px solid #e0e0e0` }} />
    <div style={{ position: "absolute", left: 0, top: 326, width: 7, height: 51, borderRadius: 999, backgroundColor: SURFACE_COLOR, outline: `1px solid #e0e0e0` }} />

    <div
      style={{
        position: "absolute",
        left: 4,
        top: 73,
        width: 427,
        height: 791,
        borderRadius: 70,
        border: `9px solid ${PHONE_FRAME_BG}`,
        outline: `0.5px solid #e0e0e0`,
        backgroundColor: PANEL_BG,
        boxShadow: "rgba(0,0,0,0.55) 0px 30px 80px, rgba(0,0,0,0.4) 0px 8px 24px",
      }}
    />

    <div
      style={{
        position: "absolute",
        left: 24,
        top: 234,
        width: 389,
        height: 385,
        borderRadius: 60,
        backgroundColor: APP_SCREEN_BG,
        boxShadow:
          "rgba(0,0,0,0.06) 0px 0px 0px 0.5px, rgba(0,0,0,0.06) 0px 1px 2px -1px, rgba(0,0,0,0.04) 0px 2px 4px",
      }}
    />

    <div style={{ position: "absolute", left: 34, top: 166, width: 47, height: 47, borderRadius: 999, backgroundColor: SURFACE_COLOR }} />

    <div style={{ position: "absolute", left: 162, top: 100, width: 111, height: 36, borderRadius: 999, backgroundColor: "#000000" }} />

    <div style={{ position: "absolute", display: "flex", left: 177, top: 174, alignItems: "center", gap: 4 }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fillRule="evenodd" clipRule="evenodd" d="M19.071 4.929C22.976 8.834 22.976 15.166 19.071 19.071C15.166 22.976 8.834 22.976 4.929 19.071C1.024 15.166 1.024 8.834 4.929 4.929C8.834 1.024 15.166 1.024 19.071 4.929ZM14.829 15.828C14.276 15.828 13.829 15.381 13.829 14.828L13.829 11.586L9.88 15.536C9.489 15.926 8.856 15.926 8.466 15.536C8.075 15.145 8.075 14.512 8.466 14.121L12.415 10.172L9.172 10.172C8.62 10.172 8.172 9.724 8.172 9.172C8.172 8.619 8.62 8.172 9.172 8.172H14.829L14.832 8.172C15.087 8.172 15.342 8.27 15.537 8.464C15.742 8.67 15.839 8.942 15.829 9.211L15.829 14.828C15.829 15.381 15.381 15.828 14.829 15.828Z" fill={ACCENT_CYAN} />
      </svg>
      <div style={{ fontFamily: APP_FONT, fontSize: 22, fontWeight: 600, letterSpacing: "-0.03em", color: SEND_TEXT_COLOR }}>Send</div>
    </div>

    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", left: 68, top: 202, width: 24, height: "auto", rotate: "180deg", transformOrigin: "0% 0%" }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M7.293 20.707C6.902 20.317 6.902 19.683 7.293 19.293L14.586 12L7.293 4.707C6.902 4.317 6.902 3.683 7.293 3.293C7.683 2.902 8.317 2.902 8.707 3.293L16.707 11.293C16.895 11.48 17 11.735 17 12C17 12.265 16.895 12.52 16.707 12.707L8.707 20.707C8.317 21.098 7.683 21.098 7.293 20.707Z" fill={ICON_GRAY} />
    </svg>

    <div
      style={{
        position: "absolute",
        left: 158,
        top: 277,
        fontFamily: APP_FONT,
        fontSize: 55,
        fontWeight: 600,
        color: AMOUNT_COLOR,
        opacity: amountProgress,
        transform: `translateY(${(1 - amountProgress) * AMOUNT_RISE_PX}px)`,
      }}
    >
      {`$${Math.round(AMOUNT_VALUE * amountProgress)}`}
    </div>

    <div style={{ position: "absolute", display: "flex", left: 85, top: 399, alignItems: "flex-start", gap: 96 }}>
      {[
        ["1", "4"],
        ["2", "5"],
        ["3", "6"],
      ].map((column) => (
        <div key={column.join("")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 31 }}>
          {column.map((digit) => (
            <div key={digit} style={{ fontFamily: APP_FONT, fontSize: 39, fontWeight: 500, color: NUMBER_COLOR }}>
              {digit}
            </div>
          ))}
        </div>
      ))}
    </div>

    <div style={{ position: "absolute", inset: 0 }}>
      {ISSUE_BOXES.map((box, index) => {
        const boxStart = index * ISSUE_BOX_STAGGER;
        const boxProgress = interpolate(
          issueHighlightProgress,
          [boxStart, boxStart + ISSUE_BOX_FADE],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const boxFixed = interpolate(
          fixedProgress,
          [boxStart, boxStart + ISSUE_BOX_FADE],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const borderColor = interpolateColors(boxFixed, [0, 1], [ISSUE_BOX_COLOR, FIXED_BOX_COLOR]);
        const glowInner = interpolateColors(boxFixed, [0, 1], [ISSUE_GLOW_INNER, FIXED_GLOW_INNER]);
        const glowOuter = interpolateColors(boxFixed, [0, 1], [ISSUE_GLOW_OUTER, FIXED_GLOW_OUTER]);
        return (
          <div
            key={`${box.left}-${box.top}`}
            style={{
              position: "absolute",
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              border: `3px solid ${borderColor}`,
              borderRadius: 12,
              boxShadow: `0 0 0 4px ${glowInner}, 0 0 18px ${glowOuter}`,
              opacity: boxProgress,
              transform: `scale(${0.9 + 0.1 * boxProgress})`,
              transformOrigin: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: -3,
                bottom: "100%",
                marginBottom: 6,
                backgroundColor: borderColor,
                color: "#ffffff",
                fontFamily: APP_FONT,
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: "-0.01em",
                padding: "3px 9px",
                borderRadius: 7,
                whiteSpace: "nowrap",
              }}
            >
              {box.label}
            </div>
          </div>
        );
      })}
    </div>

    <div
      style={{
        position: "absolute",
        left: touchX - TOUCH_SIZE_PX / 2,
        top: touchY - TOUCH_SIZE_PX / 2,
        width: TOUCH_SIZE_PX,
        height: TOUCH_SIZE_PX,
        borderRadius: 999,
        backgroundColor: "rgba(0, 0, 0, 0.1)",
        border: "2px solid rgba(0, 0, 0, 0.22)",
        opacity: touchOpacity,
        transform: `scale(${1 - 0.2 * touchPulse})`,
        transformOrigin: "center",
      }}
    />
  </div>
);
