export const isFirebaseRulesPath = (relativePath: string): boolean =>
  /(?:^|\/)(?:firestore\.rules|storage\.rules|database\.rules\.json)$/.test(relativePath);
