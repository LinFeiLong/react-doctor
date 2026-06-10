export const mountToolbarBridge = () => {
  window.addEventListener("message", (event) => {
    window.dispatchEvent(new CustomEvent("toolbar-message", { detail: event.data }));
  });
};
