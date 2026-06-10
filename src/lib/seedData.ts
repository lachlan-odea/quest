/**
 * Seed / mock data templates used both by the in-app admin "seed" buttons and
 * the standalone scripts/seed.ts script.
 *
 * These are plain templates (no ids / eventId) — the services stamp those on
 * when writing to Firestore.
 */

import type { QuestDifficulty, StatusEffect, UpgradeType } from '@/types';
import { shortId } from './utils';

// -----------------------------------------------------------------------------
// Hidden quest templates
// -----------------------------------------------------------------------------

export interface QuestTemplate {
  title: string;
  description: string;
  difficulty: QuestDifficulty;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  {
    title: 'Start a Chant',
    description: 'Convince a stranger (not in your group) to start a chant.',
    difficulty: 'medium',
  },
  {
    title: 'Name Drop',
    description: "Get a stranger to say the groom's name out loud.",
    difficulty: 'easy',
  },
  {
    title: 'To the Groom!',
    description: 'Start a group toast that the whole party joins in on.',
    difficulty: 'easy',
  },
  {
    title: 'Dance-Off Champion',
    description: 'Win a dance-off against anyone, anywhere.',
    difficulty: 'hard',
  },
  {
    title: 'Spill the Tea',
    description: 'Get someone to tell an embarrassing story about the groom.',
    difficulty: 'medium',
  },
  {
    title: 'Phantom High-Fives',
    description: 'Secretly high-five every member of your team without them noticing the pattern.',
    difficulty: 'hard',
  },
  {
    title: 'Drip the Groom',
    description: 'Make the groom wear a ridiculous item for at least 15 minutes.',
    difficulty: 'medium',
  },
  {
    title: 'Matching Fits',
    description: 'Get a photo with a stranger wearing the same colour as you.',
    difficulty: 'easy',
  },
  {
    title: 'New Tradition',
    description: 'Start a harmless group tradition for the night that catches on.',
    difficulty: 'medium',
  },
  {
    title: 'Campaign for MVP',
    description: 'Get someone to formally nominate you for MVP of the night.',
    difficulty: 'medium',
  },
  {
    title: 'The Legend Grows',
    description: 'Convince a stranger that the groom is mildly famous. Get them to ask for a photo.',
    difficulty: 'legendary',
  },
  {
    title: 'Round on the House',
    description: 'Get someone outside the group to buy a round (or a single drink).',
    difficulty: 'hard',
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
  {
    name: 'Wingman Aura',
    description: '+2 Charisma for your next battle.',
    cost: 120,
    type: 'perk',
    effect: 'buff:charisma+2:1battle',
  },
  {
    name: 'Hydration Potion',
    description: 'Remove one debuff of your choice.',
    cost: 80,
    type: 'debuffRemoval',
    effect: 'removeDebuff',
  },
  {
    name: 'Main Character Energy',
    description: 'Reroll one failed battle roll.',
    cost: 150,
    type: 'perk',
    effect: 'rerollBattle',
  },
  {
    name: "Groom's Blessing",
    description: 'Bonus XP multiplier (x2) for your next completed quest.',
    cost: 200,
    type: 'perk',
    effect: 'questXpMultiplier:2',
    maxPurchases: 1,
  },
  {
    name: 'Iron Stomach',
    description: '+1 Constitution (permanent).',
    cost: 180,
    type: 'statBoost',
    effect: 'constitution+1',
    maxPurchases: 3,
  },
  {
    name: 'Silver Tongue',
    description: '+1 Charisma (permanent).',
    cost: 180,
    type: 'statBoost',
    effect: 'charisma+1',
    maxPurchases: 3,
  },
  {
    name: 'Lucky Dog',
    description: '+1 Luck (permanent).',
    cost: 180,
    type: 'statBoost',
    effect: 'luck+1',
    maxPurchases: 3,
  },
  {
    name: 'Party Legend',
    description: 'Unlock the prestigious "Party Legend" title.',
    cost: 300,
    type: 'title',
    effect: 'title:Party Legend',
    maxPurchases: 1,
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
    description: 'Lost a battle. -1 Dexterity until it wears off.',
    statDelta: { dexterity: -1 },
  },
  {
    label: 'Tongue Tied',
    description: 'Words are hard right now. -1 Charisma.',
    statDelta: { charisma: -1 },
  },
  {
    label: 'Heavy Eyelids',
    description: 'Fading fast. -1 Constitution.',
    statDelta: { constitution: -1 },
  },
  {
    label: 'Cursed Dice',
    description: 'The dice gods are displeased. -1 Luck.',
    statDelta: { luck: -1 },
  },
  {
    label: 'Must Wear the Hat',
    description: 'Decreed to wear a silly hat until your next win. No stat penalty, pure shame.',
  },
];

/** Build a fresh debuff instance (with id) from a random template. */
export function randomDebuff(): StatusEffect {
  const t = DEBUFF_TEMPLATES[Math.floor(Math.random() * DEBUFF_TEMPLATES.length)];
  return { id: shortId('debuff'), ...t };
}
