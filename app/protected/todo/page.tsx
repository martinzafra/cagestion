'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import StatusBadge from '@/components/StatusBadge';
import StatusSquare from '@/components/StatusSquare';

type TaskStatus = 'TO BE DONE' | 'DONE' | 'NA';
type InvoiceStatus = 'TO BE DONE' | 'SENT' | 'NA';

interface BookingRow {
  id: string;
  booking_ref: string;
  guest_name: string;
  status: 'CONFIRMED' | 'PENDING CONFIRMATION' | 'CANCELLED';
  check_in_date: string;
  check_out_date: string;
  apartment: { name: string } | null;
  police_registration: TaskStatus;
  police_registration_date: string | null;
  platform_invoice: InvoiceStatus;
  platform_invoice_date: string | null;
  final_liquidation: InvoiceStatus;
  final_liquidation_date: string | null;
}

const todayISO = () => new Date().toISOString().split('T')[0];

// Computed automatically: past checkout -> Checked Out, past check-in ->
// Checked In, otherwise the booking hasn't started yet so show its
// reservation status (Confirmed / Pending Confirmation / Cancelled).
function computeTodoStatus(b: BookingRow): string {
  const today = todayISO();
  if (today >= b.check_out_date) return 'CHECKED OUT';
  if (today >= b.check_in_date) return 'CHECKED IN';
  return b.status;
}

export default function TodoPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_ref, guest_name, status, check_in_date, check_out_date,
          apartment:inventory_apartments(name),
          police_registration, police_registration_date,
          platform_invoice, platform_invoice_date,
          final_liquidation, final_liquidation_date
        `)
        .neq('status', 'CANCELLED')
        .order('check_in_date', { ascending: true });

      if (error) throw error;
      setBookings((data as any) || []);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const isPending = (b: BookingRow) =>
    b.police_registration === 'TO BE DONE' ||
    b.platform_invoice === 'TO BE DONE' ||
    b.final_liquidation === 'TO BE DONE';

  const visibleBookings = showCompleted ? bookings : bookings.filter(isPending);

  const updateBooking = async (id: string, updates: Record<string, any>) => {
    try {
      const { error } = await supabase.from('bookings').update(updates).eq('id', id);
      if (error) throw error;
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
      );
    } catch (error: any) {
      toast.error(error.message || 'Update failed');
    }
  };

  const handleTaskStatusChange = (
    booking: BookingRow,
    field: 'police_registration' | 'platform_invoice' | 'final_liquidation',
    dateField: 'police_registration_date' | 'platform_invoice_date' | 'final_liquidation_date',
    value: string
  ) => {
    const updates: Record<string, any> = { [field]: value };
    const isCompleteValue = value === 'DONE' || value === 'SENT';
    if (isCompleteValue && !booking[dateField]) {
      updates[dateField] = todayISO();
    }
    if (value === 'NA') {
      updates[dateField] = null;
    }
    updateBooking(booking.id, updates);
  };

  const handleDateChange = (
    id: string,
    dateField: 'police_registration_date' | 'platform_invoice_date' | 'final_liquidation_date',
    value: string
  ) => {
    updateBooking(id, { [dateField]: value || null });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">To Do</h1>
          <p className="text-gray-600 mt-1">
            Track booking status and pending administrative tasks
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show completed bookings
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Apartment</th>
                <th>Booking</th>
                <th>To Do Status</th>
                <th>Police Registration</th>
                <th>Platform Invoice</th>
                <th>Final Liquidation</th>
              </tr>
            </thead>
            <tbody>
              {visibleBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    {showCompleted
                      ? 'No bookings found'
                      : 'No pending tasks — everything is up to date'}
                  </td>
                </tr>
              ) : (
                visibleBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap">{b.apartment?.name}</td>
                    <td className="whitespace-nowrap">
                      {b.guest_name} <span className="text-gray-400">({b.booking_ref})</span>
                    </td>
                    <td>
                      <StatusBadge status={computeTodoStatus(b)} />
                    </td>
                    <td>
                      <div className="flex gap-2 items-center">
                        <StatusSquare
                          value={b.police_registration}
                          doneValue="DONE"
                          onChange={(value) =>
                            handleTaskStatusChange(
                              b,
                              'police_registration',
                              'police_registration_date',
                              value
                            )
                          }
                        />
                        <input
                          type="date"
                          value={b.police_registration_date || ''}
                          onChange={(e) =>
                            handleDateChange(
                              b.id,
                              'police_registration_date',
                              e.target.value
                            )
                          }
                          disabled={b.police_registration !== 'DONE'}
                          className="input"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2 items-center">
                        <StatusSquare
                          value={b.platform_invoice}
                          doneValue="SENT"
                          onChange={(value) =>
                            handleTaskStatusChange(
                              b,
                              'platform_invoice',
                              'platform_invoice_date',
                              value
                            )
                          }
                        />
                        <input
                          type="date"
                          value={b.platform_invoice_date || ''}
                          onChange={(e) =>
                            handleDateChange(
                              b.id,
                              'platform_invoice_date',
                              e.target.value
                            )
                          }
                          disabled={b.platform_invoice !== 'SENT'}
                          className="input"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2 items-center">
                        <StatusSquare
                          value={b.final_liquidation}
                          doneValue="SENT"
                          onChange={(value) =>
                            handleTaskStatusChange(
                              b,
                              'final_liquidation',
                              'final_liquidation_date',
                              value
                            )
                          }
                        />
                        <input
                          type="date"
                          value={b.final_liquidation_date || ''}
                          onChange={(e) =>
                            handleDateChange(
                              b.id,
                              'final_liquidation_date',
                              e.target.value
                            )
                          }
                          disabled={b.final_liquidation !== 'SENT'}
                          className="input"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
