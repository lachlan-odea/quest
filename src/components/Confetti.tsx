/**
 * Lightweight, dependency-free confetti. Renders a burst of falling emoji that
 * clean themselves up. Purely cosmetic — used to celebrate big moments like the
 * legendary Groom's Blessing.
 */
import { useEffect, useMemo, useState } from 'react';

const PIECES = ['🎉', '✨', '🎊', '👑', '⭐', '🥂', '🍻'];

export function Confetti({
  count = 40,
  durationMs = 4000,
  onDone,
}: {
  count?: number;
  durationMs?: number;
  onDone?: () => void;
}) {
  const [show, setShow] = useState(true);

  // Compute random per-piece parameters once.
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.4 + Math.random() * 2,
        emoji: PIECES[Math.floor(Math.random() * PIECES.length)],
        size: 16 + Math.random() * 22,
      })),
    [count],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setShow(false);
      onDone?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [durationMs, onDone]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {bits.map((b) => (
        <span
          key={b.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${b.left}%`,
            fontSize: `${b.size}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
}
