'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate } from '@/lib/calculations';

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

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchStats();
    }
  }, [dateRange, userRole]);

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
        window.location.href = '/bookings';
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

  if (userRole !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Property management insights and statistics</p>
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
