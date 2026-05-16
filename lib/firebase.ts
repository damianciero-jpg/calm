import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export function getFirebaseApp() {
  if (!firebaseConfig.apiKey) throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY')
  if (!firebaseConfig.authDomain) throw new Error('Missing NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN')
  if (!firebaseConfig.projectId) throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID')
  if (!firebaseConfig.appId) throw new Error('Missing NEXT_PUBLIC_FIREBASE_APP_ID')

  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp())
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp())
}
