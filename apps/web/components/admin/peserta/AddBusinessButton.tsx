"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessForm } from "@/components/forms/BusinessForm";
import { useRouter } from "next/navigation";
import type { BoothCategoryFormOption } from "@/lib/booth-form-options";
import type { BusinessFormValues } from "@/lib/validations/tambah_peserta";

interface AddBusinessButtonProps {
  boothCategoryOptions?: BoothCategoryFormOption[];
  defaultValues?: Partial<BusinessFormValues>;
  participantId: string;
  participantName: string;
}

export function AddBusinessButton({
  boothCategoryOptions = [],
  defaultValues,
  participantId,
  participantName,
}: AddBusinessButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();

  if (isOpen) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center justify-between px-2">
          <h4 className="font-bold text-primary-900">Tambah Usaha Baru</h4>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="rounded-xl h-8 gap-1.5 text-muted-foreground">
            <X className="size-4" /> Batal
          </Button>
        </div>
        <BusinessForm 
          boothCategoryOptions={boothCategoryOptions}
          defaultValues={defaultValues}
          participantId={participantId} 
          participantName={participantName}
          onSuccess={() => {
            setIsOpen(false);
            router.refresh();
          }}
        />
      </div>
    );
  }

  return (
    <Button 
      onClick={() => setIsOpen(true)} 
      className="bg-primary-600 hover:bg-primary-700 h-9 rounded-2xl gap-2 shadow-lg shadow-primary-200"
    >
      <Plus className="size-4" /> Tambah Usaha
    </Button>
  );
}
