export const restoreImagePreset = (metadata: { styles: string }) => {
  const restoredStyles = eval(metadata.styles);

  return Array.isArray(restoredStyles) ? restoredStyles : [];
};
