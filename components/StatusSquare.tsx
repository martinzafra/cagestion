'use client';

import React from 'react';
import { Check, Minus } from 'lucide-react';

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

  const isDone = value === doneValue;
  const isNA = value === 'NA';
  const label = isDone ? (doneValue === 'DONE' ? 'Done' : 'Sent') : isNA ? 'N/A' : 'To Be Done';

  return (
    <button
      type="button"
      onClick={cycle}
      title={`${label} — click to change`}
      className="inline-flex items-center justify-center"
    >
      <span
        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
          isDone
            ? 'bg-green-500 border-green-500'
            : isNA
            ? 'bg-gray-300 border-gray-300'
            : 'bg-white border-gray-300 hover:border-gray-400'
        }`}
      >
        {isDone && <Check size={16} className="text-white" strokeWidth={3} />}
        {isNA && <Minus size={16} className="text-gray-600" strokeWidth={3} />}
      </span>
    </button>
  );
}
