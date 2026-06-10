/**
 * Character sheet — the player's home base. Class, level/XP, stats, buffs,
 * debuffs, titles and inventory.
 */
import { Link } from 'react-router-dom';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import { classEmoji, getClass } from '@/lib/classes';
import { levelProgress } from '@/lib/utils';
import { StatSheet } from '@/components/StatSheet';
import { Badge, Button, Card, EmptyState, ProgressBar, SectionTitle, Spinner } from '@/components/ui';

export default function CharacterSheetPage() {
  const { player, loading, availableXp } = usePlayer();
  const { event } = useEvent();

  if (loading || !player || !event) return <Spinner />;

  if (!player.hasRolled) {
    return (
      <Card className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="text-5xl">🎲</div>
        <p className="font-display text-xl text-parchment-100">
          You haven't rolled your stats yet!
        </p>
        <p className="text-sm text-parchment-300">
          Every hero needs a character sheet. Roll the dice to begin.
        </p>
        <Link to="/roll" className="w-full">
          <Button fullWidth>Roll My Stats</Button>
        </Link>
      </Card>
    );
  }

  const cls = getClass(player.className);
  const prog = levelProgress(player.xp, event.settings.xpPerLevel);

  return (
    <div className="flex flex-col gap-4">
      {/* Hero header */}
      <Card className="text-center">
        <div className="text-5xl">{classEmoji(player.className)}</div>
        <h1 className="mt-1 font-display text-2xl text-parchment-100">
          {player.name}
        </h1>
        <p className="text-sm text-gold-300">{player.className}</p>
        {cls && (
          <p className="mt-1 text-xs italic text-parchment-300">
            "{cls.tagline}"
          </p>
        )}
        <div className="mt-3 flex items-center justify-center gap-3 text-sm">
          <Badge>Level {prog.level}</Badge>
          <Badge>{player.xp} XP total</Badge>
          <Badge>{availableXp} XP to spend</Badge>
        </div>
        <div className="mt-3">
          <ProgressBar pct={prog.pct} />
          <p className="mt-1 text-xs text-parchment-300">
            {prog.into}/{prog.needed} XP to level {prog.level + 1}
          </p>
        </div>
      </Card>

      {/* Stats */}
      <div>
        <SectionTitle>Ability Scores</SectionTitle>
        <StatSheet stats={player.stats} />
      </div>

      {/* Buffs & debuffs */}
      {(player.activeBuffs.length > 0 || player.activeDebuffs.length > 0) && (
        <div>
          <SectionTitle>Active Effects</SectionTitle>
          <div className="flex flex-col gap-2">
            {player.activeBuffs.map((b) => (
              <Card key={b.id} className="border-gold-400/40">
                <p className="font-semibold text-gold-300">✨ {b.label}</p>
                <p className="text-sm text-parchment-200">{b.description}</p>
              </Card>
            ))}
            {player.activeDebuffs.map((d) => (
              <Card key={d.id} className="border-ember/40">
                <p className="font-semibold text-ember">☠️ {d.label}</p>
                <p className="text-sm text-parchment-200">{d.description}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inventory / titles */}
      <div>
        <SectionTitle>Inventory & Titles</SectionTitle>
        {player.inventory.length === 0 ? (
          <EmptyState
            emoji="🎒"
            title="Empty pack"
            subtitle="Win battles and complete quests to earn XP, then visit the shop."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {player.inventory.map((item) => (
              <Card key={item.id} parchment className="flex items-start gap-3">
                <span className="text-2xl">🏷️</span>
                <div>
                  <p className="font-display">{item.name}</p>
                  <p className="text-sm opacity-80">{item.description}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Link to="/shop">
        <Button variant="secondary" fullWidth>
          🛒 Spend XP in the Shop
        </Button>
      </Link>
    </div>
  );
}
