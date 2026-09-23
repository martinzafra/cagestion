'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PublicBooking {
  check_in_date: string;
  check_out_date: string;
  status: string;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PublicApartmentCalendarPage() {
  const params = useParams();
  const token = params.token as string;

  const [apartmentName, setApartmentName] = useState<string | null>(null);
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [baseMonth, setBaseMonth] = useState(new Date());
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    const load = async () => {
      const { data: apt, error: aptError } = await supabase
        .rpc('get_public_apartment', { p_token: token })
        .maybeSingle();

      if (aptError || !apt) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setApartmentName((apt as any).name);

      const { data: bkgs } = await supabase.rpc('get_public_calendar_bookings', {
        p_token: token,
      });
      setBookings((bkgs as PublicBooking[]) || []);
      setLoading(false);
    };

    load();
  }, [token]);

  const isBusy = (date: Date) => {
    const dateKey = toDateKey(date);
    return bookings.some((b) => dateKey >= b.check_in_date && dateKey < b.check_out_date);
  };

  const renderMonth = (monthDate: Date) => {
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(monthDate.getFullYear(), monthDate.getMonth(), i));
    }

    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div key={monthName} className="border rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-3 py-2 font-semibold text-center">{monthName}</div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {WEEKDAYS.map((day) => (
            <div key={day} className="bg-white p-1.5 text-center font-semibold text-xs">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200 p-px">
          {days.map((date, idx) => {
            const busy = date ? isBusy(date) : false;
            const isToday = date && toDateKey(date) === todayKey;
            return (
              <div
                key={idx}
                className={`min-h-14 p-1.5 text-sm flex flex-col items-center ${
                  date ? (busy ? 'bg-red-50' : 'bg-white') : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
              >
                {date && (
                  <>
                    <div
                      className={`font-semibold text-xs mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-blue-500 text-white' : 'text-gray-700'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    {busy && (
                      <div className="w-full text-center text-[9px] font-semibold leading-[14px] rounded bg-red-100 text-red-800 border border-red-300">
                        Reserved
                      </div>
                    )}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen text-center px-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar not found</h1>
          <p className="text-gray-600 mt-2">This link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{apartmentName}</h1>
          <p className="text-gray-600">Availability calendar</p>
        </div>

        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setBaseMonth(new Date(baseMonth.getFullYear(), baseMonth.getMonth() - 1))}
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
            onClick={() => setBaseMonth(new Date(baseMonth.getFullYear(), baseMonth.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-gray-700">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block bg-red-100 border border-red-300"></span>
            Reserved
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full inline-block bg-white border border-gray-300"></span>
            Available
          </div>
        </div>

        <div className="space-y-6">{months.map((m) => renderMonth(m))}</div>
      </div>
    </div>
  );
}
