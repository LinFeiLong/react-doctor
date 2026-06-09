export const isSqlPath = (relativePath: string): boolean =>
  relativePath.endsWith(".sql") || /(?:^|\/)supabase\/(?:migrations|schemas)\//.test(relativePath);
