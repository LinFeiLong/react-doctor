import { fontFamily } from "../utils/font";

const CARD_FONT = "'Mona Sans', system-ui, -apple-system, sans-serif";

const CARD_SURFACE_COLOR = "#131313";
const CARD_SURFACE_INSET_COLOR = "#0e0e0e";
const CARD_BORDER_COLOR = "#2a2a2a";
const INK_3_COLOR = "#aaaaaa";

const CHECK_GREEN_COLOR = "#1f9d44";
const CHECK_GREEN_BORDER_COLOR = "#13772f";
const REACT_DOCTOR_GREEN_COLOR = "#22b04e";

const CHECK_RED_COLOR = "#d1242f";
const CHECK_RED_BORDER_COLOR = "#a01622";
const REACT_DOCTOR_RED_COLOR = "#f0626c";
const PENDING_AMBER_COLOR = "#f58700";
const PENDING_CIRCLE_BG_COLOR = "rgba(245, 135, 0, 0.12)";

const DIFF_RED_BAR_COLOR = "rgba(251, 44, 54, 0.16)";
const DIFF_RED_STRONG_COLOR = "rgba(251, 44, 54, 0.32)";
const DIFF_GREEN_BAR_COLOR = "rgba(25, 200, 110, 0.16)";
const DIFF_GREEN_STRONG_COLOR = "rgba(25, 200, 110, 0.32)";
const DIFF_RED_TEXT_COLOR = "#ff9d96";
const DIFF_GREEN_TEXT_COLOR = "#85f0b4";
const CODE_COMMENT_COLOR = "#cfcfcf";
const DIFF_RED_GUTTER_COLOR = "#fb2c36";
const DIFF_GREEN_GUTTER_COLOR = "#19c86e";

const CARD_WIDTH_PX = 720;
const CARD_RADIUS_PX = 44;
const CARD_GAP_PX = 40;
const CARD_HORIZONTAL_PADDING_PX = 44;
const CARD_VERTICAL_PADDING_PX = 34;
const ROW_GAP_PX = 18;
const STATUS_CIRCLE_SIZE_PX = 70;
const CHECK_ICON_SIZE_PX = 38;
const DIVIDER_INDENT_PX = 92;
const BODY_FONT_SIZE_PX = 32;

const CheckIcon = ({ color, sizePx }: { color: string; sizePx: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: sizePx, height: sizePx, flexShrink: 0 }}
    aria-hidden="true"
  >
    <path
      d="M5 12 L10 17 L19 8"
      stroke={color}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CrossIcon = ({ color, sizePx }: { color: string; sizePx: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: sizePx, height: sizePx, flexShrink: 0 }}
    aria-hidden="true"
  >
    <path d="M7 7 L17 17 M17 7 L7 17" stroke={color} strokeWidth={3.5} strokeLinecap="round" />
  </svg>
);

const Spinner = ({ color, sizePx, rotationDeg }: { color: string; sizePx: number; rotationDeg: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ width: sizePx, height: sizePx, flexShrink: 0, transform: `rotate(${rotationDeg}deg)` }}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={4} strokeOpacity={0.2} />
    <path d="M21 12a9 9 0 0 1-9 9" stroke={color} strokeWidth={4} strokeLinecap="round" />
  </svg>
);

const cardBaseStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  width: CARD_WIDTH_PX,
  flexShrink: 0,
  overflow: "hidden",
  borderRadius: CARD_RADIUS_PX,
  backgroundColor: CARD_SURFACE_COLOR,
  border: `1px solid ${CARD_BORDER_COLOR}`,
  boxShadow:
    "0 2px 4px rgba(0, 0, 0, 0.4), 0 12px 28px rgba(0, 0, 0, 0.55), 0 40px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
};

const Divider = () => (
  <div
    style={{
      height: 1,
      marginLeft: DIVIDER_INDENT_PX,
      maxWidth: 500,
      backgroundColor: CARD_BORDER_COLOR,
    }}
  />
);

const HEADLINE_BY_STATE = {
  pending: "Running checks…",
  fail: "Some checks were not successful",
  pass: "All checks have passed",
};

const StatusCircle = ({ state, spinnerRotationDeg }: ChecksCardProps) => {
  if (state === "pending") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: STATUS_CIRCLE_SIZE_PX,
          height: STATUS_CIRCLE_SIZE_PX,
          flexShrink: 0,
          borderRadius: "50%",
          backgroundColor: PENDING_CIRCLE_BG_COLOR,
        }}
      >
        <Spinner color={PENDING_AMBER_COLOR} sizePx={CHECK_ICON_SIZE_PX} rotationDeg={spinnerRotationDeg ?? 0} />
      </div>
    );
  }

  const isFail = state === "fail";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: STATUS_CIRCLE_SIZE_PX,
        height: STATUS_CIRCLE_SIZE_PX,
        flexShrink: 0,
        borderRadius: "50%",
        backgroundColor: isFail ? CHECK_RED_COLOR : CHECK_GREEN_COLOR,
        border: `1px solid ${isFail ? CHECK_RED_BORDER_COLOR : CHECK_GREEN_BORDER_COLOR}`,
        boxShadow: isFail
          ? "inset 0 0 8px rgba(255, 130, 130, 0.45)"
          : "inset 0 0 8px rgba(120, 255, 170, 0.45)",
      }}
    >
      {isFail ? (
        <CrossIcon color="#ffffff" sizePx={CHECK_ICON_SIZE_PX} />
      ) : (
        <CheckIcon color="#ffffff" sizePx={CHECK_ICON_SIZE_PX} />
      )}
    </div>
  );
};

const ReactDoctorStatus = ({ state, spinnerRotationDeg }: ChecksCardProps) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: STATUS_CIRCLE_SIZE_PX,
      height: STATUS_CIRCLE_SIZE_PX,
      flexShrink: 0,
    }}
  >
    {state === "pending" ? (
      <Spinner color={PENDING_AMBER_COLOR} sizePx={CHECK_ICON_SIZE_PX} rotationDeg={spinnerRotationDeg ?? 0} />
    ) : state === "fail" ? (
      <CrossIcon color={REACT_DOCTOR_RED_COLOR} sizePx={CHECK_ICON_SIZE_PX} />
    ) : (
      <CheckIcon color={REACT_DOCTOR_GREEN_COLOR} sizePx={CHECK_ICON_SIZE_PX} />
    )}
  </div>
);

interface ChecksCardProps {
  state: "pending" | "fail" | "pass";
  spinnerRotationDeg?: number;
}

export const ChecksCard = ({ state, spinnerRotationDeg }: ChecksCardProps) => (
  <div style={{ ...cardBaseStyle, justifyContent: "center" }}>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: ROW_GAP_PX,
        paddingTop: CARD_VERTICAL_PADDING_PX,
        paddingBottom: CARD_VERTICAL_PADDING_PX,
        paddingLeft: CARD_HORIZONTAL_PADDING_PX,
        paddingRight: CARD_HORIZONTAL_PADDING_PX,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: ROW_GAP_PX }}>
        <StatusCircle state={state} spinnerRotationDeg={spinnerRotationDeg} />
        <span style={{ fontFamily: CARD_FONT, fontSize: BODY_FONT_SIZE_PX, color: INK_3_COLOR }}>
          {HEADLINE_BY_STATE[state]}
        </span>
      </div>

      <Divider />

      <div style={{ display: "flex", alignItems: "center", gap: ROW_GAP_PX }}>
        <ReactDoctorStatus state={state} spinnerRotationDeg={spinnerRotationDeg} />
        <span style={{ fontFamily: CARD_FONT, fontSize: BODY_FONT_SIZE_PX, color: INK_3_COLOR }}>
          React Doctor
        </span>
      </div>
    </div>
  </div>
);

const DiffPreview = () => (
  <div
    style={{
      position: "absolute",
      top: -1,
      left: CARD_HORIZONTAL_PADDING_PX,
      width: CARD_WIDTH_PX - CARD_HORIZONTAL_PADDING_PX * 2,
      backgroundColor: CARD_SURFACE_INSET_COLOR,
      border: `1px solid ${CARD_BORDER_COLOR}`,
      borderBottomLeftRadius: CARD_RADIUS_PX,
      borderTop: "none",
      padding: "28px 0 28px 36px",
      fontFamily,
      fontSize: 26,
      lineHeight: 1.6,
      overflow: "hidden",
    }}
  >
    <div style={{ color: CODE_COMMENT_COLOR, paddingLeft: 38 }}>return (</div>
    <DiffLine
      sign="-"
      gutterColor={DIFF_RED_GUTTER_COLOR}
      barColor={DIFF_RED_BAR_COLOR}
      strongColor={DIFF_RED_STRONG_COLOR}
      textColor={DIFF_RED_TEXT_COLOR}
      code="<motion.div"
    />
    <DiffLine
      sign="+"
      gutterColor={DIFF_GREEN_GUTTER_COLOR}
      barColor={DIFF_GREEN_BAR_COLOR}
      strongColor={DIFF_GREEN_STRONG_COLOR}
      textColor={DIFF_GREEN_TEXT_COLOR}
      code="<m.div"
    />
  </div>
);

interface DiffLineProps {
  sign: string;
  gutterColor: string;
  barColor: string;
  strongColor: string;
  textColor: string;
  code: string;
}

const DiffLine = ({ sign, gutterColor, barColor, strongColor, textColor, code }: DiffLineProps) => (
  <div
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 14,
      marginTop: 8,
      backgroundColor: barColor,
      borderTopLeftRadius: 4,
      borderBottomLeftRadius: 4,
      padding: "4px 0 4px 14px",
    }}
  >
    <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: gutterColor }} />
    <span style={{ color: textColor, opacity: 0.8 }}>{sign}</span>
    <span style={{ color: textColor, backgroundColor: strongColor, borderRadius: 4, padding: "0 4px" }}>
      {code}
    </span>
  </div>
);

const ReviewBadge = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "5px 16px",
      backgroundColor: CARD_SURFACE_COLOR,
      border: `1px solid ${CARD_BORDER_COLOR}`,
    }}
  >
    <span style={{ fontFamily: CARD_FONT, fontSize: BODY_FONT_SIZE_PX, color: INK_3_COLOR, whiteSpace: "pre" }}>
      {children}
    </span>
  </div>
);

const CodeReviewsCard = () => (
  <div style={cardBaseStyle}>
    <DiffPreview />

    <div style={{ height: 210, flexShrink: 0 }} />

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        paddingLeft: CARD_HORIZONTAL_PADDING_PX,
        paddingRight: CARD_HORIZONTAL_PADDING_PX,
        paddingBottom: CARD_VERTICAL_PADDING_PX,
      }}
    >
      <ReviewBadge>😞 -5</ReviewBadge>
      <ReviewBadge>{"⚠️  Issues found"}</ReviewBadge>
    </div>
  </div>
);

export const CommitResultCards = () => (
  <div style={{ display: "flex", alignItems: "stretch", gap: CARD_GAP_PX }}>
    <ChecksCard state="pass" />
    <CodeReviewsCard />
  </div>
);
