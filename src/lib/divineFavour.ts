/**
 * The Table of Divine Favour — a d20 roll table of punishments and blessings,
 * plus the legendary "Groom's Blessing" triggered by a double natural 20.
 *
 * This file is PURE DATA + lookup helpers (no Firestore). The rolling,
 * persistence and effect application live in services/divineFavourService.ts.
 *
 * Effect objects deliberately only include the keys they use — Firestore
 * rejects `undefined` values, so we never spell out optional keys we don't set.
 */

import type {
  DivineFavourResult,
  DivineFavourTier,
} from '@/types';

/**
 * The 20 results, indexed by `roll - 1`.
 * Tiers: 1–10 punishment, 11–17 minor blessing, 18–20 strong blessing.
 * (Legendary is reserved for the Groom's Blessing — see GROOMS_BLESSING.)
 */
export const DIVINE_FAVOUR_TABLE: DivineFavourResult[] = [
  {
    roll: 1,
    name: 'Wrath of Entropy',
    description: 'The Chaos God personally notices you.',
    tier: 'punishment',
    effects: [
      { type: 'xpLoss', value: 100, description: 'Lose 100 XP.' },
      { type: 'titleGrant', title: "Entropy's Chosen" },
      {
        type: 'battleRollModifier',
        value: -1,
        until: 'endOfNight',
        description: 'All battle rolls today are at -1.',
      },
    ],
  },
  {
    roll: 2,
    name: 'Curse of the Hangover Wraith',
    description: 'The Wraith clings to you until you prove yourself anew.',
    tier: 'punishment',
    effects: [
      {
        type: 'temporaryAttributeModifier',
        attribute: 'stamina',
        value: -2,
        until: 'questCompleted',
        description: '-2 Stamina until you complete a quest.',
      },
    ],
  },
  {
    roll: 3,
    name: "The Fool's Burden",
    description: 'You are now responsible for a sacred (silly) artefact.',
    tier: 'punishment',
    effects: [
      {
        type: 'socialPunishment',
        durationMinutes: 30,
        description:
          'Carry a designated object for 30 minutes. If you lose it, lose 50 XP.',
        metadata: {
          penaltyXp: 50,
          exampleObjects: ['rubber duck', 'toy horse', 'fake crown'],
        },
      },
    ],
  },
  {
    roll: 4,
    name: "The Bard's Tax",
    description: 'The muses demand payment before fortune flows again.',
    tier: 'punishment',
    effects: [
      {
        type: 'socialPunishment',
        until: 'manualClear',
        description:
          'Before receiving XP again you must sing, rap, or dramatically recite a toast.',
        metadata: { options: ['Sing', 'Rap', 'Dramatically recite a toast'] },
      },
    ],
  },
  {
    roll: 5,
    name: 'Voice of the Oracle',
    description: 'You speak only in riddles now.',
    tier: 'punishment',
    effects: [
      {
        type: 'socialPunishment',
        durationMinutes: 15,
        description: 'For 15 minutes, you may only speak in questions.',
      },
    ],
  },
  {
    roll: 6,
    name: 'Curse of the Swan',
    description: 'Grace demands tribute to the man of the hour.',
    tier: 'punishment',
    effects: [
      {
        type: 'socialPunishment',
        until: 'nextBattle',
        description: 'Before your next battle, publicly praise the Groom.',
      },
    ],
  },
  {
    roll: 7,
    name: "The Goblin's Accent",
    description: 'A goblin spirit takes up residence in your throat.',
    tier: 'punishment',
    effects: [
      {
        type: 'socialPunishment',
        durationMinutes: 15,
        description: 'Use a terrible accent for 15 minutes.',
      },
    ],
  },
  {
    roll: 8,
    name: 'Burden of Olympus',
    description: 'The weight of the gods presses on your next contest.',
    tier: 'punishment',
    effects: [
      {
        type: 'battleRollModifier',
        value: -2,
        until: 'nextBattle',
        description: '-2 on your next battle roll.',
      },
    ],
  },
  {
    roll: 9,
    name: 'The Lost Scroll',
    description: 'Your tricks of the trade have gone missing.',
    tier: 'punishment',
    effects: [
      {
        type: 'upgradeRestriction',
        until: 'nextBattle',
        description: 'You cannot use upgrades in your next battle.',
      },
    ],
  },
  {
    roll: 10,
    name: 'Dionysus Laughs',
    description: 'The god of revelry wants a show — and soon.',
    tier: 'punishment',
    effects: [
      {
        type: 'forcedChallenge',
        durationMinutes: 15,
        description: 'Challenge another player within 15 minutes or lose 25 XP.',
        metadata: { penaltyXp: 25 },
      },
    ],
  },
  {
    roll: 11,
    name: 'Fortune Smiles',
    description: 'A little luck lands in your lap.',
    tier: 'minorBlessing',
    effects: [{ type: 'xpGain', value: 25, description: 'Gain 25 XP.' }],
  },
  {
    roll: 12,
    name: 'Heroic Recovery',
    description: 'You shake off a lingering curse.',
    tier: 'minorBlessing',
    effects: [
      { type: 'removeDebuff', description: 'Remove one active debuff.' },
    ],
  },
  {
    roll: 13,
    name: "Traveller's Luck",
    description: 'The road favours the bold.',
    tier: 'minorBlessing',
    effects: [
      {
        type: 'temporaryAttributeModifier',
        attribute: 'vibes',
        value: 1,
        until: 'nextBattle',
        description: '+1 Vibes for your next battle.',
      },
    ],
  },
  {
    roll: 14,
    name: 'Gift of Confidence',
    description: 'You stand a little taller.',
    tier: 'minorBlessing',
    effects: [
      {
        type: 'temporaryAttributeModifier',
        attribute: 'rizz',
        value: 1,
        until: 'nextBattle',
        description: '+1 Rizz for your next battle.',
      },
    ],
  },
  {
    roll: 15,
    name: 'Clever Fox',
    description: 'A cunning idea takes shape.',
    tier: 'minorBlessing',
    effects: [
      {
        type: 'temporaryAttributeModifier',
        attribute: 'shenanigans',
        value: 1,
        until: 'nextBattle',
        description: '+1 Shenanigans for your next battle.',
      },
    ],
  },
  {
    roll: 16,
    name: 'Second Wind',
    description: 'You find a reserve of energy.',
    tier: 'minorBlessing',
    effects: [
      {
        type: 'temporaryAttributeModifier',
        attribute: 'stamina',
        value: 1,
        until: 'nextBattle',
        description: '+1 Stamina for your next battle.',
      },
    ],
  },
  {
    roll: 17,
    name: 'Favour of Hermes',
    description: 'The messenger god speeds your next quest.',
    tier: 'minorBlessing',
    effects: [
      {
        type: 'questXpModifier',
        value: 25,
        until: 'nextQuest',
        description: 'Complete your next quest for +25 bonus XP.',
      },
    ],
  },
  {
    roll: 18,
    name: 'Blessing of Athena',
    description: 'Wisdom and cunning flow through you.',
    tier: 'strongBlessing',
    effects: [
      {
        type: 'temporaryAttributeModifier',
        attribute: 'shenanigans',
        value: 2,
        until: 'nextBattle',
        description: '+2 Shenanigans for your next battle.',
      },
    ],
  },
  {
    roll: 19,
    name: 'Blessing of Apollo',
    description: 'The sun god lends you his charm.',
    tier: 'strongBlessing',
    effects: [
      {
        type: 'temporaryAttributeModifier',
        attribute: 'rizz',
        value: 2,
        until: 'nextBattle',
        description: '+2 Rizz for your next battle.',
      },
    ],
  },
  {
    roll: 20,
    name: 'Divine Intervention',
    description: 'The heavens open — choose your reward.',
    tier: 'strongBlessing',
    effects: [],
    choices: [
      {
        id: 'xp200',
        label: 'Gain 200 XP',
        effects: [{ type: 'xpGain', value: 200, description: 'Gain 200 XP.' }],
      },
      {
        id: 'freeUpgrade',
        label: 'Gain one free upgrade',
        effects: [
          { type: 'freeUpgrade', description: 'A free upgrade token to spend.' },
        ],
      },
      {
        id: 'cleanse',
        label: 'Remove all debuffs',
        effects: [
          { type: 'removeAllDebuffs', description: 'Clear every active debuff.' },
        ],
      },
      {
        id: 'teamXp',
        label: 'Grant your team 100 XP',
        effects: [
          { type: 'teamXpGain', value: 100, description: 'Your team gains 100 XP.' },
        ],
      },
      {
        id: 'autoWin',
        label: 'Auto-win your next stat roll',
        effects: [
          {
            type: 'autoWinNextStatRoll',
            until: 'nextBattle',
            description: 'Automatically win your next battle stat roll.',
          },
        ],
      },
    ],
  },
];

/** The legendary reward for rolling a natural 20 twice in a row. */
export const GROOMS_BLESSING: DivineFavourResult = {
  roll: 20,
  name: "The Bucks's Blessing",
  description:
    'Two natural 20s! The Groom himself blesses you with legendary fortune.',
  tier: 'legendary',
  effects: [
    { type: 'xpGain', value: 500, description: 'Gain 500 XP.' },
    { type: 'titleGrant', title: 'Blessed by the Buck' },
    {
      type: 'debuffImmunity',
      until: 'endOfNight',
      description: 'Immune to all debuffs for the rest of the night.',
    },
    { type: 'teamXpGain', value: 100, description: 'Your team gains 100 XP.' },
  ],
};

/** Look up a result by its d20 value (1–20). */
export function divineFavourResultFor(roll: number): DivineFavourResult {
  return DIVINE_FAVOUR_TABLE[Math.min(20, Math.max(1, roll)) - 1];
}

/** Presentation metadata per tier (emoji, label, Tailwind colour classes). */
export const TIER_META: Record<
  DivineFavourTier,
  { label: string; emoji: string; text: string; border: string; bg: string }
> = {
  punishment: {
    label: 'Punishment',
    emoji: '💀',
    text: 'text-ember',
    border: 'border-ember/60',
    bg: 'bg-ember/10',
  },
  minorBlessing: {
    label: 'Minor Blessing',
    emoji: '✨',
    text: 'text-gold-300',
    border: 'border-gold-400/50',
    bg: 'bg-gold-500/10',
  },
  strongBlessing: {
    label: 'Strong Blessing',
    emoji: '🌟',
    text: 'text-gold-300',
    border: 'border-gold-400/70',
    bg: 'bg-gold-500/15',
  },
  legendary: {
    label: 'LEGENDARY',
    emoji: '👑',
    text: 'text-gold-300',
    border: 'border-gold-400',
    bg: 'bg-gold-500/20',
  },
};
