'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Calendar, List } from 'lucide-react';
import BookingForm from '@/components/BookingForm';
import BookingsList from '@/components/BookingsList';
import BookingCalendar from '@/components/BookingCalendar';
import toast from 'react-hot-toast';

type ViewMode = 'list' | 'calendar';

export default function BookingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showForm, setShowForm] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApartment, setSelectedApartment] = useState<string | null>(null);
  const [apartments, setApartments] = useState<any[]>([]);

  useEffect(() => {
    fetchBookings();
    fetchApartments();
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
    } catch (error) {
      toast.error('Failed to fetch apartments');
    }
  };

  const handleBookingCreated = () => {
    setShowForm(false);
    fetchBookings();
    toast.success('Booking created successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600 mt-1">Manage accommodation reservations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          New Booking
        </button>
      </div>

      {showForm && (
        <div className="card">
          <BookingForm
            onSuccess={handleBookingCreated}
            onCancel={() => setShowForm(false)}
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
        <BookingsList bookings={bookings} onRefresh={fetchBookings} />
      ) : (
        <div className="card">
          <div className="mb-4">
            <label className="label">Filter by Apartment</label>
            <select
              value={selectedApartment || ''}
              onChange={(e) => setSelectedApartment(e.target.value || null)}
              className="select"
            >
              <option value="">All Apartments</option>
              {apartments.map((apt) => (
                <option key={apt.id} value={apt.id}>
                  {apt.name}
                </option>
              ))}
            </select>
          </div>
          <BookingCalendar
            bookings={bookings}
            apartmentFilter={selectedApartment}
          />
        </div>
      )}
    </div>
  );
}
