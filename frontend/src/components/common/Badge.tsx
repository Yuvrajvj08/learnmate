import React from 'react';

export type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const variantStyles: Record<BadgeVariant, { bg: string; dotBg: string }> = {
    default: {
      bg: 'bg-slate-100 text-slate-700 border border-slate-200',
      dotBg: 'bg-slate-500',
    },
    accent: {
      bg: 'bg-[var(--accent-subtle)] text-[var(--accent-primary)] border border-[var(--accent-border)]',
      dotBg: 'bg-[var(--accent-primary)]',
    },
    success: {
      bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      dotBg: 'bg-emerald-500',
    },
    warning: {
      bg: 'bg-amber-50 text-amber-700 border border-amber-200',
      dotBg: 'bg-amber-500',
    },
    danger: {
      bg: 'bg-rose-50 text-rose-700 border border-rose-200',
      dotBg: 'bg-rose-500',
    },
    neutral: {
      bg: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
      dotBg: 'bg-zinc-400',
    },
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full leading-none shrink-0 ${sizeClasses} ${variantStyles[variant].bg} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${variantStyles[variant].dotBg}`} />}
      {children}
    </span>
  );
};
