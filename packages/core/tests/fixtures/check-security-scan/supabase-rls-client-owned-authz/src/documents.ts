export const saveDocument = async (supabase: any, ownerId: string, orgId: string) => {
  return supabase.from("documents").upsert({
    ownerId,
    orgId,
    role: "admin",
    title: "Q4 plan",
  });
};
