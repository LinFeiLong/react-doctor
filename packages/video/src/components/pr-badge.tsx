import {
  GH_BORDER_COLOR,
  GH_FONT_FAMILY,
  PR_BADGE_BG_COLOR,
  PR_BADGE_FONT_SIZE_PX,
  PR_BADGE_ICON_SIZE_PX,
  PR_BADGE_TEXT_COLOR,
  PR_NUMBER,
} from "../constants";

export const PrBadge = () => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 28px",
      borderRadius: 999,
      backgroundColor: PR_BADGE_BG_COLOR,
      border: `1px solid ${GH_BORDER_COLOR}`,
    }}
  >
    <svg
      width={PR_BADGE_ICON_SIZE_PX}
      height={PR_BADGE_ICON_SIZE_PX}
      viewBox="0 0 16 16"
      fill={PR_BADGE_TEXT_COLOR}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
    </svg>
    <span style={{ fontFamily: GH_FONT_FAMILY, fontSize: PR_BADGE_FONT_SIZE_PX, fontWeight: 600, color: PR_BADGE_TEXT_COLOR }}>
      {PR_NUMBER}
    </span>
  </div>
);
