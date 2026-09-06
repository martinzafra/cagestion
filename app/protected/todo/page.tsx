'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import StatusBadge from '@/components/StatusBadge';
import StatusSquare from '@/components/StatusSquare';
import { formatDate } from '@/lib/calculations';

type TaskStatus = 'TO BE DONE' | 'DONE' | 'NA';
type InvoiceStatus = 'TO BE DONE' | 'SENT' | 'NA';

interface BookingRow {
  id: string;
  booking_ref: string;
  guest_name: string;
  status: 'CONFIRMED' | 'PENDING CONFIRMATION' | 'CANCELLED';
  check_in_date: string;
  check_out_date: string;
  apartment_id: string;
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

const ROW_TINT: Record<string, string> = {
  CONFIRMED: 'bg-green-50',
  'PENDING CONFIRMATION': 'bg-yellow-50',
  'CHECKED IN': 'bg-blue-50',
  'CHECKED OUT': 'bg-gray-50',
};

export default function TodoPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const [filters, setFilters] = useState({
    apartment_id: '',
    search: '',
    todo_status: '',
    police_registration: '',
    platform_invoice: '',
    final_liquidation: '',
  });

  useEffect(() => {
    fetchBookings();
    fetchApartments();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id, booking_ref, guest_name, status, check_in_date, check_out_date,
          apartment_id, apartment:inventory_apartments(name),
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

  const fetchApartments = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_apartments')
        .select('*')
        .order('name');

      if (error) throw error;
      setApartments(data || []);
    } catch (error) {
      toast.error('Failed to fetch apartments');
    }
  };

  const isPending = (b: BookingRow) =>
    b.police_registration === 'TO BE DONE' ||
    b.platform_invoice === 'TO BE DONE' ||
    b.final_liquidation === 'TO BE DONE';

  const filteredBookings = bookings.filter((b) => {
    if (filters.apartment_id && b.apartment_id !== filters.apartment_id) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matches =
        b.guest_name?.toLowerCase().includes(q) ||
        b.booking_ref?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filters.todo_status && computeTodoStatus(b) !== filters.todo_status) return false;
    if (filters.police_registration && b.police_registration !== filters.police_registration)
      return false;
    if (filters.platform_invoice && b.platform_invoice !== filters.platform_invoice)
      return false;
    if (filters.final_liquidation && b.final_liquidation !== filters.final_liquidation)
      return false;
    return true;
  });

  const visibleBookings = showCompleted
    ? filteredBookings
    : filteredBookings.filter(isPending);

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

      {/* Filter line */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select
            value={filters.apartment_id}
            onChange={(e) => setFilters({ ...filters, apartment_id: e.target.value })}
            className="select"
          >
            <option value="">All Apartments</option>
            {apartments.map((apt) => (
              <option key={apt.id} value={apt.id}>
                {apt.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search guest or reference..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="input"
          />
          <select
            value={filters.todo_status}
            onChange={(e) => setFilters({ ...filters, todo_status: e.target.value })}
            className="select"
          >
            <option value="">All To Do Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING CONFIRMATION">Pending Confirmation</option>
            <option value="CHECKED IN">Checked In</option>
            <option value="CHECKED OUT">Checked Out</option>
          </select>
          <select
            value={filters.police_registration}
            onChange={(e) =>
              setFilters({ ...filters, police_registration: e.target.value })
            }
            className="select"
          >
            <option value="">Police Registration: All</option>
            <option value="TO BE DONE">To Be Done</option>
            <option value="DONE">Done</option>
            <option value="NA">N/A</option>
          </select>
          <select
            value={filters.platform_invoice}
            onChange={(e) => setFilters({ ...filters, platform_invoice: e.target.value })}
            className="select"
          >
            <option value="">Platform Invoice: All</option>
            <option value="TO BE DONE">To Be Done</option>
            <option value="SENT">Sent</option>
            <option value="NA">N/A</option>
          </select>
          <select
            value={filters.final_liquidation}
            onChange={(e) =>
              setFilters({ ...filters, final_liquidation: e.target.value })
            }
            className="select"
          >
            <option value="">Final Liquidation: All</option>
            <option value="TO BE DONE">To Be Done</option>
            <option value="SENT">Sent</option>
            <option value="NA">N/A</option>
          </select>
        </div>
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
                <th>Check-out</th>
                <th>To Do Status</th>
                <th>Police Registration</th>
                <th>Platform Invoice</th>
                <th>Final Liquidation</th>
              </tr>
            </thead>
            <tbody>
              {visibleBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    {showCompleted
                      ? 'No bookings found'
                      : 'No pending tasks — everything is up to date'}
                  </td>
                </tr>
              ) : (
                visibleBookings.map((b) => {
                  const todoStatus = computeTodoStatus(b);
                  return (
                    <tr key={b.id} className={ROW_TINT[todoStatus] || ''}>
                      <td className="whitespace-nowrap">{b.apartment?.name}</td>
                      <td className="whitespace-nowrap">
                        {b.guest_name} <span className="text-gray-400">({b.booking_ref})</span>
                      </td>
                      <td className="whitespace-nowrap">{formatDate(b.check_out_date)}</td>
                      <td>
                        <StatusBadge status={todoStatus} />
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
