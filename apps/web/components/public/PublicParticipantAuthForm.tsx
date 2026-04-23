"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { OptionAutocompleteSelect, type FormSelectOption } from "@/components/forms/OptionAutocompleteSelect";
import { ForbisMemberSearch } from "@/components/forms/ForbisMemberSearch";
import { PublicButton } from "@/components/public/ui/PublicButton";
import { FieldShell } from "@/components/public/ui/FieldShell";
import { Input } from "@/components/ui/input";
import type { ForbisMemberOption } from "@/lib/forbis-members";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register" | "reset";
type AuthStep = "form" | "otp" | "reset_confirm";

type PublicParticipantAuthFormProps = {
  eventSlug: string;
  initialMode?: AuthMode;
  organizationOptions: FormSelectOption[];
  redirectTo?: string;
};

export function PublicParticipantAuthForm({
  eventSlug,
  initialMode = "login",
  organizationOptions,
  redirectTo,
}: PublicParticipantAuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [step, setStep] = React.useState<AuthStep>("form");
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [otp, setOtp] = React.useState("");
  const [otpPhone, setOtpPhone] = React.useState("");
  const [selectedForbisMember, setSelectedForbisMember] = React.useState<ForbisMemberOption | null>(null);
  const [loginForm, setLoginForm] = React.useState({
    identifier: "",
    password: "",
  });
  const [resetForm, setResetForm] = React.useState({
    otp: "",
    password: "",
    whatsapp: "",
  });
  const [registerForm, setRegisterForm] = React.useState({
    email: "",
    forbisMemberId: "",
    forbisMemberSourceId: "",
    isKmiAlumni: "",
    kmiYear: "",
    name: "",
    organizationGroupId: "",
    password: "",
    phone: "",
    sameWhatsapp: true,
    whatsapp: "",
  });
  const selectedOrganization = organizationOptions.find((option) => option.id === registerForm.organizationGroupId) ?? null;
  const isForbisOrganization = selectedOrganization?.slug === "forbis";

  React.useEffect(() => {
    if (!isForbisOrganization) {
      setSelectedForbisMember(null);
      setRegisterForm((current) => ({
        ...current,
        forbisMemberId: "",
        forbisMemberSourceId: "",
      }));
    }
  }, [isForbisOrganization]);

  function resetTransientState(nextMode: AuthMode) {
    setMode(nextMode);
    setStep("form");
    setError("");
    setOtp("");
    setOtpPhone("");
  }

  async function requestOtp(phone: string) {
    const response = await fetch("/api/public/otp/request", {
      body: JSON.stringify({ phone }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    return response.json() as Promise<{ success: boolean; error?: string }>;
  }

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/login", {
        body: JSON.stringify({ ...loginForm, eventSlug }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as {
        error?: string;
        redirectTo?: string;
        requiresOtp?: boolean;
        success: boolean;
        whatsapp?: string;
      };

      if (!result.success) {
        if (result.requiresOtp && result.whatsapp) {
          const otpResult = await requestOtp(result.whatsapp);
          if (!otpResult.success) {
            setError(otpResult.error ?? result.error ?? "Nomor WhatsApp belum diverifikasi.");
            return;
          }
          setOtpPhone(result.whatsapp);
          setStep("otp");
          return;
        }
        setError(result.error ?? "Login gagal.");
        return;
      }

      router.push(redirectTo ?? result.redirectTo ?? `/${eventSlug}/dashboard`);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const whatsapp = registerForm.sameWhatsapp ? registerForm.phone : registerForm.whatsapp;

    if (isForbisOrganization && !selectedForbisMember) {
      setError("Pilih nama anggota FORBIS dari data anggota terlebih dahulu.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/public/register", {
        body: JSON.stringify({
          ...registerForm,
          forbisMemberId: selectedForbisMember?.forbisMemberId ?? "",
          forbisMemberSourceId: selectedForbisMember?.id ?? "",
          isKmiAlumni: registerForm.isKmiAlumni === "true",
          whatsapp,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as { error?: string; success: boolean };

      if (!result.success && response.status !== 202) {
        setError(result.error ?? "Pendaftaran gagal.");
        return;
      }

      setOtpPhone(whatsapp);
      setStep("otp");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/otp/verify", {
        body: JSON.stringify({ code: otp, eventSlug, phone: otpPhone }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as { error?: string; redirectTo?: string; success: boolean };

      if (!result.success) {
        setError(result.error ?? "OTP salah atau kedaluwarsa.");
        return;
      }

      router.push(redirectTo ?? result.redirectTo ?? `/${eventSlug}/dashboard`);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (!otpPhone) return;
    setError("");
    setIsSubmitting(true);
    try {
      const result = await requestOtp(otpPhone);
      if (!result.success) {
        setError(result.error ?? "Gagal mengirim ulang OTP.");
      }
    } catch {
      setError("Gagal mengirim ulang OTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetRequest(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/password/reset-request", {
        body: JSON.stringify({ whatsapp: resetForm.whatsapp }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as { error?: string; success: boolean };

      if (!result.success) {
        setError(result.error ?? "Gagal mengirim OTP reset password.");
        return;
      }

      setOtpPhone(resetForm.whatsapp);
      setStep("reset_confirm");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetConfirm(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/password/reset-confirm", {
        body: JSON.stringify(resetForm),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as { error?: string; success: boolean };

      if (!result.success) {
        setError(result.error ?? "Gagal mengganti password.");
        return;
      }

      setLoginForm({ identifier: resetForm.whatsapp, password: "" });
      setResetForm({ otp: "", password: "", whatsapp: "" });
      resetTransientState("login");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "otp") {
    return (
      <form className="space-y-5" onSubmit={handleVerifyOtp}>
        <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-900">
          Kode OTP dikirim ke WhatsApp <strong>{otpPhone}</strong>. Verifikasi ini hanya dibutuhkan sekali.
        </div>
        <FieldShell error={error || undefined} id="otp" label="Kode OTP" required>
          <Input
            autoComplete="one-time-code"
            className="h-14 rounded-2xl text-center font-mono text-xl tracking-[0.35em]"
            disabled={isSubmitting}
            id="otp"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
            pattern="[0-9]{6}"
            placeholder="123456"
            value={otp}
          />
        </FieldShell>
        <PublicButton disabled={isSubmitting || otp.length !== 6} fullWidth type="submit">
          {isSubmitting ? "Memverifikasi..." : "Verifikasi & Masuk"}
        </PublicButton>
        <div className="flex justify-center gap-3 text-sm">
          <button className="font-medium text-primary hover:underline" disabled={isSubmitting} onClick={handleResendOtp} type="button">
            Kirim ulang OTP
          </button>
          <span className="text-muted-foreground">·</span>
          <button className="font-medium text-white/50 hover:text-white/80 hover:underline" disabled={isSubmitting} onClick={() => setStep("form")} type="button">
            Kembali
          </button>
        </div>
      </form>
    );
  }

  if (step === "reset_confirm") {
    return (
      <form className="space-y-5" onSubmit={handleResetConfirm}>
        <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-900">
          Kode OTP reset password dikirim ke WhatsApp <strong>{otpPhone}</strong>.
        </div>
        <FieldShell error={error || undefined} id="reset-otp" label="Kode OTP" required>
          <Input
            autoComplete="one-time-code"
            className="h-14 rounded-2xl text-center font-mono text-xl tracking-[0.35em]"
            disabled={isSubmitting}
            id="reset-otp"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setResetForm((current) => ({ ...current, otp: event.target.value.replace(/\D/g, "") }))}
            pattern="[0-9]{6}"
            placeholder="123456"
            value={resetForm.otp}
          />
        </FieldShell>
        <FieldShell id="reset-new-password" label="Password Baru" required>
          <Input
            autoComplete="new-password"
            className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
            disabled={isSubmitting}
            id="reset-new-password"
            minLength={8}
            onChange={(event) => setResetForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Minimal 8 karakter"
            type="password"
            value={resetForm.password}
          />
        </FieldShell>
        <PublicButton disabled={isSubmitting || resetForm.otp.length !== 6 || resetForm.password.length < 8} fullWidth type="submit">
          {isSubmitting ? "Menyimpan..." : "Reset Password"}
        </PublicButton>
        <div className="flex justify-center gap-3 text-sm">
          <button className="font-medium text-primary hover:underline" disabled={isSubmitting} onClick={handleResetRequest} type="button">
            Kirim ulang OTP
          </button>
          <span className="text-muted-foreground">·</span>
          <button className="font-medium text-white/50 hover:text-white/80 hover:underline" disabled={isSubmitting} onClick={() => setStep("form")} type="button">
            Kembali
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 rounded-2xl bg-white/8 p-1">
        {(["login", "register"] as const).map((item) => (
          <button
            className={cn(
              "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
              mode === item ? "bg-white/15 text-white shadow-sm" : "text-white/40 hover:text-white/70"
            )}
            key={item}
            onClick={() => resetTransientState(item)}
            type="button"
          >
            {item === "login" ? "Masuk" : "Daftar Baru"}
          </button>
        ))}
      </div>

      {mode === "login" ? (
        <form className="space-y-4" onSubmit={handleLogin}>
          <FieldShell error={error || undefined} id="identifier" label="Email atau Nomor WhatsApp" required>
            <Input
              autoComplete="username"
              className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
              disabled={isSubmitting}
              id="identifier"
              onChange={(event) => setLoginForm((current) => ({ ...current, identifier: event.target.value }))}
              placeholder="nama@email.com atau 0812xxxx"
              value={loginForm.identifier}
            />
          </FieldShell>
          <FieldShell id="login-password" label="Password" required>
            <Input
              autoComplete="current-password"
              className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
              disabled={isSubmitting}
              id="login-password"
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Password"
              type="password"
              value={loginForm.password}
            />
          </FieldShell>
          <PublicButton disabled={isSubmitting} fullWidth type="submit">
            {isSubmitting ? "Masuk..." : "Masuk"}
          </PublicButton>
          <div className="text-center">
            <button
              className="text-sm font-medium text-primary hover:underline"
              disabled={isSubmitting}
              onClick={() => resetTransientState("reset")}
              type="button"
            >
              Lupa password?
            </button>
          </div>
        </form>
      ) : mode === "reset" ? (
        <form className="space-y-4" onSubmit={handleResetRequest}>
          <FieldShell error={error || undefined} id="reset-whatsapp" label="Nomor WhatsApp Terdaftar" required>
            <Input
              autoComplete="tel"
              className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
              disabled={isSubmitting}
              id="reset-whatsapp"
              onChange={(event) => setResetForm((current) => ({ ...current, whatsapp: event.target.value }))}
              placeholder="081234567890"
              value={resetForm.whatsapp}
            />
          </FieldShell>
          <PublicButton disabled={isSubmitting || !resetForm.whatsapp} fullWidth type="submit">
            {isSubmitting ? "Mengirim..." : "Kirim OTP Reset Password"}
          </PublicButton>
          <div className="text-center">
            <button
              className="text-sm font-medium text-white/50 hover:text-white/80 hover:underline"
              disabled={isSubmitting}
              onClick={() => resetTransientState("login")}
              type="button"
            >
              Kembali ke login
            </button>
          </div>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleRegister}>
      <FieldShell id="organization" label="Pilih Organisasi" required>
            <OptionAutocompleteSelect
              variant="dark"
              disabled={isSubmitting}
              onValueChange={(value) => {
                setSelectedForbisMember(null);
                setRegisterForm((current) => ({
                  ...current,
                  email: "",
                  forbisMemberId: "",
                  forbisMemberSourceId: "",
                  isKmiAlumni: "",
                  kmiYear: "",
                  name: "",
                  organizationGroupId: value,
                  phone: "",
                  sameWhatsapp: true,
                  whatsapp: "",
                }));
              }}
              options={organizationOptions}
              placeholder="Cari atau pilih organisasi peserta"
              value={registerForm.organizationGroupId}
            />
          </FieldShell>
          <FieldShell id="name" label="Nama Lengkap" required>
            {isForbisOrganization ? (
              <ForbisMemberSearch
                disabled={isSubmitting || !registerForm.organizationGroupId}
                onChange={(value) => {
                  setRegisterForm((current) => ({ ...current, name: value }));
                }}
                onSelect={(member) => {
                  setSelectedForbisMember(member);
                  setRegisterForm((current) => ({
                    ...current,
                    email: member.email ?? "",
                    forbisMemberId: member.forbisMemberId ?? "",
                    forbisMemberSourceId: member.id,
                    isKmiAlumni: member.isKmiAlumni ? "true" : "false",
                    kmiYear: member.isKmiAlumni ? (member.kmiYear ?? "") : "",
                    name: member.name,
                    phone: member.phone ?? member.whatsapp ?? "",
                    sameWhatsapp: !member.whatsapp || Boolean(member.phone && member.phone === member.whatsapp),
                    whatsapp: member.whatsapp ?? member.phone ?? "",
                  }));
                }}
                placeholder="Cari nama anggota FORBIS"
                value={registerForm.name}
              />
            ) : (
              <Input
                autoComplete="name"
                className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
                disabled={isSubmitting || !registerForm.organizationGroupId}
                id="name"
                onChange={(event) => setRegisterForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Masukkan nama lengkap sesuai identitas"
                value={registerForm.name}
              />
            )}
          </FieldShell>
          {isForbisOrganization && (
            <FieldShell hint="Nomor ID keanggotaan FORBIS (otomatis terisi)" id="forbisMemberId" label="Nomor ID FORBIS">
              <Input
                className="h-11 rounded-2xl border-white/8 bg-white/5 text-white/50 placeholder:text-white/25"
                id="forbisMemberId"
                onChange={(event) => setRegisterForm((current) => ({ ...current, forbisMemberId: event.target.value }))}
                placeholder="Terisi otomatis saat memilih nama anggota"
                value={registerForm.forbisMemberId}
              />
            </FieldShell>
          )}
          <FieldShell hint="Opsional. Dipakai untuk pengiriman invoice dan notifikasi." id="email" label="Email">
            <Input
              autoComplete="email"
              className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
              disabled={isSubmitting || !registerForm.organizationGroupId}
              id="email"
              onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="contoh@email.com"
              type="email"
              value={registerForm.email}
            />
          </FieldShell>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell id="phone" label="Nomor Telepon" required>
              <Input
                autoComplete="tel"
                className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
                disabled={isSubmitting || !registerForm.organizationGroupId}
                id="phone"
                onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="081234567890"
                value={registerForm.phone}
              />
            </FieldShell>
            <FieldShell id="whatsapp" label="Nomor WhatsApp" required>
              <Input
                autoComplete="tel"
                className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
                disabled={isSubmitting || registerForm.sameWhatsapp || !registerForm.organizationGroupId}
                id="whatsapp"
                onChange={(event) => setRegisterForm((current) => ({ ...current, whatsapp: event.target.value }))}
                placeholder="081234567890"
                value={registerForm.sameWhatsapp ? registerForm.phone : registerForm.whatsapp}
              />
            </FieldShell>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              checked={registerForm.sameWhatsapp}
              disabled={isSubmitting}
              onChange={(event) => setRegisterForm((current) => ({ ...current, sameWhatsapp: event.target.checked }))}
              type="checkbox"
            />
            Sama dengan nomor telepon
          </label>
          <FieldShell id="kmi" label="Alumni Pondok Modern Gontor?" required>
            <select
              className="h-11 w-full rounded-2xl border border-white/12 bg-white/8 px-3 text-sm text-white"
              disabled={isSubmitting || !registerForm.organizationGroupId}
              id="kmi"
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  isKmiAlumni: event.target.value,
                  kmiYear: event.target.value !== "true" ? "" : current.kmiYear,
                }))
              }
              value={registerForm.isKmiAlumni}
            >
              <option value="">Pilih status</option>
              <option value="true">Ya</option>
              <option value="false">Tidak</option>
            </select>
          </FieldShell>
          {registerForm.isKmiAlumni === "true" && (
            <FieldShell hint="Tahun lulus/tamat dari KMI" id="kmiYear" label="Tahun Alumni KMI" required>
              <Input
                className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
                disabled={isSubmitting}
                id="kmiYear"
                inputMode="numeric"
                maxLength={4}
                onChange={(event) =>
                  setRegisterForm((current) => ({
                    ...current,
                    kmiYear: event.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
                placeholder="Contoh: 2005"
                value={registerForm.kmiYear}
              />
            </FieldShell>
          )}
          <FieldShell id="password" label="Buat Password" required>
            <Input
              autoComplete="new-password"
              className="h-11 rounded-2xl border-white/12 bg-white/8 text-white placeholder:text-white/30 focus-visible:border-[#00adee]/50"
              disabled={isSubmitting || !registerForm.organizationGroupId}
              id="password"
              minLength={8}
              onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="Minimal 8 karakter"
              type="password"
              value={registerForm.password}
            />
          </FieldShell>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <PublicButton disabled={isSubmitting || !registerForm.organizationGroupId} fullWidth type="submit">
            {isSubmitting ? "Menyimpan..." : "Daftar & Kirim OTP"}
          </PublicButton>
        </form>
      )}
    </div>
  );
}
