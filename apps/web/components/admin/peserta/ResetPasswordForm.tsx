"use client";

import * as React from "react";
import { KeyRound, Eye, EyeOff } from "lucide-react";
import { resetParticipantPassword } from "@/actions/participants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function ResetPasswordForm({ participantId }: { participantId: string }) {
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password minimal 8 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Konfirmasi password tidak cocok." });
      return;
    }
    setIsPending(true);
    try {
      const result = await resetParticipantPassword(participantId, newPassword);
      if (result.success) {
        setMessage({ type: "success", text: "Password berhasil direset." });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: result.error ?? "Gagal mereset password." });
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="rounded-[32px] border-none shadow-none bg-white/72 p-1 sm:p-2">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <KeyRound className="size-4" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Reset Password</p>
            <p className="text-xs text-gray-500">Set password baru untuk peserta ini</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Password Baru</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                disabled={isPending}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Konfirmasi Password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              disabled={isPending}
              autoComplete="new-password"
            />
          </div>

          {message && (
            <p className={`text-sm font-medium ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={isPending || !newPassword || !confirmPassword} className="w-full">
            {isPending ? "Menyimpan..." : "Simpan Password Baru"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
