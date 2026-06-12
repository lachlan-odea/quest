/**
 * Dice & stat maths.
 *
 * Stats are rolled with the classic "4d6 drop lowest" method, then converted to
 * D&D-style modifiers. Battles use d20 + stat modifier.
 */

import type { StatBlock, StatKey } from '@/types';

export const STAT_KEYS: StatKey[] = ['stamina', 'rizz', 'shenanigans', 'vibes'];

export const STAT_LABELS: Record<StatKey, string> = {
  stamina: 'Stamina',
  rizz: 'Rizz',
  shenanigans: 'Shenanigans',
  vibes: 'Vibes',
};

/** Short hint shown in pickers / on the character sheet. */
export const STAT_BLURBS: Record<StatKey, string> = {
  stamina:
    'Endurance, resisting debuffs, late-night quests and surviving the Hangover Wraith.',
  rizz: 'Charm, persuasion, storytelling, speeches, toasts and social battles.',
  shenanigans:
    'Creativity, trickery, scheming, puzzles and pulling off ridiculous objectives.',
  vibes:
    'Chaotic energy, luck, wildcard battles and benefiting from unpredictable chaos.',
};

/** Longer flavour description for each attribute (character sheet / rolling). */
export const STAT_DESCRIPTIONS: Record<StatKey, string> = {
  stamina:
    'Your ability to endure the trials of the weekend — endurance challenges, resisting debuffs, late-night quests, drinking-related challenges and surviving the Hangover Wraith.',
  rizz: 'Your social power — charm, persuasion, storytelling and confidence. Used for convincing strangers, speeches, toasts, negotiation, leadership and social battles.',
  shenanigans:
    'Your creativity, trickery, problem solving and scheming — secret quests, creative solutions, puzzles and completing difficult objectives.',
  vibes:
    'Your chaotic energy and knack for benefiting from unpredictable situations — random encounters, luck-based events, chaos quests and wildcard battles.',
};

/** Roll a single die with the given number of sides (1..sides). */
export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Roll `count` dice of `sides` and return all results. */
export function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => rollDie(sides));
}

/**
 * Roll one ability score: 4d6, drop the lowest, sum the rest.
 * Returns both the total and the individual dice for the rolling animation.
 */
export function rollAbilityScore(): { total: number; dice: number[] } {
  const dice = rollDice(4, 6);
  const sorted = [...dice].sort((a, b) => a - b);
  const total = sorted.slice(1).reduce((sum, d) => sum + d, 0); // drop lowest
  return { total, dice };
}

/** Roll a full stat block (one 4d6-drop-lowest per stat). */
export function rollStatBlock(): StatBlock {
  return STAT_KEYS.reduce((block, key) => {
    block[key] = rollAbilityScore().total;
    return block;
  }, {} as StatBlock);
}

/**
 * D&D 5e modifier: floor((score - 10) / 2).
 * 10-11 -> +0, 12-13 -> +1, 8-9 -> -1, etc.
 */
export function statModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Format a modifier with an explicit sign, e.g. "+2" or "-1". */
export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/** A d20 battle roll: raw d20 plus the chosen stat's modifier. */
export function battleRoll(score: number): {
  roll: number;
  modifier: number;
  total: number;
} {
  const roll = rollDie(20);
  const modifier = statModifier(score);
  return { roll, modifier, total: roll + modifier };
}
