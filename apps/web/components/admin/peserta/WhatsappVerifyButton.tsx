"use client";

import * as React from "react";
import { CheckCircle, ShieldCheck } from "lucide-react";
import { markWhatsappVerified } from "@/actions/participants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function WhatsappVerifyButton({
  participantId,
  whatsapp,
  isVerified,
}: {
  participantId: string;
  whatsapp: string;
  isVerified: boolean;
}) {
  const [verified, setVerified] = React.useState(isVerified);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleVerify() {
    setIsPending(true);
    setError(null);
    try {
      const result = await markWhatsappVerified(participantId);
      if (result.success) {
        setVerified(true);
      } else {
        setError(result.error ?? "Gagal memperbarui.");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="rounded-[32px] border-none shadow-none bg-white/72 p-1 sm:p-2">
      <CardContent className="p-5 sm:p-6 md:p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex size-9 items-center justify-center rounded-xl ${verified ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"}`}>
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Verifikasi WhatsApp</p>
            <p className="text-xs text-gray-500">{whatsapp}</p>
          </div>
        </div>

        {verified ? (
          <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
            <CheckCircle className="size-4" />
            WhatsApp sudah terverifikasi
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              WhatsApp belum diverifikasi — peserta tidak bisa login sebelum ini dicentang.
            </p>
            <Button
              onClick={handleVerify}
              disabled={isPending}
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              {isPending ? "Memproses..." : "Tandai Sudah Terverifikasi"}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
