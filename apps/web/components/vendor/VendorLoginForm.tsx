'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function VendorLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await authClient.signIn.email({ email, password });

    if (authError) {
      setError('Email atau password salah.');
      setLoading(false);
      return;
    }

    router.push('/vendor/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-white/80">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="vendor@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          className="h-11 w-full rounded-2xl border border-white/12 bg-white/8 px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#00adee]/50 focus:ring-1 focus:ring-[#00adee]/30 disabled:opacity-50"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-white/80">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          className="h-11 w-full rounded-2xl border border-white/12 bg-white/8 px-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#00adee]/50 focus:ring-1 focus:ring-[#00adee]/30 disabled:opacity-50"
        />
      </div>
      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-400 border border-red-400/20">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !email || !password}
        className="h-12 w-full rounded-2xl text-sm font-semibold text-white transition active:scale-[.98] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #134397, #00adee)' }}
      >
        {loading ? 'Masuk...' : 'Masuk'}
      </button>
    </form>
  );
}
