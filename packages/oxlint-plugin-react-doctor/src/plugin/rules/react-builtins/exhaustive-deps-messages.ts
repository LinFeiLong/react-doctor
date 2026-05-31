// User-facing diagnostic strings emitted by the `exhaustive-deps` rule.
// Kept beside the rule (same bucket directory) so authors editing
// wording don't need to scroll past 900 lines of analysis logic;
// otherwise behavior-neutral.

export const buildMissingDepMessage = (hookName: string, depName: string): string =>
  `\`${hookName}\` can run with a stale \`${depName}\` & show your users old data.`;

export const buildUnnecessaryDepMessage = (hookName: string, depName: string): string =>
  `\`${hookName}\` re-runs whenever \`${depName}\` changes even though it never uses it.`;

export const buildDuplicateDepMessage = (hookName: string, depName: string): string =>
  `\`${hookName}\` lists \`${depName}\` twice in its dependency array.`;

export const buildLiteralDepMessage = (hookName: string): string =>
  `A literal in \`${hookName}\`'s dependency array never changes & does nothing.`;

export const buildRefCurrentDepMessage = (hookName: string, depName: string): string =>
  `\`${hookName}\` won't re-run when \`${depName}\` changes because a ref's \`.current\` updates without a redraw.`;

export const buildNonArrayDepsMessage = (hookName: string): string =>
  `\`${hookName}\`'s dependencies can't be checked because its second argument isn't an inline array.`;

export const buildMissingDepArrayMessage = (hookName: string): string =>
  `\`${hookName}\` re-runs on every render with no dependency array.`;

export const buildMissingCallbackMessage = (hookName: string): string =>
  `\`${hookName}\` crashes without a function as its first argument.`;

export const buildEffectEventDepMessage = (depName: string): string =>
  `A function from \`useEffectEvent\` is stable & shouldn't sit in the dependency array.`;

export const buildSpreadDepMessage = (hookName: string): string =>
  `\`${hookName}\`'s dependencies can't be checked because of a spread in the array.`;

export const buildComplexDepMessage = (hookName: string): string =>
  `\`${hookName}\`'s dependencies can't be checked because of a complex expression in the array.`;

export const buildAsyncEffectMessage = (hookName: string): string =>
  `\`${hookName}\` was given an async function, so its cleanup breaks.`;

export const buildUnknownCallbackMessage = (hookName: string): string =>
  `\`${hookName}\`'s dependencies can't be checked because its function is defined elsewhere.`;

export const buildUnstableDepMessage = (hookName: string, depName: string): string =>
  `\`${depName}\` is rebuilt every render, so \`${hookName}\` runs every time.`;

export const buildSetStateWithoutDepsMessage = (hookName: string, setterName: string): string =>
  `\`${hookName}\` calls \`${setterName}\` with no dependency array, so it can loop forever & freeze the component.`;

export const buildRefCleanupMessage = (depName: string): string =>
  `Your cleanup can read the wrong node because the ref \`${depName}\` may have changed by the time it runs.`;

export const buildAssignmentMessage = (name: string): string =>
  `Assigning to \`${name}\` inside a hook is thrown away after each render.`;
