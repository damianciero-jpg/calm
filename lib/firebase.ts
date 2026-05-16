import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
}

const requiredFirebaseEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: firebaseConfig.apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: firebaseConfig.appId,
}

export function getMissingFirebaseEnvVars() {
  return Object.entries(requiredFirebaseEnv)
    .filter(([, value]) => !value)
    .map(([name]) => name)
}

export function assertFirebaseEnv() {
  const missing = getMissingFirebaseEnvVars()
  if (missing.length) {
    throw new Error(`Missing Firebase environment variables: ${missing.join(', ')}`)
  }
}

export function getFirebaseApp() {
  const missing = getMissingFirebaseEnvVars()
  if (missing.length && typeof window !== 'undefined') {
    console.error(`Missing Firebase environment variables: ${missing.join(', ')}`)
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

export const app = getFirebaseApp()
export const auth = (typeof window === 'undefined' ? null : getAuth(app)) as Auth
export const db = (typeof window === 'undefined' ? null : getFirestore(app)) as Firestore

export function getFirebaseAuth() {
  return getAuth(app)
}

export function getFirebaseDb() {
  return getFirestore(app)
}
