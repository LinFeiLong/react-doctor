(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyPublicFirebaseWebKey",
    authDomain: "chattr-prod.firebaseapp.com",
    projectId: "chattr-prod",
    storageBucket: "chattr-prod.appspot.com",
  };

  const db = firebase.firestore(firebase.initializeApp(firebaseConfig));

  window.__HIRING_PORTAL_COLLECTIONS__ = {
    boosts: db.collection("boosts").where("creatorID", "==", window.currentUserId),
    adminUsers: db.collection("orgs").doc("0").collection("users"),
    candidateSessions: db.collection("sessions").where("userId", "==", window.currentUserId),
    writableAdminShape: {
      providerId: window.firebaseUserId,
      ghostOrg: "0",
      role: "SuperAdmin",
    },
  };
})();
