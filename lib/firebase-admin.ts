import * as admin from "firebase-admin";

function getPrivateKey(): string {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) throw new Error("Missing env: FIREBASE_PRIVATE_KEY");
  // Cloud providers escape newlines as \n literals — undo that.
  return raw.replace(/\\n/g, "\n");
}

function initAdmin(): admin.app.App {
  // Guard against re-initialisation during Next.js hot-reloads
  // and across concurrent serverless invocations sharing the process.
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (!projectId) throw new Error("Missing env: FIREBASE_PROJECT_ID");
  if (!clientEmail) throw new Error("Missing env: FIREBASE_CLIENT_EMAIL");

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: getPrivateKey(),
    }),
    // Only needed if you use Realtime Database:
    // databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

let cachedApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App {
  if (!cachedApp) {
    cachedApp = initAdmin();
  }
  return cachedApp;
}

export function getAdminAuth(): admin.auth.Auth {
  return admin.auth(getAdminApp());
}

export function getAdminFirestore(): admin.firestore.Firestore {
  return admin.firestore(getAdminApp());
}

export function getAdminStorage(): admin.storage.Storage {
  return admin.storage(getAdminApp());
}
