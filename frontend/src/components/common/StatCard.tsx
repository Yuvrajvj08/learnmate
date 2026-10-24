import React from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  hint,
  trend,
  onClick,
  className = '',
}) => {
  return (
    <Card
      interactive={!!onClick}
      onClick={onClick}
      className={`p-5 flex items-start justify-between gap-4 ${className}`}
    >
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold text-[var(--text-primary)] mt-1.5 tracking-tight">
          {value}
        </p>
        {hint && (
          <p className="text-xs text-[var(--text-secondary)] mt-1">{hint}</p>
        )}
        {trend && (
          <p
            className={`text-xs font-medium mt-1 inline-flex items-center gap-1 ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            <span>{trend.value}</span>
          </p>
        )}
      </div>
      <div className="w-11 h-11 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent-primary)] shrink-0">
        {icon}
      </div>
    </Card>
  );
};
