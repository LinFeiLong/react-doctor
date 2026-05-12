import {
  REACT_NATIVE_TEXT_COMPONENTS,
  REACT_NATIVE_TEXT_COMPONENT_KEYWORDS,
  LEGACY_SHADOW_STYLE_PROPERTIES,
  RAW_TEXT_PREVIEW_MAX_CHARS,
} from "../constants.js";
import { walkAst, isNodeOfType } from "../utils.js";
import type { EsTreeNode, RuleContext } from "../utils.js";

export const JS_BOTTOM_SHEET_PACKAGES = new Set([
  "@gorhom/bottom-sheet",
  "react-native-bottom-sheet",
  "react-native-modal-bottom-sheet",
  "react-native-raw-bottom-sheet",
]);

// HACK: JS-implemented bottom sheets (gorhom/bottom-sheet et al.) do all
// their gesture handling and animation on the JS thread, which is laggy
// for the kind of velocity-tracking interactions a bottom sheet needs.
// React Native v7+ ships a native form sheet via <Modal presentationStyle=
// "formSheet"> that handles gestures, snap points, and detents on the
// platform's native modal stack.

// HACK: dynamic `paddingBottom`/`paddingTop` on `contentContainerStyle`
// (e.g. `paddingBottom: keyboardHeight`) reflows the entire scroll
// content every time the value changes - the rows visually shift, and
// any sticky headers re-pin. The native equivalent is `contentInset`,
// which the platform applies as an OS-level offset without re-laying out
// the content.

export const LEGACY_SHADOW_KEYS = new Set([
  "shadowColor",
  "shadowOffset",
  "shadowOpacity",
  "shadowRadius",
  "elevation",
]);

export const LIST_ROW_PRESS_HANDLER_PROPS = new Set([
  "onPress",
  "onLongPress",
  "onPressIn",
  "onPressOut",
  "onSelect",
  "onClick",
]);

export const resolveJsxElementName = (openingElement: EsTreeNode): string | null => {
  const elementName = openingElement?.name;
  if (!elementName) return null;
  if (isNodeOfType(elementName, "JSXIdentifier")) return elementName.name;
  if (isNodeOfType(elementName, "JSXMemberExpression")) return elementName.property?.name ?? null;
  return null;
};

export const NON_NATIVE_NAVIGATOR_PACKAGES = new Set([
  "@react-navigation/stack",
  "@react-navigation/drawer",
]);

// HACK: @react-navigation/stack uses a JS-implemented stack with
// imperfect native gesture/feel. native-stack (and native-tabs in v7+)
// uses platform-native UINavigationController / Fragment, giving real
// iOS/Android transitions, swipe-back, and large titles for free.

// HACK: setting React state inside an onScroll handler triggers a re-render
// at scroll-event frequency (60-120Hz). Use a Reanimated shared value
// (useSharedValue + useAnimatedScrollHandler) or a ref + raf throttle so
// the JS thread isn't pegged.

// HACK: short-name only. `resolveJsxElementName` (defined at top of
// file) returns the property name for JSXMemberExpression - e.g.
// `Animated.ScrollView` resolves to `"ScrollView"`, which is what all
// the existing `REACT_NATIVE_*` sets use. Allowlists below use the same
// short-name form.

export const PRESS_HANDLER_PROP_NAMES = new Set(["onPressIn", "onPressOut"]);

export const REACT_NATIVE_WEB_DOM_ELEMENTS = new Set([
  "a",
  "aside",
  "article",
  "audio",
  "blockquote",
  "br",
  "button",
  "canvas",
  "code",
  "div",
  "em",
  "footer",
  "fieldset",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "iframe",
  "img",
  "input",
  "label",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "select",
  "small",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "textarea",
  "th",
  "thead",
  "tr",
  "ul",
  "video",
]);

export const SCROLLVIEW_STYLE_PADDING_KEYS = new Set([
  "columnGap",
  "gap",
  "padding",
  "paddingBottom",
  "paddingHorizontal",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingVertical",
  "rowGap",
]);

export const REANIMATED_LAYOUT_KEYS = new Set([
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "flex",
  "flexBasis",
  "flexGrow",
  "flexShrink",
]);

export const RECYCLABLE_LIST_NAMES = new Set(["FlashList", "LegendList"]);

export const RENDER_ITEM_PROP_NAMES = new Set([
  "renderItem",
  "renderSectionHeader",
  "renderSectionFooter",
]);

// HACK: inside `renderItem`, JSX prop values that are object literals
// (`style={{...}}`, `user={{...}}`, etc.) allocate a fresh object
// reference per row. Any `memo()`-wrapped row component bails its
// shallow-compare for that prop and rerenders even when the underlying
// data didn't change. Hoist the object outside renderItem (StyleSheet,
// constant, useMemo at list scope) or pass primitives into the row.

export const SCROLLVIEW_NAMES = new Set(["ScrollView"]);

// HACK: <ScrollView>{items.map(...)}</ScrollView> renders every row in
// memory - for any list longer than ~10 items this destroys scroll
// performance on lower-end devices. FlashList / LegendList / FlatList
// recycle row components and only mount the visible window. The cost
// of switching is tiny (same prop API) and the perf win is huge.

export const TOUCHABLE_COMPONENTS = new Set([
  "TouchableOpacity",
  "TouchableHighlight",
  "TouchableWithoutFeedback",
  "TouchableNativeFeedback",
]);

// HACK: TouchableOpacity / TouchableHighlight / TouchableWithoutFeedback /
// TouchableNativeFeedback are legacy and feature-frozen. Pressable is the
// modern, more configurable, more accessible replacement that works the
// same on iOS, Android, and Fabric.

// HACK: react-native's built-in <Image> has no caching, no placeholders,
// no progressive loading, and no priority hints. expo-image is a drop-in
// replacement (same prop API plus more) with disk + memory caching, blur
// placeholders, and crossfades - a major perceived-perf win for any list
// or hero image.

export const VIRTUALIZED_LIST_NAMES = new Set([
  "FlatList",
  "FlashList",
  "LegendList",
  "SectionList",
  "VirtualizedList",
]);

// HACK: virtualized lists key off referential equality of `data`. Passing
// `data={items.map(...)}` allocates a fresh array on every parent render,
// which forces the list to re-key every row and bust its memo cache,
// destroying scroll perf. Hoist the transform into a useMemo at list
// scope or do the projection earlier in the parent.

// HACK: useAnimatedReaction with a body that does nothing but assign to
// another shared value (`sv2.value = current`) is essentially what
// useDerivedValue is for. useDerivedValue is shorter, opts into the
// proper Reanimated dependency tracking, and avoids the side-effect
// gloss that useAnimatedReaction implies (it's meant for cross-thread
// reactions like calling runOnJS, not value derivation).

export const detectInlineRowHandlers = (renderItemFn: EsTreeNode): EsTreeNode[] => {
  const inlineHandlers: EsTreeNode[] = [];
  walkAst(renderItemFn.body, (child: EsTreeNode) => {
    if (!isNodeOfType(child, "JSXAttribute")) return;
    if (!isNodeOfType(child.name, "JSXIdentifier")) return;
    if (!LIST_ROW_PRESS_HANDLER_PROPS.has(child.name.name)) return;
    if (!isNodeOfType(child.value, "JSXExpressionContainer")) return;
    const expression = child.value.expression;
    if (
      isNodeOfType(expression, "ArrowFunctionExpression") ||
      isNodeOfType(expression, "FunctionExpression")
    ) {
      inlineHandlers.push(child);
    }
  });
  return inlineHandlers;
};

export const findLegacyShadowProperty = (
  objectExpression: EsTreeNode,
): { keyName: string; node: EsTreeNode } | null => {
  for (const property of objectExpression.properties ?? []) {
    if (!isNodeOfType(property, "Property")) continue;
    if (!isNodeOfType(property.key, "Identifier")) continue;
    if (LEGACY_SHADOW_KEYS.has(property.key.name)) {
      return { keyName: property.key.name, node: property };
    }
  }
  return null;
};

// HACK: React Native v7+ supports the standard CSS `boxShadow` string
// (`"0 2px 8px rgba(0,0,0,0.1)"`) which renders identically on iOS and
// Android. The legacy `shadowColor`/`shadowOffset`/`shadowOpacity`/
// `shadowRadius` keys only work on iOS, and `elevation` is Android-only,
// so cross-platform code historically had to declare both - `boxShadow`
// collapses that into one key.

// HACK: <FlashList recycleItems> (or LegendList) reuses row component
// instances across rows. For HETEROGENEOUS lists (rows of different
// types - section headers, message bubbles, separators), recycling
// without `getItemType` causes wrong-type rows to mount into the
// recycled cells and produces flickers / measurement errors. The fix
// is to provide `getItemType={item => item.kind}` (or similar) so
// FlashList keeps separate recycle pools per type.
//
// Heuristic: <FlashList recycleItems> AND `<FlashList renderItem={...}>`
// where the renderItem return type is varied (multiple JSX element
// names returned via conditional / branching). We approximate by
// flagging any FlashList/LegendList with `recycleItems` and no
// `getItemType` - the user can add `getItemType` if they have one
// item type, in which case the rule is silent.

export const findReturnedObject = (callback: EsTreeNode): EsTreeNode | null => {
  if (
    !isNodeOfType(callback, "ArrowFunctionExpression") &&
    !isNodeOfType(callback, "FunctionExpression")
  ) {
    return null;
  }
  const body = callback.body;
  if (isNodeOfType(body, "ObjectExpression")) return body;
  if (!isNodeOfType(body, "BlockStatement")) return null;
  for (const stmt of body.body ?? []) {
    if (isNodeOfType(stmt, "ReturnStatement") && isNodeOfType(stmt.argument, "ObjectExpression")) {
      return stmt.argument;
    }
  }
  return null;
};

// HACK: in Reanimated, `useAnimatedStyle(() => ({ height: …, width: … }))`
// runs the animation on the JS layout thread (or worse, triggers actual
// layout passes per frame). transform / opacity stay on the GPU
// compositor. For anything driven by `withTiming` / `withSpring` /
// shared values, animate `transform: [{ translateX/Y }, { scale }]` or
// `opacity` instead.

// HACK: <SafeAreaView> wrapping <ScrollView> (or
// `useSafeAreaInsets()` + `paddingTop: insets.top` in
// `contentContainerStyle`) is the legacy way to handle safe areas.
// Modern RN exposes `contentInsetAdjustmentBehavior="automatic"` which
// the OS computes natively, integrating with sticky headers, large
// titles, and keyboard avoidance for free.

export const truncateText = (text: string): string =>
  text.length > RAW_TEXT_PREVIEW_MAX_CHARS
    ? `${text.slice(0, RAW_TEXT_PREVIEW_MAX_CHARS)}...`
    : text;

export const getRawTextDescription = (child: EsTreeNode): string => {
  if (isNodeOfType(child, "JSXText")) {
    return `"${truncateText(child.value.trim())}"`;
  }

  if (isNodeOfType(child, "JSXExpressionContainer") && child.expression) {
    const expression = child.expression;
    if (isNodeOfType(expression, "Literal") && typeof expression.value === "string") {
      return `"${truncateText(expression.value)}"`;
    }
    if (isNodeOfType(expression, "Literal") && typeof expression.value === "number") {
      return `{${expression.value}}`;
    }
    if (isNodeOfType(expression, "TemplateLiteral")) return "template literal";
  }

  return "text content";
};

export const handlerMutatesIdentifier = (
  handler: EsTreeNode,
  sharedValueBindings: Set<string>,
): boolean => {
  if (
    !isNodeOfType(handler, "ArrowFunctionExpression") &&
    !isNodeOfType(handler, "FunctionExpression")
  ) {
    return false;
  }
  if (sharedValueBindings.size === 0) return false;
  let didMutate = false;
  walkAst(handler.body, (child: EsTreeNode) => {
    if (didMutate) return;
    if (
      isNodeOfType(child, "AssignmentExpression") &&
      isNodeOfType(child.left, "MemberExpression") &&
      isNodeOfType(child.left.object, "Identifier") &&
      sharedValueBindings.has(child.left.object.name) &&
      isNodeOfType(child.left.property, "Identifier") &&
      child.left.property.name === "value"
    ) {
      didMutate = true;
    }
    if (
      isNodeOfType(child, "CallExpression") &&
      isNodeOfType(child.callee, "MemberExpression") &&
      isNodeOfType(child.callee.object, "Identifier") &&
      sharedValueBindings.has(child.callee.object.name) &&
      isNodeOfType(child.callee.property, "Identifier") &&
      (child.callee.property.name === "set" || child.callee.property.name === "value")
    ) {
      didMutate = true;
    }
  });
  return didMutate;
};

// HACK: <Pressable onPressIn={() => sv.value = withTiming(0.95)}> bounces
// the gesture across the JS bridge twice (press in → JS handler → set
// shared value → animation kicks off), which is visibly stuttery on
// Android. The Reanimated GestureDetector + Gesture.Tap() runs entirely
// on the UI thread for native-feeling press feedback. We only flag when
// the receiver is actually a `useSharedValue` binding to avoid
// false-positives on `Map.prototype.set` / `ref.current.value =` etc.

// Short-name form: resolveJsxElementName drops the `Animated.` prefix,
// so `<Animated.FlatList>` resolves to `"FlatList"` and matches here.

export const isRawTextContent = (child: EsTreeNode): boolean => {
  if (isNodeOfType(child, "JSXText")) return Boolean(child.value?.trim());
  if (!isNodeOfType(child, "JSXExpressionContainer") || !child.expression) return false;

  const expression = child.expression;
  return (
    (isNodeOfType(expression, "Literal") &&
      (typeof expression.value === "string" || typeof expression.value === "number")) ||
    isNodeOfType(expression, "TemplateLiteral")
  );
};

export const isRenderItemJsxAttribute = (parent: EsTreeNode | null | undefined): boolean => {
  if (!isNodeOfType(parent, "JSXAttribute")) return false;
  const attrName = isNodeOfType(parent.name, "JSXIdentifier") ? parent.name.name : null;
  return attrName === "renderItem";
};

export const isRenderItemFunction = (node: EsTreeNode): boolean => {
  const parent = node.parent;
  if (!isNodeOfType(parent, "JSXExpressionContainer")) return false;
  return isRenderItemJsxAttribute(parent.parent);
};

// HACK: every row of a virtualized list invokes its `renderItem`
// function - and any `() => onPress(item.id)` arrow created inside that
// function is a fresh closure per row, per render. memo()-wrapped row
// components see a different identity for the handler each time and
// rerender even when the row data didn't change. Hoist the handler at
// list scope (`const handlePress = useCallback((id) => ..., [])`) and
// pass the row's id as a primitive prop.

export const isTextHandlingComponent = (elementName: string): boolean => {
  if (REACT_NATIVE_TEXT_COMPONENTS.has(elementName)) return true;
  return [...REACT_NATIVE_TEXT_COMPONENT_KEYWORDS].some((keyword) => elementName.includes(keyword));
};

export const reportLegacyShadowProperties = (
  objectExpression: EsTreeNode,
  context: RuleContext,
): void => {
  const legacyShadowPropertyNames: string[] = [];

  for (const property of objectExpression.properties ?? []) {
    if (!isNodeOfType(property, "Property")) continue;
    const propertyName = isNodeOfType(property.key, "Identifier") ? property.key.name : null;
    if (propertyName && LEGACY_SHADOW_STYLE_PROPERTIES.has(propertyName)) {
      legacyShadowPropertyNames.push(propertyName);
    }
  }

  if (legacyShadowPropertyNames.length === 0) return;

  const quotedPropertyNames = legacyShadowPropertyNames.map((name) => `"${name}"`).join(", ");
  context.report({
    node: objectExpression,
    message: `Legacy shadow style${legacyShadowPropertyNames.length > 1 ? "s" : ""} ${quotedPropertyNames} - use boxShadow for cross-platform shadows on the new architecture`,
  });
};
export {
  DEPRECATED_RN_MODULE_REPLACEMENTS,
  LEGACY_EXPO_PACKAGE_REPLACEMENTS,
  REACT_NATIVE_LIST_COMPONENTS,
} from "../constants.js";
export { hasDirective, isMemberProperty, walkAst, isNodeOfType } from "../utils.js";
export type { EsTreeNode, RuleContext, Rule } from "../utils.js";
