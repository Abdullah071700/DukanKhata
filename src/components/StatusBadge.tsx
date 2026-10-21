import React from 'react';

interface StatusBadgeProps {
  status: 'paid' | 'pending';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const isPaid = status === 'paid';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
        isPaid
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-red-50 text-red-600 border border-red-200'
      } ${className}`}
    >
      {isPaid ? 'PAID ✓' : 'PENDING'}
    </span>
  );
};
