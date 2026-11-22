import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseAuth: Auth | null | undefined;

export function getFirebaseAuth(): Auth | null {
  if (firebaseAuth !== undefined) return firebaseAuth;
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) {
    firebaseAuth = null;
    return firebaseAuth;
  }
  const app = getApps().length ? getApp() : initializeApp(config);
  firebaseAuth = getAuth(app);
  return firebaseAuth;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}
