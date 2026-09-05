'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NavigationProps {
  userRole?: 'admin' | 'agent';
  userName?: string;
}

const Navigation: React.FC<NavigationProps> = ({ userRole = 'agent', userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/protected/bookings', label: 'Bookings', public: true },
    { href: '/protected/todo', label: 'To Do', public: true },
    { href: '/protected/revenue', label: 'Revenue & Invoicing', public: true },
    { href: '/protected/expenses', label: 'Expenses', public: true },
    { href: '/protected/reports', label: 'Reports', public: true },
    ...(userRole === 'admin'
      ? [{ href: '/protected/inventory', label: 'Inventory', public: false }]
      : []),
  ];

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex-shrink-0 font-bold text-xl">
            Casa Amiga
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col items-end">
              {userName && <span className="text-sm">{userName}</span>}
              <span className="text-xs text-blue-100 capitalize">{userRole}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-md hover:bg-blue-700 transition"
              title="Logout"
            >
              <LogOut size={18} />
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-md hover:bg-blue-700 transition"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-700 transition"
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
