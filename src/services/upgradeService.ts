/**
 * Upgrade / shop service — the catalog of buyable upgrades and the purchase
 * flow (spend XP, apply the effect to the player).
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Player, StatKey, Upgrade } from '@/types';
import { shortId } from '@/lib/utils';
import { logActivity } from './activityService';

const upgradesCol = collection(db, COLLECTIONS.upgrades);

export function subscribeUpgrades(
  eventId: string,
  cb: (upgrades: Upgrade[]) => void,
): () => void {
  const q = query(upgradesCol, where('eventId', '==', eventId));
  return onSnapshot(
    q,
    (snap) => {
      const upgrades = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Upgrade,
      );
      upgrades.sort((a, b) => a.cost - b.cost);
      cb(upgrades);
    },
    (err) => console.error('[upgrades] subscription error', err),
  );
}

export async function createUpgrade(
  input: Omit<Upgrade, 'id'>,
): Promise<Upgrade> {
  const ref = await addDoc(upgradesCol, input);
  return { id: ref.id, ...input };
}

export async function deleteUpgrade(upgradeId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.upgrades, upgradeId));
}

/** XP a player has available to spend. */
export function availableXp(player: Player): number {
  return player.xp - player.spentXp;
}

/** How many times this player has already bought a given upgrade. */
export function purchaseCount(player: Player, upgradeId: string): number {
  return player.upgradeIds.filter((id) => id === upgradeId).length;
}

export function canPurchase(
  player: Player,
  upgrade: Upgrade,
): { ok: boolean; reason?: string } {
  if (availableXp(player) < upgrade.cost) {
    return { ok: false, reason: 'Not enough XP.' };
  }
  if (
    upgrade.maxPurchases != null &&
    purchaseCount(player, upgrade.id) >= upgrade.maxPurchases
  ) {
    return { ok: false, reason: 'Purchase limit reached.' };
  }
  if (upgrade.type === 'debuffRemoval' && player.activeDebuffs.length === 0) {
    return { ok: false, reason: 'No debuffs to remove.' };
  }
  return { ok: true };
}

const STAT_KEYS: StatKey[] = [
  'strength',
  'charisma',
  'constitution',
  'wisdom',
  'dexterity',
  'luck',
];

/**
 * Translate an upgrade's `effect` string into a patch on the player doc.
 * Supported effects:
 *   "<stat>+N"            -> permanent stat boost
 *   "buff:<stat>+N:<tag>" -> temporary buff (StatusEffect)
 *   "removeDebuff"        -> clears the oldest active debuff
 *   "title:<name>"        -> adds a title item to inventory
 *   anything else         -> stored as a usable inventory item
 */
function applyEffect(player: Player, upgrade: Upgrade): Partial<Player> {
  const effect = upgrade.effect;

  // Permanent stat boost, e.g. "charisma+1".
  const statMatch = effect.match(/^([a-z]+)\+(\d+)$/);
  if (statMatch && STAT_KEYS.includes(statMatch[1] as StatKey)) {
    const stat = statMatch[1] as StatKey;
    const amount = Number(statMatch[2]);
    return {
      stats: { ...player.stats, [stat]: player.stats[stat] + amount },
    };
  }

  // Temporary buff, e.g. "buff:charisma+2:1battle".
  const buffMatch = effect.match(/^buff:([a-z]+)\+(\d+):(.+)$/);
  if (buffMatch && STAT_KEYS.includes(buffMatch[1] as StatKey)) {
    const stat = buffMatch[1] as StatKey;
    const amount = Number(buffMatch[2]);
    return {
      activeBuffs: [
        ...player.activeBuffs,
        {
          id: shortId('buff'),
          label: upgrade.name,
          description: upgrade.description,
          statDelta: { [stat]: amount },
        },
      ],
    };
  }

  // Remove the oldest debuff.
  if (effect === 'removeDebuff') {
    return { activeDebuffs: player.activeDebuffs.slice(1) };
  }

  // Title or generic item -> inventory.
  const name =
    effect.startsWith('title:') ? effect.slice('title:'.length) : upgrade.name;
  return {
    inventory: [
      ...player.inventory,
      {
        id: shortId('item'),
        name,
        description: upgrade.description,
        upgradeId: upgrade.id,
      },
    ],
  };
}

/** Purchase an upgrade for a player: validate, spend XP, apply the effect. */
export async function purchaseUpgrade(
  player: Player,
  upgrade: Upgrade,
): Promise<void> {
  const check = canPurchase(player, upgrade);
  if (!check.ok) throw new Error(check.reason ?? 'Cannot purchase.');

  const patch = applyEffect(player, upgrade);
  await updateDoc(doc(db, COLLECTIONS.players, player.id), {
    ...patch,
    spentXp: player.spentXp + upgrade.cost,
    upgradeIds: [...player.upgradeIds, upgrade.id],
    updatedAt: Date.now(),
  });
  await logActivity(
    player.eventId,
    'upgrade',
    `${player.name} bought "${upgrade.name}". 🛒`,
    player.id,
  );
}
