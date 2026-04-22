"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import { PaymentConfirmationDialog } from "./PaymentConfirmationDialog";

type Props = {
  grandTotal: number;
  invoiceNumber: string;
  paymentOptions: Array<{ key: string; label: string }>;
  publicToken: string;
};

export function PaymentConfirmationTrigger({
  grandTotal,
  invoiceNumber,
  paymentOptions,
  publicToken,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        type="button"
      >
        <CreditCard className="w-4 h-4" />
        Masukan Pembayaran
      </button>

      {open && (
        <PaymentConfirmationDialog
          grandTotal={grandTotal}
          invoiceNumber={invoiceNumber}
          paymentOptions={paymentOptions}
          publicToken={publicToken}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
