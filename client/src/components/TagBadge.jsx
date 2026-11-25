import React from 'react';
import { Code, Hash, Atom, Dna, FlaskConical, DollarSign, BookOpen, Terminal } from 'lucide-react';

const TAG_CONFIGS = {
  computer_science: {
    label: 'Computer Science',
    cls: 'bg-blue-500/10 text-blue-300 border-blue-500/25',
    icon: Terminal,
  },
  mathematics: {
    label: 'Mathematics',
    cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25',
    icon: Hash,
  },
  physics: {
    label: 'Physics',
    cls: 'bg-purple-500/10 text-purple-300 border-purple-500/25',
    icon: Atom,
  },
  biology: {
    label: 'Biology',
    cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    icon: Dna,
  },
  chemistry: {
    label: 'Chemistry',
    cls: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    icon: FlaskConical,
  },
  economics: {
    label: 'Economics & Finance',
    cls: 'bg-orange-500/10 text-orange-300 border-orange-500/25',
    icon: DollarSign,
  },
  general_engineering: {
    label: 'Engineering Systems',
    cls: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
    icon: BookOpen,
  },
};

export const TagBadge = ({ tag, size = 'sm', showIcon = true, className = '' }) => {
  const normalized = (tag || 'general_engineering').toLowerCase().replace(/\s+/g, '_');
  const config = TAG_CONFIGS[normalized] || {
    label: tag || 'General',
    cls: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
    icon: BookOpen,
  };

  const Icon = config.icon;
  const sizeClasses =
    size === 'xs'
      ? 'text-[10px] px-2 py-0.5 gap-1 font-mono font-medium'
      : size === 'md'
      ? 'text-xs px-3 py-1 gap-1.5 font-mono font-medium'
      : 'text-xs px-2.5 py-0.5 gap-1.5 font-mono font-medium';

  return (
    <span
      className={`inline-flex items-center border rounded-md transition-colors ${config.cls} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
};
