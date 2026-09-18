'use client';

import React from 'react';
import { formatCurrencyPaper } from '@/lib/calculations';

export interface SettlementData {
  apartmentName: string;
  ownerName: string | null;
  guestName: string;
  bookingRef: string;
  platformName: string;
  checkInDate: string; // ISO yyyy-mm-dd
  checkOutDate: string; // ISO yyyy-mm-dd
  nights: number;
  pricePerNight: number;
  cleaningCharge: number;
  otherCharge: number;
  rent: number;
  platformFee: number;
  caFee: number;
  caVat: number;
  toOwner: number;
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
        className="relative w-full max-w-2xl mx-auto bg-white border border-ink/20 rounded-lg shadow-card p-6 sm:p-10"
      >
        {data.isSent && (
          <div className="absolute top-5 right-5 sm:right-8 -rotate-6 border-2 border-green-700 text-green-700 bg-green-50/60 rounded px-3 py-1 text-xs font-bold uppercase tracking-wide opacity-80">
            Sent ✓
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="font-display font-bold text-xl">
            casa amiga
            <span className="block font-sans font-medium text-[11px] uppercase tracking-wide text-gray mt-0.5">
              Property Management
            </span>
          </div>
          <div className="text-right text-xs text-gray">
            <b className="block text-ink text-sm">{formatDateLong(data.issuedDate)}</b>
            Settlement issued
          </div>
        </div>

        <div className="border-[1.5px] border-ink px-4 py-2 font-bold tracking-wide mb-5">
          BOOKING SETTLEMENT
        </div>

        <div className="flex flex-col gap-1 mb-5">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="italic text-gray text-sm font-medium">Apartment:</span>
            <span className="text-lg font-semibold">{data.apartmentName}</span>
          </div>
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="italic text-gray text-sm font-medium">Owner:</span>
            <span className="text-base font-semibold">{data.ownerName || '—'}</span>
          </div>
          <div className="text-[15px] text-gray italic mt-1">{data.guestName}</div>
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
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Casa Amiga · Owner settlement statement, generated from confirmed booking &amp; revenue records.
        </p>
      </div>
    );
  }
);

export default SettlementPaper;
