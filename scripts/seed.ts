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
      divineFavourMode: 'winnerOnly',
      battleSettings: {
        victoryXp: 50,
        gloryXp: 100,
        statRollFallbackXp: 25,
        triggerDivineFavourForStatWinner: true,
        allowPlayerIssuedChallenges: true,
        requireAdminApproval: false,
        cooldownMinutesBetweenBattles: 15,
        allowDecline: true,
      },
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
      stamina: randStat(),
      rizz: randStat(),
      shenanigans: randStat(),
      vibes: randStat(),
    };
    const teamId = teamIds[i % teamIds.length];
    // Give the groom (player 0) an example title + active effect to show off
    // the Divine Favour system; everyone else starts clean.
    const exampleEffects =
      i === 0
        ? [
            {
              id: `fx_seed_${i}`,
              source: 'Divine Favour',
              name: 'Blessing of Apollo',
              description: '+2 Rizz for your next battle.',
              effects: [
                {
                  type: 'temporaryAttributeModifier',
                  attribute: 'rizz',
                  value: 2,
                  until: 'nextBattle',
                  description: '+2 Rizz for your next battle.',
                },
              ],
              createdAt: now,
            },
          ]
        : [];
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
      activeEffects: exampleEffects,
      titles: i === 0 ? ['Blessed of the Groom'] : [],
      divineFavourRollIds: [],
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

  // Example Divine Favour roll history (so the history screens aren't empty).
  {
    const batch = writeBatch(db);
    const examples = [
      {
        playerId: playerIds[0],
        roll: 19,
        resultName: 'Blessing of Apollo',
        resultDescription: 'The sun god lends you his charm.',
        triggeredGroomsBlessing: false,
      },
      {
        playerId: playerIds[1 % playerIds.length],
        roll: 8,
        resultName: 'Burden of Olympus',
        resultDescription: 'The weight of the gods presses on your next contest.',
        triggeredGroomsBlessing: false,
      },
      {
        playerId: playerIds[2 % playerIds.length],
        roll: 11,
        resultName: 'Fortune Smiles',
        resultDescription: 'A little luck lands in your lap.',
        triggeredGroomsBlessing: false,
      },
    ];
    examples.forEach((ex, idx) => {
      batch.set(doc(collection(db, 'divineFavourRolls')), {
        eventId,
        ...ex,
        effectsApplied: [],
        createdAt: now - (idx + 1) * 60_000,
      });
    });
    await batch.commit();
  }
  console.log('Created example Divine Favour roll history.');

  // Example completed battles (so history isn't empty) — covers a normal
  // victory with a different stat-roll winner, a Glory win, and a battle where
  // a debuff (Burden of Olympus, -2) dragged a roll down.
  {
    const roll = (
      playerId: string,
      attribute: string,
      d20: number,
      mod: number,
      activeMod = 0,
    ) => ({
      playerId,
      attribute,
      d20,
      attributeValue: 10 + mod * 2,
      attributeModifier: mod,
      activeModifier: activeMod,
      total: d20 + mod + activeMod,
      naturalRoll: d20,
    });
    const challenge = (attribute: string, title: string, instructions: string) => ({
      id: `chal_seed_${title.replace(/\s+/g, '').toLowerCase()}`,
      attribute,
      title,
      description: '',
      instructions,
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    });
    const base = (i: number, cId: string, dId: string, category: string) => ({
      eventId,
      challengerId: cId,
      defenderId: dId,
      challengerName: DEMO_NAMES[playerIds.indexOf(cId)] ?? 'Challenger',
      defenderName: DEMO_NAMES[playerIds.indexOf(dId)] ?? 'Defender',
      category,
      status: 'completed' as const,
      judgeMode: 'admin' as const,
      createdAt: now - (i + 1) * 5 * 60_000,
      completedAt: now - (i + 1) * 5 * 60_000 + 120_000,
    });

    const p = (i: number) => playerIds[i % playerIds.length];
    const batch = writeBatch(db);

    // 1) Normal victory — real-world winner p0, but the gods favoured p1.
    batch.set(doc(collection(db, 'battles')), {
      ...base(0, p(0), p(1), 'rizz'),
      challenge: challenge('rizz', 'Toast to the Groom', 'Each player delivers a toast. Best one wins.'),
      challengerRoll: roll(p(0), 'rizz', 12, 1),
      defenderRoll: roll(p(1), 'rizz', 18, 0),
      realWorldWinnerId: p(0),
      realWorldLoserId: p(1),
      statRollWinnerId: p(1),
      statRollLoserId: p(0),
      victoryXpAwarded: 50,
      divineFavourTriggeredForPlayerId: p(1),
    });

    // 2) Glory — p2 won the game AND the stat roll.
    batch.set(doc(collection(db, 'battles')), {
      ...base(1, p(2), p(3), 'shenanigans'),
      challenge: challenge('shenanigans', 'Invent & Pitch a Product', 'Pitch a ridiculous product. Best pitch wins.'),
      challengerRoll: roll(p(2), 'shenanigans', 17, 2),
      defenderRoll: roll(p(3), 'shenanigans', 9, 1),
      realWorldWinnerId: p(2),
      realWorldLoserId: p(3),
      statRollWinnerId: p(2),
      statRollLoserId: p(3),
      gloryWinnerId: p(2),
      gloryXpAwarded: 100,
      divineFavourTriggeredForPlayerId: p(2),
    });

    // 3) Debuff at work — p4's roll carries Burden of Olympus (-2).
    batch.set(doc(collection(db, 'battles')), {
      ...base(2, p(4), p(0), 'stamina'),
      challenge: challenge('stamina', 'Plank Challenge', 'Hold a plank. Last one up wins.'),
      challengerRoll: roll(p(4), 'stamina', 14, 1, -2),
      defenderRoll: roll(p(0), 'stamina', 11, 0),
      realWorldWinnerId: p(0),
      realWorldLoserId: p(4),
      statRollWinnerId: p(0),
      statRollLoserId: p(4),
      gloryWinnerId: p(0),
      gloryXpAwarded: 100,
      statRollXpAwarded: 25,
    });

    await batch.commit();
  }
  console.log('Created example battles.');

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
      recommendedAttribute: qt.recommendedAttribute ?? null,
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
