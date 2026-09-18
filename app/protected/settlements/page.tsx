'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Printer, Check, Paperclip, Upload, X } from 'lucide-react';
import {
  calculateDailyPricePerNight,
  formatCurrency,
  formatDate,
  round2,
} from '@/lib/calculations';
import { getPlatformBadge } from '@/lib/platformBadge';
import { fetchAllApartments } from '@/lib/apartmentAccess';
import SettlementPaper, { SettlementData } from '@/components/SettlementPaper';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const todayISO = () => new Date().toISOString().split('T')[0];

interface SettlementRecord {
  id: string;
  apartmentId: string;
  apartmentName: string;
  ownerName: string | null;
  guestName: string;
  bookingRef: string;
  platformName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  pricePerNight: number;
  cleaningCharge: number;
  otherCharge: number;
  rent: number;
  // null when there's no Commission entry in Revenue & Invoicing yet - the
  // booking is on the radar (confirmed or later) but not settle-able.
  platformFee: number | null;
  caFee: number | null;
  caVat: number | null;
  toOwner: number | null;
  hasRevenue: boolean;
  status: 'pending' | 'sent';
  issuedDate: string;
  fileUrl: string | null;
  bookingStatus: string;
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'pending' | 'sent' | 'azure';
}) {
  const valueClass =
    tone === 'pending' ? 'text-amber-700' : tone === 'sent' ? 'text-green-700' : 'text-azure';
  return (
    <div className="card">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-display text-3xl font-bold mt-0.5 tabular-nums ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}

function SettlementsPageInner() {
  const searchParams = useSearchParams();
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [apartments, setApartments] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'sent'>('pending');
  const [apartmentFilter, setApartmentFilter] = useState('all');
  const [settlementDateInput, setSettlementDateInput] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appliedDeepLinkRef = useRef(false);

  useEffect(() => {
    checkAuth();
    fetchAllApartments().then((data) => setApartments(data.map((a) => ({ id: a.id, name: a.name }))));
  }, []);

  useEffect(() => {
    if (userRole === 'admin') fetchSettlements();
  }, [userRole]);

  // Pick up ?booking=<id> from the To Do page's "+" link, but only once,
  // right after the first successful load - a later refetch (e.g. after
  // archiving) must never yank the selection back to that booking.
  useEffect(() => {
    if (loading || records.length === 0 || appliedDeepLinkRef.current) return;
    const wanted = searchParams.get('booking');
    if (!wanted) return;
    appliedDeepLinkRef.current = true;
    if (records.some((r) => r.id === wanted)) {
      setSelectedId(wanted);
    } else {
      toast.error("That booking isn't ready for a settlement — it needs to be Confirmed (not Pending/Cancelled) and CA Inv and Liquidation can't be N/A.");
    }
  }, [loading, records, searchParams]);

  // Default selection once records are in: prefer the first Pending one so
  // it matches the queue's default filter. Re-evaluates against whatever
  // records currently holds (instead of a one-shot ref) so it can't lock
  // onto a stale answer if the fetch effect runs more than once in dev.
  useEffect(() => {
    if (loading || records.length === 0 || selectedId !== null) return;
    const firstPending = records.find((r) => r.status === 'pending');
    setSelectedId((firstPending || records[0]).id);
  }, [loading, records, selectedId]);

  const selected = records.find((r) => r.id === selectedId) || null;

  useEffect(() => {
    if (selected) setSettlementDateInput(selected.issuedDate);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (userData?.role !== 'admin') {
        toast.error('Access denied. Settlements are admin only.');
        window.location.href = '/protected/bookings';
        return;
      }
      setUserRole('admin');
    } catch (error) {
      toast.error('Authorization failed');
    }
  };

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const [bookingsRes, revenueRes, expensesRes] = await Promise.all([
        supabase
          .from('bookings')
          .select(
            `id, booking_ref, guest_name, status,
             check_in_date, check_out_date, nights,
             price_basis, daily_price, total_rent, cleaning_charge, other_charge,
             final_liquidation, final_liquidation_date, final_liquidation_file,
             apartment_id, apartment:inventory_apartments(name, owner_name),
             platform:inventory_platforms(name)`
          )
          .neq('final_liquidation', 'NA')
          .in('status', ['CONFIRMED', 'DONE', 'FINISHED'])
          .order('check_in_date', { ascending: false }),
        supabase
          .from('revenue_invoicing')
          .select('booking_id, amount, vat, item:inventory_invoice_items(name)'),
        supabase
          .from('expenses')
          .select('booking_id, total, category:inventory_expense_types(name)'),
      ]);
      if (bookingsRes.error) throw bookingsRes.error;
      if (revenueRes.error) throw revenueRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const commissionByBooking = new Map<string, { fee: number; vat: number }>();
      (revenueRes.data || []).forEach((r: any) => {
        if (!r.booking_id || r.item?.name !== 'Commission') return;
        const entry = commissionByBooking.get(r.booking_id) || { fee: 0, vat: 0 };
        entry.fee += r.amount || 0;
        entry.vat += r.vat || 0;
        commissionByBooking.set(r.booking_id, entry);
      });

      const platformFeeByBooking = new Map<string, number>();
      (expensesRes.data || []).forEach((e: any) => {
        if (!e.booking_id || e.category?.name !== 'Platform Invoice') return;
        platformFeeByBooking.set(
          e.booking_id,
          (platformFeeByBooking.get(e.booking_id) || 0) + (e.total || 0)
        );
      });

      const nextRecords: SettlementRecord[] = [];
      (bookingsRes.data || []).forEach((b: any) => {
        const commission = commissionByBooking.get(b.id);

        const pricePerNight = calculateDailyPricePerNight(b.daily_price || 0, b.price_basis || 'DAY');
        const rent = b.total_rent ?? round2(pricePerNight * (b.nights || 0));
        const cleaningCharge = b.cleaning_charge || 0;
        const otherCharge = b.other_charge || 0;
        const platformFee = commission ? platformFeeByBooking.get(b.id) || 0 : null;
        const toOwner = commission
          ? round2(rent + cleaningCharge + otherCharge - (platformFee || 0) - commission.fee - commission.vat)
          : null;

        nextRecords.push({
          id: b.id,
          apartmentId: b.apartment_id,
          apartmentName: b.apartment?.name || 'Unknown apartment',
          ownerName: b.apartment?.owner_name || null,
          guestName: b.guest_name,
          bookingRef: b.booking_ref,
          platformName: b.platform?.name || 'Other',
          checkInDate: b.check_in_date,
          checkOutDate: b.check_out_date,
          nights: b.nights,
          pricePerNight,
          cleaningCharge,
          otherCharge,
          rent,
          platformFee,
          caFee: commission ? commission.fee : null,
          caVat: commission ? commission.vat : null,
          toOwner,
          hasRevenue: !!commission,
          status: b.final_liquidation === 'SENT' ? 'sent' : 'pending',
          issuedDate: b.final_liquidation_date || todayISO(),
          fileUrl: b.final_liquidation_file,
          bookingStatus: b.status,
        });
      });

      setRecords(nextRecords);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const visibleRecords = records.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (apartmentFilter !== 'all' && r.apartmentId !== apartmentFilter) return false;
    return true;
  });
  const pending = records.filter((r) => r.status === 'pending');
  const sent = records.filter((r) => r.status === 'sent');
  const pendingMissingRevenue = pending.filter((r) => !r.hasRevenue).length;
  const apartmentsInQueue = Array.from(new Set(records.map((r) => r.apartmentName))).sort();

  const handleViewFile = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('settlement-attachments')
        .createSignedUrl(path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast.error(error.message || 'Failed to open settlement PDF');
    }
  };

  const handlePrint = () => window.print();

  // Shared by both the auto-generated PDF (Archive button) and a manually
  // attached one (Attach PDF): once the file is uploaded to `path`, marking
  // the booking Sent and reflecting it locally is identical either way.
  const finalizeSettlement = async (record: SettlementRecord, path: string) => {
    const updates: Record<string, any> = {
      final_liquidation: 'SENT',
      final_liquidation_date: settlementDateInput,
      final_liquidation_file: path,
    };
    if (record.bookingStatus !== 'CANCELLED') {
      updates.status = todayISO() > record.checkOutDate ? 'FINISHED' : 'DONE';
    }
    const { error } = await supabase.from('bookings').update(updates).eq('id', record.id);
    if (error) throw error;
    setRecords((prev) =>
      prev.map((r) =>
        r.id === record.id ? { ...r, status: 'sent', issuedDate: settlementDateInput, fileUrl: path } : r
      )
    );
  };

  const handleArchive = async () => {
    if (!selected || selected.status === 'sent' || !selected.hasRevenue || !paperRef.current || !settlementDateInput)
      return;
    setArchiving(true);
    try {
      const canvas = await html2canvas(paperRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const widthPt = canvas.width / 2;
      const heightPt = canvas.height / 2;
      const pdf = new jsPDF({ unit: 'pt', format: [widthPt, heightPt] });
      pdf.addImage(imgData, 'PNG', 0, 0, widthPt, heightPt);
      const blob = pdf.output('blob');

      const path = `${selected.id}/${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('settlement-attachments')
        .upload(path, blob, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      await finalizeSettlement(selected, path);
      toast.success('Settlement archived and booking marked as Sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive settlement');
    } finally {
      setArchiving(false);
    }
  };

  const handleAttachFile = async (file?: File) => {
    if (!file || !selected || !settlementDateInput) return;
    setAttaching(true);
    try {
      const path = `${selected.id}/${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('settlement-attachments')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' });
      if (uploadError) throw uploadError;

      await finalizeSettlement(selected, path);
      toast.success('Settlement PDF attached and booking marked as Sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to attach settlement PDF');
    } finally {
      setAttaching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = async () => {
    if (!selected || !selected.fileUrl) return;
    if (!confirm('Remove this settlement PDF? The booking will go back to Pending.')) return;
    try {
      await supabase.storage.from('settlement-attachments').remove([selected.fileUrl]);
      const updates: Record<string, any> = {
        final_liquidation: 'TO BE DONE',
        final_liquidation_file: null,
      };
      if (selected.bookingStatus === 'FINISHED' || selected.bookingStatus === 'DONE') {
        updates.status = 'CONFIRMED';
      }
      const { error } = await supabase.from('bookings').update(updates).eq('id', selected.id);
      if (error) throw error;
      setRecords((prev) =>
        prev.map((r) => (r.id === selected.id ? { ...r, status: 'pending', fileUrl: null } : r))
      );
      toast.success('Settlement PDF removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove settlement PDF');
    }
  };

  const paperData: SettlementData | null = selected
    ? {
        apartmentName: selected.apartmentName,
        ownerName: selected.ownerName,
        bookingRef: selected.bookingRef,
        platformName: selected.platformName,
        checkInDate: selected.checkInDate,
        checkOutDate: selected.checkOutDate,
        nights: selected.nights,
        pricePerNight: selected.pricePerNight,
        cleaningCharge: selected.cleaningCharge,
        otherCharge: selected.otherCharge,
        rent: selected.rent,
        platformFee: selected.platformFee,
        caFee: selected.caFee,
        caVat: selected.caVat,
        toOwner: selected.toOwner,
        issuedDate: settlementDateInput || selected.issuedDate,
        isSent: selected.status === 'sent',
      }
    : null;

  if (userRole !== 'admin') return null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold text-gray-900">Owner Settlements</h1>
        <p className="text-gray-600 mt-1">
          Preview, print and archive the payout statement sent to each apartment owner.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <StatCard
          label="Pending settlement"
          value={String(pending.length)}
          sub={
            pendingMissingRevenue > 0
              ? `${pendingMissingRevenue} still need Revenue assigned`
              : 'Ready to preview and send'
          }
          tone="pending"
        />
        <StatCard
          label="Sent"
          value={String(sent.length)}
          sub="Archived with a PDF on file"
          tone="sent"
        />
        <StatCard
          label="Apartments in queue"
          value={String(apartmentsInQueue.length)}
          sub={apartmentsInQueue.join(' · ') || 'None yet'}
          tone="azure"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : records.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          Nothing here yet. A booking shows up once it's Confirmed or later, and CA Inv and
          Liquidation isn't set to N/A.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px),1fr] gap-6 items-start print:block">
          <div className="card print:hidden">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Queue</h2>
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-wrap gap-2">
                {(['all', 'pending', 'sent'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border-[1.5px] transition ${
                      statusFilter === s
                        ? 'bg-azure border-azure text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {s === 'all' ? `All (${records.length})` : s === 'pending' ? `Pending (${pending.length})` : `Sent (${sent.length})`}
                  </button>
                ))}
              </div>
              <select
                value={apartmentFilter}
                onChange={(e) => setApartmentFilter(e.target.value)}
                className="select"
              >
                <option value="all">All apartments</option>
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name}
                  </option>
                ))}
              </select>
            </div>

            {visibleRecords.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-6">
                No settlements match these filters.
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setApartmentFilter('all');
                  }}
                  className="block mx-auto mt-2 text-azure font-medium hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              (['pending', 'sent'] as const).map((group) => {
                const items = visibleRecords.filter((r) => r.status === group);
                if (items.length === 0) return null;
                return (
                  <div key={group} className="mb-1">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-4 mb-2">
                      {group === 'pending' ? 'Pending' : 'Sent'} — {items.length}
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {items.map((r) => {
                        const badge = getPlatformBadge(r.platformName);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedId(r.id)}
                            className={`text-left border-[1.5px] rounded-2xl p-3 transition ${
                              r.id === selectedId
                                ? 'border-azure bg-blue-50'
                                : 'border-gray-200 bg-white hover:shadow-card'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                                    badge.textClassName || 'text-white'
                                  } ${badge.className}`}
                                >
                                  {badge.text}
                                </span>
                                <span className="font-semibold text-sm truncate">{r.apartmentName}</span>
                              </div>
                              <span
                                className={`font-bold text-sm tabular-nums shrink-0 ${
                                  r.hasRevenue ? '' : 'text-amber-600 font-medium normal-case'
                                }`}
                              >
                                {r.hasRevenue ? formatCurrency(r.toOwner!) : 'Revenue pending'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {r.guestName} · Ref {r.bookingRef}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-gray-400 tabular-nums">
                                {formatDate(r.checkInDate)} – {formatDate(r.checkOutDate)} ({r.nights}n)
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                  r.status === 'sent'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {r.status === 'sent' ? 'Sent' : 'Pending'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col gap-5 min-w-0">
            {selected && (
              <div className="card print:hidden flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-bold text-gray-900">
                    {selected.apartmentName} · {selected.guestName}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {formatDate(selected.checkInDate)} – {formatDate(selected.checkOutDate)} ·{' '}
                    {selected.nights} nights
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="settlement-date" className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                    Settlement date
                  </label>
                  <input
                    id="settlement-date"
                    type="date"
                    value={settlementDateInput}
                    disabled={selected.status === 'sent'}
                    onChange={(e) => setSettlementDateInput(e.target.value)}
                    className="input text-base sm:text-sm py-2 disabled:bg-gray-50 disabled:opacity-60"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => handleAttachFile(e.target.files?.[0])}
                  />
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={!selected.hasRevenue}
                    title={selected.hasRevenue ? undefined : 'Add a Commission entry in Revenue & Invoicing first'}
                    className="btn-secondary flex items-center gap-2 disabled:opacity-60"
                  >
                    <Printer size={16} />
                    Print / Save as PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attaching}
                    title="Attach a settlement PDF you already have, instead of generating one"
                    className="btn-secondary flex items-center gap-2 disabled:opacity-60"
                  >
                    <Upload size={16} />
                    {attaching ? 'Attaching…' : 'Attach PDF'}
                  </button>
                  {selected.status === 'sent' ? (
                    <>
                      <button type="button" disabled className="btn-primary flex items-center gap-2 opacity-60">
                        <Check size={16} />
                        Archived ✓ · {formatDate(selected.issuedDate)}
                      </button>
                      {selected.fileUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleViewFile(selected.fileUrl!)}
                            className="text-sm text-azure font-medium hover:underline flex items-center gap-1"
                          >
                            <Paperclip size={14} />
                            View archived PDF
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            title="Remove the attached PDF and reopen this settlement"
                            className="p-1.5 hover:bg-red-50 rounded"
                          >
                            <X size={16} className="text-red-500" />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleArchive}
                      disabled={archiving || !selected.hasRevenue}
                      title={selected.hasRevenue ? undefined : 'Add a Commission entry in Revenue & Invoicing first'}
                      className="btn-primary flex items-center gap-2 disabled:opacity-60"
                    >
                      <Check size={16} />
                      {archiving ? 'Archiving…' : 'Archive & Mark as Sent'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {paperData ? (
              <SettlementPaper ref={paperRef} data={paperData} />
            ) : (
              <div className="card text-center py-12 text-gray-500 print:hidden">
                Select a booking from the queue to preview its settlement.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettlementsPage() {
  return (
    <Suspense fallback={null}>
      <SettlementsPageInner />
    </Suspense>
  );
}
