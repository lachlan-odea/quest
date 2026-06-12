/**
 * Firebase initialisation (modular SDK).
 *
 * Reads config from Vite env vars (see .env.example). Exposes the singleton
 * `app`, `auth` and `db` used by every service. Optionally wires up the local
 * emulators when VITE_USE_EMULATORS=true.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fail loudly in dev if the config is missing — a common first-run mistake.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // eslint-disable-next-line no-console
  console.error(
    '[firebase] Missing config. Copy .env.example to .env and fill in your ' +
      'Firebase web app values.',
  );
}

export const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  // eslint-disable-next-line no-console
  console.info('[firebase] Connected to local emulators.');
}

// Firestore collection names — single source of truth.
export const COLLECTIONS = {
  events: 'events',
  players: 'players',
  teams: 'teams',
  quests: 'quests',
  battles: 'battles',
  upgrades: 'upgrades',
  activityLog: 'activityLog',
  notifications: 'notifications',
  divineFavourRolls: 'divineFavourRolls',
} as const;
