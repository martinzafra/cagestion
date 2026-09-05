'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Calendar, List } from 'lucide-react';
import BookingForm from '@/components/BookingForm';
import BookingsList from '@/components/BookingsList';
import BookingCalendar from '@/components/BookingCalendar';
import { getApartmentColorMap } from '@/lib/apartmentColors';
import toast from 'react-hot-toast';

type ViewMode = 'list' | 'calendar';

export default function BookingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState<string | undefined>(undefined);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [apartments, setApartments] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [calendarApartmentIds, setCalendarApartmentIds] = useState<string[]>([]);

  const [listFilters, setListFilters] = useState({
    apartment_id: '',
    agent_id: '',
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    fetchBookings();
    fetchApartments();
    fetchAgents();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          agent:inventory_agents(name),
          apartment:inventory_apartments(name),
          platform:inventory_platforms(name),
          payment_type:inventory_payment_types(name)
        `)
        .order('check_in_date', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchApartments = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_apartments')
        .select('*')
        .order('name');

      if (error) throw error;
      setApartments(data || []);
      setCalendarApartmentIds((prev) =>
        prev.length === 0 ? (data || []).map((a) => a.id) : prev
      );
    } catch (error) {
      toast.error('Failed to fetch apartments');
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_agents')
        .select('*')
        .order('name');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      toast.error('Failed to fetch agents');
    }
  };

  const handleNewBooking = () => {
    setEditingBookingId(undefined);
    setShowForm((prev) => !prev);
  };

  const handleEditBooking = (id: string) => {
    setEditingBookingId(id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingBookingId(undefined);
    fetchBookings();
    toast.success(editingBookingId ? 'Booking updated successfully' : 'Booking created successfully');
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingBookingId(undefined);
  };

  const filteredBookings = bookings.filter((b) => {
    if (listFilters.apartment_id && b.apartment_id !== listFilters.apartment_id)
      return false;
    if (listFilters.agent_id && b.agent_id !== listFilters.agent_id) return false;
    if (listFilters.status && b.status !== listFilters.status) return false;
    if (listFilters.dateFrom && b.check_in_date < listFilters.dateFrom) return false;
    if (listFilters.dateTo && b.check_in_date > listFilters.dateTo) return false;
    if (listFilters.search) {
      const q = listFilters.search.toLowerCase();
      const matches =
        b.guest_name?.toLowerCase().includes(q) ||
        b.booking_ref?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const colorMap = getApartmentColorMap(apartments);

  const toggleCalendarApartment = (id: string) => {
    setCalendarApartmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600 mt-1">Manage accommodation reservations</p>
        </div>
        <button onClick={handleNewBooking} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          New Booking
        </button>
      </div>

      {showForm && (
        <div className="card">
          <BookingForm
            bookingId={editingBookingId}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {/* View Mode Selector */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition ${
            viewMode === 'list'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <List size={18} />
          List View
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition ${
            viewMode === 'calendar'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar size={18} />
          Calendar View
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'list' ? (
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
                value={listFilters.agent_id}
                onChange={(e) =>
                  setListFilters({ ...listFilters, agent_id: e.target.value })
                }
                className="select"
              >
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <select
                value={listFilters.status}
                onChange={(e) =>
                  setListFilters({ ...listFilters, status: e.target.value })
                }
                className="select"
              >
                <option value="">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PENDING CONFIRMATION">Pending Confirmation</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <input
                type="date"
                title="Check-in from"
                value={listFilters.dateFrom}
                onChange={(e) =>
                  setListFilters({ ...listFilters, dateFrom: e.target.value })
                }
                className="input"
              />
              <input
                type="date"
                title="Check-in to"
                value={listFilters.dateTo}
                onChange={(e) =>
                  setListFilters({ ...listFilters, dateTo: e.target.value })
                }
                className="input"
              />
              <input
                type="text"
                placeholder="Search guest or reference..."
                value={listFilters.search}
                onChange={(e) =>
                  setListFilters({ ...listFilters, search: e.target.value })
                }
                className="input"
              />
            </div>
          </div>
          <BookingsList
            bookings={filteredBookings}
            onRefresh={fetchBookings}
            onEdit={handleEditBooking}
          />
        </>
      ) : (
        <div className="card">
          <div className="mb-4">
            <label className="label">Filter by Apartment</label>
            <div className="flex flex-wrap gap-2">
              {apartments.map((apt) => {
                const checked = calendarApartmentIds.includes(apt.id);
                return (
                  <label
                    key={apt.id}
                    className={`flex items-center gap-1.5 text-sm cursor-pointer px-2 py-1 rounded ${
                      checked ? colorMap.get(apt.id)?.chip || 'bg-gray-100' : 'bg-gray-50 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCalendarApartment(apt.id)}
                    />
                    {apt.name}
                  </label>
                );
              })}
            </div>
          </div>
          <BookingCalendar
            bookings={bookings}
            apartments={apartments}
            selectedApartmentIds={calendarApartmentIds}
          />
        </div>
      )}
    </div>
  );
}
