'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '@/lib/calculations';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [apartments, setApartments] = useState<any[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    expense_type: 'INVOICE' as 'INVOICE' | 'PAYMENT',
    expense_category_id: '',
    vendor: '',
    expense_date: new Date().toISOString().split('T')[0],
    invoice_number: '',
    amount: 0,
    vat: 0,
    apartment_id: '',
    booking_id: '',
    comments: '',
    attachment_url: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, aptRes, typesRes, bookingsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            apartment:inventory_apartments(name),
            category:inventory_expense_types(name),
            booking:bookings(guest_name)
          `)
          .order('expense_date', { ascending: false }),
        supabase.from('inventory_apartments').select('*').order('name'),
        supabase.from('inventory_expense_types').select('*').order('name'),
        supabase
          .from('bookings')
          .select('id, guest_name, check_in_date')
          .order('check_in_date', { ascending: false }),
      ]);

      if (expRes.data) setExpenses(expRes.data);
      if (aptRes.data) setApartments(aptRes.data);
      if (typesRes.data) setExpenseTypes(typesRes.data);
      if (bookingsRes.data) setBookings(bookingsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.apartment_id || !formData.expense_category_id || !formData.vendor) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('expenses').insert([
        {
          expense_type: formData.expense_type,
          expense_category_id: formData.expense_category_id,
          vendor: formData.vendor,
          expense_date: formData.expense_date,
          invoice_number: formData.invoice_number || null,
          amount: formData.amount,
          vat: formData.vat || 0,
          apartment_id: formData.apartment_id,
          booking_id: formData.booking_id || null,
          comments: formData.comments || null,
          attachment_url: formData.attachment_url || null,
        },
      ]);

      if (error) throw error;
      toast.success('Expense recorded');
      setShowForm(false);
      fetchData();
      setFormData({
        expense_type: 'INVOICE',
        expense_category_id: '',
        vendor: '',
        expense_date: new Date().toISOString().split('T')[0],
        invoice_number: '',
        amount: 0,
        vat: 0,
        apartment_id: '',
        booking_id: '',
        comments: '',
        attachment_url: '',
      });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Expense deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600 mt-1">Track all property-related costs</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          New Expense
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Record Expense</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Type *</label>
                <select
                  value={formData.expense_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expense_type: e.target.value as 'INVOICE' | 'PAYMENT',
                    })
                  }
                  className="select"
                >
                  <option value="INVOICE">Invoice</option>
                  <option value="PAYMENT">Payment</option>
                </select>
              </div>
              <div>
                <label className="label">Category *</label>
                <select
                  value={formData.expense_category_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expense_category_id: e.target.value,
                    })
                  }
                  className="select"
                  required
                >
                  <option value="">Select Category</option>
                  {expenseTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Vendor *</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) =>
                    setFormData({ ...formData, vendor: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Date *</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expense_date: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Amount € *</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="input"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="label">VAT €</label>
                <input
                  type="number"
                  value={formData.vat}
                  onChange={(e) =>
                    setFormData({ ...formData, vat: parseFloat(e.target.value) || 0 })
                  }
                  className="input"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Invoice #</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_number: e.target.value })
                  }
                  className="input"
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
                <label className="label">Booking (Optional)</label>
                <select
                  value={formData.booking_id}
                  onChange={(e) =>
                    setFormData({ ...formData, booking_id: e.target.value })
                  }
                  className="select"
                >
                  <option value="">General Expense</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.guest_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Comments</label>
              <textarea
                value={formData.comments}
                onChange={(e) =>
                  setFormData({ ...formData, comments: e.target.value })
                }
                className="input"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn-primary">
                Record Expense
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
                <th>Category</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Apartment</th>
                <th>Amount €</th>
                <th>VAT €</th>
                <th>Total €</th>
                <th>Booking</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    No expenses recorded
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="text-sm">{exp.expense_type}</td>
                    <td>{exp.category?.name}</td>
                    <td className="font-medium">{exp.vendor}</td>
                    <td>{formatDate(exp.expense_date)}</td>
                    <td>{exp.apartment?.name}</td>
                    <td>{formatCurrency(exp.amount)}</td>
                    <td>{formatCurrency(exp.vat)}</td>
                    <td className="font-semibold">{formatCurrency(exp.total)}</td>
                    <td>{exp.booking?.guest_name || 'General'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(exp.id)}
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
