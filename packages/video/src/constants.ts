import type { ScannedIssue } from "./types";

export const VIDEO_WIDTH_PX = 1920;
export const VIDEO_HEIGHT_PX = 1080;
export const VIDEO_FPS = 30;

export const BACKGROUND_COLOR = "#0a0a0a";
export const TEXT_COLOR = "#d4d4d8";
export const MUTED_COLOR = "#737373";
export const RED_COLOR = "#f87171";
export const GREEN_COLOR = "#4ade80";
export const YELLOW_COLOR = "#eab308";

export const ERROR_ROW_BACKGROUND_COLOR = "rgba(127, 29, 29, 0.28)";
export const ERROR_BADGE_BACKGROUND_COLOR = "#dc2626";
export const ERROR_BADGE_TEXT_COLOR = "#fafafa";
export const WARNING_BADGE_BACKGROUND_COLOR = "#a16207";

export const FILE_ROW_HORIZONTAL_PADDING_PX = 24;
export const FILE_ROW_VERTICAL_PADDING_PX = 4;
export const FILE_ROW_GAP_PX = 24;
export const LINE_NUMBER_COLUMN_WIDTH_PX = 90;
export const SEVERITY_BADGE_SIZE_PX = 44;
export const SEVERITY_BADGE_RADIUS_PX = 6;
export const POINTS_LOST_COLUMN_WIDTH_PX = 140;
export const OVERLAY_GRADIENT_RGB = "10, 10, 10";
export const OVERLAY_GRADIENT_HEIGHT_PX = 400;
export const OVERLAY_GRADIENT_HORIZONTAL_PADDING_PX = 120;
export const OVERLAY_GRADIENT_BOTTOM_PADDING_PX = 80;
export const OVERLAY_GRADIENT_BOTTOM_ALPHA = 0.96;
export const OVERLAY_GRADIENT_MIDDLE_ALPHA = 0.85;
export const OVERLAY_GRADIENT_MIDDLE_STOP_PERCENT = 50;

export const COMMAND = "npx react-doctor@latest";
export const REACT_DOCTOR_URL = "https://react.doctor";
export const CONTENT_WIDTH_PX = 1400;

export const TYPING_FONT_SIZE_PX = 100;
export const TYPING_CHAR_WIDTH_PX = 60;
export const CHAR_FRAMES = 1;
export const CURSOR_BLINK_FRAMES = 16;
export const TYPING_INITIAL_DELAY_FRAMES = 10;
export const TYPING_POST_PAUSE_FRAMES = 24;
export const TYPING_PAN_THRESHOLD_PX = CONTENT_WIDTH_PX * 0.6;

export const FILE_SCAN_FONT_SIZE_PX = 48;
export const FRAMES_PER_FILE = 2;
export const FILE_SCAN_INITIAL_DELAY_FRAMES = 5;
export const FILE_SCAN_VISIBLE_ROWS = 14;
export const SCANNED_ISSUES: ScannedIssue[] = [
  { message: "Fix crash from unwrapped text", severity: "error", pointsLost: 5, file: "ProductCard.tsx:31" },
  { message: "Fix slow list scrolling", severity: "warning", pointsLost: 2, file: "SearchResults.tsx:18" },
  { message: "Fix janky animation", severity: "warning", pointsLost: 2, file: "SplashScreen.tsx:24" },
  { message: "Fix crash from rendering 0", severity: "error", pointsLost: 5, file: "CartScreen.tsx:47" },
  { message: "Fix slow list rendering", severity: "warning", pointsLost: 2, file: "InboxScreen.tsx:52" },
  { message: "Fix missing shadow", severity: "warning", pointsLost: 2, file: "ProductCard.tsx:9" },
  { message: "Fix laggy scrolling", severity: "error", pointsLost: 5, file: "FeedScreen.tsx:63" },
  { message: "Fix outdated button", severity: "warning", pointsLost: 2, file: "Button.tsx:14" },
  { message: "Fix slow list updates", severity: "warning", pointsLost: 2, file: "HomeScreen.tsx:71" },
  { message: "Fix crash from removed module", severity: "error", pointsLost: 5, file: "storage.ts:3" },
  { message: "Fix slow row rendering", severity: "warning", pointsLost: 2, file: "FeedScreen.tsx:58" },
  { message: "Fix slow image loading", severity: "warning", pointsLost: 2, file: "Avatar.tsx:11" },
  { message: "Fix extra layout nesting", severity: "warning", pointsLost: 2, file: "Screen.tsx:6" },
  { message: "Fix janky animation", severity: "error", pointsLost: 5, file: "Drawer.tsx:88" },
  { message: "Fix slow scrolling", severity: "warning", pointsLost: 2, file: "Notifications.tsx:33" },
  { message: "Fix slow list handlers", severity: "warning", pointsLost: 2, file: "ChatScreen.tsx:46" },
  { message: "Fix outdated dependency", severity: "warning", pointsLost: 2, file: "package.json:1" },
  { message: "Fix slow screen load", severity: "warning", pointsLost: 2, file: "IconButton.tsx:27" },
  { message: "Fix janky press feedback", severity: "warning", pointsLost: 2, file: "LikeButton.tsx:19" },
  { message: "Fix wasteful styling", severity: "warning", pointsLost: 2, file: "Row.tsx:12" },
  { message: "Fix broken rotation layout", severity: "warning", pointsLost: 2, file: "useLayout.ts:5" },
  { message: "Fix broken list rows", severity: "warning", pointsLost: 2, file: "Timeline.tsx:41" },
  { message: "Fix dead code in list", severity: "warning", pointsLost: 2, file: "ProductList.tsx:22" },
  { message: "Fix missing shadow", severity: "warning", pointsLost: 2, file: "ModalCard.tsx:17" },
  { message: "Fix non-native bottom sheet", severity: "warning", pointsLost: 2, file: "BottomSheet.tsx:13" },
  { message: "Fix non-native navigation", severity: "warning", pointsLost: 2, file: "App.tsx:29" },
  { message: "Fix stale animation value", severity: "warning", pointsLost: 2, file: "Parallax.tsx:36" },
  { message: "Fix list layout jump", severity: "warning", pointsLost: 2, file: "ScrollScreen.tsx:21" },
  { message: "Fix collapsing scroll view", severity: "warning", pointsLost: 2, file: "ScrollScreen.tsx:24" },
  { message: "Fix crash from unwrapped text", severity: "error", pointsLost: 5, file: "Badge.tsx:8" },
  { message: "Fix slow list scrolling", severity: "warning", pointsLost: 2, file: "Timeline.tsx:41" },
  { message: "Fix slow list rendering", severity: "warning", pointsLost: 2, file: "Followers.tsx:30" },
  { message: "Fix crash from rendering 0", severity: "error", pointsLost: 5, file: "Counter.tsx:15" },
  { message: "Fix janky animation", severity: "warning", pointsLost: 2, file: "Toast.tsx:22" },
  { message: "Fix outdated button", severity: "warning", pointsLost: 2, file: "TabBar.tsx:40" },
  { message: "Fix broken rotation layout", severity: "warning", pointsLost: 2, file: "Carousel.tsx:18" },
  { message: "Fix slow list updates", severity: "warning", pointsLost: 2, file: "Explore.tsx:44" },
  { message: "Fix slow row rendering", severity: "warning", pointsLost: 2, file: "Gallery.tsx:27" },
  { message: "Fix crash from removed module", severity: "error", pointsLost: 5, file: "clipboard.ts:2" },
  { message: "Fix wasteful styling", severity: "warning", pointsLost: 2, file: "Divider.tsx:7" },
  { message: "Fix janky press feedback", severity: "warning", pointsLost: 2, file: "Heart.tsx:21" },
  { message: "Fix dead code in list", severity: "warning", pointsLost: 2, file: "Followers.tsx:30" },
  { message: "Fix non-native navigation", severity: "warning", pointsLost: 2, file: "RootNavigator.tsx:11" },
  { message: "Fix janky animation", severity: "error", pointsLost: 5, file: "Accordion.tsx:52" },
  { message: "Fix missing shadow", severity: "warning", pointsLost: 2, file: "Card.tsx:14" },
  { message: "Fix slow list handlers", severity: "warning", pointsLost: 2, file: "Comments.tsx:38" },
  { message: "Fix broken list rows", severity: "warning", pointsLost: 2, file: "Explore.tsx:44" },
  { message: "Fix laggy scrolling", severity: "error", pointsLost: 5, file: "Header.tsx:34" },
  { message: "Fix slow screen load", severity: "warning", pointsLost: 2, file: "CloseButton.tsx:16" },
  { message: "Fix slow image loading", severity: "warning", pointsLost: 2, file: "Poster.tsx:13" },
  { message: "Fix slow scrolling", severity: "warning", pointsLost: 2, file: "Settings.tsx:48" },
  { message: "Fix non-native bottom sheet", severity: "warning", pointsLost: 2, file: "FilterSheet.tsx:9" },
  { message: "Fix stale animation value", severity: "warning", pointsLost: 2, file: "ScrollSync.tsx:25" },
  { message: "Fix missing shadow", severity: "warning", pointsLost: 2, file: "Sheet.tsx:31" },
  { message: "Fix crash from rendering 0", severity: "error", pointsLost: 5, file: "Inbox.tsx:19" },
  { message: "Fix list layout jump", severity: "warning", pointsLost: 2, file: "Feed.tsx:21" },
  { message: "Fix slow list scrolling", severity: "warning", pointsLost: 2, file: "Mentions.tsx:18" },
  { message: "Fix outdated button", severity: "warning", pointsLost: 2, file: "ListItem.tsx:22" },
  { message: "Fix crash from unwrapped text", severity: "error", pointsLost: 5, file: "PriceTag.tsx:11" },
  { message: "Fix slow list rendering", severity: "warning", pointsLost: 2, file: "Activity.tsx:35" },
  { message: "Fix wasteful styling", severity: "warning", pointsLost: 2, file: "Spacer.tsx:5" },
  { message: "Fix crash from removed module", severity: "error", pointsLost: 5, file: "netinfo.ts:4" },
  { message: "Fix slow row rendering", severity: "warning", pointsLost: 2, file: "Comments.tsx:38" },
  { message: "Fix broken rotation layout", severity: "warning", pointsLost: 2, file: "Lightbox.tsx:14" },
  { message: "Fix janky animation", severity: "warning", pointsLost: 2, file: "Ripple.tsx:18" },
  { message: "Fix dead code in list", severity: "warning", pointsLost: 2, file: "Activity.tsx:35" },
  { message: "Fix slow list updates", severity: "warning", pointsLost: 2, file: "Discover.tsx:51" },
  { message: "Fix slow screen load", severity: "warning", pointsLost: 2, file: "BackButton.tsx:13" },
  { message: "Fix janky press feedback", severity: "warning", pointsLost: 2, file: "Bookmark.tsx:21" },
];

export const DIAGNOSTIC_FONT_SIZE_PX = 28;
export const DIAGNOSTIC_LINE_HEIGHT = 1.7;
export const FRAMES_PER_DIAGNOSTIC = 4;
export const DIAGNOSTIC_INITIAL_DELAY_FRAMES = 15;
export const SCORE_PAUSE_FRAMES = 18;
export const SCORE_ANIMATION_FRAMES = 20;
export const POST_SCORE_PAUSE_FRAMES = 21;
export const TARGET_SCORE = 42;
export const PERFECT_SCORE = 100;
export const TOTAL_ERROR_COUNT = 22;
export const AFFECTED_FILE_COUNT = 18;
export const ELAPSED_TIME = "2.1s";
export const SCORE_BAR_WIDTH = 30;
export const SCORE_GOOD_THRESHOLD = 75;
export const SCORE_OK_THRESHOLD = 50;

export const DIAGNOSTICS = SCANNED_ISSUES.filter(
  (issue) => issue.severity === "error" || issue.severity === "warning",
);


export const FRAMES_PER_FIX = 20;
export const FIX_INITIAL_DELAY_FRAMES = 15;

export const SCENE_TYPING_DURATION_FRAMES = 115;
export const SCENE_FILE_SCAN_DURATION_FRAMES = 160;
export const SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES = 175;
export const SCENE_SCORE_REVEAL_DURATION_FRAMES = 110;
export const TRANSITION_DURATION_FRAMES = 15;

export const TOTAL_DURATION =
  SCENE_TYPING_DURATION_FRAMES +
  SCENE_FILE_SCAN_DURATION_FRAMES +
  SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES +
  SCENE_SCORE_REVEAL_DURATION_FRAMES -
  TRANSITION_DURATION_FRAMES * 2;
