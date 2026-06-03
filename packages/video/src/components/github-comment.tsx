import { Img, staticFile } from "remotion";
import { fontFamily } from "../utils/font";

const GH_BORDER_COLOR = "#30363d";
const GH_CANVAS_COLOR = "#0d1117";
const GH_HEADER_BG_COLOR = "#161b22";
const GH_TEXT_COLOR = "#e6edf3";
const GH_MUTED_COLOR = "#8b949e";
const GH_LINK_COLOR = "#4493f8";
const GH_SANS_FONT = "'Mona Sans', system-ui, -apple-system, sans-serif";

const COMMENT_RADIUS_PX = 12;
const HEADER_PADDING_PX = 18;
const BODY_PADDING_PX = 24;
const HEADER_GAP_PX = 12;
const AVATAR_SIZE_PX = 54;
const AVATAR_LOGO_SIZE_PX = 38;
const USERNAME_FONT_SIZE_PX = 34;
const BADGE_FONT_SIZE_PX = 24;
const META_FONT_SIZE_PX = 32;
const BODY_FONT_SIZE_PX = 38;
const SUGGESTION_FONT_SIZE_PX = 30;

const GH_DIFF_RED_BG_COLOR = "rgba(248, 81, 73, 0.15)";
const GH_DIFF_GREEN_BG_COLOR = "rgba(63, 185, 80, 0.15)";
const GH_DIFF_RED_TEXT_COLOR = "#ff9d96";
const GH_DIFF_GREEN_TEXT_COLOR = "#7ee787";

interface GithubCommentProps {
  file: string;
  message: string;
  suggestionRemoved?: string;
  suggestionAdded?: string;
}

const SuggestionLine = ({ sign, code, bgColor, textColor }: { sign: string; code: string; bgColor: string; textColor: string }) => (
  <div style={{ display: "flex", gap: 16, backgroundColor: bgColor, padding: "4px 20px" }}>
    <span style={{ color: textColor, width: "1ch", flexShrink: 0 }}>{sign}</span>
    <span style={{ color: textColor }}>{code}</span>
  </div>
);

export const GithubComment = ({ file, message, suggestionRemoved, suggestionAdded }: GithubCommentProps) => (
  <div
    style={{
      border: `1px solid ${GH_BORDER_COLOR}`,
      borderRadius: COMMENT_RADIUS_PX,
      overflow: "hidden",
      backgroundColor: GH_CANVAS_COLOR,
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: HEADER_GAP_PX,
        padding: `${HEADER_PADDING_PX}px ${HEADER_PADDING_PX + 4}px`,
        backgroundColor: GH_HEADER_BG_COLOR,
        borderBottom: `1px solid ${GH_BORDER_COLOR}`,
      }}
    >
      <div
        style={{
          width: AVATAR_SIZE_PX,
          height: AVATAR_SIZE_PX,
          flexShrink: 0,
          borderRadius: 10,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d1117",
          border: `1px solid ${GH_BORDER_COLOR}`,
        }}
      >
        <Img
          src={staticFile("react-native-logo.png")}
          style={{ width: AVATAR_LOGO_SIZE_PX, height: AVATAR_LOGO_SIZE_PX, objectFit: "contain" }}
        />
      </div>
      <span style={{ fontFamily: GH_SANS_FONT, fontWeight: 600, fontSize: USERNAME_FONT_SIZE_PX, color: GH_TEXT_COLOR }}>
        react-doctor
      </span>
      <span
        style={{
          fontFamily: GH_SANS_FONT,
          fontSize: BADGE_FONT_SIZE_PX,
          color: GH_MUTED_COLOR,
          border: `1px solid ${GH_BORDER_COLOR}`,
          borderRadius: 999,
          padding: "1px 12px",
        }}
      >
        bot
      </span>
      <span style={{ fontFamily: GH_SANS_FONT, fontSize: META_FONT_SIZE_PX, color: GH_MUTED_COLOR }}>
        {"commented on "}
        <span style={{ fontFamily, color: GH_LINK_COLOR }}>{file}</span>
      </span>
    </div>

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: `${BODY_PADDING_PX}px ${BODY_PADDING_PX}px`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          fontFamily: GH_SANS_FONT,
          fontSize: BODY_FONT_SIZE_PX,
          lineHeight: 1.5,
          color: GH_TEXT_COLOR,
        }}
      >
        <span style={{ flexShrink: 0 }}>⚠️</span>
        <span>{message}</span>
      </div>

      {suggestionRemoved && suggestionAdded && (
        <div
          style={{
            border: `1px solid ${GH_BORDER_COLOR}`,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 20px",
              backgroundColor: GH_HEADER_BG_COLOR,
              borderBottom: `1px solid ${GH_BORDER_COLOR}`,
              fontFamily: GH_SANS_FONT,
              fontSize: META_FONT_SIZE_PX,
              color: GH_MUTED_COLOR,
            }}
          >
            Suggested change
          </div>
          <div style={{ fontFamily, fontSize: SUGGESTION_FONT_SIZE_PX, lineHeight: 1.6, backgroundColor: GH_CANVAS_COLOR }}>
            <SuggestionLine sign="-" code={suggestionRemoved} bgColor={GH_DIFF_RED_BG_COLOR} textColor={GH_DIFF_RED_TEXT_COLOR} />
            <SuggestionLine sign="+" code={suggestionAdded} bgColor={GH_DIFF_GREEN_BG_COLOR} textColor={GH_DIFF_GREEN_TEXT_COLOR} />
          </div>
        </div>
      )}
    </div>
  </div>
);
