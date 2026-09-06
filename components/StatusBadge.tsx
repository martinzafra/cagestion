'use client';

import React from 'react';

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  'PENDING CONFIRMATION': 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  'CHECKED IN': 'bg-blue-100 text-blue-800',
  'CHECKED OUT': 'bg-gray-200 text-gray-700',
  FINISHED: 'bg-purple-100 text-purple-800',
};

export default function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2.5 py-1 rounded-full text-sm font-medium whitespace-nowrap ${color}`}>
      {status}
    </span>
  );
}
