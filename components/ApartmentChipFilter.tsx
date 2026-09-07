'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { getApartmentColorMap } from '@/lib/apartmentColors';

interface ApartmentChipFilterProps {
  apartments: { id: string; name: string }[];
  selectedIds: string[] | Set<string>;
  onToggle: (id: string) => void;
  colorMap: ReturnType<typeof getApartmentColorMap>;
}

const ApartmentChipFilter: React.FC<ApartmentChipFilterProps> = ({
  apartments,
  selectedIds,
  onToggle,
  colorMap,
}) => {
  const isSelected = (id: string) =>
    Array.isArray(selectedIds) ? selectedIds.includes(id) : selectedIds.has(id);

  return (
    <div className="flex flex-wrap gap-2">
      {apartments.map((apt) => {
        const checked = isSelected(apt.id);
        const color = colorMap.get(apt.id);
        return (
          <button
            key={apt.id}
            type="button"
            onClick={() => onToggle(apt.id)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border-[1.5px] transition-colors ${
              checked
                ? `${color?.chip || 'bg-gray-100 text-gray-800'} ${color?.border || 'border-gray-400'}`
                : 'bg-white text-gray-500 border-gray-300'
            }`}
          >
            <Check size={12} strokeWidth={3} className={checked ? 'opacity-100' : 'opacity-0'} />
            {apt.name}
          </button>
        );
      })}
    </div>
  );
};

export default ApartmentChipFilter;
