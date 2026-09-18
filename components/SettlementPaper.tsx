'use client';

import React from 'react';
import { formatCurrencyPaper } from '@/lib/calculations';

export interface SettlementData {
  apartmentName: string;
  ownerName: string | null;
  bookingRef: string;
  platformName: string;
  checkInDate: string; // ISO yyyy-mm-dd
  checkOutDate: string; // ISO yyyy-mm-dd
  nights: number;
  pricePerNight: number;
  cleaningCharge: number;
  otherCharge: number;
  rent: number;
  // null when this booking has no Commission entry in Revenue & Invoicing yet -
  // there's nothing to compute the payout from.
  platformFee: number | null;
  caFee: number | null;
  caVat: number | null;
  toOwner: number | null;
  issuedDate: string; // ISO yyyy-mm-dd
  isSent: boolean;
}

// DD/MM/YYYY (full year) - the app's own formatDate() uses a 2-digit year,
// but this printed document follows the owner's own paperwork convention.
function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function MoneyRow({
  label,
  value,
  negative = false,
  strong = false,
  ruled = false,
}: {
  label: string;
  value: number;
  negative?: boolean;
  strong?: boolean;
  ruled?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-1.5 text-[15px] tabular-nums ${
        strong ? 'font-bold text-[16px] border-t-[1.5px] border-ink mt-1 pt-2.5' : ''
      } ${ruled ? 'border-t border-sand mt-1 pt-2.5' : ''}`}
    >
      <span className={strong ? '' : 'text-gray'}>{label}</span>
      <span>
        {negative ? '− ' : ''}
        {formatCurrencyPaper(value)}
      </span>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="italic text-gray font-medium">{label}</dt>
      <dd className="m-0 tabular-nums">{value}</dd>
    </>
  );
}

const SettlementPaper = React.forwardRef<HTMLDivElement, { data: SettlementData }>(
  function SettlementPaper({ data }, ref) {
    const total = data.rent + data.cleaningCharge + data.otherCharge;

    return (
      <div
        ref={ref}
        className="relative w-full max-w-2xl mx-auto bg-white border border-ink/20 rounded-lg shadow-card overflow-hidden"
      >
        {/* Ribbon - same treatment as the app's own top nav (Navigation.tsx):
            azure bar, real logo, font-display wordmark. Narrow widths stack
            into two rows (like the nav collapses to logo + hamburger) since
            wordmark + title + date can't share one row below sm. */}
        <div className="bg-azure text-white">
          <div className="sm:hidden">
            <div className="flex items-center justify-between gap-3 pl-5 pr-4 pt-3">
              <div className="flex items-center gap-2 min-w-0">
                <img src="/images/logo/CA-logo2.png" alt="Casa Amiga logo" className="h-6 w-auto flex-shrink-0" />
                <span className="font-display font-bold text-base tracking-wide lowercase truncate">
                  casa amiga
                </span>
              </div>
              <div className="text-right text-[10px] text-white/75 leading-tight flex-shrink-0">
                <b className="block text-white text-xs font-semibold">{formatDateLong(data.issuedDate)}</b>
                Settlement issued
              </div>
            </div>
            <div className="text-center text-xs font-bold tracking-wide uppercase pb-2.5 pt-1.5">
              Booking Settlement
            </div>
          </div>

          <div className="hidden sm:grid grid-cols-3 items-center gap-3 h-16 px-8">
            <div className="flex items-center gap-2 justify-self-start min-w-0">
              <img src="/images/logo/CA-logo2.png" alt="Casa Amiga logo" className="h-8 w-auto flex-shrink-0" />
              <span className="font-display font-bold text-xl tracking-wide lowercase truncate">
                casa amiga
              </span>
            </div>
            <div className="justify-self-center text-sm font-bold tracking-wide uppercase text-center whitespace-nowrap">
              Booking Settlement
            </div>
            <div className="justify-self-end text-right text-xs text-white/75 leading-tight">
              <b className="block text-white text-sm font-semibold">{formatDateLong(data.issuedDate)}</b>
              Settlement issued
            </div>
          </div>
        </div>

        <div className="relative p-6 sm:p-10">
          {data.isSent && (
            <div className="absolute top-4 right-5 sm:right-8 -rotate-6 border-2 border-green-700 text-green-700 bg-green-50/60 rounded px-3 py-1 text-xs font-bold uppercase tracking-wide opacity-80">
              Sent ✓
            </div>
          )}

          <div className="flex flex-col gap-1 mb-5">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="italic text-gray text-sm font-medium">Apartment:</span>
              <span className="text-lg font-semibold">{data.apartmentName}</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="italic text-gray text-sm font-medium">Owner:</span>
              <span className="text-base font-semibold">{data.ownerName || '—'}</span>
            </div>
          </div>

          <dl className="grid grid-cols-[7rem,1fr] sm:grid-cols-[11rem,1fr] gap-y-2.5 gap-x-4 mb-6 text-[15px]">
            <MetaRow label="Ref. number" value={data.bookingRef} />
            <MetaRow label="Platform" value={data.platformName} />
            <MetaRow label="Date Check-In" value={formatDateLong(data.checkInDate)} />
            <MetaRow label="Date Check-Out" value={formatDateLong(data.checkOutDate)} />
            <MetaRow label="Number of nights" value={String(data.nights)} />
            <MetaRow label="Price per night" value={formatCurrencyPaper(data.pricePerNight)} />
          </dl>

          <div>
            <MoneyRow label="Rent" value={data.rent} />
            {data.cleaningCharge > 0 && <MoneyRow label="Cleaning fee" value={data.cleaningCharge} />}
            {data.otherCharge > 0 && <MoneyRow label="Other charges" value={data.otherCharge} />}
            <MoneyRow label="Total" value={total} strong />

            {data.caFee === null || data.caVat === null || data.platformFee === null || data.toOwner === null ? (
              <div className="mt-4 rounded border border-dashed border-amber-400 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
                Revenue not yet assigned for this booking — add a Commission entry in{' '}
                <span className="font-semibold">Revenue &amp; Invoicing</span>, then come back here to
                work out the payout.
              </div>
            ) : (
              <>
                <MoneyRow
                  label={`Platform fee (${data.platformName})`}
                  value={data.platformFee}
                  negative
                  ruled
                />
                <MoneyRow label="Casa Amiga Fee" value={data.caFee} negative />
                <MoneyRow label="Casa Amiga VAT" value={data.caVat} negative />

                <div className="flex justify-between items-center gap-4 bg-blue-50 rounded px-4 py-3.5 mt-4">
                  <span className="text-sm font-bold uppercase tracking-wide text-azure-hover">
                    To be transferred to owner
                  </span>
                  <span className="text-xl font-bold text-azure-hover tabular-nums">
                    {formatCurrencyPaper(data.toOwner)}
                  </span>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-6">
            Casa Amiga · Owner settlement statement, generated from confirmed booking &amp; revenue records.
          </p>
        </div>
      </div>
    );
  }
);

export default SettlementPaper;
