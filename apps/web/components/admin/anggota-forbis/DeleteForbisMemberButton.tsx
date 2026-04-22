"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteForbisMember } from "@/actions/forbis-members";

interface Props {
  id: string;
  name: string;
}

export function DeleteForbisMemberButton({ id, name }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm) { setConfirm(true); return; }
    startTransition(async () => {
      await deleteForbisMember(id);
    });
  }

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          className="rounded-lg px-2 py-0.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
          disabled={isPending}
          onClick={handleClick}
          type="button"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : "Hapus?"}
        </button>
        <button
          className="rounded-lg px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition"
          disabled={isPending}
          onClick={() => setConfirm(false)}
          type="button"
        >
          Batal
        </button>
      </span>
    );
  }

  return (
    <button
      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
      onClick={handleClick}
      title={`Hapus ${name}`}
      type="button"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
