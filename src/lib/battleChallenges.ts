/**
 * The battle challenge bank — real-world party games grouped by attribute.
 *
 * `getRandomBattleChallenge(attribute)` returns a ready-to-store
 * `BattleChallenge` (with a fresh id). These are the "do the party game" half
 * of a hybrid battle; the stat roll is the "gods interfere" half.
 */
import type { AttributeKey, BattleChallenge } from '@/types';
import { randomOf, shortId } from './utils';

export type BattleChallengeTemplate = Omit<BattleChallenge, 'id'>;

export const BATTLE_CHALLENGES: Record<AttributeKey, BattleChallengeTemplate[]> = {
  stamina: [
    {
      attribute: 'stamina',
      title: 'Plank Challenge',
      description: 'Endurance of body and will.',
      instructions: 'Both players hold a plank. Last one holding wins.',
      suggestedDurationMinutes: 3,
      requiresJudge: true,
    },
    {
      attribute: 'stamina',
      title: 'Wall Sit Showdown',
      description: 'Legs of steel required.',
      instructions: 'Both sit against a wall (invisible chair). Last to drop wins.',
      suggestedDurationMinutes: 3,
      requiresJudge: true,
    },
    {
      attribute: 'stamina',
      title: 'Coaster Balance',
      description: 'Poise under pressure.',
      instructions: 'Balance a coaster (or cup) on your head. Last to keep it up wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'stamina',
      title: 'Ridiculous Pose Hold',
      description: 'Hold the pose, hold the line.',
      instructions: 'The judge sets a silly pose. Hold it longest to win.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'stamina',
      title: 'Stay In Character',
      description: 'Commit to the bit.',
      instructions: 'Pick a character and stay in it for 5 minutes. First to break loses.',
      suggestedDurationMinutes: 5,
      requiresJudge: true,
    },
    {
      attribute: 'stamina',
      title: 'Silent Endurance',
      description: 'Not a word.',
      instructions: 'Stay completely silent. First to speak loses.',
      suggestedDurationMinutes: 3,
      requiresJudge: true,
    },
    {
      attribute: 'stamina',
      title: 'Last to Laugh',
      description: 'Keep your composure.',
      instructions: 'The group tries to make you laugh. Last one to crack wins.',
      suggestedDurationMinutes: 3,
      requiresJudge: true,
    },
    {
      attribute: 'stamina',
      title: 'Straight Face Roast',
      description: 'Take it on the chin.',
      instructions: 'Endure a friendly roast without laughing. Last straight face wins.',
      suggestedDurationMinutes: 3,
      requiresJudge: true,
    },
  ],
  rizz: [
    {
      attribute: 'rizz',
      title: 'Toast to the Groom',
      description: 'Raise a glass, raise the roof.',
      instructions: 'Each player delivers a toast to the Groom. Best one wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'rizz',
      title: 'Best Pickup Line',
      description: 'Pure, unfiltered charm.',
      instructions: 'Deliver your best (clean-ish) pickup line. Judge picks the smoothest.',
      suggestedDurationMinutes: 1,
      requiresJudge: true,
    },
    {
      attribute: 'rizz',
      title: 'Dramatic Reading',
      description: 'Shakespeare would weep.',
      instructions: 'Dramatically read something mundane (a menu, a text). Most captivating wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'rizz',
      title: 'Make Your Case',
      description: 'Win the room.',
      instructions: 'Convince the judge your team is the best. Most persuasive wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'rizz',
      title: 'Make the Group Laugh',
      description: 'Comedy is the deadliest weapon.',
      instructions: 'You have 60 seconds to make the group laugh hardest.',
      suggestedDurationMinutes: 1,
      requiresJudge: true,
    },
    {
      attribute: 'rizz',
      title: 'Compliment Battle',
      description: 'Kill them with kindness.',
      instructions: 'Trade compliments back and forth. First to run dry loses.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'rizz',
      title: 'Best Groom Story',
      description: 'Legends are told.',
      instructions: 'Tell the best (true or embellished) story about the Groom.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'rizz',
      title: 'Fake Campaign Speech',
      description: 'Vote for you.',
      instructions: 'Deliver a fake campaign speech. Most rousing wins the election.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
  ],
  shenanigans: [
    {
      attribute: 'shenanigans',
      title: 'Invent & Pitch a Product',
      description: 'Tonight, on the Shark Tank…',
      instructions: 'Invent a ridiculous product and pitch it. Best pitch wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'shenanigans',
      title: 'Most Believable Lie',
      description: 'A web of deceit.',
      instructions: 'Tell a fake story. The most believable one wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'shenanigans',
      title: '60-Second Team Chant',
      description: 'Make it catchy.',
      instructions: 'Create a team chant in 60 seconds. Best chant wins.',
      suggestedDurationMinutes: 1,
      requiresJudge: true,
    },
    {
      attribute: 'shenanigans',
      title: 'Build Something',
      description: 'MacGyver energy.',
      instructions: 'Build something from random nearby objects. Most impressive wins.',
      suggestedDurationMinutes: 3,
      requiresJudge: true,
    },
    {
      attribute: 'shenanigans',
      title: 'Fake Rule Convince',
      description: 'Gaslight, gatekeep, girlboss.',
      instructions: 'Convince another player of a fake rule. If they believe it, you win.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'shenanigans',
      title: 'Design a Ridiculous Quest',
      description: 'Dungeon master mode.',
      instructions: 'Invent a ridiculous quest for someone else. Best quest wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'shenanigans',
      title: 'Solve the Silly Riddle',
      description: 'Wits required.',
      instructions: 'The judge poses a silly riddle. First correct (or funniest) answer wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'shenanigans',
      title: 'Best Excuse',
      description: 'Sorry I’m late to the wedding because…',
      instructions: 'Come up with the best excuse for being late to the wedding.',
      suggestedDurationMinutes: 1,
      requiresJudge: true,
    },
  ],
  vibes: [
    {
      attribute: 'vibes',
      title: 'Dance-Off',
      description: 'Let the body do the talking.',
      instructions: 'Both players dance. The judge (or crowd) picks the better mover.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'vibes',
      title: 'Rock Paper Scissors',
      description: 'Ancient and pure.',
      instructions: 'Best of three. Winner takes the real-world victory.',
      suggestedDurationMinutes: 1,
      requiresJudge: false,
    },
    {
      attribute: 'vibes',
      title: 'Mystery Wheel',
      description: 'Spin to win.',
      instructions: 'The group invents two random dares; each player does one. Best effort wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'vibes',
      title: 'Random Dare',
      description: 'The app demands chaos.',
      instructions: 'The judge sets a harmless dare. Best execution wins.',
      suggestedDurationMinutes: 2,
      requiresJudge: true,
    },
    {
      attribute: 'vibes',
      title: 'Coin Toss Gauntlet',
      description: 'Fate decides.',
      instructions: 'Best of five coin tosses. Most correct calls wins.',
      suggestedDurationMinutes: 1,
      requiresJudge: false,
    },
    {
      attribute: 'vibes',
      title: 'Best Celebration Move',
      description: 'You scored — now celebrate.',
      instructions: 'Show your best celebration move. Most iconic wins.',
      suggestedDurationMinutes: 1,
      requiresJudge: true,
    },
    {
      attribute: 'vibes',
      title: 'Most Dramatic Entrance',
      description: 'Make an entrance.',
      instructions: 'Each player makes a dramatic entrance. Most dramatic wins.',
      suggestedDurationMinutes: 1,
      requiresJudge: true,
    },
    {
      attribute: 'vibes',
      title: 'Object = The Groom',
      description: 'Deep, symbolic, unhinged.',
      instructions: 'Grab a random object and explain why it represents the Groom. Best wins.',
      suggestedDurationMinutes: 1,
      requiresJudge: true,
    },
  ],
};

/** A random challenge for the given attribute, ready to store on a battle. */
export function getRandomBattleChallenge(attribute: AttributeKey): BattleChallenge {
  const template = randomOf(BATTLE_CHALLENGES[attribute]);
  return { id: shortId('chal'), ...template };
}
