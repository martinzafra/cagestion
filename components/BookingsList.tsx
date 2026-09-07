'use client';

import React, { useState } from 'react';
import { formatDate, formatCurrency } from '@/lib/calculations';
import { Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';

interface BookingsListProps {
  bookings: any[];
  onRefresh: () => void;
  onEdit: (id: string) => void;
}

type SortColumn =
  | 'apartment'
  | 'agent'
  | 'guest_name'
  | 'check_in_date'
  | 'check_out_date'
  | 'nights'
  | 'guest_total_amount'
  | 'status';

// Fixed initials per agent, not a generic first-letters transform — these
// are the agents' own shorthand, independent of how "Basia"/"Karo"/"Both"
// happen to be spelled in the database.
const AGENT_BADGE_TEXT: Record<string, string> = {
  Basia: 'BM',
  Karo: 'KW',
  Both: 'CA',
};

function getAgentBadgeText(agentName?: string): string {
  if (!agentName) return '—';
  return AGENT_BADGE_TEXT[agentName] || agentName.slice(0, 2).toUpperCase();
}

const GUEST_NAME_MAX_LENGTH = 20;

function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

const BookingsList: React.FC<BookingsListProps> = ({ bookings, onRefresh, onEdit }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Booking deleted');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

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

  const getSortValue = (booking: any, column: SortColumn) => {
    switch (column) {
      case 'guest_name':
        return booking.guest_name?.toLowerCase() || '';
      case 'apartment':
        return booking.apartment?.name?.toLowerCase() || '';
      case 'agent':
        return booking.agent?.name?.toLowerCase() || '';
      case 'check_in_date':
        return booking.check_in_date || '';
      case 'check_out_date':
        return booking.check_out_date || '';
      case 'nights':
        return booking.nights || 0;
      case 'guest_total_amount':
        return booking.guest_total_amount || 0;
      case 'status':
        return booking.status || '';
      default:
        return '';
    }
  };

  const sortedBookings = sortColumn
    ? [...bookings].sort((a, b) => {
        const va = getSortValue(a, sortColumn);
        const vb = getSortValue(b, sortColumn);
        if (va < vb) return sortDirection === 'asc' ? -1 : 1;
        if (va > vb) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : bookings;

  const SortableHeader: React.FC<{
    column: SortColumn;
    children: React.ReactNode;
    align?: 'left' | 'center' | 'right';
  }> = ({ column, children, align = 'left' }) => (
    <th
      className={`cursor-pointer select-none hover:bg-gray-200 ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''
      }`}
      onClick={() => handleSort(column)}
    >
      <span
        className={`inline-flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}
      >
        {children}
        {sortColumn === column &&
          (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </span>
    </th>
  );

  return (
    <div className="card overflow-x-auto">
      <table className="table text-xs [&_th]:text-xs [&_th]:px-2 [&_th]:py-1.5 [&_td]:text-xs [&_td]:px-2 [&_td]:py-1.5">
        <thead>
          <tr>
            <SortableHeader column="apartment">Apartment</SortableHeader>
            <SortableHeader column="agent">Agent</SortableHeader>
            <SortableHeader column="guest_name">Guest/Booking Ref</SortableHeader>
            <SortableHeader column="check_in_date">Check-in</SortableHeader>
            <SortableHeader column="check_out_date">Check-out</SortableHeader>
            <SortableHeader column="nights">Nights</SortableHeader>
            <SortableHeader column="guest_total_amount" align="right">Total Amount</SortableHeader>
            <SortableHeader column="status" align="center">Status</SortableHeader>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedBookings.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center py-8 text-gray-500">
                No bookings found
              </td>
            </tr>
          ) : (
            sortedBookings.map((booking) => (
              <tr
                key={booking.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedId(expandedId === booking.id ? null : booking.id)
                }
              >
                <td>{booking.apartment?.name}</td>
                <td>
                  <span
                    title={booking.agent?.name || 'No agent'}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-azure text-white text-xs font-bold"
                  >
                    {getAgentBadgeText(booking.agent?.name)}
                  </span>
                </td>
                <td className="whitespace-nowrap" title={booking.guest_name}>
                  <div className="font-medium">
                    {truncateText(booking.guest_name || '', GUEST_NAME_MAX_LENGTH)}
                  </div>
                  <div className="text-gray-400">{booking.booking_ref}</div>
                </td>
                <td>{formatDate(booking.check_in_date)}</td>
                <td>{formatDate(booking.check_out_date)}</td>
                <td>{booking.nights}</td>
                <td className="font-semibold text-right">
                  {formatCurrency(booking.guest_total_amount || 0)}
                </td>
                <td className="text-center">
                  <StatusBadge status={booking.status} wrap />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onEdit(booking.id)}
                    className="p-1 hover:bg-blue-100 rounded"
                    title="Edit"
                  >
                    <Edit2 size={16} className="text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(booking.id)}
                    className="p-1 hover:bg-red-100 rounded ml-1"
                    title="Delete"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Expanded Details */}
      {expandedId && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
          {bookings
            .filter((b) => b.id === expandedId)
            .map((booking) => (
              <div key={booking.id} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{booking.guest_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{booking.guest_email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Platform</p>
                  <p className="font-medium">{booking.platform?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Police Registration</p>
                  <p className="font-medium">{booking.police_registration}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Platform Invoice</p>
                  <p className="font-medium">{booking.platform_invoice}</p>
                </div>
                {booking.comments && (
                  <div className="col-span-full">
                    <p className="text-sm text-gray-600">Comments</p>
                    <p className="font-medium">{booking.comments}</p>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default BookingsList;
