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
  { message: "Array index used as key", severity: "error", pointsLost: 5, file: "UserList.tsx:14" },
  { message: "Component defined inside component", severity: "error", pointsLost: 5, file: "Dashboard.tsx:87" },
  { message: "Derived state in useEffect", severity: "error", pointsLost: 5, file: "Cart.tsx:23" },
  { message: "Missing cleanup in useEffect", severity: "error", pointsLost: 5, file: "Chat.tsx:41" },
  { message: "setState in useEffect without deps", severity: "error", pointsLost: 5, file: "Feed.tsx:19" },
  { message: "New object created every render", severity: "warning", pointsLost: 2, file: "Theme.tsx:8" },
  { message: "Inline function as prop", severity: "warning", pointsLost: 2, file: "Button.tsx:32" },
  { message: "useState synced from prop", severity: "error", pointsLost: 5, file: "Modal.tsx:11" },
  { message: "Unnecessary re-render detected", severity: "warning", pointsLost: 2, file: "Sidebar.tsx:55" },
  { message: "Missing error boundary", severity: "warning", pointsLost: 2, file: "App.tsx:1" },
  { message: "Large component (300+ lines)", severity: "warning", pointsLost: 2, file: "Settings.tsx:1" },
  { message: "Direct DOM mutation in component", severity: "error", pointsLost: 5, file: "Canvas.tsx:67" },
  { message: "Fetch in useEffect without race guard", severity: "error", pointsLost: 5, file: "Profile.tsx:29" },
  { message: "Context provider re-renders all consumers", severity: "warning", pointsLost: 2, file: "AuthProvider.tsx:18" },
  { message: "Stale closure in event handler", severity: "error", pointsLost: 5, file: "Editor.tsx:104" },
  { message: "Proper use of useMemo", severity: "ok", pointsLost: 0, file: "Table.tsx:42" },
  { message: "Correct key usage in list", severity: "ok", pointsLost: 0, file: "NavBar.tsx:26" },
  { message: "Clean effect cleanup", severity: "ok", pointsLost: 0, file: "Timer.tsx:15" },
  { message: "Server action missing auth check", severity: "error", pointsLost: 5, file: "deleteUser.ts:3" },
  { message: "Prop drilling through 4+ levels", severity: "warning", pointsLost: 2, file: "Layout.tsx:12" },
  { message: "useCallback with empty deps", severity: "ok", pointsLost: 0, file: "Search.tsx:31" },
  { message: "Suspense boundary in place", severity: "ok", pointsLost: 0, file: "page.tsx:7" },
  { message: "Lazy loading configured", severity: "ok", pointsLost: 0, file: "routes.tsx:4" },
  { message: "Accessible form labels", severity: "ok", pointsLost: 0, file: "LoginForm.tsx:19" },
  { message: "State reset on unmount", severity: "ok", pointsLost: 0, file: "Wizard.tsx:38" },
  { message: "Ref used for non-reactive value", severity: "ok", pointsLost: 0, file: "Video.tsx:22" },
  { message: "useEffect runs on every render", severity: "error", pointsLost: 5, file: "Tooltip.tsx:9" },
  { message: "Spreading props without filtering", severity: "warning", pointsLost: 2, file: "Input.tsx:5" },
  { message: "forwardRef used correctly", severity: "ok", pointsLost: 0, file: "Select.tsx:14" },
  { message: "Event handler recreated each render", severity: "warning", pointsLost: 2, file: "Card.tsx:47" },
  { message: "Deeply nested ternary in JSX", severity: "warning", pointsLost: 2, file: "Status.tsx:33" },
  { message: "Missing loading state for async data", severity: "warning", pointsLost: 2, file: "Posts.tsx:21" },
  { message: "useReducer for complex state", severity: "ok", pointsLost: 0, file: "Form.tsx:8" },
  { message: "Mutable ref for interval ID", severity: "ok", pointsLost: 0, file: "Countdown.tsx:11" },
  { message: "setState called during render", severity: "error", pointsLost: 5, file: "Filter.tsx:28" },
  { message: "Large bundle from barrel import", severity: "warning", pointsLost: 2, file: "index.ts:1" },
  { message: "Uncontrolled to controlled switch", severity: "error", pointsLost: 5, file: "Toggle.tsx:16" },
  { message: "Layout thrashing in useLayoutEffect", severity: "error", pointsLost: 5, file: "Resize.tsx:39" },
  { message: "Proper Suspense fallback", severity: "ok", pointsLost: 0, file: "loading.tsx:3" },
  { message: "Memo comparison function correct", severity: "ok", pointsLost: 0, file: "Row.tsx:52" },
  { message: "Async setState after unmount", severity: "error", pointsLost: 5, file: "Upload.tsx:44" },
  { message: "Missing key in Fragment list", severity: "error", pointsLost: 5, file: "Tabs.tsx:20" },
  { message: "Unnecessary useEffect for transform", severity: "warning", pointsLost: 2, file: "Price.tsx:13" },
  { message: "Portal used for modal overlay", severity: "ok", pointsLost: 0, file: "Dialog.tsx:7" },
  { message: "Stable callback ref pattern", severity: "ok", pointsLost: 0, file: "Measure.tsx:25" },
  { message: "Duplicate provider in tree", severity: "warning", pointsLost: 2, file: "layout.tsx:31" },
  { message: "String ref instead of createRef", severity: "error", pointsLost: 5, file: "Legacy.tsx:58" },
  { message: "Correct use of flushSync", severity: "ok", pointsLost: 0, file: "Scroll.tsx:36" },
  { message: "Hydration mismatch detected", severity: "error", pointsLost: 5, file: "page.tsx:1" },
  { message: "Proper error boundary fallback", severity: "ok", pointsLost: 0, file: "error.tsx:5" },
  { message: "Infinite loop in useEffect", severity: "error", pointsLost: 5, file: "Poll.tsx:17" },
  { message: "Object spread in dependency array", severity: "error", pointsLost: 5, file: "useFilters.ts:24" },
  { message: "Unmemoized context value", severity: "warning", pointsLost: 2, file: "CartProvider.tsx:9" },
  { message: "Conditional hook call", severity: "error", pointsLost: 5, file: "UserCard.tsx:12" },
  { message: "Proper key on sibling elements", severity: "ok", pointsLost: 0, file: "Menu.tsx:41" },
  { message: "useRef for previous value", severity: "ok", pointsLost: 0, file: "Diff.tsx:18" },
  { message: "Render prop causes re-mount", severity: "error", pointsLost: 5, file: "DataGrid.tsx:73" },
  { message: "Missing displayName on memo", severity: "warning", pointsLost: 2, file: "Badge.tsx:4" },
  { message: "Controlled input without onChange", severity: "error", pointsLost: 5, file: "Checkout.tsx:56" },
  { message: "Proper use of startTransition", severity: "ok", pointsLost: 0, file: "Search.tsx:48" },
  { message: "Effect depends on unstable reference", severity: "error", pointsLost: 5, file: "useSync.ts:31" },
  { message: "Correct children prop type", severity: "ok", pointsLost: 0, file: "Container.tsx:6" },
  { message: "useId for accessible labels", severity: "ok", pointsLost: 0, file: "Field.tsx:10" },
  { message: "Mutation inside render function", severity: "error", pointsLost: 5, file: "Summary.tsx:27" },
  { message: "Promise not handled in effect", severity: "warning", pointsLost: 2, file: "useFetch.ts:15" },
  { message: "Proper default props pattern", severity: "ok", pointsLost: 0, file: "Avatar.tsx:3" },
  { message: "Excessive re-renders from context", severity: "warning", pointsLost: 2, file: "ThemeToggle.tsx:22" },
  { message: "Missing aria attributes on button", severity: "warning", pointsLost: 2, file: "IconBtn.tsx:8" },
  { message: "useLayoutEffect in SSR component", severity: "error", pointsLost: 5, file: "Header.tsx:34" },
  { message: "Stable ref callback", severity: "ok", pointsLost: 0, file: "Popover.tsx:19" },
  { message: "Non-serializable value in state", severity: "warning", pointsLost: 2, file: "useMap.ts:7" },
  { message: "Proper list virtualization", severity: "ok", pointsLost: 0, file: "Feed.tsx:62" },
  { message: "dangerouslySetInnerHTML used safely", severity: "ok", pointsLost: 0, file: "Markdown.tsx:14" },
  { message: "Effect cleanup prevents memory leak", severity: "ok", pointsLost: 0, file: "Socket.tsx:28" },
  { message: "Throwing in render without boundary", severity: "error", pointsLost: 5, file: "Detail.tsx:45" },
  { message: "Synthetic event accessed async", severity: "error", pointsLost: 5, file: "Dropdown.tsx:37" },
  { message: "Fragment avoids extra DOM node", severity: "ok", pointsLost: 0, file: "List.tsx:9" },
  { message: "Debounced input handler", severity: "ok", pointsLost: 0, file: "Autocomplete.tsx:53" },
  { message: "State update on unmounted component", severity: "error", pointsLost: 5, file: "Notification.tsx:41" },
  { message: "Proper use of React.lazy", severity: "ok", pointsLost: 0, file: "routes.tsx:18" },
  { message: "Missing alt text on image", severity: "warning", pointsLost: 2, file: "Gallery.tsx:25" },
  { message: "Unnecessary wrapper div", severity: "warning", pointsLost: 2, file: "Panel.tsx:11" },
  { message: "Computed value not memoized", severity: "warning", pointsLost: 2, file: "Stats.tsx:30" },
  { message: "Proper form submission handling", severity: "ok", pointsLost: 0, file: "Register.tsx:22" },
  { message: "Correct use of useImperativeHandle", severity: "ok", pointsLost: 0, file: "Player.tsx:46" },
  { message: "Timer not cleared on unmount", severity: "error", pointsLost: 5, file: "Toast.tsx:16" },
  { message: "Optimistic update pattern correct", severity: "ok", pointsLost: 0, file: "Like.tsx:8" },
  { message: "Prop type mismatch at boundary", severity: "warning", pointsLost: 2, file: "Wrapper.tsx:35" },
  { message: "Effect fires twice in StrictMode", severity: "warning", pointsLost: 2, file: "Analytics.tsx:20" },
  { message: "Proper use of useDeferredValue", severity: "ok", pointsLost: 0, file: "Results.tsx:39" },
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

export const SCENE_TYPING_DURATION_FRAMES = 70;
export const SCENE_FILE_SCAN_DURATION_FRAMES = 80;
export const SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES = 310;
export const SCENE_SCORE_REVEAL_DURATION_FRAMES = 110;
export const TRANSITION_DURATION_FRAMES = 15;

export const TOTAL_DURATION =
  SCENE_TYPING_DURATION_FRAMES +
  SCENE_FILE_SCAN_DURATION_FRAMES +
  SCENE_DIAGNOSE_AND_FIX_DURATION_FRAMES +
  SCENE_SCORE_REVEAL_DURATION_FRAMES -
  TRANSITION_DURATION_FRAMES * 2;
