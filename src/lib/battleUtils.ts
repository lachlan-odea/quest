/**
 * Pure battle maths & rules (no Firestore). The battle SERVICE wires these to
 * persistence; keeping them pure makes them trivial to unit-test and to move
 * into a Cloud Function later.
 */
import type {
  ActiveEffect,
  AttributeKey,
  BattleRoll,
  Player,
} from '@/types';
import { STAT_KEYS } from './dice';

// ---- Modifiers & dice -------------------------------------------------------

/** DnD-style ability modifier: floor((value - 10) / 2). */
export function getAttributeModifier(value: number): number {
  return Math.floor((value - 10) / 2);
}

/** Roll a d20 (1–20). */
export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

// ---- Active-effect scanning -------------------------------------------------

const effectsOf = (player: Player): ActiveEffect[] => player.activeEffects ?? [];

/**
 * Effective attribute value = base + active buff/debuff stat deltas + Divine
 * Favour `temporaryAttributeModifier`s for this attribute.
 */
export function effectiveAttribute(player: Player, attribute: AttributeKey): number {
  const buffDelta = [...player.activeBuffs, ...player.activeDebuffs].reduce(
    (sum, e) => sum + (e.statDelta?.[attribute] ?? 0),
    0,
  );
  const fxDelta = effectsOf(player).reduce(
    (sum, ae) =>
      sum +
      ae.effects.reduce(
        (s, e) =>
          s +
          (e.type === 'temporaryAttributeModifier' && e.attribute === attribute
            ? e.value ?? 0
            : 0),
        0,
      ),
    0,
  );
  return player.stats[attribute] + buffDelta + fxDelta;
}

/** Flat d20 roll modifier from Divine Favour `battleRollModifier` effects. */
export function getBattleRollModifiers(
  player: Player,
  attribute: AttributeKey,
): { attributeValue: number; attributeModifier: number; activeModifier: number } {
  const attributeValue = effectiveAttribute(player, attribute);
  const attributeModifier = getAttributeModifier(attributeValue);
  const activeModifier = effectsOf(player).reduce(
    (sum, ae) =>
      sum +
      ae.effects.reduce(
        (s, e) => s + (e.type === 'battleRollModifier' ? e.value ?? 0 : 0),
        0,
      ),
    0,
  );
  return { attributeValue, attributeModifier, activeModifier };
}

/** Does the player hold an "auto-win next stat roll" blessing? */
export function hasAutoWin(player: Player): boolean {
  return effectsOf(player).some((ae) =>
    ae.effects.some((e) => e.type === 'autoWinNextStatRoll'),
  );
}

/** Is the player blocked from challenging (e.g. Minotaur's Maze)? */
export function hasChallengeRestriction(player: Player): boolean {
  return effectsOf(player).some((ae) =>
    ae.effects.some((e) => e.type === 'challengeRestriction'),
  );
}

/** Behavioural debuffs are plain StatusEffects — match them by label. */
function hasDebuffLabelled(player: Player, fragment: string): boolean {
  return player.activeDebuffs.some((d) =>
    d.label.toLowerCase().includes(fragment.toLowerCase()),
  );
}

/** The player's lowest effective attribute (used by the Cyclops' Curse). */
export function lowestAttribute(player: Player): AttributeKey {
  return STAT_KEYS.reduce((lowest, key) =>
    effectiveAttribute(player, key) < effectiveAttribute(player, lowest)
      ? key
      : lowest,
  );
}

/**
 * If a curse forces the player's stat-roll attribute (e.g. the Cyclops' Curse
 * forces their lowest), return it; otherwise null (use the battle category).
 */
export function getForcedBattleAttribute(player: Player): AttributeKey | null {
  if (hasDebuffLabelled(player, 'cyclops')) return lowestAttribute(player);
  return null;
}

// ---- Roll & winner resolution ----------------------------------------------

/**
 * Compute a player's stat roll for a battle. Honours the Cyclops' Curse
 * (forced lowest attribute) and Divine Favour roll modifiers; records whether
 * the player holds an auto-win blessing.
 */
export function calculateBattleRoll(
  player: Player,
  category: AttributeKey,
): BattleRoll {
  const attribute = getForcedBattleAttribute(player) ?? category;
  const { attributeValue, attributeModifier, activeModifier } =
    getBattleRollModifiers(player, attribute);
  const d20 = rollD20();
  return {
    playerId: player.id,
    attribute,
    d20,
    attributeValue,
    attributeModifier,
    activeModifier,
    total: d20 + attributeModifier + activeModifier,
    naturalRoll: d20,
    usedAutoWin: hasAutoWin(player),
  };
}

/**
 * Decide the stat-roll winner. An auto-win blessing beats a non-blesser; if
 * both (or neither) hold it, the higher total wins. Returns null on a tie.
 */
export function determineStatRollWinner(
  challengerRoll: BattleRoll,
  defenderRoll: BattleRoll,
): string | null {
  const cAuto = !!challengerRoll.usedAutoWin;
  const dAuto = !!defenderRoll.usedAutoWin;
  if (cAuto && !dAuto) return challengerRoll.playerId;
  if (dAuto && !cAuto) return defenderRoll.playerId;
  if (challengerRoll.total > defenderRoll.total) return challengerRoll.playerId;
  if (defenderRoll.total > challengerRoll.total) return defenderRoll.playerId;
  return null;
}

/** Glory = the same player won both the real-world challenge and the stat roll. */
export function determineGloryWinner(
  realWorldWinnerId: string | undefined,
  statRollWinnerId: string | undefined,
): string | null {
  return realWorldWinnerId && statRollWinnerId && realWorldWinnerId === statRollWinnerId
    ? realWorldWinnerId
    : null;
}

// ---- Eligibility & effect consumption --------------------------------------

/** Can this player issue a challenge right now? */
export function canPlayerChallenge(player: Player): { ok: boolean; reason?: string } {
  if (!player.hasRolled) {
    return { ok: false, reason: 'Roll your character sheet first.' };
  }
  if (hasChallengeRestriction(player)) {
    return {
      ok: false,
      reason: 'A curse blocks you from challenging until you complete a quest.',
    };
  }
  return { ok: true };
}

/** Can this player decline a challenge, or are they cursed to accept? */
export function canPlayerDeclineChallenge(player: Player): boolean {
  // The Curse of Dionysus forces the player to accept the next challenge.
  return !hasDebuffLabelled(player, 'dionysus');
}

/** Active effects remaining after consuming "until next battle" ones. */
export function consumeBattleEffects(player: Player): ActiveEffect[] {
  return effectsOf(player).filter(
    (ae) => !ae.effects.some((e) => e.until === 'nextBattle'),
  );
}
