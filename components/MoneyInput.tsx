'use client';

import React, { useState } from 'react';

interface MoneyInputProps {
  name?: string;
  value: number | null;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

// Native <input type="number"> only accepts "." as the decimal separator, so
// on a Spanish/EU mobile keyboard (inputMode="decimal" shows a "," key) the
// separator keystroke is silently rejected. This is a plain text input with
// the same decimal keypad that accepts either "," or "." while typing.
const MoneyInput: React.FC<MoneyInputProps> = ({
  name,
  value,
  onValueChange,
  disabled,
  required,
  className,
}) => {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState('');

  const displayValue = focused
    ? rawText
    : value === null || value === undefined
    ? ''
    : String(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      name={name}
      value={displayValue}
      onChange={(e) => {
        const next = e.target.value;
        if (!/^\d*[.,]?\d*$/.test(next)) return;
        setRawText(next);
        const parsed = parseFloat(next.replace(',', '.'));
        onValueChange(Number.isNaN(parsed) ? 0 : parsed);
      }}
      onFocus={(e) => {
        setRawText(value === null || value === undefined ? '' : String(value));
        setFocused(true);
        e.target.select();
      }}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      required={required}
      className={className}
    />
  );
};

export default MoneyInput;
