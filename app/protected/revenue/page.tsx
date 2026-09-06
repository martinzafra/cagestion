'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Pencil, Download, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '@/lib/calculations';

type SortColumn =
  | 'revenue_type'
  | 'revenue_number'
  | 'revenue_date'
  | 'guest_name'
  | 'apartment'
  | 'item'
  | 'total_services'
  | 'commission_percentage'
  | 'amount'
  | 'status';

const blankFormData = {
  revenue_type: 'INVOICE' as 'INVOICE' | 'COLLECTION',
  revenue_date: new Date().toISOString().split('T')[0],
  apartment_id: '',
  booking_id: '',
  invoice_item_id: '',
  total_services: 0,
  commission_percentage: 0,
  issued: false,
  attachment_url: '',
};

export default function RevenuePage() {
  const [revenues, setRevenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRevenueId, setEditingRevenueId] = useState<string | undefined>(undefined);
  const [apartments, setApartments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  const [listFilters, setListFilters] = useState({
    apartment_id: '',
    revenue_type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  const [formData, setFormData] = useState(blankFormData);

  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [revenueRes, aptRes, bookingsRes, itemsRes] = await Promise.all([
        supabase
          .from('revenue_invoicing')
          .select(`
            *,
            apartment:inventory_apartments(name),
            booking:bookings(guest_name, check_in_date),
            item:inventory_invoice_items(name)
          `)
          .order('revenue_date', { ascending: false }),
        supabase.from('inventory_apartments').select('*').order('name'),
        supabase
          .from('bookings')
          .select('id, guest_name, check_in_date, booking_ref')
          .order('check_in_date', { ascending: false }),
        supabase.from('inventory_invoice_items').select('*').order('name'),
      ]);

      if (revenueRes.data) setRevenues(revenueRes.data);
      if (aptRes.data) setApartments(aptRes.data);
      if (bookingsRes.data) setBookings(bookingsRes.data);
      if (itemsRes.data) setInvoiceItems(itemsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.booking_id || !formData.apartment_id || !formData.invoice_item_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        revenue_type: formData.revenue_type,
        revenue_date: formData.revenue_date,
        apartment_id: formData.apartment_id,
        booking_id: formData.booking_id,
        invoice_item_id: formData.invoice_item_id,
        total_services: formData.total_services,
        commission_percentage: formData.commission_percentage,
        issued: formData.issued,
        attachment_url: formData.attachment_url || null,
      };

      if (editingRevenueId) {
        const { error } = await supabase
          .from('revenue_invoicing')
          .update(payload)
          .eq('id', editingRevenueId);
        if (error) throw error;
        toast.success('Revenue entry updated');
      } else {
        const { error } = await supabase.from('revenue_invoicing').insert([payload]);
        if (error) throw error;
        toast.success('Revenue entry created');
      }

      setShowForm(false);
      setEditingRevenueId(undefined);
      fetchData();
      setFormData(blankFormData);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEditRevenue = (id: string) => {
    const rev = revenues.find((r) => r.id === id);
    if (!rev) return;

    setEditingRevenueId(id);
    setFormData({
      revenue_type: rev.revenue_type,
      revenue_date: rev.revenue_date,
      apartment_id: rev.apartment_id,
      booking_id: rev.booking_id,
      invoice_item_id: rev.invoice_item_id,
      total_services: rev.total_services,
      commission_percentage: rev.commission_percentage,
      issued: rev.issued,
      attachment_url: rev.attachment_url || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this revenue entry?')) return;

    try {
      const { error } = await supabase
        .from('revenue_invoicing')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Entry deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getBookingDisplay = (booking: any) => {
    return `${booking.guest_name} - ${formatDate(booking.check_in_date)} - ${booking.booking_ref}`;
  };

  const filteredRevenues = revenues.filter((rev) => {
    if (listFilters.apartment_id && rev.apartment_id !== listFilters.apartment_id) return false;
    if (listFilters.revenue_type && rev.revenue_type !== listFilters.revenue_type) return false;
    if (listFilters.status === 'issued' && !rev.issued) return false;
    if (listFilters.status === 'draft' && rev.issued) return false;
    if (listFilters.dateFrom && rev.revenue_date < listFilters.dateFrom) return false;
    if (listFilters.dateTo && rev.revenue_date > listFilters.dateTo) return false;
    if (listFilters.search) {
      const q = listFilters.search.toLowerCase();
      const matches =
        rev.booking?.guest_name?.toLowerCase().includes(q) ||
        String(rev.revenue_number).includes(q);
      if (!matches) return false;
    }
    return true;
  });

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

  const getSortValue = (rev: any, column: SortColumn) => {
    switch (column) {
      case 'revenue_type':
        return rev.revenue_type || '';
      case 'revenue_number':
        return rev.revenue_number || 0;
      case 'revenue_date':
        return rev.revenue_date || '';
      case 'guest_name':
        return rev.booking?.guest_name?.toLowerCase() || '';
      case 'apartment':
        return rev.apartment?.name?.toLowerCase() || '';
      case 'item':
        return rev.item?.name?.toLowerCase() || '';
      case 'total_services':
        return rev.total_services || 0;
      case 'commission_percentage':
        return rev.commission_percentage || 0;
      case 'amount':
        return rev.amount || 0;
      case 'status':
        return rev.issued ? 1 : 0;
      default:
        return '';
    }
  };

  const sortedRevenues = sortColumn
    ? [...filteredRevenues].sort((a, b) => {
        const va = getSortValue(a, sortColumn);
        const vb = getSortValue(b, sortColumn);
        if (va < vb) return sortDirection === 'asc' ? -1 : 1;
        if (va > vb) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredRevenues;

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue & Invoicing</h1>
          <p className="text-gray-600 mt-1">Manage income from bookings</p>
        </div>
        <button
          onClick={() => {
            setEditingRevenueId(undefined);
            setFormData(blankFormData);
            setShowForm((prev) => !prev);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          New Entry
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">
            {editingRevenueId ? 'Edit Revenue Entry' : 'Add Revenue Entry'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Revenue Type *</label>
                <select
                  value={formData.revenue_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      revenue_type: e.target.value as 'INVOICE' | 'COLLECTION',
                    })
                  }
                  className="select"
                >
                  <option value="INVOICE">Invoice</option>
                  <option value="COLLECTION">Collection</option>
                </select>
              </div>
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  value={formData.revenue_date}
                  onChange={(e) =>
                    setFormData({ ...formData, revenue_date: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Apartment *</label>
                <select
                  value={formData.apartment_id}
                  onChange={(e) =>
                    setFormData({ ...formData, apartment_id: e.target.value })
                  }
                  className="select"
                  required
                >
                  <option value="">Select Apartment</option>
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Booking *</label>
                <select
                  value={formData.booking_id}
                  onChange={(e) =>
                    setFormData({ ...formData, booking_id: e.target.value })
                  }
                  className="select"
                  required
                >
                  <option value="">Select Booking</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {getBookingDisplay(b)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Invoice Item *</label>
                <select
                  value={formData.invoice_item_id}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_item_id: e.target.value })
                  }
                  className="select"
                  required
                >
                  <option value="">Select Item</option>
                  {invoiceItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Total Services €</label>
                <input
                  type="number"
                  value={formData.total_services}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      total_services: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Commission %</label>
                <input
                  type="number"
                  value={formData.commission_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      commission_percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.issued}
                  onChange={(e) =>
                    setFormData({ ...formData, issued: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Issued</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="btn-primary"
              >
                {editingRevenueId ? 'Update Entry' : 'Create Entry'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingRevenueId(undefined);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Filter line */}
          <div className="card">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <select
                value={listFilters.apartment_id}
                onChange={(e) =>
                  setListFilters({ ...listFilters, apartment_id: e.target.value })
                }
                className="select"
              >
                <option value="">All Apartments</option>
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name}
                  </option>
                ))}
              </select>
              <select
                value={listFilters.revenue_type}
                onChange={(e) =>
                  setListFilters({ ...listFilters, revenue_type: e.target.value })
                }
                className="select"
              >
                <option value="">All Types</option>
                <option value="INVOICE">Invoice</option>
                <option value="COLLECTION">Collection</option>
              </select>
              <select
                value={listFilters.status}
                onChange={(e) => setListFilters({ ...listFilters, status: e.target.value })}
                className="select"
              >
                <option value="">All Statuses</option>
                <option value="issued">Issued</option>
                <option value="draft">Draft</option>
              </select>
              <input
                type="date"
                title="Date from"
                value={listFilters.dateFrom}
                onChange={(e) =>
                  setListFilters({ ...listFilters, dateFrom: e.target.value })
                }
                className="input"
              />
              <input
                type="date"
                title="Date to"
                value={listFilters.dateTo}
                onChange={(e) => setListFilters({ ...listFilters, dateTo: e.target.value })}
                className="input"
              />
              <input
                type="text"
                placeholder="Search guest or invoice #..."
                value={listFilters.search}
                onChange={(e) => setListFilters({ ...listFilters, search: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <SortableHeader column="revenue_type">Type</SortableHeader>
                <SortableHeader column="revenue_number">Invoice #</SortableHeader>
                <SortableHeader column="revenue_date">Date</SortableHeader>
                <SortableHeader column="guest_name">Guest</SortableHeader>
                <SortableHeader column="apartment">Apartment</SortableHeader>
                <SortableHeader column="item">Item</SortableHeader>
                <SortableHeader column="total_services" align="right">Services €</SortableHeader>
                <SortableHeader column="commission_percentage">Commission %</SortableHeader>
                <SortableHeader column="amount" align="right">Amount €</SortableHeader>
                <SortableHeader column="status">Status</SortableHeader>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRevenues.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500">
                    No revenue entries
                  </td>
                </tr>
              ) : (
                sortedRevenues.map((rev) => (
                  <tr key={rev.id}>
                    <td className="text-sm">{rev.revenue_type}</td>
                    <td className="font-mono text-sm">{rev.revenue_number}</td>
                    <td>{formatDate(rev.revenue_date)}</td>
                    <td className="font-medium">{rev.booking?.guest_name}</td>
                    <td>{rev.apartment?.name}</td>
                    <td>{rev.item?.name}</td>
                    <td className="text-right">{formatCurrency(rev.total_services)}</td>
                    <td>{rev.commission_percentage}%</td>
                    <td className="font-semibold text-right">
                      {formatCurrency(rev.amount)}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                          rev.issued
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {rev.issued ? 'Issued' : 'Draft'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditRevenue(rev.id)}
                          className="p-1 hover:bg-blue-100 rounded"
                        >
                          <Pencil size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(rev.id)}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
