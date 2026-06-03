import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import {
  BACKGROUND_COLOR,
  OVERLAY_GRADIENT_BOTTOM_PADDING_PX,
  OVERLAY_GRADIENT_HEIGHT_PX,
  OVERLAY_GRADIENT_HORIZONTAL_PADDING_PX,
} from "../constants";
import { getBottomOverlayGradient } from "../utils/get-bottom-overlay-gradient";
import { ChecksCard } from "../components/commit-result-cards";
import { GithubComment } from "../components/github-comment";
import { fontFamily } from "../utils/font";

const COMMENT_WIDTH_PX = 1280;
const COMMENT_RISE_PX = 40;
const COMMENT_FADE_IN_START_FRAME = 10;
const COMMENT_FADE_IN_FRAMES = 14;
const COMMENT_GAP_PX = 48;
const COMMENT_STACK_TOP_PX = 300;
const COMMENT_SCROLL_START_FRAME = 0;
const COMMENT_SCROLL_PX_PER_FRAME = 9;

const REVIEW_COMMENTS = [
  {
    file: "FeedScreen.tsx:63",
    message:
      "This list re-renders every row on each state change, which is causing the dropped frames while scrolling. Memoize the row and pass a stable keyExtractor.",
    suggestionRemoved: "<FlatList data={items} renderItem={renderRow} />",
    suggestionAdded: "<FlatList data={items} renderItem={renderRow} keyExtractor={keyExtractor} />",
  },
  {
    file: "ProductCard.tsx:31",
    message:
      "Raw text rendered outside a <Text> component crashes on React Native. Wrap the value in <Text>.",
    suggestionRemoved: "{product.title}",
    suggestionAdded: "<Text>{product.title}</Text>",
  },
  {
    file: "Avatar.tsx:11",
    message:
      "react-native's <Image> has no caching, so avatars reload on every scroll. Switch to expo-image for disk and memory caching.",
    suggestionRemoved: "import { Image } from 'react-native'",
    suggestionAdded: "import { Image } from 'expo-image'",
  },
  {
    file: "Button.tsx:14",
    message:
      "TouchableOpacity is in legacy maintenance. Use <Pressable> for flexible, modern press feedback.",
    suggestionRemoved: "<TouchableOpacity onPress={onPress}>",
    suggestionAdded: "<Pressable onPress={onPress}>",
  },
  {
    file: "SplashScreen.tsx:24",
    message:
      "Animated from react-native runs on the JS thread and stutters. Drive this with react-native-reanimated so it runs on the UI thread.",
    suggestionRemoved: "import { Animated } from 'react-native'",
    suggestionAdded: "import Animated from 'react-native-reanimated'",
  },
];

const TITLE_FONT_SIZE_PX = 88;
const TITLE_FADE_IN_START_FRAME = 5;
const TITLE_FADE_IN_FRAMES = 12;
const TITLE_LOGO_SIZE_PX = 96;
const TITLE_LOGO_GAP_PX = 24;

const CHECKS_ENTRANCE_START_FRAME = 24;
const CHECKS_ENTRANCE_FRAMES = 16;
const CHECKS_FAIL_FRAME = 105;
const CHECKS_RISE_PX = 40;
const CHECKS_EDGE_PADDING_PX = 80;
const SPINNER_DEG_PER_FRAME = 14;

export const SimulatorPreview = () => {
  const frame = useCurrentFrame();

  const commentOpacity = interpolate(
    frame,
    [COMMENT_FADE_IN_START_FRAME, COMMENT_FADE_IN_START_FRAME + COMMENT_FADE_IN_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const commentTranslateY = interpolate(
    frame,
    [COMMENT_FADE_IN_START_FRAME, COMMENT_FADE_IN_START_FRAME + COMMENT_FADE_IN_FRAMES],
    [COMMENT_RISE_PX, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );

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

  const checksOpacity = interpolate(
    frame,
    [CHECKS_ENTRANCE_START_FRAME, CHECKS_ENTRANCE_START_FRAME + CHECKS_ENTRANCE_FRAMES],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const checksTranslateY = interpolate(
    frame,
    [CHECKS_ENTRANCE_START_FRAME, CHECKS_ENTRANCE_START_FRAME + CHECKS_ENTRANCE_FRAMES],
    [CHECKS_RISE_PX, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) },
  );
  const checksState = frame >= CHECKS_FAIL_FRAME ? "fail" : "pending";
  const spinnerRotationDeg = frame * SPINNER_DEG_PER_FRAME;

  const commentScrollY = Math.max(0, (frame - COMMENT_SCROLL_START_FRAME) * COMMENT_SCROLL_PX_PER_FRAME);

  return (
    <AbsoluteFill style={{ backgroundColor: BACKGROUND_COLOR, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          overflow: "hidden",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 16%, black 84%, transparent 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: COMMENT_STACK_TOP_PX,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: commentOpacity,
            transform: `translateY(${commentTranslateY - commentScrollY}px)`,
          }}
        >
          <div style={{ width: COMMENT_WIDTH_PX, display: "flex", flexDirection: "column", gap: COMMENT_GAP_PX }}>
            {REVIEW_COMMENTS.map((comment) => (
              <GithubComment
                key={comment.file}
                file={comment.file}
                message={comment.message}
                suggestionRemoved={comment.suggestionRemoved}
                suggestionAdded={comment.suggestionAdded}
              />
            ))}
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "flex-end",
          padding: CHECKS_EDGE_PADDING_PX,
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        <div style={{ opacity: checksOpacity, transform: `translateY(${checksTranslateY}px)` }}>
          <ChecksCard state={checksState} spinnerRotationDeg={spinnerRotationDeg} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "flex-start", pointerEvents: "none", zIndex: 50 }}>
        <div
          style={{
            width: "100%",
            height: OVERLAY_GRADIENT_HEIGHT_PX,
            background: getBottomOverlayGradient(titleOpacity).replace("to top", "to bottom"),
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: `${OVERLAY_GRADIENT_BOTTOM_PADDING_PX}px ${OVERLAY_GRADIENT_HORIZONTAL_PADDING_PX}px 0`,
          }}
        >
          <div
            style={{
              fontFamily,
              fontSize: TITLE_FONT_SIZE_PX,
              fontWeight: 400,
              color: "white",
              opacity: titleOpacity,
              textAlign: "center",
              lineHeight: 1.4,
              textShadow:
                "0 0 40px rgba(10,10,10,0.95), 0 0 80px rgba(10,10,10,0.9), 0 0 120px rgba(10,10,10,0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: TITLE_LOGO_GAP_PX,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: TITLE_LOGO_GAP_PX }}>
              Catch
              <Img
                src={staticFile("react-native-logo.png")}
                style={{ width: TITLE_LOGO_SIZE_PX, height: TITLE_LOGO_SIZE_PX, objectFit: "contain" }}
              />
              React
            </span>
            <span>bugs in CI</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
