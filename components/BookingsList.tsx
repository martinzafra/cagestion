'use client';

import React, { useState } from 'react';
import { formatDate, formatCurrency } from '@/lib/calculations';
import { Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';

interface BookingsListProps {
  bookings: any[];
  onRefresh: () => void;
}

const BookingsList: React.FC<BookingsListProps> = ({ bookings, onRefresh }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Guest</th>
            <th>Apartment</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Nights</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-8 text-gray-500">
                No bookings found
              </td>
            </tr>
          ) : (
            bookings.map((booking) => (
              <tr
                key={booking.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedId(expandedId === booking.id ? null : booking.id)
                }
              >
                <td className="font-medium">{booking.guest_name}</td>
                <td>{booking.apartment?.name}</td>
                <td>{formatDate(booking.check_in_date)}</td>
                <td>{formatDate(booking.check_out_date)}</td>
                <td>{booking.nights}</td>
                <td className="font-semibold">
                  {formatCurrency(booking.guest_total_amount || 0)}
                </td>
                <td>
                  <StatusBadge status={booking.status} />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button className="p-1 hover:bg-blue-100 rounded" title="Edit">
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
