/**
 * Standalone seed script — creates a demo event with mock players, teams,
 * quests and the upgrade shop, so you can explore the app with real data.
 *
 * Usage (PowerShell):
 *   1) Ensure your .env has the Firebase config (same as the app).
 *   2) npm run seed
 *
 * Notes:
 *   - This signs in anonymously and creates the event with that uid as admin.
 *   - The admin PIN for the seeded event is printed at the end.
 *   - Prefer the in-app "Host a New Event" + "Seed" buttons for the real night;
 *     this script is mainly for local development / demos.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';

// seedData has no runtime Firebase imports (type-only imports are erased), so
// importing it here is safe outside the browser.
import {
  QUEST_TEMPLATES,
  UPGRADE_TEMPLATES,
  TEAM_TEMPLATES,
} from '../src/lib/seedData';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- Load .env manually (no extra dependency) -------------------------------
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    console.warn('No .env file found — relying on process env vars.');
  }
}
loadEnv();

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  console.error('Missing Firebase config. Fill in your .env first.');
  process.exit(1);
}

const QUEST_XP = { easy: 50, medium: 100, hard: 200, legendary: 400 } as const;
const DEMO_CLASSES = [
  'The Smooth Talker',
  'The Tank',
  'The Chaos Goblin',
  'The Hype Mage',
  "The Groom's Champion",
];
const DEMO_NAMES = ['Dave (Groom)', 'Macca', 'Smithy', 'Joey', 'Big Tone'];

function randStat() {
  // 4d6 drop lowest, inline.
  const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  return dice.sort((a, b) => a - b).slice(1).reduce((s, d) => s + d, 0);
}

async function main() {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const { user } = await signInAnonymously(auth);
  const now = Date.now();
  const pin = String(1000 + Math.floor(Math.random() * 9000));

  // Event
  const eventRef = await addDoc(collection(db, 'events'), {
    name: "Dave's Last Stand (Demo)",
    joinCode: 'DEMO1',
    adminPin: pin,
    adminUids: [user.uid],
    status: 'active',
    settings: {
      questXp: QUEST_XP,
      battleXpReward: 75,
      battleCooldownSeconds: 30,
      xpPerLevel: 300,
      battlesNeedApproval: false,
    },
    createdAt: now,
    updatedAt: now,
  });
  const eventId = eventRef.id;
  console.log(`Created event ${eventId} (join code DEMO1, admin PIN ${pin})`);

  // Teams
  const teamIds: string[] = [];
  {
    const batch = writeBatch(db);
    TEAM_TEMPLATES.slice(0, 2).forEach((t) => {
      const ref = doc(collection(db, 'teams'));
      teamIds.push(ref.id);
      batch.set(ref, {
        eventId,
        name: t.name,
        color: t.color,
        playerIds: [],
        xp: 0,
        createdAt: now,
      });
    });
    await batch.commit();
  }

  // Players (mock)
  const playerIds: string[] = [];
  for (let i = 0; i < DEMO_NAMES.length; i++) {
    const stats = {
      strength: randStat(),
      charisma: randStat(),
      constitution: randStat(),
      wisdom: randStat(),
      dexterity: randStat(),
      luck: randStat(),
    };
    const teamId = teamIds[i % teamIds.length];
    const ref = await addDoc(collection(db, 'players'), {
      eventId,
      authUid: `seed-${i}`,
      name: DEMO_NAMES[i],
      className: DEMO_CLASSES[i % DEMO_CLASSES.length],
      teamId,
      level: 1,
      xp: Math.floor(Math.random() * 250),
      spentXp: 0,
      stats,
      hasRolled: true,
      inventory: [],
      activeBuffs: [],
      activeDebuffs: [],
      assignedQuestIds: [],
      completedQuestIds: [],
      upgradeIds: [],
      lastBattleAt: null,
      createdAt: now,
      updatedAt: now,
    });
    playerIds.push(ref.id);
  }
  console.log(`Created ${playerIds.length} mock players.`);

  // Quests (assign first few to players)
  for (let i = 0; i < QUEST_TEMPLATES.length; i++) {
    const qt = QUEST_TEMPLATES[i];
    const assignedPlayerId = i < playerIds.length ? playerIds[i] : null;
    await addDoc(collection(db, 'quests'), {
      eventId,
      assignedPlayerId,
      assignedTeamId: null,
      title: qt.title,
      description: qt.description,
      difficulty: qt.difficulty,
      xpReward: QUEST_XP[qt.difficulty],
      status: assignedPlayerId ? 'assigned' : 'unassigned',
      hiddenFromOthers: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  console.log(`Created ${QUEST_TEMPLATES.length} quests.`);

  // Upgrades
  {
    const batch = writeBatch(db);
    UPGRADE_TEMPLATES.forEach((u) => {
      batch.set(doc(collection(db, 'upgrades')), { eventId, ...u });
    });
    await batch.commit();
  }
  console.log(`Created ${UPGRADE_TEMPLATES.length} upgrades.`);

  console.log('\n✅ Seed complete!');
  console.log(`   Join code: DEMO1`);
  console.log(`   Admin PIN: ${pin}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
