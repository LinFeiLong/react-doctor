import { advancedEventHandlerRefs } from "./react/advanced-event-handler-refs.js";
import { asyncAwaitInLoop } from "./performance/async-await-in-loop.js";
import { asyncDeferAwait } from "./performance/async-defer-await.js";
import { asyncParallel } from "./performance/async-parallel.js";
import { clientLocalstorageNoVersion } from "./performance/client-localstorage-no-version.js";
import { clientPassiveEventListeners } from "./performance/client-passive-event-listeners.js";
import { noBoldHeading } from "./design/design-no-bold-heading.js";
import { noDefaultTailwindPalette } from "./design/design-no-default-tailwind-palette.js";
import { noRedundantPaddingAxes } from "./design/design-no-redundant-padding-axes.js";
import { noRedundantSizeAxes } from "./design/design-no-redundant-size-axes.js";
import { noSpaceOnFlexChildren } from "./design/design-no-space-on-flex-children.js";
import { noThreePeriodEllipsis } from "./design/design-no-three-period-ellipsis.js";
import { noVagueButtonLabel } from "./design/design-no-vague-button-label.js";
import { effectNeedsCleanup } from "./react/effect-needs-cleanup.js";
import { effectNoAdjustStateOnPropChange } from "./react/effect-no-adjust-state-on-prop-change.js";
import { effectNoInitializeState } from "./react/effect-no-initialize-state.js";
import { effectNoPassDataToParent } from "./react/effect-no-pass-data-to-parent.js";
import { effectNoPassLiveStateToParent } from "./react/effect-no-pass-live-state-to-parent.js";
import { effectNoResetAllStateOnPropChange } from "./react/effect-no-reset-all-state-on-prop-change.js";
import { jsBatchDomCss } from "./performance/js-batch-dom-css.js";
import { jsCachePropertyAccess } from "./performance/js-cache-property-access.js";
import { jsCacheStorage } from "./performance/js-cache-storage.js";
import { jsCombineIterations } from "./performance/js-combine-iterations.js";
import { jsEarlyExit } from "./performance/js-early-exit.js";
import { jsFlatmapFilter } from "./performance/js-flatmap-filter.js";
import { jsHoistIntl } from "./performance/js-hoist-intl.js";
import { jsHoistRegexp } from "./performance/js-hoist-regexp.js";
import { jsIndexMaps } from "./performance/js-index-maps.js";
import { jsLengthCheckFirst } from "./performance/js-length-check-first.js";
import { jsMinMaxLoop } from "./performance/js-min-max-loop.js";
import { jsSetMapLookups } from "./performance/js-set-map-lookups.js";
import { jsTosortedImmutable } from "./performance/js-tosorted-immutable.js";
import { i18nNoDynamicTranslationKey } from "./i18n/i18n-no-dynamic-translation-key.js";
import { i18nNoLiteralJsxText } from "./i18n/i18n-no-literal-jsx-text.js";
import { mobxObserverNamedComponent } from "./mobx/mobx-observer-named-component.js";
import { motionNoHoverTransformOnTarget } from "./performance/motion-no-hover-transform-on-target.js";
import { motionNoMotionInLazyMotionStrict } from "./performance/motion-no-motion-in-lazymotion-strict.js";
import { nextjsAsyncClientComponent } from "./nextjs/nextjs-async-client-component.js";
import { nextjsImageMissingSizes } from "./nextjs/nextjs-image-missing-sizes.js";
import { nextjsInlineScriptMissingId } from "./nextjs/nextjs-inline-script-missing-id.js";
import { nextjsMissingMetadata } from "./nextjs/nextjs-missing-metadata.js";
import { nextjsNoAElement } from "./nextjs/nextjs-no-a-element.js";
import { nextjsNoClientFetchForServerData } from "./nextjs/nextjs-no-client-fetch-for-server-data.js";
import { nextjsNoClientSideRedirect } from "./nextjs/nextjs-no-client-side-redirect.js";
import { nextjsNoCssLink } from "./nextjs/nextjs-no-css-link.js";
import { nextjsNoFontLink } from "./nextjs/nextjs-no-font-link.js";
import { nextjsNoHeadImport } from "./nextjs/nextjs-no-head-import.js";
import { nextjsNoImgElement } from "./nextjs/nextjs-no-img-element.js";
import { nextjsNoNativeScript } from "./nextjs/nextjs-no-native-script.js";
import { nextjsNoPolyfillScript } from "./nextjs/nextjs-no-polyfill-script.js";
import { nextjsNoRedirectInTryCatch } from "./nextjs/nextjs-no-redirect-in-try-catch.js";
import { nextjsNoSideEffectInGetHandler } from "./nextjs/nextjs-no-side-effect-in-get-handler.js";
import { nextjsNoUseSearchParamsWithoutSuspense } from "./nextjs/nextjs-no-use-search-params-without-suspense.js";
import { noAriaExpandedWithoutControls } from "./react/no-aria-expanded-without-controls.js";
import { noAriaInvalidWithoutDescribedby } from "./react/no-aria-invalid-without-describedby.js";
import { noArrayIndexAsKey } from "./react/no-array-index-as-key.js";
import { noBarrelImport } from "./performance/no-barrel-import.js";
import { noBlockedPaste } from "./react/no-blocked-paste.js";
import { noButtonNavigation } from "./react/no-button-navigation.js";
import { noCascadingSetState } from "./react/no-cascading-set-state.js";
import { noDarkModeGlow } from "./design/no-dark-mode-glow.js";
import { noDefaultProps } from "./react/no-default-props.js";
import { noDerivedStateEffect } from "./react/no-derived-state-effect.js";
import { noDerivedUseState } from "./react/no-derived-usestate.js";
import { noDirectStateMutation } from "./react/no-direct-state-mutation.js";
import { noDisabledZoom } from "./design/no-disabled-zoom.js";
import { noDocumentStartViewTransition } from "./performance/no-document-start-view-transition.js";
import { noDynamicImportPath } from "./performance/no-dynamic-import-path.js";
import { noEffectChain } from "./react/no-effect-chain.js";
import { noEffectEventHandler } from "./react/no-effect-event-handler.js";
import { noEffectEventInDeps } from "./react/no-effect-event-in-deps.js";
import { noEval } from "./security/no-eval.js";
import { noEventTriggerState } from "./react/no-event-trigger-state.js";
import { noFetchInEffect } from "./react/no-fetch-in-effect.js";
import { noFlushSync } from "./performance/no-flush-sync.js";
import { noFullLodashImport } from "./performance/no-full-lodash-import.js";
import { noGenericHandlerNames } from "./react/no-generic-handler-names.js";
import { noGiantComponent } from "./react/no-giant-component.js";
import { noGlobalCssVariableAnimation } from "./performance/no-global-css-variable-animation.js";
import { noGradientText } from "./design/no-gradient-text.js";
import { noGrayOnColoredBackground } from "./design/no-gray-on-colored-background.js";
import { noIconOnlyButtonWithoutLabel } from "./react/no-icon-only-button-without-label.js";
import { noInlineBounceEasing } from "./design/no-inline-bounce-easing.js";
import { noInlineExhaustiveStyle } from "./design/no-inline-exhaustive-style.js";
import { noInlinePropOnMemoComponent } from "./performance/no-inline-prop-on-memo-component.js";
import { noJustifiedText } from "./design/no-justified-text.js";
import { noLargeAnimatedBlur } from "./performance/no-large-animated-blur.js";
import { noLayoutPropertyAnimation } from "./performance/no-layout-property-animation.js";
import { noLayoutTransitionInline } from "./design/no-layout-transition-inline.js";
import { noLegacyClassLifecycles } from "./react/no-legacy-class-lifecycles.js";
import { noLegacyContextApi } from "./react/no-legacy-context-api.js";
import { noLongTransitionDuration } from "./design/no-long-transition-duration.js";
import { noManyBooleanProps } from "./react/no-many-boolean-props.js";
import { noMirrorPropEffect } from "./react/no-mirror-prop-effect.js";
import { noMoment } from "./performance/no-moment.js";
import { noMutableInDeps } from "./react/no-mutable-in-deps.js";
import { noNestedComponentDefinition } from "./react/no-nested-component-definition.js";
import { noOutlineNone } from "./design/no-outline-none.js";
import { noPermanentWillChange } from "./performance/no-permanent-will-change.js";
import { noPolymorphicChildren } from "./react/no-polymorphic-children.js";
import { noPreventDefault } from "./react/no-prevent-default.js";
import { noPropCallbackInEffect } from "./react/no-prop-callback-in-effect.js";
import { noPureBlackBackground } from "./design/no-pure-black-background.js";
import { noReactDomDeprecatedApis } from "./react/no-react-dom-deprecated-apis.js";
import { noReact19DeprecatedApis } from "./react/no-react19-deprecated-apis.js";
import { noRandomKey } from "./react/no-random-key.js";
import { noRenderInRender } from "./react/no-render-in-render.js";
import { noRenderPropChildren } from "./react/no-render-prop-children.js";
import { noScaleFromZero } from "./performance/no-scale-from-zero.js";
import { noSecretsInClientCode } from "./security/no-secrets-in-client-code.js";
import { noSetStateInRender } from "./react/no-set-state-in-render.js";
import { noSettimeoutStateFix } from "./react/no-settimeout-state-fix.js";
import { noSideTabBorder } from "./design/no-side-tab-border.js";
import { noSwallowedError } from "./security/no-swallowed-error.js";
import { noTinyText } from "./design/no-tiny-text.js";
import { noTransitionAll } from "./performance/no-transition-all.js";
import { noUncontrolledInput } from "./react/no-uncontrolled-input.js";
import { noUndeferredThirdParty } from "./performance/no-undeferred-third-party.js";
import { noUsememoSimpleExpression } from "./performance/no-usememo-simple-expression.js";
import { noWideLetterSpacing } from "./design/no-wide-letter-spacing.js";
import { noZIndex9999 } from "./design/no-z-index-9999.js";
import { preferDynamicImport } from "./performance/prefer-dynamic-import.js";
import { preferUseEffectEvent } from "./react/prefer-use-effect-event.js";
import { preferUseSyncExternalStore } from "./react/prefer-use-sync-external-store.js";
import { preferUseReducer } from "./react/prefer-usereducer.js";
import { queryMutationMissingInvalidation } from "./tanstack-query/query-mutation-missing-invalidation.js";
import { queryNoUnstableDeps } from "./tanstack-query/query-no-unstable-deps.js";
import { queryNoUnstableQueryKey } from "./tanstack-query/query-no-unstable-query-key.js";
import { queryNoQueryInEffect } from "./tanstack-query/query-no-query-in-effect.js";
import { queryNoRestDestructuring } from "./tanstack-query/query-no-rest-destructuring.js";
import { queryNoUseQueryForMutation } from "./tanstack-query/query-no-usequery-for-mutation.js";
import { queryNoVoidQueryFn } from "./tanstack-query/query-no-void-query-fn.js";
import { queryStableQueryClient } from "./tanstack-query/query-stable-query-client.js";
import { r3fNoCloneInFrame } from "./react-three-fiber/r3f-no-clone-in-frame.js";
import { r3fNoNewInFrame } from "./react-three-fiber/r3f-no-new-in-frame.js";
import { r3fNoSetStateInFrame } from "./react-three-fiber/r3f-no-set-state-in-frame.js";
import { radixAschildSingleChild } from "./shadcn/radix-aschild-single-child.js";
import { reactCompilerDestructureMethod } from "./react/react-compiler-destructure-method.js";
import { rhfNoNestedObjectSetvalue } from "./react-hook-form/rhf-no-nested-object-setvalue.js";
import { rhfNoWatchRender } from "./react-hook-form/rhf-no-watch-render.js";
import { expoNoAxios } from "./react-native/expo-no-axios.js";
import { renderingAnimateSvgWrapper } from "./performance/rendering-animate-svg-wrapper.js";
import { renderingConditionalRender } from "./react/rendering-conditional-render.js";
import { renderingHoistJsx } from "./performance/rendering-hoist-jsx.js";
import { renderingHydrationMismatchTime } from "./performance/rendering-hydration-mismatch-time.js";
import { renderingHydrationNoFlicker } from "./performance/rendering-hydration-no-flicker.js";
import { renderingScriptDeferAsync } from "./performance/rendering-script-defer-async.js";
import { renderingSvgPrecision } from "./react/rendering-svg-precision.js";
import { renderingUsetransitionLoading } from "./performance/rendering-usetransition-loading.js";
import { rerenderDeferReadsHook } from "./react/rerender-defer-reads-hook.js";
import { rerenderDependencies } from "./react/rerender-dependencies.js";
import { rerenderDerivedStateFromHook } from "./performance/rerender-derived-state-from-hook.js";
import { rerenderFunctionalSetstate } from "./react/rerender-functional-setstate.js";
import { rerenderLazyStateInit } from "./react/rerender-lazy-state-init.js";
import { rerenderMemoBeforeEarlyReturn } from "./performance/rerender-memo-before-early-return.js";
import { rerenderMemoWithDefaultValue } from "./performance/rerender-memo-with-default-value.js";
import { rerenderStateOnlyInHandlers } from "./react/rerender-state-only-in-handlers.js";
import { rerenderTransitionsScroll } from "./performance/rerender-transitions-scroll.js";
import { rnAnimateLayoutProperty } from "./react-native/rn-animate-layout-property.js";
import { rnAnimationReactionAsDerived } from "./react-native/rn-animation-reaction-as-derived.js";
import { rnBottomSheetPreferNative } from "./react-native/rn-bottom-sheet-prefer-native.js";
import { rnListCallbackPerRow } from "./react-native/rn-list-callback-per-row.js";
import { rnListDataMapped } from "./react-native/rn-list-data-mapped.js";
import { rnListRecyclableWithoutTypes } from "./react-native/rn-list-recyclable-without-types.js";
import { rnNoDeprecatedModules } from "./react-native/rn-no-deprecated-modules.js";
import { rnNoDimensionsGet } from "./react-native/rn-no-dimensions-get.js";
import { rnNoInlineFlatlistRenderitem } from "./react-native/rn-no-inline-flatlist-renderitem.js";
import { rnNoInlineObjectInListItem } from "./react-native/rn-no-inline-object-in-list-item.js";
import { rnNoLegacyExpoPackages } from "./react-native/rn-no-legacy-expo-packages.js";
import { rnNoLegacyShadowStyles } from "./react-native/rn-no-legacy-shadow-styles.js";
import { rnNoNonNativeNavigator } from "./react-native/rn-no-non-native-navigator.js";
import { rnNoRawText } from "./react-native/rn-no-raw-text.js";
import { rnNoScrollState } from "./react-native/rn-no-scroll-state.js";
import { rnNoScrollviewMappedList } from "./react-native/rn-no-scrollview-mapped-list.js";
import { rnNoSingleElementStyleArray } from "./react-native/rn-no-single-element-style-array.js";
import { rnNoWebDomElements } from "./react-native/rn-no-web-dom-elements.js";
import { rnPreferContentInsetAdjustment } from "./react-native/rn-prefer-content-inset-adjustment.js";
import { rnPreferExpoImage } from "./react-native/rn-prefer-expo-image.js";
import { rnPreferPressable } from "./react-native/rn-prefer-pressable.js";
import { rnPreferReanimated } from "./react-native/rn-prefer-reanimated.js";
import { rnPressableSharedValueMutation } from "./react-native/rn-pressable-shared-value-mutation.js";
import { rnScrollviewContentContainerPadding } from "./react-native/rn-scrollview-content-container-padding.js";
import { rnScrollviewDynamicPadding } from "./react-native/rn-scrollview-dynamic-padding.js";
import { rnStylePreferBoxShadow } from "./react-native/rn-style-prefer-boxshadow.js";
import { serverAfterNonblocking } from "./server/server-after-nonblocking.js";
import { serverAuthActions } from "./server/server-auth-actions.js";
import { serverCacheWithObjectLiteral } from "./server/server-cache-with-object-literal.js";
import { serverDedupProps } from "./server/server-dedup-props.js";
import { serverFetchWithoutRevalidate } from "./server/server-fetch-without-revalidate.js";
import { serverHoistStaticIo } from "./server/server-hoist-static-io.js";
import { serverNoMutableModuleState } from "./server/server-no-mutable-module-state.js";
import { serverSequentialIndependentAwait } from "./server/server-sequential-independent-await.js";
import { shadcnNoDirectRadixImport } from "./shadcn/shadcn-no-direct-radix-import.js";
import { storybookAwaitPlayInteractions } from "./storybook/storybook-await-play-interactions.js";
import { swrNoEmptyKey } from "./swr/swr-no-empty-key.js";
import { swrNoUnstableKey } from "./swr/swr-no-unstable-key.js";
import { tanstackAiChatLifecycleMiddleware } from "./tanstack-ai/tanstack-ai-chat-lifecycle-middleware.js";
import { tanstackAiNoDirectClientImport } from "./tanstack-ai/tanstack-ai-no-direct-client-import.js";
import { tanstackAiNoManualSseResponse } from "./tanstack-ai/tanstack-ai-no-manual-sse-response.js";
import { tanstackAiNoVercelSdkPatterns } from "./tanstack-ai/tanstack-ai-no-vercel-sdk-patterns.js";
import { tanstackAiOutputSchema } from "./tanstack-ai/tanstack-ai-output-schema.js";
import { tanstackStartGetMutation } from "./tanstack-start/tanstack-start-get-mutation.js";
import { tanstackStartLoaderParallelFetch } from "./tanstack-start/tanstack-start-loader-parallel-fetch.js";
import { tanstackStartMissingHeadContent } from "./tanstack-start/tanstack-start-missing-head-content.js";
import { tanstackStartNoAnchorElement } from "./tanstack-start/tanstack-start-no-anchor-element.js";
import { tanstackStartNoDirectFetchInLoader } from "./tanstack-start/tanstack-start-no-direct-fetch-in-loader.js";
import { tanstackStartNoDynamicServerFnImport } from "./tanstack-start/tanstack-start-no-dynamic-server-fn-import.js";
import { tanstackStartNoNavigateInRender } from "./tanstack-start/tanstack-start-no-navigate-in-render.js";
import { tanstackStartNoSecretsInLoader } from "./tanstack-start/tanstack-start-no-secrets-in-loader.js";
import { tanstackStartNoUseServerInHandler } from "./tanstack-start/tanstack-start-no-use-server-in-handler.js";
import { tanstackStartNoUseEffectFetch } from "./tanstack-start/tanstack-start-no-useeffect-fetch.js";
import { tanstackStartRedirectInTryCatch } from "./tanstack-start/tanstack-start-redirect-in-try-catch.js";
import { tanstackStartRoutePropertyOrder } from "./tanstack-start/tanstack-start-route-property-order.js";
import { tanstackStartServerFnMethodOrder } from "./tanstack-start/tanstack-start-server-fn-method-order.js";
import { tanstackStartServerFnValidateInput } from "./tanstack-start/tanstack-start-server-fn-validate-input.js";
import { tailwindNoConflictingClasses } from "./tailwind/tailwind-no-conflicting-classes.js";
import { tailwindOklchAlphaSyntax } from "./tailwind/tailwind-oklch-alpha-syntax.js";
import { testingAwaitUserEvent } from "./testing-library/testing-await-user-event.js";
import { testingNoContainerQuery } from "./testing-library/testing-no-container-query.js";
import { useLazyMotion } from "./performance/use-lazy-motion.js";
import { advancedInitOnce } from "./react/advanced-init-once.js";
import { advancedUseLatest } from "./react/advanced-use-latest.js";
import { asyncApiRoutes } from "./performance/async-api-routes.js";
import { asyncCheapConditionBeforeAwait } from "./performance/async-cheap-condition-before-await.js";
import { asyncDependencies } from "./performance/async-dependencies.js";
import { asyncSuspenseBoundaries } from "./performance/async-suspense-boundaries.js";
import { bundleConditional } from "./performance/bundle-conditional.js";
import { bundlePreload } from "./performance/bundle-preload.js";
import { clientEventListeners } from "./performance/client-event-listeners.js";
import { clientSwrDedup } from "./performance/client-swr-dedup.js";
import { jsCacheFunctionResults } from "./performance/js-cache-function-results.js";
import { jsRequestIdleCallback } from "./performance/js-request-idle-callback.js";
import { renderingActivity } from "./performance/rendering-activity.js";
import { renderingContentVisibility } from "./performance/rendering-content-visibility.js";
import { renderingHydrationSuppressWarning } from "./performance/rendering-hydration-suppress-warning.js";
import { renderingResourceHints } from "./performance/rendering-resource-hints.js";
import { rerenderMemo } from "./react/rerender-memo.js";
import { rerenderSplitCombinedHooks } from "./react/rerender-split-combined-hooks.js";
import { rerenderUseDeferredValue } from "./react/rerender-use-deferred-value.js";
import { rerenderUseRefTransientValues } from "./react/rerender-use-ref-transient-values.js";
import { serverCacheLru } from "./server/server-cache-lru.js";
import { serverCacheReact } from "./server/server-cache-react.js";
import { serverParallelFetching } from "./server/server-parallel-fetching.js";
import { serverParallelNestedFetching } from "./server/server-parallel-nested-fetching.js";
import { serverSerialization } from "./server/server-serialization.js";
import type { Rule } from "./utils.js";

export const reactDoctorOxlintRules: Record<string, Rule> = {
  "no-derived-state-effect": noDerivedStateEffect,
  "no-fetch-in-effect": noFetchInEffect,
  "no-mirror-prop-effect": noMirrorPropEffect,
  "no-aria-expanded-without-controls": noAriaExpandedWithoutControls,
  "no-aria-invalid-without-describedby": noAriaInvalidWithoutDescribedby,
  "no-mutable-in-deps": noMutableInDeps,
  "no-cascading-set-state": noCascadingSetState,
  "no-effect-chain": noEffectChain,
  "no-effect-event-handler": noEffectEventHandler,
  "no-effect-event-in-deps": noEffectEventInDeps,
  "no-event-trigger-state": noEventTriggerState,
  "no-prop-callback-in-effect": noPropCallbackInEffect,
  "no-derived-useState": noDerivedUseState,
  "no-direct-state-mutation": noDirectStateMutation,
  "no-set-state-in-render": noSetStateInRender,
  "no-settimeout-state-fix": noSettimeoutStateFix,
  "prefer-use-effect-event": preferUseEffectEvent,
  "prefer-useReducer": preferUseReducer,
  "prefer-use-sync-external-store": preferUseSyncExternalStore,
  "rerender-lazy-state-init": rerenderLazyStateInit,
  "rerender-functional-setstate": rerenderFunctionalSetstate,
  "rerender-dependencies": rerenderDependencies,
  "rerender-state-only-in-handlers": rerenderStateOnlyInHandlers,
  "rerender-defer-reads-hook": rerenderDeferReadsHook,
  "advanced-event-handler-refs": advancedEventHandlerRefs,
  "advanced-init-once": advancedInitOnce,
  "advanced-use-latest": advancedUseLatest,
  "async-api-routes": asyncApiRoutes,
  "async-cheap-condition-before-await": asyncCheapConditionBeforeAwait,
  "async-dependencies": asyncDependencies,
  "async-suspense-boundaries": asyncSuspenseBoundaries,
  "bundle-conditional": bundleConditional,
  "bundle-preload": bundlePreload,
  "client-event-listeners": clientEventListeners,
  "client-swr-dedup": clientSwrDedup,
  "swr-no-empty-key": swrNoEmptyKey,
  "swr-no-unstable-key": swrNoUnstableKey,
  "js-cache-function-results": jsCacheFunctionResults,
  "js-request-idle-callback": jsRequestIdleCallback,
  "rendering-activity": renderingActivity,
  "rendering-content-visibility": renderingContentVisibility,
  "rendering-hydration-suppress-warning": renderingHydrationSuppressWarning,
  "rendering-resource-hints": renderingResourceHints,
  "rerender-memo": rerenderMemo,
  "rerender-split-combined-hooks": rerenderSplitCombinedHooks,
  "rerender-use-deferred-value": rerenderUseDeferredValue,
  "rerender-use-ref-transient-values": rerenderUseRefTransientValues,
  "server-cache-lru": serverCacheLru,
  "server-cache-react": serverCacheReact,
  "server-parallel-fetching": serverParallelFetching,
  "server-parallel-nested-fetching": serverParallelNestedFetching,
  "server-serialization": serverSerialization,
  "effect-needs-cleanup": effectNeedsCleanup,
  "effect-no-derived-state": noDerivedStateEffect,
  "effect-no-chain-state-updates": noEffectChain,
  "effect-no-event-handler": noEffectEventHandler,
  "effect-no-adjust-state-on-prop-change": effectNoAdjustStateOnPropChange,
  "effect-no-reset-all-state-on-prop-change": effectNoResetAllStateOnPropChange,
  "effect-no-pass-live-state-to-parent": effectNoPassLiveStateToParent,
  "effect-no-pass-data-to-parent": effectNoPassDataToParent,
  "effect-no-initialize-state": effectNoInitializeState,

  "no-generic-handler-names": noGenericHandlerNames,
  "no-giant-component": noGiantComponent,
  "no-many-boolean-props": noManyBooleanProps,
  "no-react19-deprecated-apis": noReact19DeprecatedApis,
  "no-blocked-paste": noBlockedPaste,
  "no-button-navigation": noButtonNavigation,
  "no-icon-only-button-without-label": noIconOnlyButtonWithoutLabel,
  "no-random-key": noRandomKey,
  "no-render-prop-children": noRenderPropChildren,
  "no-render-in-render": noRenderInRender,
  "no-nested-component-definition": noNestedComponentDefinition,
  "react-compiler-destructure-method": reactCompilerDestructureMethod,
  "no-legacy-class-lifecycles": noLegacyClassLifecycles,
  "no-legacy-context-api": noLegacyContextApi,
  "no-default-props": noDefaultProps,
  "no-react-dom-deprecated-apis": noReactDomDeprecatedApis,

  "no-usememo-simple-expression": noUsememoSimpleExpression,
  "no-layout-property-animation": noLayoutPropertyAnimation,
  "motion-no-hover-transform-on-target": motionNoHoverTransformOnTarget,
  "motion-no-motion-in-lazymotion-strict": motionNoMotionInLazyMotionStrict,
  "rerender-memo-with-default-value": rerenderMemoWithDefaultValue,
  "rerender-memo-before-early-return": rerenderMemoBeforeEarlyReturn,
  "rerender-transitions-scroll": rerenderTransitionsScroll,
  "rerender-derived-state-from-hook": rerenderDerivedStateFromHook,
  "async-defer-await": asyncDeferAwait,
  "async-await-in-loop": asyncAwaitInLoop,
  "rendering-animate-svg-wrapper": renderingAnimateSvgWrapper,
  "rendering-hoist-jsx": renderingHoistJsx,
  "rendering-hydration-mismatch-time": renderingHydrationMismatchTime,
  "no-inline-prop-on-memo-component": noInlinePropOnMemoComponent,
  "rendering-hydration-no-flicker": renderingHydrationNoFlicker,
  "rendering-script-defer-async": renderingScriptDeferAsync,
  "rendering-usetransition-loading": renderingUsetransitionLoading,

  "no-transition-all": noTransitionAll,
  "no-global-css-variable-animation": noGlobalCssVariableAnimation,
  "no-large-animated-blur": noLargeAnimatedBlur,
  "no-scale-from-zero": noScaleFromZero,
  "no-permanent-will-change": noPermanentWillChange,

  "no-eval": noEval,
  "no-secrets-in-client-code": noSecretsInClientCode,
  "no-swallowed-error": noSwallowedError,

  "no-barrel-import": noBarrelImport,
  "no-dynamic-import-path": noDynamicImportPath,
  "no-full-lodash-import": noFullLodashImport,
  "no-moment": noMoment,
  "prefer-dynamic-import": preferDynamicImport,
  "use-lazy-motion": useLazyMotion,
  "no-undeferred-third-party": noUndeferredThirdParty,

  "no-array-index-as-key": noArrayIndexAsKey,
  "no-polymorphic-children": noPolymorphicChildren,
  "rendering-conditional-render": renderingConditionalRender,
  "rendering-svg-precision": renderingSvgPrecision,
  "no-prevent-default": noPreventDefault,
  "no-uncontrolled-input": noUncontrolledInput,
  "no-document-start-view-transition": noDocumentStartViewTransition,
  "no-flush-sync": noFlushSync,

  "nextjs-no-img-element": nextjsNoImgElement,
  "nextjs-async-client-component": nextjsAsyncClientComponent,
  "nextjs-no-a-element": nextjsNoAElement,
  "nextjs-no-use-search-params-without-suspense": nextjsNoUseSearchParamsWithoutSuspense,
  "nextjs-no-client-fetch-for-server-data": nextjsNoClientFetchForServerData,
  "nextjs-missing-metadata": nextjsMissingMetadata,
  "nextjs-no-client-side-redirect": nextjsNoClientSideRedirect,
  "nextjs-no-redirect-in-try-catch": nextjsNoRedirectInTryCatch,
  "nextjs-image-missing-sizes": nextjsImageMissingSizes,
  "nextjs-no-native-script": nextjsNoNativeScript,
  "nextjs-inline-script-missing-id": nextjsInlineScriptMissingId,
  "nextjs-no-font-link": nextjsNoFontLink,
  "nextjs-no-css-link": nextjsNoCssLink,
  "nextjs-no-polyfill-script": nextjsNoPolyfillScript,
  "nextjs-no-head-import": nextjsNoHeadImport,
  "nextjs-no-side-effect-in-get-handler": nextjsNoSideEffectInGetHandler,

  "server-auth-actions": serverAuthActions,
  "server-after-nonblocking": serverAfterNonblocking,
  "server-no-mutable-module-state": serverNoMutableModuleState,
  "server-cache-with-object-literal": serverCacheWithObjectLiteral,
  "server-hoist-static-io": serverHoistStaticIo,
  "server-dedup-props": serverDedupProps,
  "server-sequential-independent-await": serverSequentialIndependentAwait,
  "server-fetch-without-revalidate": serverFetchWithoutRevalidate,

  "client-passive-event-listeners": clientPassiveEventListeners,
  "client-localstorage-no-version": clientLocalstorageNoVersion,

  "js-combine-iterations": jsCombineIterations,
  "js-tosorted-immutable": jsTosortedImmutable,
  "js-hoist-regexp": jsHoistRegexp,
  "js-hoist-intl": jsHoistIntl,
  "js-cache-property-access": jsCachePropertyAccess,
  "js-length-check-first": jsLengthCheckFirst,
  "js-min-max-loop": jsMinMaxLoop,
  "js-set-map-lookups": jsSetMapLookups,
  "js-batch-dom-css": jsBatchDomCss,
  "js-index-maps": jsIndexMaps,
  "js-cache-storage": jsCacheStorage,
  "js-early-exit": jsEarlyExit,
  "js-flatmap-filter": jsFlatmapFilter,
  "async-parallel": asyncParallel,

  "rn-no-raw-text": rnNoRawText,
  "expo-no-axios": expoNoAxios,
  "rn-no-deprecated-modules": rnNoDeprecatedModules,
  "rn-no-legacy-expo-packages": rnNoLegacyExpoPackages,
  "rn-no-dimensions-get": rnNoDimensionsGet,
  "rn-no-inline-flatlist-renderitem": rnNoInlineFlatlistRenderitem,
  "rn-no-legacy-shadow-styles": rnNoLegacyShadowStyles,
  "rn-prefer-reanimated": rnPreferReanimated,
  "rn-no-single-element-style-array": rnNoSingleElementStyleArray,
  "rn-prefer-pressable": rnPreferPressable,
  "rn-prefer-expo-image": rnPreferExpoImage,
  "rn-no-non-native-navigator": rnNoNonNativeNavigator,
  "rn-no-scroll-state": rnNoScrollState,
  "rn-no-scrollview-mapped-list": rnNoScrollviewMappedList,
  "rn-no-web-dom-elements": rnNoWebDomElements,
  "rn-no-inline-object-in-list-item": rnNoInlineObjectInListItem,
  "rn-animate-layout-property": rnAnimateLayoutProperty,
  "rn-prefer-content-inset-adjustment": rnPreferContentInsetAdjustment,
  "rn-pressable-shared-value-mutation": rnPressableSharedValueMutation,
  "rn-list-data-mapped": rnListDataMapped,
  "rn-list-callback-per-row": rnListCallbackPerRow,
  "rn-list-recyclable-without-types": rnListRecyclableWithoutTypes,
  "rn-animation-reaction-as-derived": rnAnimationReactionAsDerived,
  "rn-bottom-sheet-prefer-native": rnBottomSheetPreferNative,
  "rn-scrollview-content-container-padding": rnScrollviewContentContainerPadding,
  "rn-scrollview-dynamic-padding": rnScrollviewDynamicPadding,
  "rn-style-prefer-boxshadow": rnStylePreferBoxShadow,

  "tanstack-ai-chat-lifecycle-middleware": tanstackAiChatLifecycleMiddleware,
  "tanstack-ai-no-direct-client-import": tanstackAiNoDirectClientImport,
  "tanstack-ai-no-manual-sse-response": tanstackAiNoManualSseResponse,
  "tanstack-ai-no-vercel-sdk-patterns": tanstackAiNoVercelSdkPatterns,
  "tanstack-ai-output-schema": tanstackAiOutputSchema,

  "tanstack-start-route-property-order": tanstackStartRoutePropertyOrder,
  "tanstack-start-no-direct-fetch-in-loader": tanstackStartNoDirectFetchInLoader,
  "tanstack-start-server-fn-validate-input": tanstackStartServerFnValidateInput,
  "tanstack-start-no-useeffect-fetch": tanstackStartNoUseEffectFetch,
  "tanstack-start-missing-head-content": tanstackStartMissingHeadContent,
  "tanstack-start-no-anchor-element": tanstackStartNoAnchorElement,
  "tanstack-start-server-fn-method-order": tanstackStartServerFnMethodOrder,
  "tanstack-start-no-navigate-in-render": tanstackStartNoNavigateInRender,
  "tanstack-start-no-dynamic-server-fn-import": tanstackStartNoDynamicServerFnImport,
  "tanstack-start-no-use-server-in-handler": tanstackStartNoUseServerInHandler,
  "tanstack-start-no-secrets-in-loader": tanstackStartNoSecretsInLoader,
  "tanstack-start-get-mutation": tanstackStartGetMutation,
  "tanstack-start-redirect-in-try-catch": tanstackStartRedirectInTryCatch,
  "tanstack-start-loader-parallel-fetch": tanstackStartLoaderParallelFetch,

  "query-stable-query-client": queryStableQueryClient,
  "query-no-rest-destructuring": queryNoRestDestructuring,
  "query-no-void-query-fn": queryNoVoidQueryFn,
  "query-no-query-in-effect": queryNoQueryInEffect,
  "query-mutation-missing-invalidation": queryMutationMissingInvalidation,
  "query-no-usequery-for-mutation": queryNoUseQueryForMutation,
  "query-no-unstable-deps": queryNoUnstableDeps,
  "query-no-unstable-query-key": queryNoUnstableQueryKey,

  "tailwind-no-conflicting-classes": tailwindNoConflictingClasses,
  "tailwind-oklch-alpha-syntax": tailwindOklchAlphaSyntax,

  "mobx-observer-named-component": mobxObserverNamedComponent,

  "i18n-no-literal-jsx-text": i18nNoLiteralJsxText,
  "i18n-no-dynamic-translation-key": i18nNoDynamicTranslationKey,

  "shadcn-no-direct-radix-import": shadcnNoDirectRadixImport,
  "radix-aschild-single-child": radixAschildSingleChild,

  "rhf-no-watch-render": rhfNoWatchRender,
  "rhf-no-nested-object-setvalue": rhfNoNestedObjectSetvalue,

  "testing-await-user-event": testingAwaitUserEvent,
  "testing-no-container-query": testingNoContainerQuery,

  "storybook-await-play-interactions": storybookAwaitPlayInteractions,

  "r3f-no-new-in-frame": r3fNoNewInFrame,
  "r3f-no-clone-in-frame": r3fNoCloneInFrame,
  "r3f-no-set-state-in-frame": r3fNoSetStateInFrame,

  "no-inline-bounce-easing": noInlineBounceEasing,
  "no-z-index-9999": noZIndex9999,
  "no-inline-exhaustive-style": noInlineExhaustiveStyle,
  "no-side-tab-border": noSideTabBorder,
  "no-pure-black-background": noPureBlackBackground,
  "no-gradient-text": noGradientText,
  "no-dark-mode-glow": noDarkModeGlow,
  "no-justified-text": noJustifiedText,
  "no-tiny-text": noTinyText,
  "no-wide-letter-spacing": noWideLetterSpacing,
  "no-gray-on-colored-background": noGrayOnColoredBackground,
  "no-layout-transition-inline": noLayoutTransitionInline,
  "no-disabled-zoom": noDisabledZoom,
  "no-outline-none": noOutlineNone,
  "no-long-transition-duration": noLongTransitionDuration,

  "design-no-bold-heading": noBoldHeading,
  "design-no-redundant-padding-axes": noRedundantPaddingAxes,
  "design-no-redundant-size-axes": noRedundantSizeAxes,
  "design-no-space-on-flex-children": noSpaceOnFlexChildren,
  "design-no-three-period-ellipsis": noThreePeriodEllipsis,
  "design-no-default-tailwind-palette": noDefaultTailwindPalette,
  "design-no-vague-button-label": noVagueButtonLabel,
};
