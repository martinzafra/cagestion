'use client';

import React, { useState } from 'react';
import { formatDate } from '@/lib/calculations';
import { Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { compareSortValues } from '@/lib/sort';
import StatusBadge from '@/components/StatusBadge';
import { getPlatformBadge } from '@/lib/platformBadge';

interface BookingsListProps {
  bookings: any[];
  onRefresh: () => void;
  onEdit: (id: string) => void;
}

type SortColumn =
  | 'apartment'
  | 'agent'
  | 'guest_name'
  | 'platform'
  | 'check_in_date'
  | 'check_out_date'
  | 'nights'
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
      case 'platform':
        return booking.platform?.name?.toLowerCase() || '';
      case 'check_in_date':
        return booking.check_in_date || '';
      case 'check_out_date':
        return booking.check_out_date || '';
      case 'nights':
        return booking.nights || 0;
      case 'status':
        return booking.status || '';
      default:
        return '';
    }
  };

  const sortedBookings = sortColumn
    ? [...bookings].sort((a, b) => {
        const cmp = compareSortValues(getSortValue(a, sortColumn), getSortValue(b, sortColumn));
        return sortDirection === 'asc' ? cmp : -cmp;
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
    <div className="card">
      <div className="hidden md:block overflow-x-auto">
      <table className="table text-xs [&_th]:text-xs [&_th]:px-2 [&_th]:py-1.5 [&_td]:text-xs [&_td]:px-2 [&_td]:py-1.5">
        <thead>
          <tr>
            <SortableHeader column="apartment">Apartment</SortableHeader>
            <SortableHeader column="agent">Agent</SortableHeader>
            <SortableHeader column="guest_name">Guest/Booking Ref</SortableHeader>
            <SortableHeader column="platform" align="center">Platform</SortableHeader>
            <SortableHeader column="check_in_date">Check-in</SortableHeader>
            <SortableHeader column="check_out_date">Check-out</SortableHeader>
            <SortableHeader column="nights">Nights</SortableHeader>
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
                <td className="text-center">
                  {(() => {
                    const badge = getPlatformBadge(booking.platform?.name);
                    return (
                      <span
                        title={booking.platform?.name || 'No platform'}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                          badge.textClassName || 'text-white'
                        } ${badge.className}`}
                      >
                        {badge.text}
                      </span>
                    );
                  })()}
                </td>
                <td>{formatDate(booking.check_in_date)}</td>
                <td>{formatDate(booking.check_out_date)}</td>
                <td>{booking.nights}</td>
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
                  <p className="text-sm text-gray-600">Owner Invoice</p>
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sortedBookings.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No bookings found</p>
        ) : (
          sortedBookings.map((booking) => {
            const platformBadge = getPlatformBadge(booking.platform?.name);
            const isExpanded = expandedId === booking.id;
            return (
              <div
                key={booking.id}
                className="border border-gray-200 rounded-2xl p-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : booking.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      title={booking.platform?.name || 'No platform'}
                      className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                        platformBadge.textClassName || 'text-white'
                      } ${platformBadge.className}`}
                    >
                      {platformBadge.text}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium">{booking.guest_name}</div>
                      <div className="text-gray-400 text-xs truncate">{booking.booking_ref}</div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <StatusBadge status={booking.status} wrap />
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-500">Apartment</div>
                    <div className="font-medium">{booking.apartment?.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Nights</div>
                    <div className="font-medium">{booking.nights}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Check-in</div>
                    <div className="font-medium">{formatDate(booking.check_in_date)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Check-out</div>
                    <div className="font-medium">{formatDate(booking.check_out_date)}</div>
                  </div>
                  <div className="col-span-full">
                    <div className="text-xs text-gray-500">Owner Invoice</div>
                    <div className="font-medium">{booking.platform_invoice}</div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="text-sm mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <div>
                      <div className="text-xs text-gray-500">Guest Phone</div>
                      <div className="font-medium">{booking.guest_phone || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Guest Email</div>
                      <div className="font-medium">{booking.guest_email || '-'}</div>
                    </div>
                    {booking.comments && (
                      <div>
                        <div className="text-xs text-gray-500">Comments</div>
                        <div className="font-medium">{booking.comments}</div>
                      </div>
                    )}
                    {booking.guest_comments && (
                      <div>
                        <div className="text-xs text-gray-500">Guest Comments</div>
                        <div className="font-medium">{booking.guest_comments}</div>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className="flex justify-end gap-1 mt-3 pt-3 border-t border-gray-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => onEdit(booking.id)}
                    className="p-1.5 hover:bg-blue-100 rounded"
                    title="Edit"
                  >
                    <Edit2 size={18} className="text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(booking.id)}
                    className="p-1.5 hover:bg-red-100 rounded"
                    title="Delete"
                  >
                    <Trash2 size={18} className="text-red-600" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BookingsList;
