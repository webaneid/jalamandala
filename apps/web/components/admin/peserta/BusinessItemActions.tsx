"use client";

import * as React from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteBusiness } from "@/actions/participants";
import { Button } from "@/components/ui/button";

interface BusinessItemActionsProps {
  businessId: string;
  participantId: string;
}

export function BusinessItemActions({
  businessId,
  participantId,
}: BusinessItemActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);

  async function handleDelete() {
    if (!confirm("Hapus data usaha ini?")) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteBusiness(businessId);

      if (!result.success) {
        alert(result.error || "Gagal menghapus data usaha.");
        return;
      }

      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/admin/peserta/${participantId}/usaha/${businessId}/edit`}>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-amber-600 hover:bg-amber-50"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        disabled={isDeleting}
        onClick={handleDelete}
        className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
