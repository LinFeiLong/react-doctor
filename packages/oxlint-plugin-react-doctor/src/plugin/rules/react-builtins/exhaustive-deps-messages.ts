// User-facing diagnostic strings emitted by the `exhaustive-deps` rule.
// Kept beside the rule (same bucket directory) so authors editing
// wording don't need to scroll past 900 lines of analysis logic;
// otherwise behavior-neutral.

export const buildMissingDepMessage = (hookName: string, depName: string): string =>
  `\`${hookName}\` uses \`${depName}\` but doesn't list it as a dependency, so it can run with an old value. Add \`${depName}\` to the array.`;

export const buildUnnecessaryDepMessage = (hookName: string, depName: string): string =>
  `\`${hookName}\` lists \`${depName}\` as a dependency, but the callback never uses it. Remove it.`;

export const buildDuplicateDepMessage = (hookName: string, depName: string): string =>
  `\`${hookName}\` lists \`${depName}\` twice. Remove the duplicate.`;

export const buildLiteralDepMessage = (hookName: string): string =>
  `\`${hookName}\` has a literal in its dependency array. Literals never change, so they do nothing here. Remove them.`;

export const buildRefCurrentDepMessage = (hookName: string, depName: string): string =>
  `\`${hookName}\` shouldn't list \`${depName}\` as a dependency. A ref's \`.current\` can change without a redraw, so depend on \`${depName.replace(/\.current$/, "")}\` itself instead.`;

export const buildNonArrayDepsMessage = (hookName: string): string =>
  `\`${hookName}\`'s second argument isn't an inline array, so the dependencies can't be checked. Write the array inline.`;

export const buildMissingDepArrayMessage = (hookName: string): string =>
  `\`${hookName}\` does nothing with just one argument. Pass a dependency array as the second argument.`;

export const buildMissingCallbackMessage = (hookName: string): string =>
  `\`${hookName}\` needs a function as its first argument.`;

export const buildEffectEventDepMessage = (depName: string): string =>
  `A function from \`useEffectEvent\` shouldn't be in the dependency array. Remove \`${depName}\` from the list.`;

export const buildSpreadDepMessage = (hookName: string): string =>
  `\`${hookName}\` has a spread in its dependency array, so the dependencies can't be checked. List each one out.`;

export const buildComplexDepMessage = (hookName: string): string =>
  `\`${hookName}\` has a complex expression in its dependency array. Pull it into its own variable so it can be checked.`;

export const buildAsyncEffectMessage = (hookName: string): string =>
  `\`${hookName}\` was given an async function. Put the async work in a function inside the effect instead.`;

export const buildUnknownCallbackMessage = (hookName: string): string =>
  `\`${hookName}\` was given a function whose dependencies can't be seen. Pass an inline function instead.`;

export const buildUnstableDepMessage = (hookName: string, depName: string): string =>
  `\`${depName}\` is rebuilt every render, so \`${hookName}\` runs every time. Move it inside the callback, or wrap it in \`useMemo\` / \`useCallback\`.`;

export const buildSetStateWithoutDepsMessage = (hookName: string, setterName: string): string =>
  `\`${hookName}\` calls \`${setterName}\`. Without a dependency array, this can loop forever. Add a dependency array.`;

export const buildRefCleanupMessage = (depName: string): string =>
  `The ref \`${depName}\` has probably changed by the time this cleanup runs. Copy it to a variable inside the callback and use that in cleanup.`;

export const buildAssignmentMessage = (name: string): string =>
  `Assigning to \`${name}\` inside a hook gets thrown away after each render. Store it in a ref to keep the value.`;
