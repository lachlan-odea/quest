/**
 * Bucks-night fantasy character classes.
 *
 * Purely cosmetic for the MVP (flavour + emoji), but `statHint` documents the
 * vibe of each class so you can wire class-based stat bonuses later if you want.
 */

export interface CharacterClass {
  name: string;
  emoji: string;
  tagline: string;
  description: string;
}

export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    name: 'The Smooth Talker',
    emoji: '🕴️',
    tagline: 'Never bought their own drink.',
    description: 'Can talk their way into (or out of) anything. High charisma.',
  },
  {
    name: 'The Tank',
    emoji: '🛡️',
    tagline: 'Last one standing, every time.',
    description: 'Soaks up punishment and keeps the night rolling. High constitution.',
  },
  {
    name: 'The Wildcard',
    emoji: '🎲',
    tagline: 'Nobody knows what happens next. Not even them.',
    description: 'Unpredictable chaos energy. Rides on pure luck.',
  },
  {
    name: 'The Strategist',
    emoji: '🧠',
    tagline: 'Already planned the next three venues.',
    description: 'Always two moves ahead. High wisdom.',
  },
  {
    name: 'The Menace',
    emoji: '😈',
    tagline: 'Banned from at least one establishment.',
    description: 'Brings the mischief. Thrives on dexterity and trouble.',
  },
  {
    name: 'The Bard',
    emoji: '🎤',
    tagline: 'Knows every word to every song.',
    description: 'Keeps morale high with stories, songs and questionable karaoke.',
  },
  {
    name: 'The Responsible One',
    emoji: '🧭',
    tagline: 'Holds the wallets and the secrets.',
    description: 'The quiet hero who gets everyone home. High wisdom & constitution.',
  },
  {
    name: 'The Chaos Goblin',
    emoji: '👹',
    tagline: 'Agent of pure pandemonium.',
    description: 'Lives for the bit. Maximum chaos, minimum planning.',
  },
  {
    name: 'The Hype Mage',
    emoji: '🪄',
    tagline: 'Casts "Let\'s Goooo" at will.',
    description: 'Channels raw energy into the group. Buffs everyone nearby.',
  },
  {
    name: "The Groom's Champion",
    emoji: '👑',
    tagline: "Sworn to protect the man of the hour.",
    description: "The groom's right hand. Sworn to glory and one last big night.",
  },
];

export const CLASS_NAMES = CHARACTER_CLASSES.map((c) => c.name);

export function getClass(name: string): CharacterClass | undefined {
  return CHARACTER_CLASSES.find((c) => c.name === name);
}

export function classEmoji(name: string): string {
  return getClass(name)?.emoji ?? '🎭';
}
