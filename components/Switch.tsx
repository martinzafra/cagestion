'use client';

import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  children,
  className = 'flex items-center gap-2.5',
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={className}
  >
    <span
      className={`relative w-[38px] h-[22px] rounded-full flex-shrink-0 transition-colors ${
        checked ? 'bg-azure' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </span>
    {children}
  </button>
);

export default Switch;
