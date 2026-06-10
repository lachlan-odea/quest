/**
 * Quest for the Groom — shared domain types.
 *
 * These interfaces mirror the Firestore collections one-to-one. Every document
 * stores its own `id` (same as the Firestore doc id) for convenience so the UI
 * never has to thread ids separately from data.
 *
 * Timestamps are stored as epoch milliseconds (number) rather than Firestore
 * Timestamps. This keeps the client code trivial to reason about and serialise,
 * at the small cost of not using server timestamps. Good enough for an MVP.
 */

// -----------------------------------------------------------------------------
// Core enums / unions
// -----------------------------------------------------------------------------

export type EventStatus = 'setup' | 'active' | 'finished';

export type QuestDifficulty = 'easy' | 'medium' | 'hard' | 'legendary';

export type QuestStatus = 'unassigned' | 'assigned' | 'completed' | 'failed';

export type BattleStatus = 'pending' | 'completed' | 'cancelled';

export type UpgradeType =
  | 'statBoost'
  | 'perk'
  | 'debuffRemoval'
  | 'title'
  | 'item';

export type StatKey =
  | 'strength'
  | 'charisma'
  | 'constitution'
  | 'wisdom'
  | 'dexterity'
  | 'luck';

export type ActivityType =
  | 'event'
  | 'player'
  | 'quest'
  | 'battle'
  | 'upgrade'
  | 'xp'
  | 'team';

// -----------------------------------------------------------------------------
// Value objects
// -----------------------------------------------------------------------------

export interface StatBlock {
  strength: number;
  charisma: number;
  constitution: number;
  wisdom: number;
  dexterity: number;
  luck: number;
}

/** A temporary buff/debuff applied to a player (e.g. after losing a battle). */
export interface StatusEffect {
  id: string;
  label: string;
  description: string;
  /** Optional stat tweak this effect applies, e.g. { charisma: -1 }. */
  statDelta?: Partial<StatBlock>;
  /** Optional expiry as epoch ms; undefined = until removed. */
  expiresAt?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  /** Links back to the upgrade that granted this item, if any. */
  upgradeId?: string;
}

export interface EventSettings {
  /** XP awarded by difficulty tier for quests. */
  questXp: Record<QuestDifficulty, number>;
  /** Base XP awarded to a battle winner. */
  battleXpReward: number;
  /** Minimum seconds a player must wait between starting battles (anti-spam). */
  battleCooldownSeconds: number;
  /** XP needed per level (level = floor(xp / xpPerLevel) + 1). */
  xpPerLevel: number;
  /** Whether players resolve battles themselves or an admin must approve. */
  battlesNeedApproval: boolean;
}

// -----------------------------------------------------------------------------
// Documents
// -----------------------------------------------------------------------------

export interface GameEvent {
  id: string;
  name: string;
  joinCode: string;
  /** MVP: plaintext PIN gating the admin UI. See README for hardening. */
  adminPin: string;
  /** Auth uids allowed to administer this event. */
  adminUids: string[];
  status: EventStatus;
  settings: EventSettings;
  createdAt: number;
  updatedAt: number;
}

export interface Player {
  id: string;
  eventId: string;
  authUid: string;
  name: string;
  className: string;
  teamId: string | null;
  level: number;
  xp: number;
  spentXp: number;
  stats: StatBlock;
  /** Whether the player has rolled their stats yet (single roll unless reset). */
  hasRolled: boolean;
  inventory: InventoryItem[];
  activeBuffs: StatusEffect[];
  activeDebuffs: StatusEffect[];
  assignedQuestIds: string[];
  completedQuestIds: string[];
  /** Ids of upgrades purchased (repeats allowed for repeatable upgrades). */
  upgradeIds: string[];
  /** Epoch ms of last battle started — used for the anti-spam cooldown. */
  lastBattleAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  color: string;
  playerIds: string[];
  /** Cached team XP (sum of member XP + team quest rewards). */
  xp: number;
  createdAt: number;
}

export interface Quest {
  id: string;
  eventId: string;
  assignedPlayerId: string | null;
  assignedTeamId: string | null;
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  xpReward: number;
  status: QuestStatus;
  hiddenFromOthers: boolean;
  proofNote?: string;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Battle {
  id: string;
  eventId: string;
  challengerId: string;
  defenderId: string;
  challengerName: string;
  defenderName: string;
  challengerStat: StatKey;
  defenderStat: StatKey | null;
  challengerRoll: number | null;
  defenderRoll: number | null;
  challengerTotal: number | null;
  defenderTotal: number | null;
  winnerId: string | null;
  loserId: string | null;
  xpReward: number;
  status: BattleStatus;
  createdAt: number;
  completedAt?: number;
}

export interface Upgrade {
  id: string;
  eventId: string;
  name: string;
  description: string;
  cost: number;
  type: UpgradeType;
  /** Free-form machine-readable effect tag, e.g. "charisma+1" or "title". */
  effect: string;
  /** undefined = unlimited; otherwise max times a single player may buy it. */
  maxPurchases?: number;
}

export interface ActivityLogEntry {
  id: string;
  eventId: string;
  type: ActivityType;
  message: string;
  playerId?: string;
  createdAt: number;
}

/**
 * An admin broadcast/announcement that pops up for everyone in the event.
 * (Named AppNotification to avoid clashing with the DOM `Notification`.)
 */
export interface AppNotification {
  id: string;
  eventId: string;
  title: string;
  message: string;
  /** Display tone — drives the popup colour/emoji. */
  tone: 'info' | 'warning' | 'celebrate';
  createdBy: string; // admin uid
  createdAt: number;
}
