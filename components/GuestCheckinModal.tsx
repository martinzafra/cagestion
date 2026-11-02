'use client';

import React, { useEffect, useState } from 'react';
import { X, Copy, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, BookingGuest } from '@/lib/supabase';
import { formatDate } from '@/lib/calculations';
import {
  DOCUMENT_TYPE_LABELS,
  RELATIONSHIP_LABELS,
  SEX_LABELS,
  getCountryName,
  ageOn,
} from '@/lib/guestCheckin';

interface Props {
  bookingId: string;
  guestName: string;
  onClose: () => void;
  // Fired after guests are removed so the caller can refresh its count.
  onGuestsChange?: (count: number) => void;
}

// Admin side of the guest self check-in: the shareable link for one booking
// plus the travellers the guests have submitted through it.
export default function GuestCheckinModal({ bookingId, guestName, onClose, onGuestsChange }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [guests, setGuests] = useState<BookingGuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: booking, error: bookingError }, { data: rows, error: guestsError }] =
          await Promise.all([
            supabase
              .from('bookings')
              .select('checkin_token, checkin_submitted_at')
              .eq('id', bookingId)
              .single(),
            supabase
              .from('booking_guests')
              .select('*')
              .eq('booking_id', bookingId)
              .order('position', { ascending: true }),
          ]);
        if (bookingError) throw bookingError;
        if (guestsError) throw guestsError;
        setToken(booking.checkin_token);
        setSubmittedAt(booking.checkin_submitted_at);
        setGuests((rows as BookingGuest[]) || []);
      } catch (error: any) {
        toast.error(error.message || 'Failed to load guest check-in');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookingId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const link = token ? `${window.location.origin}/public/checkin/${token}` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Check-in link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleDelete = async (guest: BookingGuest) => {
    if (!confirm(`Remove ${guest.first_name} ${guest.last_name_1}?`)) return;
    try {
      const { error } = await supabase.from('booking_guests').delete().eq('id', guest.id);
      if (error) throw error;
      const next = guests.filter((g) => g.id !== guest.id);
      setGuests(next);
      onGuestsChange?.(next.length);
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove guest');
    }
  };

  // Every field is listed, empty ones as a dash, so each traveller can be
  // checked line by line against their passport / DNI.
  const guestFields = (g: BookingGuest): [string, React.ReactNode][] => [
    ['First name', g.first_name],
    ['Surname', g.last_name_1],
    ['Second surname', g.last_name_2],
    ['Sex', SEX_LABELS[g.sex]],
    ['Date of birth', g.birth_date && `${formatDate(g.birth_date)} (${ageOn(g.birth_date)} years)`],
    ['Nationality', getCountryName(g.nationality)],
    ['Document type', g.document_type && DOCUMENT_TYPE_LABELS[g.document_type]],
    ['Document number', g.document_number && <span className="font-mono">{g.document_number}</span>],
    [
      'Support number',
      g.document_support_number && <span className="font-mono">{g.document_support_number}</span>,
    ],
    ['Issue date', g.document_issue_date && formatDate(g.document_issue_date)],
    ['Address', g.address],
    ['City', g.city],
    ['Postcode', g.postal_code],
    ['Country of residence', getCountryName(g.country)],
    ['Phone', g.phone],
    ['Email', g.email],
    ['Relationship (minor)', g.relationship && RELATIONSHIP_LABELS[g.relationship]],
  ];

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/40 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Guest check-in</h2>
            <p className="text-sm text-gray-500">{guestName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <label className="label">Link to send to the guest</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={link}
                  onFocus={(e) => e.target.select()}
                  className="input flex-1 text-sm"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!link}
                  className="btn-secondary flex items-center gap-1.5"
                >
                  <Copy size={16} />
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Guests can submit (and resend corrections) until Police Registration is marked
                Done or NA, even after check-out. After that the link stops accepting changes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Guests submitted ({guests.length})
                {submittedAt && (
                  <span className="text-gray-500 font-normal text-sm">
                    {' '}
                    · last sent {formatDate(submittedAt)}
                  </span>
                )}
              </h3>
              {guests.length === 0 ? (
                <p className="text-sm text-gray-500">No guest details received yet.</p>
              ) : (
                <div className="space-y-3">
                  {guests.map((g) => (
                    <div key={g.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium text-gray-900">
                          {g.position}. {g.first_name} {g.last_name_1} {g.last_name_2 || ''}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(g)}
                          title="Remove guest"
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                      <dl className="grid grid-cols-[auto_1fr] sm:grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-1 mt-2">
                        {guestFields(g).map(([label, value]) => (
                          <React.Fragment key={label}>
                            <dt className="text-gray-500 whitespace-nowrap">{label}</dt>
                            <dd className="text-gray-900 break-words min-w-0">
                              {value || <span className="text-gray-300">—</span>}
                            </dd>
                          </React.Fragment>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
