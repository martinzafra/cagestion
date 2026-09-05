'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateGuestTotalAmount, calculateNights } from '@/lib/calculations';
import toast from 'react-hot-toast';

interface BookingFormProps {
  bookingId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  booking_date: string;
  booking_ref: string;
  agent_id: string;
  apartment_id: string;
  platform_id: string;
  status: 'CONFIRMED' | 'PENDING CONFIRMATION' | 'CANCELLED';
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  check_in_date: string;
  check_in_time: string;
  check_out_date: string;
  check_out_time: string;
  number_of_guests: number;
  deposit: 'Y' | 'N' | 'NA';
  deposit_amount: number | null;
  payment_type_id: string | null;
  comments: string;
  guest_comments: string;
  price_basis: 'DAY' | 'WEEK' | 'MONTH';
  daily_price: number;
  cleaning_charge: number;
  other_charge: number;
  guest_total_amount: number | null;
  police_registration: 'TO BE DONE' | 'DONE' | 'NA';
  platform_invoice: 'TO BE DONE' | 'SENT' | 'NA';
  platform_invoice_date: string | null;
  final_liquidation: 'TO BE DONE' | 'SENT' | 'NA';
  final_liquidation_date: string | null;
}

const BookingForm: React.FC<BookingFormProps> = ({
  bookingId,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [nights, setNights] = useState(0);
  const [priceMode, setPriceMode] = useState<'daily' | 'total'>('daily');

  const [formData, setFormData] = useState<FormData>({
    booking_date: new Date().toISOString().split('T')[0],
    booking_ref: '',
    agent_id: '',
    apartment_id: '',
    platform_id: '',
    status: 'PENDING CONFIRMATION',
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    check_in_date: '',
    check_in_time: '',
    check_out_date: '',
    check_out_time: '',
    number_of_guests: 1,
    deposit: 'NA',
    deposit_amount: null,
    payment_type_id: null,
    comments: '',
    guest_comments: '',
    price_basis: 'DAY',
    daily_price: 0,
    cleaning_charge: 0,
    other_charge: 0,
    guest_total_amount: null,
    police_registration: 'TO BE DONE',
    platform_invoice: 'TO BE DONE',
    platform_invoice_date: null,
    final_liquidation: 'TO BE DONE',
    final_liquidation_date: null,
  });

  useEffect(() => {
    fetchInventory();
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  useEffect(() => {
    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);
      const calculatedNights = calculateNights(checkIn, checkOut);
      setNights(calculatedNights);

      if (priceMode === 'daily') {
        const total = calculateGuestTotalAmount(
          formData.daily_price,
          formData.price_basis,
          calculatedNights,
          formData.cleaning_charge,
          formData.other_charge
        );
        setFormData((prev) => ({ ...prev, guest_total_amount: total }));
      } else {
        const total = formData.guest_total_amount || 0;
        const remaining = total - formData.cleaning_charge - formData.other_charge;
        const perNight = calculatedNights > 0 ? remaining / calculatedNights : 0;
        setFormData((prev) => ({
          ...prev,
          daily_price: Math.round(perNight * 100) / 100,
        }));
      }
    }
  }, [
    formData.check_in_date,
    formData.check_out_date,
    formData.daily_price,
    formData.price_basis,
    formData.cleaning_charge,
    formData.other_charge,
    formData.guest_total_amount,
    priceMode,
  ]);

  const fetchInventory = async () => {
    try {
      const [agentsRes, apartmentsRes, platformsRes, paymentRes] = await Promise.all(
        [
          supabase.from('inventory_agents').select('*').order('name'),
          supabase.from('inventory_apartments').select('*').order('name'),
          supabase.from('inventory_platforms').select('*').order('name'),
          supabase.from('inventory_payment_types').select('*').order('name'),
        ]
      );

      if (agentsRes.data) setAgents(agentsRes.data);
      if (apartmentsRes.data) setApartments(apartmentsRes.data);
      if (platformsRes.data) setPlatforms(platformsRes.data);
      if (paymentRes.data) setPaymentTypes(paymentRes.data);
    } catch (error) {
      toast.error('Failed to load inventory data');
    }
  };

  const fetchBooking = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData(data);
        if (data.check_in_date && data.check_out_date) {
          const checkIn = new Date(data.check_in_date);
          const checkOut = new Date(data.check_out_date);
          setNights(calculateNights(checkIn, checkOut));
        }
      }
    } catch (error) {
      toast.error('Failed to fetch booking');
    }
  };

  const checkDateOverlap = async (): Promise<boolean> => {
    if (!formData.apartment_id || !formData.check_in_date || !formData.check_out_date) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('apartment_id', formData.apartment_id)
        .neq('status', 'CANCELLED');

      if (error) throw error;

      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);

      const hasOverlap = data?.some((booking) => {
        if (bookingId && booking.id === bookingId) return false;

        const bookingCheckIn = new Date(booking.check_in_date);
        const bookingCheckOut = new Date(booking.check_out_date);

        // Check for overlap (checkout of one can be checkin of another)
        return checkIn < bookingCheckOut && checkOut > bookingCheckIn;
      });

      return hasOverlap || false;
    } catch (error) {
      toast.error('Failed to check date availability');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (
        !formData.booking_ref ||
        !formData.agent_id ||
        !formData.apartment_id ||
        !formData.platform_id ||
        !formData.guest_name ||
        !formData.check_in_date ||
        !formData.check_out_date
      ) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Check for date overlap
      const hasOverlap = await checkDateOverlap();
      if (hasOverlap) {
        toast.error('This apartment already has a booking for these dates');
        setLoading(false);
        return;
      }

      // Validate dates
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);
      if (checkOut <= checkIn) {
        toast.error('Check-out date must be after check-in date');
        setLoading(false);
        return;
      }

      // Empty strings aren't valid for TIME/nullable columns - convert to null
      const payload = {
        ...formData,
        check_in_time: formData.check_in_time || null,
        check_out_time: formData.check_out_time || null,
        platform_invoice_date: formData.platform_invoice_date || null,
        final_liquidation_date: formData.final_liquidation_date || null,
        deposit_amount: formData.deposit_amount || null,
        payment_type_id: formData.payment_type_id || null,
      };

      if (bookingId) {
        const { error } = await supabase
          .from('bookings')
          .update(payload)
          .eq('id', bookingId);

        if (error) throw error;
        toast.success('Booking updated successfully');
      } else {
        const { error } = await supabase.from('bookings').insert([payload]);

        if (error) throw error;
        toast.success('Booking created successfully');
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === 'number' ? (value ? parseFloat(value) : 0) : value;

    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">
        {bookingId ? 'Edit Booking' : 'Create New Booking'}
      </h2>

      {/* Row 1: Booking Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Booking Date *</label>
          <input
            type="date"
            name="booking_date"
            value={formData.booking_date}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Booking Reference *</label>
          <input
            type="text"
            name="booking_ref"
            value={formData.booking_ref}
            onChange={handleChange}
            className="input"
            placeholder="e.g., BOOKING123"
            required
          />
        </div>
        <div>
          <label className="label">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="select"
          >
            <option value="CONFIRMED">Confirmed</option>
            <option value="PENDING CONFIRMATION">Pending Confirmation</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Row 2: Apartment & Platform */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Agent *</label>
          <select
            name="agent_id"
            value={formData.agent_id}
            onChange={handleChange}
            className="select"
            required
          >
            <option value="">Select Agent</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Apartment *</label>
          <select
            name="apartment_id"
            value={formData.apartment_id}
            onChange={handleChange}
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
          <label className="label">Platform *</label>
          <select
            name="platform_id"
            value={formData.platform_id}
            onChange={handleChange}
            className="select"
            required
          >
            <option value="">Select Platform</option>
            {platforms.map((plat) => (
              <option key={plat.id} value={plat.id}>
                {plat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Guest Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Guest Name *</label>
          <input
            type="text"
            name="guest_name"
            value={formData.guest_name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Guest Phone</label>
          <input
            type="tel"
            name="guest_phone"
            value={formData.guest_phone}
            onChange={handleChange}
            className="input"
          />
        </div>
        <div>
          <label className="label">Guest Email</label>
          <input
            type="email"
            name="guest_email"
            value={formData.guest_email}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      {/* Row 4: Dates */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="label">Check-in Date *</label>
          <input
            type="date"
            name="check_in_date"
            value={formData.check_in_date}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Check-in Time</label>
          <input
            type="time"
            name="check_in_time"
            value={formData.check_in_time}
            onChange={handleChange}
            className="input"
          />
        </div>
        <div>
          <label className="label">Check-out Date *</label>
          <input
            type="date"
            name="check_out_date"
            value={formData.check_out_date}
            onChange={handleChange}
            className="input"
            required
          />
        </div>
        <div>
          <label className="label">Check-out Time</label>
          <input
            type="time"
            name="check_out_time"
            value={formData.check_out_time}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      {/* Row 5: Guests & Deposit */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="label">Number of Guests</label>
          <input
            type="number"
            name="number_of_guests"
            value={formData.number_of_guests}
            onChange={handleChange}
            min="1"
            className="input"
          />
        </div>
        <div>
          <label className="label">Nights</label>
          <input
            type="number"
            value={nights}
            disabled
            className="input bg-gray-100"
          />
        </div>
        <div>
          <label className="label">Deposit</label>
          <select
            name="deposit"
            value={formData.deposit}
            onChange={handleChange}
            className="select"
          >
            <option value="Y">Yes</option>
            <option value="N">No</option>
            <option value="NA">N/A</option>
          </select>
        </div>
        <div>
          <label className="label">Deposit Amount</label>
          <input
            type="number"
            name="deposit_amount"
            value={formData.deposit_amount || ''}
            onChange={handleChange}
            disabled={formData.deposit !== 'Y'}
            className="input"
            step="0.01"
          />
        </div>
      </div>

      {/* Pricing Mode Toggle */}
      <div>
        <label className="label">Pricing Mode</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPriceMode('daily')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              priceMode === 'daily'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Daily Rate
          </button>
          <button
            type="button"
            onClick={() => setPriceMode('total')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              priceMode === 'total'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Total Amount
          </button>
        </div>
      </div>

      {/* Row 6: Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="label">Price Basis</label>
          <select
            name="price_basis"
            value={formData.price_basis}
            onChange={handleChange}
            className="select"
            disabled={priceMode === 'total'}
          >
            <option value="DAY">Day</option>
            <option value="WEEK">Week</option>
            <option value="MONTH">Month</option>
          </select>
        </div>
        <div>
          <label className="label">
            Daily Price {priceMode === 'daily' ? '*' : '(calculated)'}
          </label>
          <input
            type="number"
            name="daily_price"
            value={formData.daily_price}
            onChange={handleChange}
            className={`input ${priceMode === 'total' ? 'bg-gray-100' : ''}`}
            step="0.01"
            required={priceMode === 'daily'}
            disabled={priceMode === 'total'}
          />
        </div>
        <div>
          <label className="label">Cleaning Charge</label>
          <input
            type="number"
            name="cleaning_charge"
            value={formData.cleaning_charge}
            onChange={handleChange}
            className="input"
            step="0.01"
          />
        </div>
        <div>
          <label className="label">Other Charge</label>
          <input
            type="number"
            name="other_charge"
            value={formData.other_charge}
            onChange={handleChange}
            className="input"
            step="0.01"
          />
        </div>
      </div>

      {/* Row 7: Total Amount */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">
            Guest Total Amount {priceMode === 'total' ? '*' : '(calculated)'}
          </label>
          <input
            type="number"
            name="guest_total_amount"
            value={formData.guest_total_amount ?? ''}
            onChange={handleChange}
            disabled={priceMode === 'daily'}
            className={`input font-bold text-lg ${
              priceMode === 'daily' ? 'bg-gray-100' : ''
            }`}
            step="0.01"
            required={priceMode === 'total'}
          />
        </div>
        <div>
          <label className="label">Payment Type</label>
          <select
            name="payment_type_id"
            value={formData.payment_type_id || ''}
            onChange={handleChange}
            className="select"
          >
            <option value="">Select Payment Type</option>
            {paymentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 8: Task Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Police Registration</label>
          <select
            name="police_registration"
            value={formData.police_registration}
            onChange={handleChange}
            className="select"
          >
            <option value="TO BE DONE">To Be Done</option>
            <option value="DONE">Done</option>
            <option value="NA">N/A</option>
          </select>
        </div>
        <div>
          <label className="label">Platform Invoice</label>
          <select
            name="platform_invoice"
            value={formData.platform_invoice}
            onChange={handleChange}
            className="select"
          >
            <option value="TO BE DONE">To Be Done</option>
            <option value="SENT">Sent</option>
            <option value="NA">N/A</option>
          </select>
        </div>
        <div>
          <label className="label">Platform Invoice Date</label>
          <input
            type="date"
            name="platform_invoice_date"
            value={formData.platform_invoice_date || ''}
            onChange={handleChange}
            disabled={formData.platform_invoice !== 'SENT'}
            className="input"
          />
        </div>
      </div>

      {/* Row 9: Liquidation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="label">Final Liquidation</label>
          <select
            name="final_liquidation"
            value={formData.final_liquidation}
            onChange={handleChange}
            className="select"
          >
            <option value="TO BE DONE">To Be Done</option>
            <option value="SENT">Sent</option>
            <option value="NA">N/A</option>
          </select>
        </div>
        <div>
          <label className="label">Final Liquidation Date</label>
          <input
            type="date"
            name="final_liquidation_date"
            value={formData.final_liquidation_date || ''}
            onChange={handleChange}
            disabled={formData.final_liquidation !== 'SENT'}
            className="input"
          />
        </div>
      </div>

      {/* Comments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Comments</label>
          <textarea
            name="comments"
            value={formData.comments}
            onChange={handleChange}
            className="input"
            rows={3}
          />
        </div>
        <div>
          <label className="label">Guest Comments</label>
          <textarea
            name="guest_comments"
            value={formData.guest_comments}
            onChange={handleChange}
            className="input"
            rows={3}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : bookingId ? 'Update Booking' : 'Create Booking'}
        </button>
      </div>
    </form>
  );
}

export default BookingForm;
