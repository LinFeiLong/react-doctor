import { useEffect, useRef, useState } from "react";

declare const fetchUserData: (userId: string) => Promise<{ id: string }>;
declare const processUserData: (data: { id: string }) => string;

// async-defer-await: await a value that the early return doesn't use.
export async function handleRequest(
  userId: string,
  skipProcessing: boolean,
): Promise<{ result: string } | { skipped: true }> {
  const userData = await fetchUserData(userId);
  if (skipProcessing) {
    return { skipped: true };
  }
  return { result: processUserData(userData) };
}

// rerender-state-only-in-handlers: setX called from a handler, x never
// referenced in JSX (transient/non-visual state).
export const TrackedScroller = () => {
  const [offset, setOffset] = useState(0);
  void offset;
  useEffect(() => {
    const onScroll = () => {
      setOffset(window.scrollY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // No reference to `offset` inside the returned JSX.
  return <div>Scroll handler attached</div>;
};

// client-localstorage-no-version: setItem with key that has no version
// delimiter.
export const persistPreferences = (prefs: { theme: "light" | "dark" }) => {
  localStorage.setItem("userPreferences", JSON.stringify(prefs));
};

// `useRouter` / `router.push("/welcome")` below were the trigger for
// `react-compiler-destructure-method`. That rule is currently in
// `RULE_IDS_TO_SKIP_REGISTRATION` in `scripts/generate-rule-registry
// .mjs`, so this block only fires `no-nested-component-definition` on
// `LoginLink`. Router scaffolding kept so re-enabling is a one-line
// change to the skiplist.
declare function useRouter(): {
  push: (path: string) => void;
  replace: (path: string) => void;
};

export const SignupForm = () => {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Regression seed for `react-compiler-destructure-method`: a
  // concise-arrow child component inside a block-body component used
  // to corrupt its per-component hook-binding stack and silently drop
  // the `router.push("/welcome")` diagnostic. Preserved in case the
  // rule comes back.
  const LoginLink = () => <a href="/login">Log in</a>;
  const handleClick = () => {
    router.push("/welcome");
  };
  return (
    <button ref={buttonRef} onClick={handleClick}>
      Sign up
      <LoginLink />
    </button>
  );
};
