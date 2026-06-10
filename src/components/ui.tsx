/**
 * Small reusable UI primitives, kept in one file for easy reuse.
 * Mobile-first: large tap targets, generous padding, high contrast.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ---- Button -----------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-gold-500 text-tavern-900 hover:bg-gold-400 active:bg-gold-600 shadow-glow font-semibold',
  secondary:
    'bg-tavern-600 text-parchment-100 border border-gold-600/40 hover:bg-tavern-500',
  ghost: 'bg-transparent text-parchment-200 hover:bg-white/5',
  danger: 'bg-ember text-white hover:brightness-110 active:brightness-95 font-semibold',
};

export function Button({
  variant = 'primary',
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base',
        'min-h-[52px] transition-all disabled:opacity-40 disabled:cursor-not-allowed',
        'active:scale-[0.98] touch-manipulation',
        buttonVariants[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---- Card -------------------------------------------------------------------
export function Card({
  children,
  className,
  parchment = false,
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  parchment?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      style={style}
      onClick={onClick}
      className={cn(
        parchment ? 'parchment-card' : 'tavern-card',
        'p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---- Badge ------------------------------------------------------------------
export function Badge({
  children,
  className,
  color,
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        !color && 'bg-gold-500/20 text-gold-300 border border-gold-500/30',
        className,
      )}
      style={color ? { backgroundColor: `${color}22`, color, borderColor: `${color}55`, borderWidth: 1 } : undefined}
    >
      {children}
    </span>
  );
}

// ---- Input / Textarea / Select ---------------------------------------------
const fieldClass =
  'w-full rounded-xl border border-gold-600/40 bg-tavern-800/80 px-4 py-3 ' +
  'text-parchment-100 placeholder:text-parchment-300/40 outline-none ' +
  'focus:border-gold-400 focus:ring-2 focus:ring-gold-500/30 min-h-[52px]';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  return (
    <textarea
      {...props}
      className={cn(fieldClass, 'min-h-[96px] py-3', props.className)}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldClass, props.className)} />;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-parchment-200">
      {children}
    </label>
  );
}

// ---- Spinner ----------------------------------------------------------------
export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-parchment-300">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500/30 border-t-gold-400" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

// ---- Progress bar -----------------------------------------------------------
export function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-tavern-900/70">
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

// ---- Empty state ------------------------------------------------------------
export function EmptyState({
  emoji = '🍺',
  title,
  subtitle,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-parchment-300">
      <div className="text-4xl">{emoji}</div>
      <p className="font-display text-lg text-parchment-100">{title}</p>
      {subtitle && <p className="max-w-xs text-sm opacity-80">{subtitle}</p>}
    </div>
  );
}

// ---- Section heading --------------------------------------------------------
export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-xl gold-text">{children}</h2>
      {right}
    </div>
  );
}
