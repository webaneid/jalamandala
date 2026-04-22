"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock3,
  Loader2,
  MapPin,
  Mic2,
  Pencil,
  Plus,
} from "lucide-react";

import { createAgenda, type AgendaPayload, updateAgenda } from "@/actions/agendas";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type AgendaRecord = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  agendaType: string;
  startAt: string;
  endAt: string | null;
  venueName: string | null;
  stageName: string | null;
  speakerNames: string[];
  isPublic: boolean;
  status: string;
  sortOrder: number;
};

type Props = {
  eventId: string;
  eventName: string;
  agendas: AgendaRecord[];
};

const AGENDA_TYPES = [
  { value: "session", label: "Sesi" },
  { value: "ceremony", label: "Seremoni" },
  { value: "talkshow", label: "Talkshow" },
  { value: "workshop", label: "Workshop" },
  { value: "business_matching", label: "Business Matching" },
  { value: "entertainment", label: "Hiburan" },
];

const AGENDA_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Publish" },
  { value: "cancelled", label: "Batal" },
];

const EMPTY_FORM: AgendaPayload = {
  agendaType: "session",
  description: "",
  endAt: "",
  isPublic: true,
  sortOrder: 0,
  speakerNames: [],
  stageName: "",
  startAt: "",
  status: "draft",
  title: "",
  venueName: "",
};

function formatAgendaType(type: string) {
  return AGENDA_TYPES.find((item) => item.value === type)?.label ?? "Sesi";
}

function formatAgendaStatus(status: string) {
  return AGENDA_STATUSES.find((item) => item.value === status)?.label ?? "Draft";
}

function getStatusClassName(status: string) {
  switch (status) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function formatDateKey(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function formatTimeRange(startAt: string, endAt: string | null) {
  const start = new Date(startAt);
  const startLabel = start.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  if (!endAt) {
    return startLabel;
  }

  const end = new Date(endAt);
  const endLabel = end.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  return `${startLabel} - ${endLabel}`;
}

function toDatetimeLocalInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function agendaToForm(agenda: AgendaRecord): AgendaPayload {
  return {
    agendaType: agenda.agendaType,
    description: agenda.description ?? "",
    endAt: toDatetimeLocalInput(agenda.endAt),
    isPublic: agenda.isPublic,
    sortOrder: agenda.sortOrder,
    speakerNames: agenda.speakerNames,
    stageName: agenda.stageName ?? "",
    startAt: toDatetimeLocalInput(agenda.startAt),
    status: agenda.status,
    title: agenda.title,
    venueName: agenda.venueName ?? "",
  };
}

export function AgendaDashboard({ eventId, eventName, agendas }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dayFilter, setDayFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [form, setForm] = useState<AgendaPayload>(EMPTY_FORM);
  const [error, setError] = useState("");

  const dayOptions = useMemo(() => {
    return Array.from(
      new Map(
        agendas.map((agenda) => {
          const date = new Date(agenda.startAt);
          return [formatDateKey(date), formatDateLabel(date)] as const;
        })
      ).entries()
    ).map(([value, label]) => ({ label, value }));
  }, [agendas]);

  const filteredAgendas = useMemo(() => {
    return agendas.filter((agenda) => {
      const agendaDay = formatDateKey(new Date(agenda.startAt));
      const matchesDay = dayFilter === "all" || agendaDay === dayFilter;
      const matchesType = typeFilter === "all" || agenda.agendaType === typeFilter;
      return matchesDay && matchesType;
    });
  }, [agendas, dayFilter, typeFilter]);

  const groupedDays = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; label: string; agendas: AgendaRecord[] }
    >();

    for (const agenda of filteredAgendas) {
      const startAt = new Date(agenda.startAt);
      const key = formatDateKey(startAt);
      const current = groups.get(key);
      if (current) {
        current.agendas.push(agenda);
        continue;
      }

      groups.set(key, {
        agendas: [agenda],
        key,
        label: formatDateLabel(startAt),
      });
    }

    return Array.from(groups.values());
  }, [filteredAgendas]);

  function openCreateDialog() {
    setEditingAgendaId(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }

  function openEditDialog(agenda: AgendaRecord) {
    setEditingAgendaId(agenda.id);
    setForm(agendaToForm(agenda));
    setError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (isPending) {
      return;
    }

    setDialogOpen(false);
    setEditingAgendaId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result = editingAgendaId
        ? await updateAgenda(editingAgendaId, eventId, form)
        : await createAgenda(eventId, form);

      if (!result.success) {
        setError(result.error ?? "Gagal menyimpan agenda.");
        return;
      }

      closeDialog();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-[28px] border border-border/70 bg-white/72 p-5 shadow-none lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="agenda-day-filter">Filter Hari</Label>
            <select
              id="agenda-day-filter"
              className="h-11 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm outline-none focus:border-primary/40"
              onChange={(event) => setDayFilter(event.target.value)}
              value={dayFilter}
            >
              <option value="all">Semua hari</option>
              {dayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agenda-type-filter">Filter Tipe</Label>
            <select
              id="agenda-type-filter"
              className="h-11 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm outline-none focus:border-primary/40"
              onChange={(event) => setTypeFilter(event.target.value)}
              value={typeFilter}
            >
              <option value="all">Semua tipe</option>
              {AGENDA_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-start lg:justify-end">
          <Button className="h-11 rounded-2xl gap-2" onClick={openCreateDialog} type="button">
            <Plus className="size-4" />
            Tambah Agenda
          </Button>
        </div>
      </div>

      {groupedDays.length === 0 ? (
        <AdminEmptyState
          icon={CalendarDays}
          title={agendas.length === 0 ? "Belum ada agenda" : "Filter tidak menemukan agenda"}
          description={
            agendas.length === 0
              ? `Agenda untuk ${eventName} masih kosong. Tambahkan item pertama agar run-down event mulai tersusun per hari dan jam.`
              : "Coba ubah filter hari atau tipe agenda agar daftar kegiatan muncul kembali."
          }
          action={
            agendas.length === 0 ? (
              <Button className="rounded-2xl gap-2" onClick={openCreateDialog} type="button">
                <Plus className="size-4" />
                Tambah Agenda Pertama
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-5">
          {groupedDays.map((group) => (
            <Card key={group.key} className="rounded-[28px] border-none bg-white/72 shadow-none">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-5 flex flex-col gap-2 border-b border-border/60 pb-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                      Hari Agenda
                    </p>
                    <h2 className="text-xl font-semibold tracking-[-0.04em] text-foreground">
                      {group.label}
                    </h2>
                  </div>
                  <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
                    {group.agendas.length} agenda
                  </Badge>
                </div>

                <div className="space-y-4">
                  {group.agendas.map((agenda) => (
                    <div
                      key={agenda.id}
                      className="grid gap-4 rounded-[24px] border border-border/70 bg-white/90 p-4 lg:grid-cols-[160px_minmax(0,1fr)_auto] lg:items-start"
                    >
                      <div className="rounded-[20px] border border-border/60 bg-slate-50/80 p-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          <Clock3 className="size-3.5" />
                          Jam
                        </div>
                        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
                          {formatTimeRange(agenda.startAt, agenda.endAt)}
                        </p>
                      </div>

                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={getStatusClassName(agenda.status)}>
                            {formatAgendaStatus(agenda.status)}
                          </Badge>
                          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                            {formatAgendaType(agenda.agendaType)}
                          </Badge>
                          {!agenda.isPublic ? (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                              Internal
                            </Badge>
                          ) : null}
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                            {agenda.title}
                          </h3>
                          {agenda.description ? (
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {agenda.description}
                            </p>
                          ) : null}
                        </div>

                        {(() => {
                          const locationValue = [agenda.venueName, agenda.stageName]
                            .filter(Boolean)
                            .join(" · ")
                          const speakerValue =
                            agenda.speakerNames.length > 0
                              ? agenda.speakerNames.join(", ")
                              : ""
                          const infoItems = [
                            locationValue
                              ? {
                                  icon: MapPin,
                                  label: "Lokasi",
                                  value: locationValue,
                                }
                              : null,
                            speakerValue
                              ? {
                                  icon: Mic2,
                                  label: "Narasumber",
                                  value: speakerValue,
                                }
                              : null,
                          ].filter(
                            (
                              item
                            ): item is {
                              icon: typeof MapPin
                              label: string
                              value: string
                            } => !!item
                          )

                          if (infoItems.length === 0) {
                            return null
                          }

                          return (
                            <div className="grid gap-3 md:grid-cols-2">
                              {infoItems.map((item) => (
                                <InfoChip
                                  key={item.label}
                                  icon={item.icon}
                                  label={item.label}
                                  value={item.value}
                                />
                              ))}
                            </div>
                          )
                        })()}
                      </div>

                      <div className="flex justify-start lg:justify-end">
                        <Button
                          className="rounded-2xl gap-2"
                          onClick={() => openEditDialog(agenda)}
                          type="button"
                          variant="outline"
                        >
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AgendaFormDialog
        error={error}
        form={form}
        isEdit={!!editingAgendaId}
        isPending={isPending}
        onClose={closeDialog}
        onSubmit={handleSubmit}
        onChange={setForm}
        open={dialogOpen}
      />
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-slate-50/70 p-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}

function AgendaFormDialog({
  open,
  onClose,
  onSubmit,
  form,
  onChange,
  isEdit,
  isPending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  form: AgendaPayload;
  onChange: React.Dispatch<React.SetStateAction<AgendaPayload>>;
  isEdit: boolean;
  isPending: boolean;
  error: string;
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <DialogHeader>
          <div>
            <DialogTitle>{isEdit ? "Edit Agenda" : "Tambah Agenda Baru"}</DialogTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Susun agenda per hari dan per jam agar run-down event tetap rapi.
            </p>
          </div>
          <DialogClose onClose={onClose} />
        </DialogHeader>

        <DialogBody className="max-h-[75vh] space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label htmlFor="agenda-title">Judul Agenda</Label>
            <Input
              id="agenda-title"
              disabled={isPending}
              onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))}
              placeholder="Opening ceremony, talkshow investor, workshop, dll"
              required
              value={form.title}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agenda-description">Deskripsi</Label>
            <textarea
              id="agenda-description"
              className="min-h-28 w-full rounded-2xl border border-border/80 bg-white px-3 py-3 text-sm outline-none focus:border-primary/40"
              disabled={isPending}
              onChange={(event) =>
                onChange((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Tulis ringkasan agenda, tujuan sesi, atau konteks kegiatan."
              value={form.description}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="agenda-start-at">Mulai</Label>
              <Input
                id="agenda-start-at"
                disabled={isPending}
                onChange={(event) => onChange((current) => ({ ...current, startAt: event.target.value }))}
                required
                type="datetime-local"
                value={form.startAt}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agenda-end-at">Selesai</Label>
              <Input
                id="agenda-end-at"
                disabled={isPending}
                onChange={(event) => onChange((current) => ({ ...current, endAt: event.target.value }))}
                type="datetime-local"
                value={form.endAt}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="agenda-type">Tipe Agenda</Label>
              <select
                id="agenda-type"
                className="h-11 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm outline-none focus:border-primary/40"
                disabled={isPending}
                onChange={(event) =>
                  onChange((current) => ({ ...current, agendaType: event.target.value }))
                }
                value={form.agendaType}
              >
                {AGENDA_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agenda-status">Status</Label>
              <select
                id="agenda-status"
                className="h-11 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm outline-none focus:border-primary/40"
                disabled={isPending}
                onChange={(event) =>
                  onChange((current) => ({ ...current, status: event.target.value }))
                }
                value={form.status}
              >
                {AGENDA_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="agenda-venue-name">Venue</Label>
              <Input
                id="agenda-venue-name"
                disabled={isPending}
                onChange={(event) =>
                  onChange((current) => ({ ...current, venueName: event.target.value }))
                }
                placeholder="Gedung utama, hall expo, area festival"
                value={form.venueName}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agenda-stage-name">Stage / Ruang</Label>
              <Input
                id="agenda-stage-name"
                disabled={isPending}
                onChange={(event) =>
                  onChange((current) => ({ ...current, stageName: event.target.value }))
                }
                placeholder="Main stage, ruang workshop, panggung VIP"
                value={form.stageName}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="agenda-speaker-names">Narasumber</Label>
            <Input
              id="agenda-speaker-names"
              disabled={isPending}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  speakerNames: event.target.value
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="Pisahkan dengan koma, misal: Ahmad Fulan, Budi Santoso"
              value={form.speakerNames.join(", ")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="agenda-sort-order">Urutan Manual</Label>
              <Input
                id="agenda-sort-order"
                disabled={isPending}
                min={0}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value || "0"),
                  }))
                }
                type="number"
                value={String(form.sortOrder)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="agenda-visibility">Visibilitas</Label>
              <select
                id="agenda-visibility"
                className="h-11 w-full rounded-2xl border border-border/80 bg-white px-3 text-sm outline-none focus:border-primary/40"
                disabled={isPending}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    isPublic: event.target.value === "public",
                  }))
                }
                value={form.isPublic ? "public" : "internal"}
              >
                <option value="public">Public</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>

        <DialogFooter>
          <Button className="rounded-2xl" disabled={isPending} onClick={onClose} type="button" variant="outline">
            Batal
          </Button>
          <Button className="rounded-2xl gap-2" disabled={isPending} type="submit">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : isEdit ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {isEdit ? "Simpan Perubahan" : "Tambah Agenda"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
