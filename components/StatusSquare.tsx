'use client';

import React from 'react';
import { CheckSquare, Square, MinusSquare } from 'lucide-react';

interface StatusSquareProps {
  value: string; // 'TO BE DONE' | 'DONE' | 'SENT' | 'NA'
  doneValue: 'DONE' | 'SENT';
  onChange: (next: string) => void;
}

// Tri-state toggle: click cycles TO BE DONE -> DONE/SENT -> NA -> ...
export default function StatusSquare({ value, doneValue, onChange }: StatusSquareProps) {
  const cycle = () => {
    const next =
      value === 'TO BE DONE' ? doneValue : value === doneValue ? 'NA' : 'TO BE DONE';
    onChange(next);
  };

  const label =
    value === doneValue ? (doneValue === 'DONE' ? 'Done' : 'Sent') : value === 'NA' ? 'N/A' : 'To Be Done';

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${label} — click to change`}
      className="inline-flex items-center justify-center hover:opacity-70 transition"
    >
      {value === doneValue ? (
        <CheckSquare size={26} className="text-green-600" fill="#dcfce7" />
      ) : value === 'NA' ? (
        <MinusSquare size={26} className="text-gray-500" fill="#e5e7eb" />
      ) : (
        <Square size={26} className="text-gray-400" />
      )}
    </button>
  );
}
