'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import StatusBadge from '@/components/StatusBadge';
import StatusSquare from '@/components/StatusSquare';
import { formatDate } from '@/lib/calculations';
import { ChevronUp, ChevronDown, Plus, Image as ImageIcon } from 'lucide-react';

type TaskStatus = 'TO BE DONE' | 'DONE' | 'NA';
type InvoiceStatus = 'TO BE DONE' | 'SENT' | 'NA';

type SortColumn =
  | 'apartment'
  | 'guest_name'
  | 'check_in_date'
  | 'check_out_date'
  | 'todo_status'
  | 'police_registration'
  | 'platform_invoice'
  | 'final_liquidation';

interface BookingRow {
  id: string;
  booking_ref: string;
  guest_name: string;
  status: 'CONFIRMED' | 'PENDING CONFIRMATION' | 'CANCELLED' | 'FINISHED';
  check_in_date: string;
  check_out_date: string;
  apartment_id: string;
  apartment: { name: string } | null;
  police_registration: TaskStatus;
  police_registration_file: string | null;
  platform_invoice: InvoiceStatus;
  platform_invoice_date: string | null;
  final_liquidation: InvoiceStatus;
  final_liquidation_date: string | null;
}

const todayISO = () => new Date().toISOString().split('T')[0];

// A booking's admin tasks are done once each is either completed or marked
// not applicable - nothing left in a "to be done" state.
function isTaskComplete(b: BookingRow): boolean {
  return (
    (b.police_registration === 'DONE' || b.police_registration === 'NA') &&
    (b.platform_invoice === 'SENT' || b.platform_invoice === 'NA') &&
    (b.final_liquidation === 'SENT' || b.final_liquidation === 'NA')
  );
}

// Computed automatically: all admin tasks done -> Completed, past checkout ->
// Checked Out, past check-in -> Checked In, otherwise the booking hasn't
// started yet so show its reservation status (Confirmed / Pending
// Confirmation / Cancelled).
function computeTodoStatus(b: BookingRow): string {
  if (isTaskComplete(b)) return 'COMPLETED';
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
  COMPLETED: 'bg-purple-50',
};

export default function TodoPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  // Snapshot of which rows were pending at the last fetch, frozen so a row
  // that becomes complete while you work on it doesn't vanish from view
  // mid-edit - it only drops off after the next refresh.
  const [pendingSnapshotIds, setPendingSnapshotIds] = useState<Set<string>>(new Set());
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [filters, setFilters] = useState({
    apartment_id: '',
    search: '',
    todo_status: '',
    police_registration: '',
    platform_invoice: '',
    final_liquidation: '',
  });

  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
          police_registration, police_registration_file,
          platform_invoice, platform_invoice_date,
          final_liquidation, final_liquidation_date
        `)
        .neq('status', 'CANCELLED')
        .order('check_in_date', { ascending: true });

      if (error) throw error;
      const rows = (data as any) || [];
      setBookings(rows);
      setPendingSnapshotIds(new Set(rows.filter((b: BookingRow) => !isTaskComplete(b)).map((b: BookingRow) => b.id)));
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
    : filteredBookings.filter((b) => pendingSnapshotIds.has(b.id));

  const handleSort = (column: SortColumn) => {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn(null);
    }
  };

  const getSortValue = (b: BookingRow, column: SortColumn) => {
    switch (column) {
      case 'apartment':
        return b.apartment?.name?.toLowerCase() || '';
      case 'guest_name':
        return b.guest_name?.toLowerCase() || '';
      case 'check_in_date':
        return b.check_in_date || '';
      case 'check_out_date':
        return b.check_out_date || '';
      case 'todo_status':
        return computeTodoStatus(b);
      case 'police_registration':
        return b.police_registration;
      case 'platform_invoice':
        return b.platform_invoice;
      case 'final_liquidation':
        return b.final_liquidation;
      default:
        return '';
    }
  };

  const sortedBookings = sortColumn
    ? [...visibleBookings].sort((a, b) => {
        const va = getSortValue(a, sortColumn);
        const vb = getSortValue(b, sortColumn);
        if (va < vb) return sortDirection === 'asc' ? -1 : 1;
        if (va > vb) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : visibleBookings;

  const SortableHeader: React.FC<{ column: SortColumn; children: React.ReactNode }> = ({
    column,
    children,
  }) => (
    <th
      className="cursor-pointer select-none hover:bg-gray-200"
      onClick={() => handleSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortColumn === column &&
          (sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
      </span>
    </th>
  );

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
    dateField: 'platform_invoice_date' | 'final_liquidation_date' | null,
    value: string
  ) => {
    const updates: Record<string, any> = { [field]: value };
    const isCompleteValue = value === 'DONE' || value === 'SENT';
    if (dateField) {
      if (isCompleteValue && !booking[dateField]) {
        updates[dateField] = todayISO();
      }
      if (value === 'NA') {
        updates[dateField] = null;
      }
    }
    // Final liquidation sent closes the booking out; un-sending it re-opens
    // the booking rather than leaving it stuck as Finished.
    if (field === 'final_liquidation' && booking.status !== 'CANCELLED') {
      if (value === 'SENT') updates.status = 'FINISHED';
      else if (booking.status === 'FINISHED') updates.status = 'CONFIRMED';
    }
    updateBooking(booking.id, updates);
  };

  const handleDateChange = (
    id: string,
    dateField: 'platform_invoice_date' | 'final_liquidation_date',
    value: string
  ) => {
    updateBooking(id, { [dateField]: value || null });
  };

  const handlePoliceFileChange = async (booking: BookingRow, file?: File) => {
    if (!file) return;
    try {
      const ext = file.name.split('.').pop();
      const path = `${booking.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('police-registrations')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      await updateBooking(booking.id, { police_registration_file: path });
      toast.success('Photo attached');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload photo');
    }
  };

  const handleViewPoliceFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('police-registrations')
        .createSignedUrl(path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast.error(error.message || 'Failed to open photo');
    }
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
            {apartments.filter((apt) => apt.active !== false).map((apt) => (
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
            <option value="COMPLETED">Completed</option>
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
          <table className="table text-xs [&_th]:text-xs [&_th]:px-2 [&_th]:py-1.5 [&_td]:text-xs [&_td]:px-2 [&_td]:py-1.5">
            <thead>
              <tr>
                <SortableHeader column="apartment">Apartment</SortableHeader>
                <SortableHeader column="guest_name">Booking</SortableHeader>
                <SortableHeader column="check_in_date">Check-in</SortableHeader>
                <SortableHeader column="check_out_date">Check-out</SortableHeader>
                <SortableHeader column="todo_status">To Do Status</SortableHeader>
                <SortableHeader column="police_registration">Police Registration</SortableHeader>
                <SortableHeader column="platform_invoice">Platform Invoice</SortableHeader>
                <SortableHeader column="final_liquidation">Final Liquidation</SortableHeader>
              </tr>
            </thead>
            <tbody>
              {sortedBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    {showCompleted
                      ? 'No bookings found'
                      : 'No pending tasks — everything is up to date'}
                  </td>
                </tr>
              ) : (
                sortedBookings.map((b) => {
                  const todoStatus = computeTodoStatus(b);
                  return (
                    <tr key={b.id} className={ROW_TINT[todoStatus] || ''}>
                      <td className="whitespace-nowrap">{b.apartment?.name}</td>
                      <td className="whitespace-nowrap">
                        <div>{b.guest_name}</div>
                        <div className="text-gray-400">{b.booking_ref}</div>
                      </td>
                      <td className="whitespace-nowrap">{formatDate(b.check_in_date)}</td>
                      <td className="whitespace-nowrap">{formatDate(b.check_out_date)}</td>
                      <td>
                        <StatusBadge status={todoStatus} />
                      </td>
                      <td>
                        <div className="flex gap-1.5 items-center">
                          <StatusSquare
                            value={b.police_registration}
                            doneValue="DONE"
                            onChange={(value) =>
                              handleTaskStatusChange(b, 'police_registration', null, value)
                            }
                          />
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => {
                              fileInputRefs.current[b.id] = el;
                            }}
                            className="hidden"
                            onChange={(e) =>
                              handlePoliceFileChange(b, e.target.files?.[0] || undefined)
                            }
                          />
                          {b.police_registration_file ? (
                            <button
                              type="button"
                              onClick={() => handleViewPoliceFile(b.police_registration_file!)}
                              title="View attached photo"
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <ImageIcon size={14} className="text-gray-600" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[b.id]?.click()}
                              title="Attach photo"
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <Plus size={14} className="text-gray-500" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex gap-1.5 items-center">
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
                            className="input w-28 text-xs px-1.5 py-1"
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
