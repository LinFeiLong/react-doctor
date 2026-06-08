interface FirestoreCollection {
  readonly doc: (documentId: string) => FirestoreDocument;
  readonly add: (value: Record<string, unknown>) => Promise<void>;
  readonly where: (field: string, operator: string, value: unknown) => FirestoreCollection;
  readonly limit: (count: number) => FirestoreCollection;
  readonly get: () => Promise<unknown>;
}

interface FirestoreDocument {
  readonly collection: (name: string) => FirestoreCollection;
}

interface FirestoreClient {
  readonly collection: (name: string) => FirestoreCollection;
}

export const inviteSupportOperator = async (db: FirestoreClient, providerId: string) => {
  await db.collection("orgs").doc("0").collection("users").add({
    email: "support@chattr.ai",
    providerId,
    ghostOrg: "0",
    role: "SuperAdmin",
    status: "active",
  });
};

export const loadCandidateSessions = (db: FirestoreClient, userId: string) => {
  return db.collection("sessions").where("userId", "==", userId).limit(10).get();
};
