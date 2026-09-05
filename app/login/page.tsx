'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let email = identifier.trim();

      // If it's not an email, treat it as a username and resolve to email first
      if (!email.includes('@')) {
        const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
          'get_email_by_username',
          { p_username: email }
        );

        if (lookupError || !resolvedEmail) {
          toast.error('Usuario no encontrado');
          setLoading(false);
          return;
        }

        email = resolvedEmail;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Login successful!');
        router.push('/protected/bookings');
      }
    } catch (err) {
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Casa Amiga
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Property Management System
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="label">
                Email or Username
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input"
                placeholder="your@email.com or username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
