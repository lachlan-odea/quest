/**
 * Centered modal overlay. Used for forced choices (battle challenges) and
 * dismissible announcements. Renders a full-screen dim backdrop with a
 * card popped in the middle of the screen.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Modal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      {/* Card */}
      <div
        className={cn(
          'relative z-10 w-full max-w-sm animate-pop-in rounded-2xl border-2 border-gold-500/60',
          'bg-tavern-800 p-6 shadow-glow',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
