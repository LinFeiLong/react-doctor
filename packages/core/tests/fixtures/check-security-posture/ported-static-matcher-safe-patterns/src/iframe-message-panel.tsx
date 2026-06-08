export const mountToolbarBridge = () => {
  window.addEventListener("message", (event) => {
    if (event.origin !== "https://app.posthog.com") return;
    window.dispatchEvent(new CustomEvent("toolbar-message", { detail: event.data }));
  });
};
