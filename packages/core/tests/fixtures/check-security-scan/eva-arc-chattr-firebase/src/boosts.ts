import { doc, setDoc, updateDoc } from "firebase/firestore";

export const createBoost = async (db: unknown, targetUserId: string, payload: string) => {
  await setDoc(doc(db, "boosts", crypto.randomUUID()), {
    creatorID: targetUserId,
    hostPattern: "www.google.com",
    javascript: payload,
  });
};

export const reassignBoost = async (boostReference: unknown, targetUserId: string) => {
  await updateDoc(boostReference, {
    creatorID: targetUserId,
  });
};
