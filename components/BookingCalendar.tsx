'use client';

import React, { useState } from 'react';
import { formatDate } from '@/lib/calculations';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BookingCalendarProps {
  bookings: any[];
  apartmentFilter?: string | null;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({
  bookings,
  apartmentFilter,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const apartments = [
    ...new Set(bookings.map((b) => b.apartment?.name).filter(Boolean)),
  ];

  const filteredApartments = apartmentFilter
    ? apartments.filter(
        (apt) =>
          bookings.find(
            (b) => b.apartment?.name === apt && b.apartment_id === apartmentFilter
          )
      )
    : apartments;

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const isBookingOnDate = (apartmentName: string, date: Date) => {
    return bookings.find((b) => {
      if (apartmentFilter && b.apartment_id !== apartmentFilter) return false;
      if (b.apartment?.name !== apartmentName) return false;

      const checkIn = new Date(b.check_in_date);
      const checkOut = new Date(b.check_out_date);
      return date >= checkIn && date < checkOut && b.status !== 'CANCELLED';
    });
  };

  const days = [];
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

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-6">
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

      {/* Calendar Grid for each Apartment */}
      {filteredApartments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No apartments with bookings
        </div>
      ) : (
        <div className="space-y-8">
          {filteredApartments.map((apartmentName) => (
            <div key={apartmentName} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 font-semibold">
                {apartmentName}
              </div>

              {/* Day headers */}
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

              {/* Days */}
              <div className="grid grid-cols-7 gap-px bg-gray-200 p-px">
                {days.map((date, idx) => {
                  const booking = date
                    ? isBookingOnDate(apartmentName, date)
                    : null;

                  return (
                    <div
                      key={idx}
                      className={`min-h-20 p-1 text-sm ${
                        date ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      {date && (
                        <>
                          <div className="font-semibold text-gray-700">
                            {date.getDate()}
                          </div>
                          {booking && (
                            <div className="mt-1 text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 truncate">
                              {booking.guest_name}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookingCalendar;
