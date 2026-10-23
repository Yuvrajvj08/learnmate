import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'glass' | 'flat' | 'interactive' | 'glow';
  tilt?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'glass',
  tilt = false,
  className = '',
  ...props
}) => {
  const base = 'rounded-2xl transition-all duration-300 relative';

  const variants = {
    glass:
      'bg-white/85 dark:bg-[#151A33]/70 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-md dark:shadow-xl shadow-slate-200/40 dark:shadow-black/20',
    flat: 'bg-white dark:bg-[#101429] border border-slate-200 dark:border-slate-800',
    interactive:
      'bg-white/85 dark:bg-[#151A33]/80 hover:bg-slate-50 dark:hover:bg-[#181E3B] border border-slate-200/80 dark:border-white/[0.08] hover:border-violet-500/40 shadow-md dark:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-0.5 cursor-pointer',
    glow: 'bg-white/90 dark:bg-[#151A33]/90 border border-violet-500/30 shadow-lg shadow-violet-500/10 hover:border-violet-400/50',
  };

  const tiltClass = tilt ? 'card-3d' : '';

  return (
    <div
      className={`${base} ${variants[variant]} ${tiltClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
