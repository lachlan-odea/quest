/**
 * Seed / mock data templates used both by the in-app admin "seed" buttons and
 * the standalone scripts/seed.ts script.
 *
 * These are plain templates (no ids / eventId) — the services stamp those on
 * when writing to Firestore.
 */

import type {
  QuestDifficulty,
  StatKey,
  StatusEffect,
  UpgradeType,
} from '@/types';
import { shortId } from './utils';

// -----------------------------------------------------------------------------
// Hidden quest templates
// -----------------------------------------------------------------------------

export interface QuestTemplate {
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  recommendedAttribute?: StatKey;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    title: 'Start a Chant',
    description: 'Convince a stranger (not in your group) to start a chant.',
    difficulty: 'medium',
    recommendedAttribute: 'rizz',
  },
  {
    title: 'Name Drop',
    description: "Get a stranger to say the groom's name out loud.",
    difficulty: 'easy',
    recommendedAttribute: 'rizz',
  },
  {
    title: 'To the Groom!',
    description: 'Start a group toast that the whole party joins in on.',
    difficulty: 'easy',
    recommendedAttribute: 'rizz',
  },
  {
    title: 'Dance-Off Champion',
    description: 'Win a dance-off against anyone, anywhere.',
    difficulty: 'hard',
    recommendedAttribute: 'vibes',
  },
  {
    title: 'Spill the Tea',
    description: 'Get someone to tell an embarrassing story about the groom.',
    difficulty: 'medium',
    recommendedAttribute: 'rizz',
  },
  {
    title: 'Phantom High-Fives',
    description: 'Secretly high-five every member of your team without them noticing the pattern.',
    difficulty: 'hard',
    recommendedAttribute: 'shenanigans',
  },
  {
    title: 'Drip the Groom',
    description: 'Make the groom wear a ridiculous item for at least 15 minutes.',
    difficulty: 'medium',
    recommendedAttribute: 'shenanigans',
  },
  {
    title: 'Matching Fits',
    description: 'Get a photo with a stranger wearing the same colour as you.',
    difficulty: 'easy',
    recommendedAttribute: 'vibes',
  },
  {
    title: 'New Tradition',
    description: 'Start a harmless group tradition for the night that catches on.',
    difficulty: 'medium',
    recommendedAttribute: 'shenanigans',
  },
  {
    title: 'Campaign for MVP',
    description: 'Get someone to formally nominate you for MVP of the night.',
    difficulty: 'medium',
    recommendedAttribute: 'rizz',
  },
  {
    title: 'The Legend Grows',
    description: 'Convince a stranger that the groom is mildly famous. Get them to ask for a photo.',
    difficulty: 'legendary',
    recommendedAttribute: 'rizz',
  },
  {
    title: 'Round on the House',
    description: 'Get someone outside the group to buy a round (or a single drink).',
    difficulty: 'hard',
    recommendedAttribute: 'vibes',
  },
  {
    title: 'Last One Standing',
    description: 'Out-last your whole team at the bar without tapping out early.',
    difficulty: 'hard',
    recommendedAttribute: 'stamina',
  },
];

// -----------------------------------------------------------------------------
// Upgrade / shop templates
// -----------------------------------------------------------------------------

export interface UpgradeTemplate {
  name: string;
  description: string;
  cost: number;
  type: UpgradeType;
  effect: string;
  maxPurchases?: number;
}

export const UPGRADE_TEMPLATES: UpgradeTemplate[] = [
  // --- Stamina ---------------------------------------------------------------
  {
    name: 'Iron Liver',
    description: '+1 Stamina (permanent).',
    cost: 180,
    type: 'statBoost',
    effect: 'stamina+1',
    maxPurchases: 3,
  },
  {
    name: 'Second Wind',
    description: 'Remove one stamina-related debuff of your choice.',
    cost: 80,
    type: 'debuffRemoval',
    effect: 'removeDebuff',
  },
  {
    name: 'Tavern Veteran',
    description: '+2 Stamina for your next battle.',
    cost: 120,
    type: 'perk',
    effect: 'buff:stamina+2:1battle',
  },
  // --- Rizz ------------------------------------------------------------------
  {
    name: 'Silver Tongue',
    description: '+1 Rizz (permanent).',
    cost: 180,
    type: 'statBoost',
    effect: 'rizz+1',
    maxPurchases: 3,
  },
  {
    name: "Bard's Blessing",
    description: '+2 Rizz for your next social challenge.',
    cost: 120,
    type: 'perk',
    effect: 'buff:rizz+2:1battle',
  },
  {
    name: 'Crowd Favourite',
    description: 'Bonus XP for leading a toast or a chant.',
    cost: 100,
    type: 'perk',
    effect: 'bonusXp:toastOrChant',
  },
  // --- Shenanigans -----------------------------------------------------------
  {
    name: 'Mastermind',
    description: '+1 Shenanigans (permanent).',
    cost: 180,
    type: 'statBoost',
    effect: 'shenanigans+1',
    maxPurchases: 3,
  },
  {
    name: 'Agent of Chaos',
    description: 'Bonus XP for completing a secret quest.',
    cost: 100,
    type: 'perk',
    effect: 'bonusXp:secretQuest',
  },
  {
    name: 'Trickster Supreme',
    description: 'Reroll one Shenanigans battle.',
    cost: 150,
    type: 'perk',
    effect: 'rerollBattle:shenanigans',
  },
  // --- Vibes -----------------------------------------------------------------
  {
    name: "Fortune's Favourite",
    description: '+1 Vibes (permanent).',
    cost: 180,
    type: 'statBoost',
    effect: 'vibes+1',
    maxPurchases: 3,
  },
  {
    name: 'Main Character Energy',
    description: 'Reroll one failed roll.',
    cost: 150,
    type: 'perk',
    effect: 'rerollBattle',
  },
  {
    name: 'Avatar of Chaos',
    description: 'Trigger a random bonus effect.',
    cost: 150,
    type: 'perk',
    effect: 'randomBonus',
  },
];

// -----------------------------------------------------------------------------
// Team templates (admin can rename / recolour later)
// -----------------------------------------------------------------------------

export interface TeamTemplate {
  name: string;
  color: string;
}

export const TEAM_TEMPLATES: TeamTemplate[] = [
  { name: 'Order of the Last Round', color: '#d4a531' },
  { name: 'Knights of the Round Table (for 12)', color: '#5b8fd6' },
  { name: 'The Hangover Guild', color: '#d9531e' },
  { name: 'House Groomsman', color: '#6db36d' },
];

// -----------------------------------------------------------------------------
// Funny temporary debuffs handed out to battle losers
// -----------------------------------------------------------------------------

export const DEBUFF_TEMPLATES: Omit<StatusEffect, 'id'>[] = [
  {
    label: 'Wobbly Legs',
    description: 'Lost a battle. -1 Stamina until it wears off.',
    statDelta: { stamina: -1 },
  },
  {
    label: 'Tongue Tied',
    description: 'Words are hard right now. -1 Rizz.',
    statDelta: { rizz: -1 },
  },
  {
    label: 'Brain Fog',
    description: "Can't scheme straight. -1 Shenanigans.",
    statDelta: { shenanigans: -1 },
  },
  {
    label: 'Bad Vibes',
    description: 'The universe has turned against you. -1 Vibes.',
    statDelta: { vibes: -1 },
  },
  {
    label: 'Must Wear the Hat',
    description: 'Decreed to wear a silly hat until your next win. No stat penalty, pure shame.',
  },
];

/**
 * Named behavioural debuffs (mythology themed) that an admin can hand out
 * manually, or that chaos events / quests can apply. Most carry no stat delta —
 * they are social/roleplay rules surfaced on the character sheet.
 */
export const DEBUFF_LIBRARY: Omit<StatusEffect, 'id'>[] = [
  {
    label: 'Curse of Echoes',
    description: 'For 10 minutes, repeat the last word of every sentence.',
  },
  {
    label: "Minotaur's Maze",
    description: 'You cannot challenge anyone until you complete a quest.',
  },
  {
    label: "Medusa's Glare",
    description: 'You may not make eye contact during your next battle.',
  },
  {
    label: 'Curse of Dionysus',
    description: 'You must accept the next challenge issued to you.',
  },
  {
    label: 'The Trojan Horse',
    description: 'A teammate secretly receives half of your next XP reward.',
  },
  {
    label: 'The Labours of Hercules',
    description: 'You must complete two quests before receiving XP again.',
  },
  {
    label: "The Oracle's Silence",
    description: 'You cannot initiate conversations for 15 minutes.',
  },
  {
    label: "The Siren's Call",
    description: 'Every time someone says "Groom", raise your drink.',
  },
  {
    label: "The Cyclops' Curse",
    description: "Your next battle must use your lowest attribute.",
  },
  {
    label: 'The Curse of Sisyphus',
    description: 'Your next completed quest awards only half XP.',
  },
  {
    label: "The Fates' Mockery",
    description:
      'Immediately roll again on the Divine Favour table and take the worse result.',
  },
];

/** Build a fresh debuff instance (with id) from a random template. */
export function randomDebuff(): StatusEffect {
  const t = DEBUFF_TEMPLATES[Math.floor(Math.random() * DEBUFF_TEMPLATES.length)];
  return { id: shortId('debuff'), ...t };
}

/** Build a debuff instance from a named template (admin assignment). */
export function debuffFromTemplate(t: Omit<StatusEffect, 'id'>): StatusEffect {
  return { id: shortId('debuff'), ...t };
}
