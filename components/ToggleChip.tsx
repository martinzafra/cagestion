'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface ToggleChipProps {
  checked: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const ToggleChip: React.FC<ToggleChipProps> = ({ checked, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border-[1.5px] transition-colors ${
      checked
        ? 'bg-blue-100 text-blue-800 border-blue-500'
        : 'bg-white text-gray-500 border-gray-300'
    }`}
  >
    <Check size={12} strokeWidth={3} className={checked ? 'opacity-100' : 'opacity-0'} />
    {children}
  </button>
);

export default ToggleChip;
