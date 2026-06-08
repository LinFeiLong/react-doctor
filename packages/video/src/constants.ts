import type { CheckItem, ChecksTiming } from "./types";

export const VIDEO_WIDTH_PX = 1920;
export const VIDEO_HEIGHT_PX = 1080;
export const VIDEO_FPS = 45;

export const GH_BACKGROUND_COLOR = "#010409";
export const GH_CANVAS_COLOR = "#0d1117";
export const GH_HEADER_BG_COLOR = "#161b22";
export const GH_BORDER_COLOR = "#30363d";
export const GH_TEXT_COLOR = "#e6edf3";
export const GH_MUTED_COLOR = "#8b949e";
export const GH_LINK_COLOR = "#4493f8";
export const GH_SUCCESS_GREEN_COLOR = "#238636";
export const GH_SUCCESS_RING_COLOR = "#3fb950";
export const GH_PENDING_AMBER_COLOR = "#d29922";
export const GH_CHECK_MARK_COLOR = "#ffffff";

export const GH_FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export const PR_NUMBER = "#726";
export const PR_BADGE_TEXT_COLOR = "#3fb950";
export const PR_BADGE_BG_COLOR = "#21262d";
export const PR_BADGE_ICON_SIZE_PX = 40;
export const PR_BADGE_FONT_SIZE_PX = 42;

export const CHECKS: CheckItem[] = [
  {
    name: "React Security",
    durationLabel: "2s",
    passScore: 96,
    failScore: 38,
    issues: [
      { path: "CartScreen.tsx", note: "unsanitized dangerouslySetInnerHTML" },
      { path: "auth/token.ts", note: "secret logged to console" },
      { path: "api/client.ts", note: "request sent over http" },
      { path: "LoginForm.tsx", note: "password kept in plain state" },
      { path: "share.ts", note: "eval on user input" },
    ],
    cleanFiles: [
      { path: "CartScreen.tsx", note: "HTML sanitized" },
      { path: "auth/token.ts", note: "no secrets logged" },
      { path: "api/client.ts", note: "https enforced" },
      { path: "LoginForm.tsx", note: "no plaintext secrets" },
      { path: "share.ts", note: "no eval on input" },
      { path: "Checkout.tsx", note: "no card data in state" },
      { path: "Webhook.ts", note: "signature verified" },
    ],
  },
  {
    name: "React Performance",
    durationLabel: "3s",
    passScore: 89,
    failScore: 51,
    issues: [
      { path: "FeedScreen.tsx", note: "list re-renders every row" },
      { path: "Avatar.tsx", note: "images reload on scroll" },
      { path: "Timeline.tsx", note: "O(n^2) filter in render" },
      { path: "Explore.tsx", note: "long list not virtualized" },
      { path: "Drawer.tsx", note: "animation runs on JS thread" },
      { path: "Comments.tsx", note: "handler recreated each render" },
      { path: "Search.tsx", note: "no debounce on input" },
      { path: "Home.tsx", note: "blocking work on mount" },
    ],
    cleanFiles: [
      { path: "FeedScreen.tsx", note: "list memoized" },
      { path: "Avatar.tsx", note: "images cached" },
      { path: "Timeline.tsx", note: "no O(n^2) in render" },
      { path: "Explore.tsx", note: "list virtualized" },
      { path: "Drawer.tsx", note: "animation on UI thread" },
      { path: "Comments.tsx", note: "stable handlers" },
      { path: "Search.tsx", note: "debounced input" },
    ],
  },
  {
    name: "React Slop check",
    durationLabel: "1s",
    passScore: 94,
    failScore: 36,
    issues: [
      { path: "Button.tsx", note: "AI-generated dead prop" },
      { path: "utils/helpers.ts", note: "hallucinated import path" },
      { path: "Feed.tsx", note: "unreachable code branch" },
      { path: "Gallery.tsx", note: "unused state setter" },
      { path: "Banner.tsx", note: "dead component, never imported" },
      { path: "Profile.tsx", note: "copy-pasted stale effect" },
      { path: "Modal.tsx", note: "magic number, no constant" },
      { path: "Card.tsx", note: "leftover console.log" },
      { path: "index.ts", note: "unused export" },
      { path: "Form.tsx", note: "TODO stub left by model" },
      { path: "Row.tsx", note: "duplicated component" },
      { path: "Toast.tsx", note: "empty catch block" },
    ],
    cleanFiles: [
      { path: "Button.tsx", note: "no dead props" },
      { path: "utils/helpers.ts", note: "imports resolve" },
      { path: "Feed.tsx", note: "no unreachable code" },
      { path: "Gallery.tsx", note: "no unused state" },
      { path: "Banner.tsx", note: "no dead components" },
      { path: "Profile.tsx", note: "fresh effect deps" },
      { path: "Modal.tsx", note: "no copy-paste" },
    ],
  },
];

export const PANEL_WIDTH_PX = 1560;
export const PANEL_RADIUS_PX = 20;
export const HEADER_ICON_SIZE_PX = 100;
export const ROW_ICON_SIZE_PX = 64;

export const SPINNER_DEG_PER_FRAME = 14;
export const ICON_POP_FRAMES = 9;
export const ICON_POP_SCALE = 1.3;

export const DETAIL_PANEL_HEIGHT_PX = 140;
export const FILE_ROW_HEIGHT_PX = 58;
export const DETAIL_FONT_SIZE_PX = 40;
export const DETAIL_CHECK_COLOR = "#3fb950";
export const GH_MONO_FONT_FAMILY = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

export const SCORE_RING_SIZE_PX = 92;
export const SCORE_RING_STROKE_PX = 10;
export const SCORE_RING_TRACK_COLOR = "#30363d";
export const SCORE_RING_COLOR = "#3fb950";
export const SCORE_RING_FAIL_COLOR = "#f85149";
export const SCORE_OVERALL_FONT_SIZE_PX = 46;

export const FAIL_RED_COLOR = "#f85149";
export const FAIL_ROW_TINT_COLOR = "rgba(248, 81, 73, 0.08)";

export const CLAUDE_ACCENT_COLOR = "#d77757";
export const CLAUDE_BACKGROUND_COLOR = "#010409";
export const CLAUDE_TEXT_COLOR = "#c9d1d9";
export const CLAUDE_MUTED_COLOR = "#6e7681";
export const CLAUDE_GREEN_COLOR = "#3fb950";
export const CLAUDE_FONT_SIZE_PX = 41;
export const CLAUDE_PROMPT = "fix the failing React Doctor checks";
export const CLAUDE_LOGO_LINE_1 = " \u2590\u259b\u2588\u2588\u2588\u259c\u258c";
export const CLAUDE_LOGO_LINE_2 = "\u259d\u259c\u2588\u2588\u2588\u2588\u2588\u259b\u2598";
export const CLAUDE_LOGO_LINE_3 = "  \u2598\u2598 \u259d\u259d";
export const CLAUDE_FIX_ROW_HEIGHT_PX = 62;
export const CLAUDE_VISIBLE_FIX_ROWS = 7;
export const CLAUDE_INTRO_FRAMES = 16;
export const CLAUDE_FIX_START_FRAME = 30;
export const CLAUDE_FIX_STAGGER_FRAMES = 4;
export const CLAUDE_FIX_FADE_FRAMES = 6;
export const CLAUDE_SCORE_START = 42;
export const CLAUDE_SCORE_END = 93;

const makeChecksTiming = (
  firstOpenFrame: number,
  slotFrames: number,
  scanFrames: number,
  expandFrames: number,
  scoreCountFrames: number,
  holdFrames: number,
): ChecksTiming => {
  const headerPassFrame = firstOpenFrame + (CHECKS.length - 1) * slotFrames + scanFrames + 2;
  return {
    firstOpenFrame,
    slotFrames,
    scanFrames,
    expandFrames,
    scoreCountFrames,
    headerPassFrame,
    durationFrames: headerPassFrame + holdFrames,
  };
};

export const CHECKS_FAIL_TIMING = makeChecksTiming(14, 46, 32, 13, 16, 44);
export const CHECKS_PASS_TIMING = makeChecksTiming(6, 24, 14, 9, 12, 38);

export const INTRO_WORDS = ["Introducing", "React", "Doctor", "for", "GitHub", "Actions"];
export const INTRO_TAIL_START_INDEX = 3;
export const INTRO_TITLE_FONT_SIZE_PX = 150;
export const INTRO_WORD_GAP_PX = 32;
export const INTRO_WORD_STAGGER_FRAMES = 5;
export const INTRO_WORD_ANIM_FRAMES = 14;
export const INTRO_WORD_RISE_PX = 32;
export const INTRO_SHIFT_START_FRAME = 40;
export const INTRO_PAN_FRAMES = 20;
export const INTRO_PAN_START_PX = 600;
export const INTRO_PAN_END_PX = -680;
export const INTRO_PAN_BLUR_MAX_PX = 26;

export const INTRO_INITIAL_BACKGROUND_COLOR = "#ffffff";
export const INTRO_INITIAL_TEXT_COLOR = "#010409";
export const INTRO_INVERTED_BACKGROUND_COLOR = "#010409";
export const INTRO_INVERTED_TEXT_COLOR = "#e6edf3";

export const TYPING_COMMAND_PREFIX = "npx ";
export const TYPING_COMMAND_TEXT = "react-doctor@latest";
export const TYPING_FONT_SIZE_PX = 104;
export const TYPING_CHAR_FRAMES = 2;
export const TYPING_CURSOR_BLINK_FRAMES = 16;
export const TYPING_INITIAL_DELAY_FRAMES = 6;
export const TYPING_POST_PAUSE_FRAMES = 28;

export const SCENE_INTRO_DURATION_FRAMES = 84;
export const SCENE_TYPING_DURATION_FRAMES =
  TYPING_INITIAL_DELAY_FRAMES + TYPING_COMMAND_TEXT.length * TYPING_CHAR_FRAMES + TYPING_POST_PAUSE_FRAMES;
export const SCENE_CLAUDE_DURATION_FRAMES = 162;

export const TOTAL_DURATION =
  SCENE_TYPING_DURATION_FRAMES +
  CHECKS_FAIL_TIMING.durationFrames +
  SCENE_CLAUDE_DURATION_FRAMES +
  CHECKS_PASS_TIMING.durationFrames;
