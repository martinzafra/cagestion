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

const TODO_STATUS_OPTIONS = [
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PENDING CONFIRMATION', label: 'Pending Confirmation' },
  { value: 'CHECKED IN', label: 'Checked In' },
  { value: 'CHECKED OUT', label: 'Checked Out' },
];

const TASK_STATUS_OPTIONS = [
  { value: 'TO BE DONE', label: 'To Be Done' },
  { value: 'DONE', label: 'Done' },
  { value: 'NA', label: 'N/A' },
];

const INVOICE_STATUS_OPTIONS = [
  { value: 'TO BE DONE', label: 'To Be Done' },
  { value: 'SENT', label: 'Sent' },
  { value: 'NA', label: 'N/A' },
];

function FilterChecklist({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  return (
    <div>
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex flex-col gap-1 mt-1.5">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-1.5 text-sm cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(opt.value)}
              onChange={() => toggle(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function TodoPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  const [filters, setFilters] = useState({
    apartment_ids: new Set<string>(),
    search: '',
    todo_status: new Set<string>(TODO_STATUS_OPTIONS.map((o) => o.value)),
    police_registration: new Set<string>(TASK_STATUS_OPTIONS.map((o) => o.value)),
    platform_invoice: new Set<string>(INVOICE_STATUS_OPTIONS.map((o) => o.value)),
    final_liquidation: new Set<string>(INVOICE_STATUS_OPTIONS.map((o) => o.value)),
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
      setFilters((prev) =>
        prev.apartment_ids.size === 0
          ? { ...prev, apartment_ids: new Set((data || []).map((a) => a.id)) }
          : prev
      );
    } catch (error) {
      toast.error('Failed to fetch apartments');
    }
  };

  const isPending = (b: BookingRow) =>
    b.police_registration === 'TO BE DONE' ||
    b.platform_invoice === 'TO BE DONE' ||
    b.final_liquidation === 'TO BE DONE';

  const filteredBookings = bookings.filter((b) => {
    if (apartments.length > 0 && !filters.apartment_ids.has(b.apartment_id)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matches =
        b.guest_name?.toLowerCase().includes(q) ||
        b.booking_ref?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (!filters.todo_status.has(computeTodoStatus(b))) return false;
    if (!filters.police_registration.has(b.police_registration)) return false;
    if (!filters.platform_invoice.has(b.platform_invoice)) return false;
    if (!filters.final_liquidation.has(b.final_liquidation)) return false;
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
        <input
          type="text"
          placeholder="Search guest or reference..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="input mb-4"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <FilterChecklist
            label="Apartment"
            options={apartments.map((apt) => ({ value: apt.id, label: apt.name }))}
            selected={filters.apartment_ids}
            onChange={(next) => setFilters({ ...filters, apartment_ids: next })}
          />
          <FilterChecklist
            label="To Do Status"
            options={TODO_STATUS_OPTIONS}
            selected={filters.todo_status}
            onChange={(next) => setFilters({ ...filters, todo_status: next })}
          />
          <FilterChecklist
            label="Police Registration"
            options={TASK_STATUS_OPTIONS}
            selected={filters.police_registration}
            onChange={(next) => setFilters({ ...filters, police_registration: next })}
          />
          <FilterChecklist
            label="Platform Invoice"
            options={INVOICE_STATUS_OPTIONS}
            selected={filters.platform_invoice}
            onChange={(next) => setFilters({ ...filters, platform_invoice: next })}
          />
          <FilterChecklist
            label="Final Liquidation"
            options={INVOICE_STATUS_OPTIONS}
            selected={filters.final_liquidation}
            onChange={(next) => setFilters({ ...filters, final_liquidation: next })}
          />
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
