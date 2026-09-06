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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  bookings,
  apartments,
  selectedApartmentIds,
}) => {
  const [baseMonth, setBaseMonth] = useState(new Date());
  const todayKey = toDateKey(new Date());

  const colorMap = getApartmentColorMap(apartments);

  const getBookingsForDate = (date: Date) => {
    const dateKey = toDateKey(date);
    return bookings.filter((b) => {
      // Inactive apartments have no filter chip to toggle, so their
      // bookings always show rather than silently disappearing.
      const apt = apartments.find((a: any) => a.id === b.apartment_id);
      const isActive = apt ? (apt as any).active !== false : true;
      if (isActive && !selectedApartmentIds.includes(b.apartment_id)) return false;
      if (b.status === 'CANCELLED') return false;
      return dateKey >= b.check_in_date && dateKey < b.check_out_date;
    });
  };

  const legendApartments = apartments.filter((a) =>
    selectedApartmentIds.includes(a.id)
  );

  const renderMonth = (monthDate: Date) => {
    const daysInMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0
    ).getDate();
    const firstDay = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    ).getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), i));
    }

    const monthName = monthDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    return (
      <div key={monthName} className="border rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-3 py-2 font-semibold text-center">
          {monthName}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {WEEKDAYS.map((day) => (
            <div key={day} className="bg-white p-1.5 text-center font-semibold text-xs">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 p-px">
          {days.map((date, idx) => {
            const dayBookings = date ? getBookingsForDate(date) : [];
            const isToday = date && toDateKey(date) === todayKey;

            return (
              <div
                key={idx}
                className={`min-h-20 p-1 text-sm ${date ? 'bg-white' : 'bg-gray-50'} ${
                  isToday ? 'ring-2 ring-inset ring-blue-500' : ''
                }`}
              >
                {date && (
                  <>
                    <div
                      className={`font-semibold text-xs mb-1 ${
                        isToday
                          ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white'
                          : 'text-gray-700'
                      }`}
                    >
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
                            {b.apartment?.name || ''} - {b.guest_name}
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
    );
  };

  const months = [0, 1, 2].map(
    (offset) => new Date(baseMonth.getFullYear(), baseMonth.getMonth() + offset, 1)
  );

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex justify-end items-center gap-2">
        <button
          onClick={() =>
            setBaseMonth(new Date(baseMonth.getFullYear(), baseMonth.getMonth() - 1))
          }
          className="p-2 hover:bg-gray-100 rounded"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => setBaseMonth(new Date())}
          className="px-3 py-1 text-sm hover:bg-gray-100 rounded"
        >
          Today
        </button>
        <button
          onClick={() =>
            setBaseMonth(new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1))
          }
          className="p-2 hover:bg-gray-100 rounded"
        >
          <ChevronRight size={20} />
        </button>
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

      {legendApartments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Select at least one apartment to see bookings
        </div>
      ) : (
        <div className="space-y-6">{months.map((m) => renderMonth(m))}</div>
      )}
    </div>
  );
};

export default BookingCalendar;
