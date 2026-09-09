'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Pencil, Paperclip, X, ChevronUp, ChevronDown, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency, formatBookingDateRange } from '@/lib/calculations';
import { getApartmentColorMap } from '@/lib/apartmentColors';
import { fetchAllowedApartments } from '@/lib/apartmentAccess';
import { fetchCurrentUserRole } from '@/lib/userRole';
import { compareSortValues } from '@/lib/sort';
import { exportToExcel } from '@/lib/exportExcel';
import ApartmentChipFilter from '@/components/ApartmentChipFilter';

type SortColumn =
  | 'expense_type'
  | 'category'
  | 'vendor'
  | 'expense_date'
  | 'apartment'
  | 'amount'
  | 'vat'
  | 'total'
  | 'guest_name';

const blankFormData = {
  expense_type: 'INVOICE' as 'INVOICE' | 'PAYMENT' | 'PLATFORM INV.',
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
  const [userRole, setUserRole] = useState('');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | undefined>(undefined);
  const [apartments, setApartments] = useState<any[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [apartmentFilterIds, setApartmentFilterIds] = useState<Set<string>>(new Set());
  const formFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingAttachmentFile, setPendingAttachmentFile] = useState<File | null>(null);

  const [listFilters, setListFilters] = useState({
    expense_type: '',
    expense_category_id: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [formData, setFormData] = useState(blankFormData);

  useEffect(() => {
    fetchData();
    fetchCurrentUserRole().then(setUserRole);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, allowedApartments, typesRes, bookingsRes] = await Promise.all([
        supabase
          .from('expenses')
          .select(`
            *,
            apartment:inventory_apartments(name),
            category:inventory_expense_types(name),
            booking:bookings(guest_name)
          `)
          .order('expense_date', { ascending: false }),
        fetchAllowedApartments(),
        supabase.from('inventory_expense_types').select('*').order('name'),
        supabase
          .from('bookings')
          .select('id, guest_name, booking_ref, check_in_date, check_out_date, status, apartment_id')
          .order('check_in_date', { ascending: false }),
      ]);

      if (expRes.data) setExpenses(expRes.data);
      setApartments(allowedApartments);
      setApartmentFilterIds((prev) =>
        prev.size === 0
          ? new Set(allowedApartments.filter((a: any) => a.active !== false).map((a: any) => a.id))
          : prev
      );
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

    // Apartment is required unless this is a General Expense (no booking
    // allocation) - a truly general cost isn't tied to any one property.
    if (
      (formData.booking_id && !formData.apartment_id) ||
      !formData.expense_category_id ||
      !formData.vendor
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.booking_id) {
      const linkedBooking = bookings.find((b) => b.id === formData.booking_id);
      if (linkedBooking?.status === 'FINISHED') {
        const proceed = confirm(
          'The booking is marked as FINISHED so it has been liquidated. Are you sure you want to modify the expense?'
        );
        if (!proceed) return;
      }
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
        apartment_id: formData.apartment_id || null,
        booking_id: formData.booking_id || null,
        comments: formData.comments || null,
        attachment_url: formData.attachment_url || null,
      };

      let expenseId = editingExpenseId;

      if (editingExpenseId) {
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingExpenseId);
        if (error) throw error;
        toast.success('Expense updated');
      } else {
        const { data, error } = await supabase
          .from('expenses')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        expenseId = data.id;
        toast.success('Expense recorded');
      }

      if (pendingAttachmentFile && expenseId) {
        const ext = pendingAttachmentFile.name.split('.').pop();
        const path = `${expenseId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('expense-attachments')
          .upload(path, pendingAttachmentFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { error: attachError } = await supabase
          .from('expenses')
          .update({ attachment_url: path })
          .eq('id', expenseId);
        if (attachError) throw attachError;
      }

      setShowForm(false);
      setEditingExpenseId(undefined);
      setPendingAttachmentFile(null);
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
      apartment_id: exp.apartment_id || '',
      booking_id: exp.booking_id || '',
      comments: exp.comments || '',
      attachment_url: exp.attachment_url || '',
    });
    setPendingAttachmentFile(null);
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

  const handleViewAttachment = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('expense-attachments')
        .createSignedUrl(path, 60);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast.error(error.message || 'Failed to open attachment');
    }
  };

  const handleRemoveFormAttachment = async () => {
    if (!editingExpenseId || !formData.attachment_url) return;
    if (!confirm('Remove this attachment?')) return;
    try {
      await supabase.storage.from('expense-attachments').remove([formData.attachment_url]);
      const { error } = await supabase
        .from('expenses')
        .update({ attachment_url: null })
        .eq('id', editingExpenseId);
      if (error) throw error;

      setFormData((prev) => ({ ...prev, attachment_url: '' }));
      toast.success('Attachment removed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove attachment');
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
  const activeApartments = apartments.filter((a) => a.active !== false);

  const filteredExpenses = expenses.filter((exp) => {
    // General expenses (no apartment) always show. Inactive apartments have
    // no filter chip to toggle, so their data always passes through too.
    if (exp.apartment_id) {
      const apt = apartments.find((a) => a.id === exp.apartment_id);
      const isActive = apt ? apt.active !== false : true;
      if (isActive && apartments.length > 0 && !apartmentFilterIds.has(exp.apartment_id))
        return false;
    }
    if (listFilters.expense_type && exp.expense_type !== listFilters.expense_type) return false;
    if (
      listFilters.expense_category_id &&
      exp.expense_category_id !== listFilters.expense_category_id
    )
      return false;
    if (listFilters.dateFrom && exp.expense_date < listFilters.dateFrom) return false;
    if (listFilters.dateTo && exp.expense_date > listFilters.dateTo) return false;
    if (listFilters.search) {
      const q = listFilters.search.toLowerCase();
      const matches =
        exp.vendor?.toLowerCase().includes(q) ||
        exp.booking?.guest_name?.toLowerCase().includes(q) ||
        (exp.invoice_number || '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const handleExport = () => {
    exportToExcel('expenses', sortedExpenses, [
      { header: 'Type', value: (e) => e.expense_type },
      { header: 'Category', value: (e) => e.category?.name },
      { header: 'Vendor', value: (e) => e.vendor },
      { header: 'Date', value: (e) => e.expense_date },
      { header: 'Invoice #', value: (e) => e.invoice_number },
      { header: 'Apartment', value: (e) => e.apartment?.name },
      { header: 'Booking / Guest', value: (e) => e.booking?.guest_name || 'General' },
      { header: 'Amount €', value: (e) => e.amount },
      { header: 'VAT €', value: (e) => e.vat },
      { header: 'Total €', value: (e) => e.total },
      { header: 'Comments', value: (e) => e.comments },
      { header: 'Has Attachment', value: (e) => (e.attachment_url ? 'Yes' : 'No') },
    ]);
  };

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

  const getSortValue = (exp: any, column: SortColumn) => {
    switch (column) {
      case 'expense_type':
        return exp.expense_type || '';
      case 'category':
        return exp.category?.name?.toLowerCase() || '';
      case 'vendor':
        return exp.vendor?.toLowerCase() || '';
      case 'expense_date':
        return exp.expense_date || '';
      case 'apartment':
        return exp.apartment?.name?.toLowerCase() || '';
      case 'amount':
        return exp.amount || 0;
      case 'vat':
        return exp.vat || 0;
      case 'total':
        return exp.total || 0;
      case 'guest_name':
        return exp.booking?.guest_name?.toLowerCase() || '';
      default:
        return '';
    }
  };

  const sortedExpenses = sortColumn
    ? [...filteredExpenses].sort((a, b) => {
        const cmp = compareSortValues(getSortValue(a, sortColumn), getSortValue(b, sortColumn));
        return sortDirection === 'asc' ? cmp : -cmp;
      })
    : filteredExpenses;

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
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-600 mt-1">Track all property-related costs</p>
        </div>
        <div className="flex items-center gap-2">
          {userRole === 'admin' && (
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
              <FileSpreadsheet size={18} />
              Export
            </button>
          )}
          <button
            onClick={() => {
              setEditingExpenseId(undefined);
              setFormData(blankFormData);
              setPendingAttachmentFile(null);
              setShowForm((prev) => !prev);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Expense
          </button>
        </div>
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
                      expense_type: e.target.value as 'INVOICE' | 'PAYMENT' | 'PLATFORM INV.',
                    })
                  }
                  className="select"
                >
                  <option value="INVOICE">Invoice</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="PLATFORM INV.">Platform Inv.</option>
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
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  onFocus={(e) => e.target.select()}
                  className="input"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label className="label">VAT €</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={formData.vat}
                  onChange={(e) =>
                    setFormData({ ...formData, vat: parseFloat(e.target.value) || 0 })
                  }
                  onFocus={(e) => e.target.select()}
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
                <label className="label">Apartment{formData.booking_id ? ' *' : ''}</label>
                <select
                  value={formData.apartment_id}
                  onChange={(e) =>
                    setFormData({ ...formData, apartment_id: e.target.value })
                  }
                  className="select"
                  required={!!formData.booking_id}
                >
                  <option value="">
                    {formData.booking_id ? 'Select Apartment' : 'General (no apartment)'}
                  </option>
                  {apartments.map((apt) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Booking allocation</label>
                <select
                  value={formData.booking_id}
                  onChange={(e) =>
                    setFormData({ ...formData, booking_id: e.target.value })
                  }
                  className="select"
                >
                  <option value="">General Expense</option>
                  {bookings
                    .filter(
                      (b) =>
                        (!formData.apartment_id || b.apartment_id === formData.apartment_id) &&
                        (b.status !== 'CANCELLED' || b.id === formData.booking_id)
                    )
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.guest_name}, {formatBookingDateRange(b.check_in_date, b.check_out_date)}, {b.booking_ref}
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

            <div>
              <label className="label">Invoice / Receipt Attachment</label>
              <input
                type="file"
                accept="image/*,.pdf,.xls,.xlsx,.doc,.docx"
                ref={formFileInputRef}
                className="hidden"
                onChange={(e) => setPendingAttachmentFile(e.target.files?.[0] || null)}
              />
              {pendingAttachmentFile ? (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Paperclip size={16} className="text-gray-600" />
                  <span>{pendingAttachmentFile.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingAttachmentFile(null);
                      if (formFileInputRef.current) formFileInputRef.current.value = '';
                    }}
                    title="Discard selected file"
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <X size={14} className="text-red-500" />
                  </button>
                </div>
              ) : formData.attachment_url ? (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <button
                    type="button"
                    onClick={() => handleViewAttachment(formData.attachment_url)}
                    className="flex items-center gap-1 hover:underline"
                  >
                    <Paperclip size={16} className="text-gray-600" />
                    View attachment
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFormAttachment}
                    title="Remove attachment"
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <X size={14} className="text-red-500" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => formFileInputRef.current?.click()}
                  className="btn-secondary flex items-center gap-2 w-fit"
                >
                  <Plus size={16} />
                  Attach File
                </button>
              )}
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
                  setPendingAttachmentFile(null);
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
          <div className="card space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1.5">Apartment</label>
              <ApartmentChipFilter
                apartments={activeApartments}
                selectedIds={apartmentFilterIds}
                onToggle={toggleApartmentFilter}
                colorMap={apartmentColorMap}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <select
                value={listFilters.expense_type}
                onChange={(e) =>
                  setListFilters({ ...listFilters, expense_type: e.target.value })
                }
                className="select"
              >
                <option value="">All Types</option>
                <option value="INVOICE">Invoice</option>
                <option value="PAYMENT">Payment</option>
                <option value="PLATFORM INV.">Platform Inv.</option>
              </select>
              <select
                value={listFilters.expense_category_id}
                onChange={(e) =>
                  setListFilters({ ...listFilters, expense_category_id: e.target.value })
                }
                className="select"
              >
                <option value="">All Categories</option>
                {expenseTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                title="Date from"
                value={listFilters.dateFrom}
                onChange={(e) => setListFilters({ ...listFilters, dateFrom: e.target.value })}
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
                placeholder="Search vendor, guest or invoice #..."
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
                <SortableHeader column="expense_type">Type</SortableHeader>
                <SortableHeader column="category">Category</SortableHeader>
                <SortableHeader column="vendor">Vendor</SortableHeader>
                <SortableHeader column="expense_date">Date</SortableHeader>
                <SortableHeader column="apartment">Apartment</SortableHeader>
                <SortableHeader column="amount" align="right">Amount €</SortableHeader>
                <SortableHeader column="vat" align="right">VAT €</SortableHeader>
                <SortableHeader column="total" align="right">Total €</SortableHeader>
                <SortableHeader column="guest_name">Booking</SortableHeader>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    No expenses recorded
                  </td>
                </tr>
              ) : (
                sortedExpenses.map((exp) => (
                  <tr key={exp.id}>
                    <td className="text-sm">{exp.expense_type}</td>
                    <td>{exp.category?.name}</td>
                    <td className="font-medium">{exp.vendor}</td>
                    <td>{formatDate(exp.expense_date)}</td>
                    <td>{exp.apartment?.name || 'General'}</td>
                    <td className="text-right">{formatCurrency(exp.amount)}</td>
                    <td className="text-right">{formatCurrency(exp.vat)}</td>
                    <td className="font-semibold text-right">{formatCurrency(exp.total)}</td>
                    <td>{exp.booking?.guest_name || 'General'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <span className="w-6 flex justify-center">
                          {exp.attachment_url && (
                            <button
                              type="button"
                              onClick={() => handleViewAttachment(exp.attachment_url)}
                              title="View attachment"
                              className="p-1 hover:bg-gray-100 rounded"
                            >
                              <Paperclip size={16} className="text-gray-600" />
                            </button>
                          )}
                        </span>
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
