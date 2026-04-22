'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { PublicButton } from '@/components/public/ui/PublicButton'
import { FieldShell } from '@/components/public/ui/FieldShell'
import { StatusBadge } from '@/components/public/ui/StatusBadge'

type Step = 'phone' | 'otp'

interface Props {
  eventSlug: string
}

export function PublicOtpLoginForm({ eventSlug }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [])

  function startCooldown(seconds: number) {
    setCooldown(seconds)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/public/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json() as { success: boolean; error?: string; cooldownSeconds?: number }
      if (!data.success) {
        setError(data.error ?? 'Gagal mengirim OTP.')
        if (data.cooldownSeconds) startCooldown(data.cooldownSeconds)
        return
      }
      startCooldown(60)
      setStep('otp')
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/public/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp, eventSlug }),
      })
      const data = await res.json() as { success: boolean; error?: string; redirectTo?: string }
      if (!data.success) {
        setError(data.error ?? 'OTP salah.')
        return
      }
      router.push(data.redirectTo ?? `/${eventSlug}/dashboard`)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/public/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json() as { success: boolean; error?: string; cooldownSeconds?: number }
      if (!data.success) {
        setError(data.error ?? 'Gagal mengirim ulang OTP.')
        if (data.cooldownSeconds) startCooldown(data.cooldownSeconds)
        return
      }
      startCooldown(60)
      setOtp('')
      setError('')
    } catch {
      setError('Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'phone') {
    return (
      <form onSubmit={handleRequestOtp} className="space-y-4">
        <FieldShell
          id="phone"
          label="Nomor WhatsApp"
          hint="OTP akan dikirim ke nomor WhatsApp ini."
          error={error || undefined}
          required
        >
          <Input
            id="phone"
            type="tel"
            placeholder="0812 xxxx xxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            disabled={loading}
            className="h-11 rounded-2xl border-border bg-white px-3 text-sm"
          />
        </FieldShell>
        <PublicButton
          type="submit"
          disabled={loading || !phone}
          fullWidth
        >
          {loading ? 'Mengirim OTP...' : 'Kirim Kode OTP'}
        </PublicButton>
      </form>
    )
  }

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <div className="mb-2">
          <StatusBadge tone="success">OTP Terkirim</StatusBadge>
        </div>
        Kode OTP dikirim ke <strong>{phone}</strong> via WhatsApp.
      </div>
      <FieldShell
        id="otp"
        label="Kode OTP (6 digit)"
        error={error || undefined}
        required
      >
        <Input
          id="otp"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          required
          disabled={loading}
          className="h-14 rounded-2xl border-border bg-white px-3 text-center font-mono text-xl tracking-[0.35em]"
        />
      </FieldShell>
      <PublicButton
        type="submit"
        disabled={loading || otp.length !== 6}
        fullWidth
      >
        {loading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}
      </PublicButton>
      <div className="text-center text-sm text-slate-500">
        {cooldown > 0 ? (
          <span>Kirim ulang dalam {cooldown} detik</span>
        ) : (
          <button type="button" onClick={handleResend} className="font-medium text-primary hover:underline">
            Kirim ulang OTP
          </button>
        )}
        <span className="mx-2">·</span>
        <button
          type="button"
          onClick={() => { setStep('phone'); setOtp(''); setError('') }}
          className="font-medium text-slate-600 hover:underline"
        >
          Ganti nomor
        </button>
      </div>
    </form>
  )
}
