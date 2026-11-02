'use client';

import React, { useEffect, useState } from 'react';
import { X, Copy, Trash2, FileDown, AlertTriangle } from 'lucide-react';
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
import {
  SES_PAYMENT_TYPES,
  SesBooking,
  buildSesXml,
  sesProblems,
  suggestPaymentType,
} from '@/lib/sesXml';

// Booking fields the SES XML needs besides the guests.
interface BookingInfo {
  booking_ref: string | null;
  booking_id_number: number;
  booking_date: string;
  check_in_date: string;
  check_in_time: string | null;
  check_out_date: string;
  check_out_time: string | null;
  apartment: { id: string; name: string; ses_establishment_code: string | null } | null;
  platform: { name: string } | null;
  payment_type: { name: string } | null;
}

interface Props {
  bookingId: string;
  guestName: string;
  onClose: () => void;
  // Fired after guests are removed so the caller can refresh its count.
  onGuestsChange?: (count: number) => void;
}

// Admin side of the guest self check-in: the shareable link for one booking,
// the travellers the guests have submitted through it, and the SES XML to
// report them to the police.
export default function GuestCheckinModal({ bookingId, guestName, onClose, onGuestsChange }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [guests, setGuests] = useState<BookingGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [establishmentCode, setEstablishmentCode] = useState('');
  const [paymentType, setPaymentType] = useState('');
  // Guests that arrived without a postcode keep their input visible while
  // the admin types one in.
  const [missingPostcodeIds, setMissingPostcodeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const [{ data: booking, error: bookingError }, { data: rows, error: guestsError }] =
          await Promise.all([
            supabase
              .from('bookings')
              .select(`
                checkin_token, checkin_submitted_at,
                booking_ref, booking_id_number, booking_date,
                check_in_date, check_in_time, check_out_date, check_out_time,
                apartment:inventory_apartments(id, name, ses_establishment_code),
                platform:inventory_platforms(name),
                payment_type:inventory_payment_types(name)
              `)
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
        setMissingPostcodeIds(
          new Set(((rows as BookingGuest[]) || []).filter((g) => !g.postal_code).map((g) => g.id))
        );
        const bookingInfo = booking as unknown as BookingInfo;
        setInfo(bookingInfo);
        setEstablishmentCode(bookingInfo.apartment?.ses_establishment_code || '');
        setPaymentType(suggestPaymentType(bookingInfo.platform?.name, bookingInfo.payment_type?.name));
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

  // SES-only fields the admin completes here (the guest form doesn't ask
  // for an INE code, and older submissions may lack a postcode).
  const handleGuestFieldChange = (id: string, field: 'postal_code' | 'municipality_code', value: string) => {
    setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  };

  const persistGuestField = async (id: string, field: 'postal_code' | 'municipality_code', value: string) => {
    try {
      const { error } = await supabase
        .from('booking_guests')
        .update({ [field]: value.trim() || null })
        .eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    }
  };

  // The establishment code belongs to the apartment, so it is filled once
  // and reused for every booking there (also editable in Inventory).
  const persistEstablishmentCode = async () => {
    if (!info?.apartment) return;
    const value = establishmentCode.trim() || null;
    if (value === (info.apartment.ses_establishment_code || null)) return;
    try {
      const { data, error } = await supabase
        .from('inventory_apartments')
        .update({ ses_establishment_code: value })
        .eq('id', info.apartment.id)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Only an admin can change the establishment code');
      setInfo({ ...info, apartment: { ...info.apartment, ses_establishment_code: value } });
      toast.success(`Establishment code saved for ${info.apartment.name}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save establishment code');
    }
  };

  const sesBooking: SesBooking | null = info && {
    booking_ref: info.booking_ref,
    booking_id_number: info.booking_id_number,
    booking_date: info.booking_date,
    check_in_date: info.check_in_date,
    check_in_time: info.check_in_time,
    check_out_date: info.check_out_date,
    check_out_time: info.check_out_time,
    establishment_code: establishmentCode,
    payment_type: paymentType,
  };
  const problems = sesBooking ? sesProblems(sesBooking, guests) : [];

  const handleDownloadXml = () => {
    if (!sesBooking || problems.length) return;
    const xml = buildSesXml(sesBooking, guests);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ref = (info?.booking_ref || String(info?.booking_id_number)).replace(/[^\w-]+/g, '_');
    a.href = url;
    a.download = `parte-viajeros-${ref}.xml`;
    a.click();
    URL.revokeObjectURL(url);
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
                      {(g.country === 'ES' || missingPostcodeIds.has(g.id)) && (
                        <div className="mt-3 pt-3 border-t border-dashed grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {g.country === 'ES' && (
                            <div>
                              <label className="text-xs text-gray-500">
                                INE municipality code (for SES)
                              </label>
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                placeholder="e.g. 28079 (Madrid)"
                                value={g.municipality_code ?? ''}
                                onChange={(e) =>
                                  handleGuestFieldChange(g.id, 'municipality_code', e.target.value)
                                }
                                onBlur={(e) => persistGuestField(g.id, 'municipality_code', e.target.value)}
                                className="input text-sm font-mono"
                              />
                            </div>
                          )}
                          {missingPostcodeIds.has(g.id) && (
                            <div>
                              <label className="text-xs text-gray-500">Postcode (required by SES)</label>
                              <input
                                type="text"
                                value={g.postal_code ?? ''}
                                onChange={(e) => handleGuestFieldChange(g.id, 'postal_code', e.target.value)}
                                onBlur={(e) => persistGuestField(g.id, 'postal_code', e.target.value)}
                                className="input text-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {guests.length > 0 && info && (
              <div className="border-t pt-5">
                <h3 className="font-semibold text-gray-900">Police XML (SES.HOSPEDAJES)</h3>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">
                  Generates the &quot;parte de viajeros&quot; file to upload in SES.HOSPEDAJES →
                  Comunicaciones → Alta masiva (carga de fichero).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">
                      Establishment code{info.apartment ? ` · ${info.apartment.name}` : ''}
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="10-digit SES code"
                      value={establishmentCode}
                      onChange={(e) => setEstablishmentCode(e.target.value)}
                      onBlur={persistEstablishmentCode}
                      className="input text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="label">Payment type</label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="select text-sm"
                    >
                      <option value="">Select...</option>
                      {Object.entries(SES_PAYMENT_TYPES).map(([code, label]) => (
                        <option key={code} value={code}>
                          {label} ({code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {problems.length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                    <div className="flex items-center gap-1.5 font-medium mb-1">
                      <AlertTriangle size={14} />
                      Fix before generating:
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {problems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleDownloadXml}
                  disabled={problems.length > 0}
                  className="btn-primary mt-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <FileDown size={18} />
                  Download XML
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
