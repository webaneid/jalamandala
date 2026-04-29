"use client";

import * as React from "react";
import { CreditCard } from "lucide-react";
import { PaymentConfirmationDialog } from "./PaymentConfirmationDialog";

type Props = {
  businessId: string | null;
  buttonClassName?: string;
  buttonLabel?: string;
  defaultAmount?: number;
  dialogTitle?: string;
  eventSlug: string;
  grandTotal: number;
  invoiceNumber: string;
  minAmount?: number;
  paymentOptions: Array<{ key: string; label: string }>;
  publicToken: string;
};

export function PaymentConfirmationTrigger({
  businessId,
  buttonClassName,
  buttonLabel = "Masukan Pembayaran",
  defaultAmount,
  dialogTitle,
  eventSlug,
  grandTotal,
  invoiceNumber,
  minAmount,
  paymentOptions,
  publicToken,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={buttonClassName ?? "flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"}
        type="button"
      >
        <CreditCard className="w-4 h-4" />
        {buttonLabel}
      </button>

      {open && (
        <PaymentConfirmationDialog
          businessId={businessId}
          defaultAmount={defaultAmount}
          dialogTitle={dialogTitle}
          eventSlug={eventSlug}
          grandTotal={grandTotal}
          invoiceNumber={invoiceNumber}
          minAmount={minAmount}
          paymentOptions={paymentOptions}
          publicToken={publicToken}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
