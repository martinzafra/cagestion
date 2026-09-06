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
  | 'booking_ref'
  | 'guest_name'
  | 'check_in_date'
  | 'check_out_date'
  | 'nights'
  | 'guest_total_amount'
  | 'status';

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
      case 'booking_ref':
        return booking.booking_ref?.toLowerCase() || '';
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
    align?: 'left' | 'right';
  }> = ({ column, children, align = 'left' }) => (
    <th
      className={`cursor-pointer select-none hover:bg-gray-200 ${
        align === 'right' ? 'text-right' : ''
      }`}
      onClick={() => handleSort(column)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortColumn === column &&
          (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
      </span>
    </th>
  );

  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <SortableHeader column="apartment">Apartment</SortableHeader>
            <SortableHeader column="booking_ref">Booking Ref</SortableHeader>
            <SortableHeader column="guest_name">Guest</SortableHeader>
            <SortableHeader column="check_in_date">Check-in</SortableHeader>
            <SortableHeader column="check_out_date">Check-out</SortableHeader>
            <SortableHeader column="nights">Nights</SortableHeader>
            <SortableHeader column="guest_total_amount" align="right">Total Amount</SortableHeader>
            <SortableHeader column="status">Status</SortableHeader>
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
                <td>{booking.booking_ref}</td>
                <td className="font-medium">{booking.guest_name}</td>
                <td>{formatDate(booking.check_in_date)}</td>
                <td>{formatDate(booking.check_out_date)}</td>
                <td>{booking.nights}</td>
                <td className="font-semibold text-right">
                  {formatCurrency(booking.guest_total_amount || 0)}
                </td>
                <td>
                  <StatusBadge status={booking.status} />
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
              <div key={booking.id} className="grid grid-cols-2 gap-4">
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
                  <p className="text-sm text-gray-600">Agent</p>
                  <p className="font-medium">{booking.agent?.name}</p>
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
                  <div className="col-span-2">
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
