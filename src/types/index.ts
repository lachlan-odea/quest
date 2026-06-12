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

export type BattleStatus =
  | 'pending' // challenge issued, awaiting the defender
  | 'accepted' // defender accepted
  | 'declined' // defender declined (terminal)
  | 'inProgress' // the real-world party challenge is happening
  | 'awaitingJudge' // waiting on the judge to record the real-world winner
  | 'awaitingRolls' // real-world winner recorded, waiting for stat rolls
  | 'completed' // rewards applied and battle saved
  | 'cancelled';

/** Who decides the real-world winner of a battle. */
export type BattleJudgeMode = 'admin' | 'groom' | 'selectedPlayer' | 'groupVote';

export type UpgradeType =
  | 'statBoost'
  | 'perk'
  | 'debuffRemoval'
  | 'title'
  | 'item';

export type StatKey = 'stamina' | 'rizz' | 'shenanigans' | 'vibes';

/** Alias used by the Divine Favour system for readability. Same four keys. */
export type AttributeKey = StatKey;

/** How Divine Favour rolls are gated after a battle (event setting). */
export type DivineFavourMode =
  | 'winnerOnly'
  | 'bothPlayers'
  | 'adminTriggered'
  | 'disabled';

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
  stamina: number;
  rizz: number;
  shenanigans: number;
  vibes: number;
}

/** A temporary buff/debuff applied to a player (e.g. after losing a battle). */
export interface StatusEffect {
  id: string;
  label: string;
  description: string;
  /** Optional stat tweak this effect applies, e.g. { rizz: -1 }. */
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

// -----------------------------------------------------------------------------
// Divine Favour & game effects
// -----------------------------------------------------------------------------

/**
 * The atomic "thing a game effect does". A Divine Favour result, debuff or
 * admin action is just a bundle of these. Kept deliberately small/extensible —
 * a fun MVP, not a full rules engine. Behavioural effects (e.g. "speak only in
 * questions") are tracked as `ActiveEffect`s and shown in the UI; a subset
 * (XP, attribute/roll modifiers, immunity, auto-win, challenge restriction) is
 * actually enforced by the battle/player services.
 */
export type EffectType =
  | 'xpGain'
  | 'xpLoss'
  | 'temporaryAttributeModifier'
  | 'battleRollModifier'
  | 'questXpModifier'
  | 'upgradeRestriction'
  | 'challengeRestriction'
  | 'forcedChallenge'
  | 'titleGrant'
  | 'debuff'
  | 'removeDebuff'
  | 'removeAllDebuffs'
  | 'freeUpgrade'
  | 'autoWinNextStatRoll'
  | 'teamXpGain'
  | 'debuffImmunity'
  | 'socialPunishment'
  | 'custom';

/** When an active effect should stop applying / be consumed. */
export type EffectUntil =
  | 'nextBattle'
  | 'nextQuest'
  | 'questCompleted'
  | 'endOfNight'
  | 'manualClear';

export interface GameEffect {
  type: EffectType;
  value?: number;
  attribute?: AttributeKey;
  durationMinutes?: number;
  until?: EffectUntil;
  title?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * An effect currently riding along on a player. Stat tweaks reuse the existing
 * `activeBuffs`/`activeDebuffs` (StatusEffect) path so the battle maths already
 * accounts for them; `activeEffects` holds the richer Divine Favour / debuff
 * effects (roll modifiers, restrictions, social punishments, immunity, etc.).
 */
export interface ActiveEffect {
  id: string;
  /** Where it came from, e.g. "Divine Favour", "Battle loss", "Admin". */
  source: string;
  name: string;
  description: string;
  effects: GameEffect[];
  /** Epoch ms. */
  createdAt: number;
  /** Epoch ms; undefined = until consumed / manually cleared. */
  expiresAt?: number;
  /** Epoch ms once cleared (kept for history); undefined = still active. */
  clearedAt?: number;
}

export type DivineFavourTier =
  | 'punishment'
  | 'minorBlessing'
  | 'strongBlessing'
  | 'legendary';

/** One pickable option for results that let the player choose (e.g. #20). */
export interface DivineFavourChoice {
  id: string;
  label: string;
  effects: GameEffect[];
}

export interface DivineFavourResult {
  roll: number;
  name: string;
  description: string;
  tier: DivineFavourTier;
  effects: GameEffect[];
  /** If present, the player/admin must pick exactly ONE option. */
  choices?: DivineFavourChoice[];
}

export interface DivineFavourRoll {
  id: string;
  eventId: string;
  playerId: string;
  roll: number;
  secondRoll?: number;
  resultName: string;
  resultDescription: string;
  triggeredGroomsBlessing: boolean;
  selectedChoice?: string;
  effectsApplied: GameEffect[];
  createdAt: number;
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
  /** Who may roll on the Table of Divine Favour after a battle. */
  divineFavourMode: DivineFavourMode;
  /** Hybrid party-game battle tuning. */
  battleSettings: BattleSettings;
}

/** Tuning for the hybrid (party-game + stat-roll) battle system. */
export interface BattleSettings {
  /** XP for winning the real-world party challenge. */
  victoryXp: number;
  /** XP for winning BOTH the real-world challenge and the stat roll (Glory). */
  gloryXp: number;
  /** XP for the stat-roll winner when Divine Favour is not triggered. */
  statRollFallbackXp: number;
  /** Trigger a Divine Favour roll for the stat-roll winner on completion. */
  triggerDivineFavourForStatWinner: boolean;
  /** Whether players may issue their own challenges (else admin-only). */
  allowPlayerIssuedChallenges: boolean;
  /** Whether player-issued challenges need admin approval first (MVP: advisory). */
  requireAdminApproval: boolean;
  /** Minutes a player must wait between issuing battles (anti-spam). */
  cooldownMinutesBetweenBattles: number;
  /** Whether a defender may decline a challenge. */
  allowDecline: boolean;
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
  /** Richer Divine Favour / behavioural effects (see ActiveEffect). */
  activeEffects: ActiveEffect[];
  /** Honorary titles the player has earned (e.g. "Entropy's Chosen"). */
  titles: string[];
  /** Ids of this player's Divine Favour rolls (history pointer). */
  divineFavourRollIds: string[];
  /** Epoch ms until which the player is immune to debuffs; undefined = none. */
  debuffImmuneUntil?: number;
  /** A Divine Favour roll awaiting the player's choice (e.g. Divine Intervention). */
  pendingDivineChoice?: DivineFavourRoll;
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
  /** Optional attribute that best suits this quest (flavour / hint). */
  recommendedAttribute?: StatKey;
  proofNote?: string;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** A single party-game challenge drawn from the challenge bank. */
export interface BattleChallenge {
  id: string;
  attribute: AttributeKey;
  title: string;
  description: string;
  instructions: string;
  suggestedDurationMinutes?: number;
  requiresJudge: boolean;
}

/** One player's stat roll within a battle. */
export interface BattleRoll {
  playerId: string;
  attribute: AttributeKey;
  d20: number;
  attributeValue: number;
  attributeModifier: number;
  activeModifier: number;
  total: number;
  /** The raw d20 (same as d20; kept for clarity/nat-20 checks). */
  naturalRoll: number;
  /** True if the player held an "auto-win next stat roll" blessing. */
  usedAutoWin?: boolean;
}

/**
 * A hybrid battle: the real-world party challenge decides the official winner;
 * the stat roll decides who the gods favour (Divine Favour); winning both is
 * "Glory". Timestamps are epoch ms to match the rest of the app.
 */
export interface Battle {
  id: string;
  eventId: string;

  challengerId: string;
  defenderId: string;
  /** Denormalised names so history/leaderboard need no extra lookups. */
  challengerName: string;
  defenderName: string;

  category: AttributeKey;
  challenge: BattleChallenge;

  status: BattleStatus;

  judgeMode: BattleJudgeMode;
  judgePlayerId?: string;

  realWorldWinnerId?: string;
  realWorldLoserId?: string;

  challengerRoll?: BattleRoll;
  defenderRoll?: BattleRoll;

  statRollWinnerId?: string;
  statRollLoserId?: string;

  gloryWinnerId?: string;

  victoryXpAwarded?: number;
  gloryXpAwarded?: number;
  statRollXpAwarded?: number;

  divineFavourTriggeredForPlayerId?: string;
  divineFavourRollId?: string;

  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
  cancelledAt?: number;
}

export interface Upgrade {
  id: string;
  eventId: string;
  name: string;
  description: string;
  cost: number;
  type: UpgradeType;
  /** Free-form machine-readable effect tag, e.g. "rizz+1" or "title". */
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
