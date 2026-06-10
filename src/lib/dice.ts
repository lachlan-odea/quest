/**
 * Dice & stat maths.
 *
 * Stats are rolled with the classic "4d6 drop lowest" method, then converted to
 * D&D-style modifiers. Battles use d20 + stat modifier.
 */

import type { StatBlock, StatKey } from '@/types';

export const STAT_KEYS: StatKey[] = [
  'strength',
  'charisma',
  'constitution',
  'wisdom',
  'dexterity',
  'luck',
];

export const STAT_LABELS: Record<StatKey, string> = {
  strength: 'Strength',
  charisma: 'Charisma',
  constitution: 'Constitution',
  wisdom: 'Wisdom',
  dexterity: 'Dexterity',
  luck: 'Luck',
};

export const STAT_BLURBS: Record<StatKey, string> = {
  strength: 'Carrying mates, opening jars, arm wrestles.',
  charisma: 'Chatting to strangers, talking your way out of trouble.',
  constitution: 'Pacing yourself, surviving the big nights.',
  wisdom: 'Knowing when to call it, finding the late-night feed.',
  dexterity: 'Pool, darts, beer pong, dodging the round.',
  luck: 'Pure, unearned good fortune.',
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
