"use client";

import { useEffect, useRef, useState } from "react";

type DuplicateResult = { email: string | null; phone: string | null; whatsapp: string | null };

const EMPTY: DuplicateResult = { email: null, phone: null, whatsapp: null };

export function useParticipantDuplicateCheck(
  fields: { email: string; phone: string; whatsapp: string },
  excludeId?: string
) {
  const [duplicates, setDuplicates] = useState<DuplicateResult>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const { email, phone, whatsapp } = fields;
    if (!email && !phone && !whatsapp) { setDuplicates(EMPTY); return; }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams();
        if (email) params.set("email", email);
        if (phone) params.set("phone", phone);
        if (whatsapp) params.set("whatsapp", whatsapp);
        if (excludeId) params.set("excludeId", excludeId);

        const res = await fetch(`/api/participants/check?${params}`, { signal: controller.signal });
        if (!res.ok) return;
        const data: DuplicateResult = await res.json();
        setDuplicates(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setDuplicates(EMPTY);
      }
    }, 500);

    return () => { clearTimeout(timeout); abortRef.current?.abort(); };
  }, [fields.email, fields.phone, fields.whatsapp, excludeId]);

  return duplicates;
}
