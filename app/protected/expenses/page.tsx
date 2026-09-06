'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency } from '@/lib/calculations';
import { getApartmentColorMap } from '@/lib/apartmentColors';

const blankFormData = {
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
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | undefined>(undefined);
  const [apartments, setApartments] = useState<any[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [apartmentFilterIds, setApartmentFilterIds] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState(blankFormData);

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
      if (aptRes.data) {
        setApartments(aptRes.data);
        setApartmentFilterIds((prev) =>
          prev.size === 0 ? new Set(aptRes.data.map((a: any) => a.id)) : prev
        );
      }
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
      const payload = {
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
      };

      if (editingExpenseId) {
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingExpenseId);
        if (error) throw error;
        toast.success('Expense updated');
      } else {
        const { error } = await supabase.from('expenses').insert([payload]);
        if (error) throw error;
        toast.success('Expense recorded');
      }

      setShowForm(false);
      setEditingExpenseId(undefined);
      fetchData();
      setFormData(blankFormData);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEditExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;

    setEditingExpenseId(id);
    setFormData({
      expense_type: exp.expense_type,
      expense_category_id: exp.expense_category_id,
      vendor: exp.vendor,
      expense_date: exp.expense_date,
      invoice_number: exp.invoice_number || '',
      amount: exp.amount,
      vat: exp.vat || 0,
      apartment_id: exp.apartment_id,
      booking_id: exp.booking_id || '',
      comments: exp.comments || '',
      attachment_url: exp.attachment_url || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const toggleApartmentFilter = (id: string) => {
    setApartmentFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const apartmentColorMap = getApartmentColorMap(apartments);

  const filteredExpenses = expenses.filter((exp) => {
    // General expenses (no apartment) always show; apartment-tied ones
    // are narrowed by the selected apartments.
    if (!exp.apartment_id) return true;
    return apartments.length === 0 || apartmentFilterIds.has(exp.apartment_id);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600 mt-1">Track all property-related costs</p>
        </div>
        <button
          onClick={() => {
            setEditingExpenseId(undefined);
            setFormData(blankFormData);
            setShowForm((prev) => !prev);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          New Expense
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">
            {editingExpenseId ? 'Edit Expense' : 'Record Expense'}
          </h2>
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
                {editingExpenseId ? 'Update Expense' : 'Record Expense'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingExpenseId(undefined);
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
            <label className="text-xs text-gray-500 block mb-1.5">Apartment</label>
            <div className="flex flex-wrap gap-2">
              {apartments.map((apt) => {
                const checked = apartmentFilterIds.has(apt.id);
                return (
                  <label
                    key={apt.id}
                    className={`flex items-center gap-1.5 text-sm cursor-pointer px-2 py-1 rounded ${
                      checked ? apartmentColorMap.get(apt.id)?.chip || 'bg-gray-100' : 'bg-gray-50 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleApartmentFilter(apt.id)}
                    />
                    {apt.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Category</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Apartment</th>
                <th className="text-right">Amount €</th>
                <th className="text-right">VAT €</th>
                <th className="text-right">Total €</th>
                <th>Booking</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    No expenses recorded
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="text-sm">{exp.expense_type}</td>
                    <td>{exp.category?.name}</td>
                    <td className="font-medium">{exp.vendor}</td>
                    <td>{formatDate(exp.expense_date)}</td>
                    <td>{exp.apartment?.name}</td>
                    <td className="text-right">{formatCurrency(exp.amount)}</td>
                    <td className="text-right">{formatCurrency(exp.vat)}</td>
                    <td className="font-semibold text-right">{formatCurrency(exp.total)}</td>
                    <td>{exp.booking?.guest_name || 'General'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditExpense(exp.id)}
                          className="p-1 hover:bg-blue-100 rounded"
                        >
                          <Pencil size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
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
