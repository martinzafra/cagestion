'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getApartmentColorMap } from '@/lib/apartmentColors';
import Switch from './Switch';

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
  const [turnoversOnly, setTurnoversOnly] = useState(false);
  const todayKey = toDateKey(new Date());

  const colorMap = getApartmentColorMap(apartments);
  const apartmentOrder = new Map(apartments.map((a, idx) => [a.id, idx]));

  type BarSegment = { type: 'bar'; booking: any; role: 'start' | 'mid' | 'end' | 'single' };
  type SplitSegment = { type: 'split'; outBooking: any; inBooking: any };

  // Bookings show through their checkout day (inclusive), so a stay reads
  // as one continuous bar from check-in to check-out rather than vanishing
  // the day before it ends. When the same apartment has one booking ending
  // and another starting on the same day, that day is split in half so the
  // turnover is visible instead of one booking silently overwriting the other.
  const getSegmentsForDate = (date: Date): (BarSegment | SplitSegment)[] => {
    const dateKey = toDateKey(date);
    const active = bookings.filter((b) => {
      // Inactive apartments have no filter chip to toggle, so their
      // bookings always show rather than silently disappearing.
      const apt = apartments.find((a: any) => a.id === b.apartment_id);
      const isActive = apt ? (apt as any).active !== false : true;
      if (isActive && !selectedApartmentIds.includes(b.apartment_id)) return false;
      if (b.status === 'CANCELLED') return false;
      return dateKey >= b.check_in_date && dateKey <= b.check_out_date;
    });

    const byApartment = new Map<string, any[]>();
    active.forEach((b) => {
      const list = byApartment.get(b.apartment_id) || [];
      list.push(b);
      byApartment.set(b.apartment_id, list);
    });

    const segments: (BarSegment | SplitSegment)[] = [];
    byApartment.forEach((list, apartmentId) => {
      const outBooking = list.find((b) => b.check_out_date === dateKey && b.check_in_date !== dateKey);
      const inBooking = list.find((b) => b.check_in_date === dateKey && b.check_out_date !== dateKey);
      if (list.length === 2 && outBooking && inBooking) {
        segments.push({ type: 'split', outBooking, inBooking });
        return;
      }
      list.forEach((b) => {
        const isStart = b.check_in_date === dateKey;
        const isEnd = b.check_out_date === dateKey;
        const role = isStart && isEnd ? 'single' : isStart ? 'start' : isEnd ? 'end' : 'mid';
        segments.push({ type: 'bar', booking: b, role });
      });
    });

    const visible = turnoversOnly
      ? segments.filter((seg) => seg.type === 'split' || seg.role !== 'mid')
      : segments;

    return visible.sort((a, b) => {
      const aptA = a.type === 'split' ? a.outBooking.apartment_id : a.booking.apartment_id;
      const aptB = b.type === 'split' ? b.outBooking.apartment_id : b.booking.apartment_id;
      return (apartmentOrder.get(aptA) ?? 0) - (apartmentOrder.get(aptB) ?? 0);
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
            const segments = date ? getSegmentsForDate(date) : [];
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
                      {segments.map((seg) => {
                        if (seg.type === 'split') {
                          const outColor = colorMap.get(seg.outBooking.apartment_id);
                          const inColor = colorMap.get(seg.inBooking.apartment_id);
                          return (
                            <div
                              key={`${seg.outBooking.id}-${seg.inBooking.id}`}
                              className="flex h-[15px] -mx-1"
                            >
                              <div
                                title={`Check-out: ${seg.outBooking.apartment?.name || ''} - ${seg.outBooking.guest_name}`}
                                className={`flex-1 min-w-0 text-[9px] font-semibold leading-[15px] text-right pr-1.5 truncate border-t-[1.5px] border-b-[1.5px] border-r-[1.5px] rounded-r mr-px ${
                                  outColor?.chip || 'bg-gray-100 text-gray-800'
                                } ${outColor?.border || 'border-gray-400'}`}
                              >
                                {seg.outBooking.guest_name}
                              </div>
                              <div
                                title={`Check-in: ${seg.inBooking.apartment?.name || ''} - ${seg.inBooking.guest_name}`}
                                className={`flex-1 min-w-0 text-[9px] font-semibold leading-[15px] text-left pl-1.5 truncate border-t-[1.5px] border-b-[1.5px] border-l-[1.5px] rounded-l ml-px ${
                                  inColor?.chip || 'bg-gray-100 text-gray-800'
                                } ${inColor?.border || 'border-gray-400'}`}
                              >
                                {seg.inBooking.guest_name}
                              </div>
                            </div>
                          );
                        }

                        const { booking: b, role } = seg;
                        const color = colorMap.get(b.apartment_id);
                        const roleClasses =
                          role === 'start'
                            ? 'border-l-[1.5px] rounded-l pl-1.5'
                            : role === 'end'
                            ? 'border-r-[1.5px] rounded-r pr-1.5'
                            : role === 'single'
                            ? 'border-l-[1.5px] border-r-[1.5px] rounded px-1.5'
                            : 'px-0.5';
                        return (
                          <div
                            key={b.id}
                            title={`${b.apartment?.name || ''} - ${b.guest_name}`}
                            className={`text-[9px] font-semibold leading-[15px] truncate -mx-1 border-t-[1.5px] border-b-[1.5px] ${roleClasses} ${
                              color?.chip || 'bg-gray-100 text-gray-800'
                            } ${color?.border || 'border-gray-400'}`}
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
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <Switch
          checked={turnoversOnly}
          onChange={setTurnoversOnly}
          className="flex items-center gap-2.5 text-sm text-gray-800 whitespace-nowrap"
        >
          Check-ins/Check-outs only
        </Switch>
        <div className="flex items-center gap-2">
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
