'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '@/lib/calculations';

export default function RevenuePage() {
  const [revenues, setRevenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [apartments, setApartments] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    revenue_type: 'INVOICE' as 'INVOICE' | 'COLLECTION',
    revenue_date: new Date().toISOString().split('T')[0],
    apartment_id: '',
    booking_id: '',
    invoice_item_id: '',
    total_services: 0,
    commission_percentage: 0,
    issued: false,
    attachment_url: '',
  });

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
      const { error } = await supabase.from('revenue_invoicing').insert([
        {
          revenue_type: formData.revenue_type,
          revenue_date: formData.revenue_date,
          apartment_id: formData.apartment_id,
          booking_id: formData.booking_id,
          invoice_item_id: formData.invoice_item_id,
          total_services: formData.total_services,
          commission_percentage: formData.commission_percentage,
          issued: formData.issued,
          attachment_url: formData.attachment_url || null,
        },
      ]);

      if (error) throw error;
      toast.success('Revenue entry created');
      setShowForm(false);
      fetchData();
      setFormData({
        revenue_type: 'INVOICE',
        revenue_date: new Date().toISOString().split('T')[0],
        apartment_id: '',
        booking_id: '',
        invoice_item_id: '',
        total_services: 0,
        commission_percentage: 0,
        issued: false,
        attachment_url: '',
      });
    } catch (error: any) {
      toast.error(error.message);
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Revenue & Invoicing</h1>
          <p className="text-gray-600 mt-1">Manage income from bookings</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          New Entry
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Add Revenue Entry</h2>
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
                Create Entry
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
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
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Guest</th>
                <th>Apartment</th>
                <th>Item</th>
                <th>Services €</th>
                <th>Commission %</th>
                <th>Amount €</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {revenues.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500">
                    No revenue entries
                  </td>
                </tr>
              ) : (
                revenues.map((rev) => (
                  <tr key={rev.id}>
                    <td className="text-sm">{rev.revenue_type}</td>
                    <td className="font-mono text-sm">{rev.revenue_number}</td>
                    <td>{formatDate(rev.revenue_date)}</td>
                    <td className="font-medium">{rev.booking?.guest_name}</td>
                    <td>{rev.apartment?.name}</td>
                    <td>{rev.item?.name}</td>
                    <td>{formatCurrency(rev.total_services)}</td>
                    <td>{rev.commission_percentage}%</td>
                    <td className="font-semibold">
                      {formatCurrency(rev.amount)}
                    </td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          rev.issued
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {rev.issued ? 'Issued' : 'Draft'}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(rev.id)}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
