/**
 * Upgrade shop — spend XP on stat boosts, perks, titles and debuff removal.
 */
import { useEffect, useState } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { useEvent } from '@/hooks/useEvent';
import type { Upgrade, UpgradeType } from '@/types';
import {
  canPurchase,
  purchaseUpgrade,
  purchaseCount,
  subscribeUpgrades,
} from '@/services/upgradeService';
import { Badge, Button, Card, EmptyState, SectionTitle, Spinner } from '@/components/ui';

const TYPE_META: Record<UpgradeType, { emoji: string; label: string }> = {
  statBoost: { emoji: '💪', label: 'Stat Boost' },
  perk: { emoji: '✨', label: 'Perk' },
  debuffRemoval: { emoji: '🧪', label: 'Cleanse' },
  title: { emoji: '🏷️', label: 'Title' },
  item: { emoji: '🎁', label: 'Item' },
};

export default function ShopPage() {
  const { player, loading, availableXp } = usePlayer();
  const { eventId } = useEvent();
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    return subscribeUpgrades(eventId, setUpgrades);
  }, [eventId]);

  if (loading || !player) return <Spinner />;

  async function buy(upgrade: Upgrade) {
    if (!player) return;
    setError(null);
    setBusyId(upgrade.id);
    try {
      await purchaseUpgrade(player, upgrade);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-center justify-between">
        <span className="text-parchment-200">XP available to spend</span>
        <span className="font-display text-2xl text-gold-300">
          {availableXp} XP
        </span>
      </Card>

      <SectionTitle>The Merchant's Wares</SectionTitle>
      {error && <Card className="border-ember/50 text-ember">{error}</Card>}

      {upgrades.length === 0 ? (
        <EmptyState
          emoji="🛒"
          title="Shop is empty"
          subtitle="Your Game Master hasn't stocked any upgrades yet."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {upgrades.map((u) => {
            const meta = TYPE_META[u.type];
            const check = canPurchase(player, u);
            const bought = purchaseCount(player, u.id);
            return (
              <Card key={u.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xl">{meta.emoji}</span>
                    <p className="font-display text-parchment-100">{u.name}</p>
                  </div>
                  <p className="text-sm text-parchment-300">{u.description}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge>{meta.label}</Badge>
                    {u.maxPurchases != null && (
                      <span className="text-xs text-parchment-300/70">
                        {bought}/{u.maxPurchases} bought
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-none flex-col items-end gap-2">
                  <span className="font-display text-gold-300">{u.cost}</span>
                  <Button
                    className="px-3 py-2 text-sm"
                    disabled={!check.ok || busyId === u.id}
                    onClick={() => buy(u)}
                  >
                    {busyId === u.id ? '…' : 'Buy'}
                  </Button>
                  {!check.ok && (
                    <span className="text-[10px] text-ember">{check.reason}</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
