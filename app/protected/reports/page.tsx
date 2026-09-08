'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  BedDouble,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/calculations';
import { exportToExcel } from '@/lib/exportExcel';

// ---- Apartment Annual Report -----------------------------------------
// The report year runs from the apartment's contract anniversary date, not
// the calendar year (e.g. a contract signed 15 Mar runs 15 Mar - 14 Mar).
// Apartments with no contract date fall back to the plain calendar year.

function daysBetween(startISO: string, endISO: string): number {
  const [sy, sm, sd] = startISO.split('-').map(Number);
  const [ey, em, ed] = endISO.split('-').map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / 86400000);
}

function getPeriodBounds(
  contractDate: string | null,
  offset: number
): { start: string; end: string; usingCalendarFallback: boolean } {
  const todayISO = new Date().toISOString().split('T')[0];
  const [ty, tm, td] = todayISO.split('-').map(Number);

  if (!contractDate) {
    const year = ty + offset;
    return { start: `${year}-01-01`, end: `${year}-12-31`, usingCalendarFallback: true };
  }

  const [, cm, cd] = contractDate.split('-').map(Number);
  // Anchor year of the CURRENT period (offset 0): the most recent
  // anniversary on or before today.
  let anchorYear = ty;
  const anniversaryReached = tm > cm || (tm === cm && td >= cd);
  if (!anniversaryReached) anchorYear -= 1;
  anchorYear += offset;

  const start = `${anchorYear}-${String(cm).padStart(2, '0')}-${String(cd).padStart(2, '0')}`;
  const endDateUTC = new Date(Date.UTC(anchorYear + 1, cm - 1, cd - 1));
  const end = endDateUTC.toISOString().split('T')[0];
  return { start, end, usingCalendarFallback: false };
}

interface ApartmentReportData {
  apartmentName: string;
  periodStart: string;
  periodEnd: string;
  isInProgress: boolean;
  usingCalendarFallback: boolean;
  pctComplete: number;
  occupancyRate: number;
  occupiedNights: number;
  availableNights: number;
  totalBookings: number;
  avgLengthOfStay: number;
  totalRevenue: number;
  commission: number;
  caOther: number;
  totalExpenses: number;
  netIncome: number;
  adr: number;
  revPar: number;
  projectionFactor: number;
  platformCounts: Record<string, number>;
  availablePlatforms: string[];
}

function ReportKpiCard({
  label,
  value,
  projected,
  valueClassName = 'text-gray-900',
}: {
  label: string;
  value: string;
  projected?: string;
  valueClassName?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${valueClassName}`}>{value}</p>
      {projected && (
        <p className="text-xs text-gray-400 mt-1">Projected (full year): {projected}</p>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [userRole, setUserRole] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    occupancyRate: 0,
  });

  const [loading, setLoading] = useState(true);

  const [apartments, setApartments] = useState<any[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [apartmentReport, setApartmentReport] = useState<ApartmentReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [exportingBookings, setExportingBookings] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchStats();
    }
  }, [dateRange, userRole]);

  useEffect(() => {
    if (userRole) {
      fetchApartments();
    }
  }, [userRole]);

  useEffect(() => {
    if (selectedApartmentId) {
      fetchApartmentReport();
    } else {
      setApartmentReport(null);
    }
  }, [selectedApartmentId, periodOffset, selectedPlatform]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
        toast.error('Access denied. Reports are admin only.');
        window.location.href = '/protected/bookings';
        return;
      }

      setUserRole('admin');
      setLoading(false);
    } catch (error) {
      toast.error('Authorization failed');
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch bookings
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*')
        .gte('check_in_date', dateRange.start)
        .lte('check_out_date', dateRange.end)
        .eq('status', 'CONFIRMED');

      // Fetch revenue
      const { data: revenueData } = await supabase
        .from('revenue_invoicing')
        .select('amount')
        .gte('revenue_date', dateRange.start)
        .lte('revenue_date', dateRange.end);

      // Fetch expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('total')
        .gte('expense_date', dateRange.start)
        .lte('expense_date', dateRange.end);

      const totalRevenue = revenueData?.reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, e) => sum + (e.total || 0), 0) || 0;

      setStats({
        totalBookings: bookingsData?.length || 0,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        occupancyRate: 65, // Placeholder
      });
    } catch (error) {
      toast.error('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchApartments = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_apartments')
        .select('id, name, contract, contract_date, active')
        .order('name');
      if (error) throw error;
      const list = data || [];
      setApartments(list);
      setSelectedApartmentId((prev) => prev || 'ALL_ACTIVE');
    } catch (error) {
      toast.error('Failed to fetch apartments');
    }
  };

  const fetchApartmentReport = async () => {
    const isAll = selectedApartmentId === 'ALL';
    const isAllActive = selectedApartmentId === 'ALL_ACTIVE';
    const isAggregate = isAll || isAllActive;
    const apt = isAggregate ? null : apartments.find((a) => a.id === selectedApartmentId);
    if (!isAggregate && !apt) return;

    const activeApartments = apartments.filter((a) => a.active !== false);
    const activeApartmentIds = activeApartments.map((a) => a.id);

    setReportLoading(true);
    try {
      const { start, end, usingCalendarFallback } = getPeriodBounds(
        isAggregate ? null : apt!.contract_date,
        periodOffset
      );
      const todayISO = new Date().toISOString().split('T')[0];
      const isInProgress = todayISO < end;
      const elapsedEnd = isInProgress ? todayISO : end;

      let bookingsQuery = supabase
        .from('bookings')
        .select(
          'id, check_in_date, check_out_date, owners_booking, cleaning_charge, other_charge, guest_total_amount, total_rent, platform:inventory_platforms(name)'
        )
        .in('status', ['FINISHED', 'CANCELLED'])
        .lte('check_in_date', elapsedEnd)
        .gt('check_out_date', start);
      if (!isAggregate) bookingsQuery = bookingsQuery.eq('apartment_id', selectedApartmentId);
      else if (isAllActive) bookingsQuery = bookingsQuery.in('apartment_id', activeApartmentIds);

      const bookingsRes = await bookingsQuery;
      if (bookingsRes.error) throw bookingsRes.error;
      const allBookings: any[] = bookingsRes.data || [];

      // Occupancy always reflects every booking regardless of the platform
      // filter - the apartment is occupied or not, no matter who booked it.
      let occupiedNights = 0;
      allBookings.forEach((b) => {
        const overlapStart = b.check_in_date > start ? b.check_in_date : start;
        const overlapEnd = b.check_out_date < elapsedEnd ? b.check_out_date : elapsedEnd;
        const nights = daysBetween(overlapStart, overlapEnd);
        if (nights > 0) occupiedNights += nights;
      });
      // elapsedDays is a pure time measure (for the progress badge/
      // projections); availableNights is elapsedDays x apartment count when
      // aggregating "All Apartments", since each one has that many nights on
      // offer independently.
      const elapsedDays = daysBetween(start, elapsedEnd);
      const availableNights =
        elapsedDays * (isAll ? apartments.length : isAllActive ? activeApartments.length : 1);
      const occupancyRate = availableNights > 0 ? occupiedNights / availableNights : 0;

      // Only offer platforms that actually have a booking in this apartment/
      // period, not every platform in inventory.
      const availablePlatforms = Array.from(
        new Set(allBookings.map((b) => b.platform?.name || 'Other'))
      ).sort();

      // Everything else (revenue, expenses, counts, ADR) is scoped to the
      // selected platform when one is chosen.
      const filteredBookings = selectedPlatform
        ? allBookings.filter((b) => (b.platform?.name || 'Other') === selectedPlatform)
        : allBookings;

      let filteredOccupiedNights = 0;
      let revenueNights = 0; // excludes owner-use nights - their rate is 0
      const platformCounts: Record<string, number> = {};
      filteredBookings.forEach((b) => {
        const overlapStart = b.check_in_date > start ? b.check_in_date : start;
        const overlapEnd = b.check_out_date < elapsedEnd ? b.check_out_date : elapsedEnd;
        const nights = daysBetween(overlapStart, overlapEnd);
        if (nights > 0) {
          filteredOccupiedNights += nights;
          if (!b.owners_booking) revenueNights += nights;
        }
        const platformName = b.platform?.name || 'Other';
        platformCounts[platformName] = (platformCounts[platformName] || 0) + 1;
      });
      const filteredBookingIds = new Set(filteredBookings.map((b) => b.id));

      let revenueQuery = supabase
        .from('revenue_invoicing')
        .select('total_services, amount, amount_with_vat, booking_id, item:inventory_invoice_items(name)')
        .gte('revenue_date', start)
        .lte('revenue_date', elapsedEnd);
      if (!isAggregate) revenueQuery = revenueQuery.eq('apartment_id', selectedApartmentId);
      else if (isAllActive) revenueQuery = revenueQuery.in('apartment_id', activeApartmentIds);

      let expensesQuery = supabase
        .from('expenses')
        .select('total, amount, booking_id, category:inventory_expense_types(name)')
        .gte('expense_date', start)
        .lte('expense_date', elapsedEnd);
      if (!isAggregate) expensesQuery = expensesQuery.eq('apartment_id', selectedApartmentId);
      else if (isAllActive) expensesQuery = expensesQuery.in('apartment_id', activeApartmentIds);

      const [revenueRes, expensesRes] = await Promise.all([revenueQuery, expensesQuery]);
      if (revenueRes.error) throw revenueRes.error;
      if (expensesRes.error) throw expensesRes.error;

      let revenue: any[] = revenueRes.data || [];
      let expenses: any[] = expensesRes.data || [];

      // Revenue/expenses tied to a booking outside the current valid set -
      // e.g. one that's still PENDING/CONFIRMED/DONE and not yet finalized,
      // or (when a platform is selected) booked on a different platform -
      // shouldn't count. CANCELLED bookings still count: the guest was
      // still charged and commission still applies. A general entry with
      // no booking_id is apartment-level and always counts.
      revenue = revenue.filter((r) => !r.booking_id || filteredBookingIds.has(r.booking_id));
      expenses = expenses.filter((e) => !e.booking_id || filteredBookingIds.has(e.booking_id));

      // Total Revenue: pure rental income - guest_total_amount minus the
      // cleaning/other pass-through charges, straight from bookings (not
      // revenue_invoicing).
      const totalRevenue = filteredBookings.reduce(
        (sum, b) => sum + ((b.guest_total_amount || 0) - (b.cleaning_charge || 0) - (b.other_charge || 0)),
        0
      );
      const commission = revenue
        .filter((r) => r.item?.name === 'Commission')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      const commissionWithVat = revenue
        .filter((r) => r.item?.name === 'Commission')
        .reduce((sum, r) => sum + (r.amount_with_vat || 0), 0);
      const platformInvoiceWithVat = expenses
        .filter((e) => e.category?.name === 'Platform Invoice')
        .reduce((sum, e) => sum + (e.total || 0), 0);
      // CA Other: the margin between what guests were charged for
      // cleaning and what was actually paid out for Cleaning/Laundry on
      // those same bookings. Net of VAT (expenses.amount), matching the
      // Bookings Report export.
      const cleaningChargeTotal = filteredBookings.reduce((sum, b) => sum + (b.cleaning_charge || 0), 0);
      const cleaningLaundryExpenses = expenses
        .filter(
          (e) =>
            e.booking_id &&
            filteredBookingIds.has(e.booking_id) &&
            ['Cleaning', 'Laundry'].includes(e.category?.name)
        )
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const caOther = cleaningChargeTotal - cleaningLaundryExpenses;
      // Total Expenses (owner profitability view): what CA and the platform
      // actually deduct - CA Commission + CA Commission VAT + Platform
      // commission + Platform Commission VAT.
      const totalExpenses = commissionWithVat + platformInvoiceWithVat;
      // Net Income = Total Revenue - Total Expenses.
      const netIncome = totalRevenue - totalExpenses;
      const adr = revenueNights > 0 ? totalRevenue / revenueNights : 0;
      // RevPAR keeps the same unfiltered available-nights denominator as
      // Occupancy, so a single platform's RevPAR shows its contribution per
      // available night rather than being inflated by a smaller base.
      const revPar = availableNights > 0 ? totalRevenue / availableNights : 0;
      const avgLengthOfStay =
        filteredBookings.length > 0 ? filteredOccupiedNights / filteredBookings.length : 0;

      const totalDays = daysBetween(start, end);
      const projectionFactor = isInProgress && elapsedDays > 0 ? totalDays / elapsedDays : 1;

      setApartmentReport({
        apartmentName: isAll ? 'All Apartments' : isAllActive ? 'All Active Apartments' : apt!.name,
        periodStart: start,
        periodEnd: end,
        isInProgress,
        usingCalendarFallback,
        pctComplete: totalDays > 0 ? Math.min(100, Math.round((elapsedDays / totalDays) * 100)) : 100,
        occupancyRate,
        occupiedNights,
        availableNights,
        totalBookings: filteredBookings.length,
        avgLengthOfStay,
        totalRevenue,
        commission,
        caOther,
        totalExpenses,
        netIncome,
        adr,
        revPar,
        projectionFactor,
        platformCounts,
        availablePlatforms,
      });
    } catch (error) {
      toast.error('Failed to load apartment report');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportBookingsReport = async () => {
    if (!apartmentReport) return;

    const isAll = selectedApartmentId === 'ALL';
    const isAllActive = selectedApartmentId === 'ALL_ACTIVE';
    const isAggregate = isAll || isAllActive;
    const apt = isAggregate ? null : apartments.find((a) => a.id === selectedApartmentId);
    if (!isAggregate && !apt) return;

    const activeApartmentIds = apartments.filter((a) => a.active !== false).map((a) => a.id);

    setExportingBookings(true);
    try {
      const start = apartmentReport.periodStart;
      const elapsedEnd = apartmentReport.isInProgress
        ? new Date().toISOString().split('T')[0]
        : apartmentReport.periodEnd;

      let bookingsQuery = supabase
        .from('bookings')
        .select(
          `*,
          agent:inventory_agents(name),
          apartment:inventory_apartments(name),
          platform:inventory_platforms(name),
          payment_type:inventory_payment_types(name)`
        )
        .in('status', ['FINISHED', 'CANCELLED'])
        .lte('check_in_date', elapsedEnd)
        .gt('check_out_date', start);
      if (!isAggregate) bookingsQuery = bookingsQuery.eq('apartment_id', selectedApartmentId);
      else if (isAllActive) bookingsQuery = bookingsQuery.in('apartment_id', activeApartmentIds);

      const bookingsRes = await bookingsQuery;
      if (bookingsRes.error) throw bookingsRes.error;
      let bookings: any[] = bookingsRes.data || [];
      if (selectedPlatform) {
        bookings = bookings.filter((b) => (b.platform?.name || 'Other') === selectedPlatform);
      }

      if (bookings.length === 0) {
        toast.error('No bookings to export for this selection');
        return;
      }

      const bookingIds = bookings.map((b) => b.id);

      const [revenueRes, expensesRes] = await Promise.all([
        supabase
          .from('revenue_invoicing')
          .select('total_services, amount, vat, booking_id, revenue_type, item:inventory_invoice_items(name)')
          .in('booking_id', bookingIds),
        supabase
          .from('expenses')
          .select('amount, total, booking_id, category:inventory_expense_types(name)')
          .in('booking_id', bookingIds),
      ]);
      if (revenueRes.error) throw revenueRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const revenueByBooking: Record<
        string,
        { invoice: number; collection: number; commission: number; commissionVat: number }
      > = {};
      (revenueRes.data || []).forEach((r: any) => {
        if (!r.booking_id) return;
        const entry =
          revenueByBooking[r.booking_id] || { invoice: 0, collection: 0, commission: 0, commissionVat: 0 };
        if (r.revenue_type === 'INVOICE') entry.invoice += r.total_services || 0;
        if (r.revenue_type === 'COLLECTION') entry.collection += r.total_services || 0;
        if (r.item?.name === 'Commission') {
          entry.commission += r.amount || 0;
          entry.commissionVat += r.vat || 0;
        }
        revenueByBooking[r.booking_id] = entry;
      });

      const expensesByBooking: Record<
        string,
        {
          cleaning: number;
          laundry: number;
          other: number;
          supplies: number;
          platformInvoiceNoVat: number;
          platformInvoiceVat: number;
        }
      > = {};
      (expensesRes.data || []).forEach((e: any) => {
        if (!e.booking_id) return;
        const entry =
          expensesByBooking[e.booking_id] ||
          { cleaning: 0, laundry: 0, other: 0, supplies: 0, platformInvoiceNoVat: 0, platformInvoiceVat: 0 };
        const categoryName = e.category?.name;
        // Every exported amount is net of VAT (expenses.amount), never
        // expenses.total - except Platform Invoice, which gets both.
        if (categoryName === 'Cleaning') entry.cleaning += e.amount || 0;
        else if (categoryName === 'Laundry') entry.laundry += e.amount || 0;
        else if (categoryName === 'Other') entry.other += e.amount || 0;
        else if (categoryName === 'Supplies') entry.supplies += e.amount || 0;
        else if (categoryName === 'Platform Invoice') {
          entry.platformInvoiceNoVat += e.amount || 0;
          entry.platformInvoiceVat += e.total || 0;
        }
        expensesByBooking[e.booking_id] = entry;
      });

      const rows = bookings.map((b) => {
        const rev =
          revenueByBooking[b.id] || { invoice: 0, collection: 0, commission: 0, commissionVat: 0 };
        const exp =
          expensesByBooking[b.id] ||
          { cleaning: 0, laundry: 0, other: 0, supplies: 0, platformInvoiceNoVat: 0, platformInvoiceVat: 0 };
        const platformCommissionVat = exp.platformInvoiceVat - exp.platformInvoiceNoVat;
        return {
          ...b,
          _revenueInvoice: rev.invoice,
          _revenueCollection: rev.collection,
          _caCommission: rev.commission,
          _caCommissionVat: rev.commissionVat,
          _platformCommission: exp.platformInvoiceNoVat,
          _platformCommissionVat: platformCommissionVat,
          _expCleaning: exp.cleaning,
          _expLaundry: exp.laundry,
          _expOther: exp.other,
          _expSupplies: exp.supplies,
          _netIncome:
            (b.total_rent || 0) - (rev.commission + rev.commissionVat) - exp.platformInvoiceVat,
          _caOther: (b.cleaning_charge || 0) - (exp.cleaning + exp.laundry),
        };
      });

      const namePart = apartmentReport.apartmentName.replace(/\s+/g, '-');
      const platformPart = selectedPlatform ? `-${selectedPlatform.replace(/\s+/g, '-')}` : '';

      exportToExcel(`bookings-report-${namePart}${platformPart}`, rows, [
        { header: 'Booking Date', value: (b) => b.booking_date },
        { header: 'Booking Ref', value: (b) => b.booking_ref },
        { header: 'Status', value: (b) => b.status },
        { header: 'Agent', value: (b) => b.agent?.name },
        { header: 'Apartment', value: (b) => b.apartment?.name },
        { header: 'Platform', value: (b) => b.platform?.name },
        { header: 'Guest Name', value: (b) => b.guest_name },
        { header: 'Check-in Date', value: (b) => b.check_in_date },
        { header: 'Check-out Date', value: (b) => b.check_out_date },
        { header: 'Nights', value: (b) => b.nights },
        { header: 'Number of Guests', value: (b) => b.number_of_guests },
        { header: 'Deposit', value: (b) => b.deposit },
        { header: 'Deposit Amount', value: (b) => b.deposit_amount },
        { header: 'Payment Type', value: (b) => b.payment_type?.name },
        { header: 'Platform Invoice', value: (b) => b.platform_invoice },
        { header: 'Final Liquidation', value: (b) => b.final_liquidation },
        { header: 'Inv & Exp Done', value: (b) => (b.inv_exp_done ? 'Yes' : 'No') },
        { header: 'Price Basis', value: (b) => b.price_basis },
        { header: 'Daily Price', value: (b) => b.daily_price },
        { header: 'Total Rent', value: (b) => b.total_rent },
        { header: 'Cleaning Charge', value: (b) => b.cleaning_charge },
        { header: 'Other Charge', value: (b) => b.other_charge },
        { header: 'Guest Total Amount', value: (b) => b.guest_total_amount },
        { header: 'CA Commision', value: (b) => b._caCommission },
        { header: 'CA Commision VAT', value: (b) => b._caCommissionVat },
        { header: 'Platform commision', value: (b) => b._platformCommission },
        { header: 'Platform Commision VAT', value: (b) => b._platformCommissionVat },
        { header: 'Exp. Cleaning', value: (b) => b._expCleaning },
        { header: 'Exp. Laundry', value: (b) => b._expLaundry },
        { header: 'Exp Other', value: (b) => b._expOther },
        { header: 'Exp Supplies', value: (b) => b._expSupplies },
        { header: 'Net Income', value: (b) => b._netIncome },
        { header: 'CA Comm', value: (b) => b._caCommission },
        { header: 'CA Other', value: (b) => b._caOther },
      ]);
    } catch (error) {
      toast.error('Failed to export bookings report');
    } finally {
      setExportingBookings(false);
    }
  };

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Property management insights and statistics</p>
      </div>

      {/* Apartment Annual Report */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900">Apartment Annual Report</h2>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedApartmentId}
              onChange={(e) => {
                setSelectedApartmentId(e.target.value);
                setPeriodOffset(0);
                setSelectedPlatform('');
              }}
              className="select"
            >
              <option value="ALL_ACTIVE">All Active Apartments</option>
              <option value="ALL">All Apartments</option>
              {apartments.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  {apt.name}
                </option>
              ))}
            </select>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="select"
            >
              <option value="">All Platforms</option>
              {(apartmentReport?.availablePlatforms || []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              onClick={handleExportBookingsReport}
              disabled={!apartmentReport || exportingBookings}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <FileSpreadsheet size={18} />
              {exportingBookings ? 'Exporting...' : 'Export Bookings Report'}
            </button>
          </div>
        </div>

        {apartmentReport && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b">
              <button
                onClick={() => setPeriodOffset((p) => p - 1)}
                className="p-2 hover:bg-gray-100 rounded"
                title="Previous period"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-sm font-medium text-gray-900">
                {formatDate(apartmentReport.periodStart)} &ndash; {formatDate(apartmentReport.periodEnd)}
              </div>
              <button
                onClick={() => setPeriodOffset((p) => p + 1)}
                className="p-2 hover:bg-gray-100 rounded"
                title="Next period"
                disabled={periodOffset >= 0 && !apartmentReport.isInProgress}
              >
                <ChevronRight size={18} />
              </button>
              {apartmentReport.isInProgress ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  In progress &mdash; {apartmentReport.pctComplete}% through period
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                  Completed
                </span>
              )}
              {apartmentReport.usingCalendarFallback && (
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  No contract date set &mdash; showing calendar year
                </span>
              )}
              {periodOffset !== 0 && (
                <button
                  onClick={() => setPeriodOffset(0)}
                  className="text-sm text-blue-600 hover:underline ml-auto"
                >
                  Back to current period
                </button>
              )}
            </div>

            {reportLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Occupancy - headline KPI */}
                <div className="mb-6 p-5 rounded-2xl bg-blue-50 flex items-center gap-5">
                  <BedDouble size={44} className="text-blue-600 opacity-40 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-600">
                      Occupancy Rate
                      {apartmentReport.isInProgress && ' (to date)'}
                    </p>
                    <p className="text-4xl font-bold text-blue-700">
                      {(apartmentReport.occupancyRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {apartmentReport.occupiedNights} of {apartmentReport.availableNights} nights booked
                      {selectedPlatform && ' — all platforms, not just the one selected'}
                    </p>
                  </div>
                </div>

                {/* Key Metrics - scoped to the apartment/platform/period filters above */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Bookings</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">
                          {apartmentReport.totalBookings}
                        </p>
                      </div>
                      <BarChart3 size={40} className="text-blue-600 opacity-20" />
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Revenue</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">
                          {formatCurrency(apartmentReport.totalRevenue)}
                        </p>
                      </div>
                      <DollarSign size={40} className="text-green-600 opacity-20" />
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Total Expenses</p>
                        <p className="text-3xl font-bold text-red-600 mt-1">
                          {formatCurrency(apartmentReport.totalExpenses)}
                        </p>
                      </div>
                      <TrendingUp size={40} className="text-red-600 opacity-20" />
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Net Profit</p>
                        <p
                          className={`text-3xl font-bold mt-1 ${
                            apartmentReport.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(apartmentReport.netIncome)}
                        </p>
                      </div>
                      <BarChart3 size={40} className="text-gray-600 opacity-20" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                  <ReportKpiCard
                    label="Total Bookings"
                    value={apartmentReport.totalBookings.toString()}
                    projected={
                      apartmentReport.isInProgress
                        ? Math.round(apartmentReport.totalBookings * apartmentReport.projectionFactor).toString()
                        : undefined
                    }
                  />
                  <ReportKpiCard
                    label="Avg. Length of Stay"
                    value={`${apartmentReport.avgLengthOfStay.toFixed(1)} nights`}
                  />
                  <ReportKpiCard
                    label="Average Daily Rate"
                    value={formatCurrency(apartmentReport.adr)}
                  />
                  <ReportKpiCard
                    label="Revenue per Available Night"
                    value={formatCurrency(apartmentReport.revPar)}
                  />
                  <ReportKpiCard
                    label="Total Revenue"
                    value={formatCurrency(apartmentReport.totalRevenue)}
                    projected={
                      apartmentReport.isInProgress
                        ? formatCurrency(apartmentReport.totalRevenue * apartmentReport.projectionFactor)
                        : undefined
                    }
                    valueClassName="text-green-600"
                  />
                  <ReportKpiCard
                    label="CA Commission"
                    value={formatCurrency(apartmentReport.commission)}
                    projected={
                      apartmentReport.isInProgress
                        ? formatCurrency(apartmentReport.commission * apartmentReport.projectionFactor)
                        : undefined
                    }
                  />
                  <ReportKpiCard
                    label="CA Other"
                    value={formatCurrency(apartmentReport.caOther)}
                    projected={
                      apartmentReport.isInProgress
                        ? formatCurrency(apartmentReport.caOther * apartmentReport.projectionFactor)
                        : undefined
                    }
                  />
                  <ReportKpiCard
                    label="Total Expenses"
                    value={formatCurrency(apartmentReport.totalExpenses)}
                    projected={
                      apartmentReport.isInProgress
                        ? formatCurrency(apartmentReport.totalExpenses * apartmentReport.projectionFactor)
                        : undefined
                    }
                    valueClassName="text-red-600"
                  />
                  <ReportKpiCard
                    label="Net Income"
                    value={formatCurrency(apartmentReport.netIncome)}
                    projected={
                      apartmentReport.isInProgress
                        ? formatCurrency(apartmentReport.netIncome * apartmentReport.projectionFactor)
                        : undefined
                    }
                    valueClassName={apartmentReport.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}
                  />
                </div>

                {Object.keys(apartmentReport.platformCounts).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Bookings by Platform</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(apartmentReport.platformCounts).map(([name, count]) => (
                        <span
                          key={name}
                          className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800"
                        >
                          {name}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              className="input"
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              className="input"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Bookings</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {stats.totalBookings}
                  </p>
                </div>
                <BarChart3 size={40} className="text-blue-600 opacity-20" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <DollarSign size={40} className="text-green-600 opacity-20" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Expenses</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">
                    {formatCurrency(stats.totalExpenses)}
                  </p>
                </div>
                <TrendingUp size={40} className="text-red-600 opacity-20" />
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Net Profit</p>
                  <p className={`text-3xl font-bold mt-1 ${
                    stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(stats.netProfit)}
                  </p>
                </div>
                <BarChart3 size={40} className="text-gray-600 opacity-20" />
              </div>
            </div>
          </div>

          {/* Placeholder for future reports */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Revenue by Apartment</h2>
            <div className="p-8 text-center text-gray-500">
              <p>Detailed reports coming soon</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-bold mb-4">Expense Breakdown</h2>
            <div className="p-8 text-center text-gray-500">
              <p>Detailed reports coming soon</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
