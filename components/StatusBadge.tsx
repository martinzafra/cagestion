'use client';

import React from 'react';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  'PENDING CONFIRMATION': 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  'CHECKED IN': 'bg-blue-100 text-blue-800',
  'CHECKED OUT': 'bg-gray-200 text-gray-700',
  DONE: 'bg-teal-100 text-teal-800',
  FINISHED: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

// Shorter text for display only - the underlying status value (used for
// color lookup, filtering, and storage) is untouched.
const STATUS_LABELS: Record<string, string> = {
  'PENDING CONFIRMATION': 'PENDING',
};

export default function StatusBadge({ status, wrap = false }: { status: string; wrap?: boolean }) {
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-sm font-medium ${color} ${
        wrap ? 'inline-block max-w-[140px] text-center leading-tight' : 'whitespace-nowrap'
      }`}
    >
      {label}
    </span>
  );
}
