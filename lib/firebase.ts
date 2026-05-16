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

export function getFirebaseApp() {
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
