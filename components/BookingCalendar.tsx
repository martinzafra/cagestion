'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getApartmentColorMap } from '@/lib/apartmentColors';

interface BookingCalendarProps {
  bookings: any[];
  apartments: { id: string; name: string }[];
  selectedApartmentIds: string[];
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  bookings,
  apartments,
  selectedApartmentIds,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const colorMap = getApartmentColorMap(apartments);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getBookingsForDate = (date: Date) => {
    const dateKey = toDateKey(date);
    return bookings.filter((b) => {
      if (!selectedApartmentIds.includes(b.apartment_id)) return false;
      if (b.status === 'CANCELLED') return false;
      return dateKey >= b.check_in_date && dateKey < b.check_out_date;
    });
  };

  const days: (Date | null)[] = [];
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
  }

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const legendApartments = apartments.filter((a) =>
    selectedApartmentIds.includes(a.id)
  );

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">{monthName}</h3>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-1 text-sm hover:bg-gray-100 rounded"
          >
            Today
          </button>
          <button
            onClick={() =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
              )
            }
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Legend */}
      {legendApartments.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {legendApartments.map((apt) => (
            <div key={apt.id} className="flex items-center gap-1.5 text-sm">
              <span
                className={`w-3 h-3 rounded-full inline-block ${
                  colorMap.get(apt.id)?.dot || 'bg-gray-400'
                }`}
              ></span>
              <span className="text-gray-700">{apt.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="bg-white p-2 text-center font-semibold text-sm"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200 p-px">
          {days.map((date, idx) => {
            const dayBookings = date ? getBookingsForDate(date) : [];

            return (
              <div
                key={idx}
                className={`min-h-24 p-1 text-sm ${date ? 'bg-white' : 'bg-gray-50'}`}
              >
                {date && (
                  <>
                    <div className="font-semibold text-gray-700 text-xs mb-1">
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayBookings.map((b) => {
                        const color = colorMap.get(b.apartment_id);
                        return (
                          <div
                            key={b.id}
                            title={`${b.apartment?.name || ''} - ${b.guest_name}`}
                            className={`text-[10px] leading-tight rounded px-1 py-0.5 truncate ${
                              color?.chip || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {b.guest_name}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {legendApartments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Select at least one apartment to see bookings
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
