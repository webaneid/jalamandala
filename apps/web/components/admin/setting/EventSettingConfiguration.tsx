"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteMessageTemplate,
  deletePaymentChannel,
  updateEventProfile,
  updateInvoiceDueDays,
  upsertMessageTemplate,
  upsertPaymentChannel,
  upsertQrisConfig,
  upsertWhatsappConfig,
} from "@/actions/event-settings";
import { updatePricePhaseSchedule } from "@/actions/price-phases";
import { PRICE_PHASE_LABELS, utcToWibInput, type PricePhase } from "@/lib/price-phase";
import { tryParseQrisPreview } from "@/lib/qris";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker, type MediaPickerValue } from "@/components/admin/media/MediaPicker";
import { FrontendSettings } from "./FrontendSettings";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type EventSettingData = {
  event: {
    endDate: string | null;
    id: string;
    logoAssetId: string | null | undefined;
    name: string;
    schemaName: string;
    slug: string;
    startDate: string | null;
    targetBooths: number | null;
    targetVisitors: number | null;
    venue: string | null;
    financeWaNumbers: string[];
    leaderWaNumbers: string[];
    eventTeamWaNumbers: string[];
    invoiceDueDays: number;
  };
  paymentChannels: Array<{
    accountName: string | null;
    accountNumber: string | null;
    bankName: string | null;
    id: string;
    isActive: boolean;
    label: string;
    type: string;
  }>;
  qrisConfig: {
    emvPayload: string | null;
    expiryMinutes: number | null;
    id: string;
    imageAssetId: string | null | undefined;
    isEnabled: boolean;
    merchantCity: string | null;
    merchantName: string | null;
  } | null;
  templates: Array<{
    bodyTemplate: string;
    id: string;
    isActive: boolean;
    key: string;
    title: string;
  }>;
  whatsappConfig: {
    apiBaseUrl: string | null;
    username: string | null;
    password: string | null;
    deviceId: string | null;
    senderNumber: string | null;
    webhookSecret: string | null;
    sendDelayMs: number | null;
    id: string;
    isActive: boolean;
  } | null;
} | null;

type BankAccountEditorState = {
  accountName: string;
  accountNumber: string;
  bankName: string;
  id?: string;
  isActive: boolean;
} | null;

type MessageTemplateEditorState = {
  bodyTemplate: string;
  id?: string;
  isActive: boolean;
  key: string;
  title: string;
} | null;

type PricePhaseScheduleEntry = {
  phase: PricePhase;
  startsAt: string | null;
  endsAt: string | null;
};

type SettingTab = "payment" | "price" | "profile" | "whatsapp" | "frontend";

export function EventSettingConfiguration({
  data,
  pricePhaseSchedules,
  frontendConfig,
  frontendTargets,
}: {
  data: EventSettingData;
  pricePhaseSchedules: PricePhaseScheduleEntry[];
  frontendConfig: any;
  frontendTargets: any[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<SettingTab>("profile");
  const [isSaving, startSaving] = React.useTransition();
  const [profileError, setProfileError] = React.useState("");
  const [bankError, setBankError] = React.useState("");
  const [qrisError, setQrisError] = React.useState("");
  const [qrisDecodeError, setQrisDecodeError] = React.useState("");
  const [qrisDecodeLoading, setQrisDecodeLoading] = React.useState(false);
  const [templateError, setTemplateError] = React.useState("");
  const [whatsappError, setWhatsappError] = React.useState("");
  const [dueDaysValue, setDueDaysValue] = React.useState(String(data?.event.invoiceDueDays ?? 1));
  const [dueDaysError, setDueDaysError] = React.useState("");
  const [dueDaysSaved, setDueDaysSaved] = React.useState(false);
  const [pricePhaseError, setPricePhaseError] = React.useState("");
  const [pricePhaseForm, setPricePhaseForm] = React.useState(() => {
    const phases: PricePhase[] = ["early_bird", "pre_sale", "regular"];
    return Object.fromEntries(
      phases.map((phase) => {
        const entry = pricePhaseSchedules.find((s) => s.phase === phase);
        return [
          phase,
          {
            startsAt: utcToWibInput(entry?.startsAt ?? null),
            endsAt: utcToWibInput(entry?.endsAt ?? null),
          },
        ];
      })
    ) as Record<PricePhase, { startsAt: string; endsAt: string }>;
  });
  const [bankEditor, setBankEditor] = React.useState<BankAccountEditorState>(null);
  const [templateEditor, setTemplateEditor] = React.useState<MessageTemplateEditorState>(null);
  const [logoAsset, setLogoAsset] = React.useState<MediaPickerValue>(
    data?.event?.logoAssetId
      ? { id: data.event.logoAssetId, url: `/api/media/${data.event.logoAssetId}`, objectKey: "", fileName: "logo", mimeType: "image/*" }
      : null
  );
  const [qrisImageAsset, setQrisImageAsset] = React.useState<MediaPickerValue>(
    data?.qrisConfig?.imageAssetId
      ? { id: data.qrisConfig.imageAssetId, url: `/api/media/${data.qrisConfig.imageAssetId}`, objectKey: "", fileName: "qris", mimeType: "image/*" }
      : null
  );
  const [profileForm, setProfileForm] = React.useState(() =>
    data?.event
      ? {
          endDate: toDateTimeLocal(data.event.endDate),
          name: data.event.name,
          startDate: toDateTimeLocal(data.event.startDate),
          targetBooths: data.event.targetBooths ? String(data.event.targetBooths) : "",
          targetVisitors: data.event.targetVisitors ? String(data.event.targetVisitors) : "",
          venue: data.event.venue ?? "",
          financeWaNumbers: (data.event.financeWaNumbers ?? []).join("\n"),
          leaderWaNumbers: (data.event.leaderWaNumbers ?? []).join("\n"),
          eventTeamWaNumbers: (data.event.eventTeamWaNumbers ?? []).join("\n"),
        }
      : {
          endDate: "",
          name: "",
          startDate: "",
          targetBooths: "",
          targetVisitors: "",
          venue: "",
          financeWaNumbers: "",
          leaderWaNumbers: "",
          eventTeamWaNumbers: "",
        }
  );
  const [qrisForm, setQrisForm] = React.useState(() => ({
    emvPayload: data?.qrisConfig?.emvPayload ?? "",
    expiryMinutes: data?.qrisConfig?.expiryMinutes
      ? String(data.qrisConfig.expiryMinutes)
      : "15",
    isEnabled: data?.qrisConfig?.isEnabled ?? false,
    merchantCity: data?.qrisConfig?.merchantCity ?? "",
    merchantName: data?.qrisConfig?.merchantName ?? "",
  }));
  const [whatsappForm, setWhatsappForm] = React.useState(() => ({
    apiBaseUrl: data?.whatsappConfig?.apiBaseUrl ?? "",
    username: data?.whatsappConfig?.username ?? "",
    password: data?.whatsappConfig?.password ?? "",
    deviceId: data?.whatsappConfig?.deviceId ?? "",
    senderNumber: data?.whatsappConfig?.senderNumber ?? "",
    webhookSecret: data?.whatsappConfig?.webhookSecret ?? "",
    sendDelayMs: data?.whatsappConfig?.sendDelayMs ?? 2000,
    isActive: data?.whatsappConfig?.isActive ?? false,
  }));
  const lastDecodedQrisAssetIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!data?.event) {
      return;
    }

    setProfileForm({
      endDate: toDateTimeLocal(data.event.endDate),
      name: data.event.name,
      startDate: toDateTimeLocal(data.event.startDate),
      targetBooths: data.event.targetBooths ? String(data.event.targetBooths) : "",
      targetVisitors: data.event.targetVisitors ? String(data.event.targetVisitors) : "",
      venue: data.event.venue ?? "",
      financeWaNumbers: (data.event.financeWaNumbers ?? []).join("\n"),
      leaderWaNumbers: (data.event.leaderWaNumbers ?? []).join("\n"),
      eventTeamWaNumbers: (data.event.eventTeamWaNumbers ?? []).join("\n"),
    });
  }, [data?.event]);

  React.useEffect(() => {
    setQrisForm({
      emvPayload: data?.qrisConfig?.emvPayload ?? "",
      expiryMinutes: data?.qrisConfig?.expiryMinutes
        ? String(data.qrisConfig.expiryMinutes)
        : "15",
      isEnabled: data?.qrisConfig?.isEnabled ?? false,
      merchantCity: data?.qrisConfig?.merchantCity ?? "",
      merchantName: data?.qrisConfig?.merchantName ?? "",
    });
  }, [data?.qrisConfig]);

  React.useEffect(() => {
    setWhatsappForm({
      apiBaseUrl: data?.whatsappConfig?.apiBaseUrl ?? "",
      username: data?.whatsappConfig?.username ?? "",
      password: data?.whatsappConfig?.password ?? "",
      deviceId: data?.whatsappConfig?.deviceId ?? "",
      senderNumber: data?.whatsappConfig?.senderNumber ?? "",
      webhookSecret: data?.whatsappConfig?.webhookSecret ?? "",
      sendDelayMs: data?.whatsappConfig?.sendDelayMs ?? 2000,
      isActive: data?.whatsappConfig?.isActive ?? false,
    });
  }, [data?.whatsappConfig]);

  const qrisPreview = React.useMemo(
    () => tryParseQrisPreview(qrisForm.emvPayload),
    [qrisForm.emvPayload]
  );

  React.useEffect(() => {
    if (!qrisForm.emvPayload) {
      return;
    }

    if (qrisPreview.error) {
      return;
    }

    setQrisForm((current) => ({
      ...current,
      merchantCity: qrisPreview.merchantCity ?? "",
      merchantName: qrisPreview.merchantName ?? "",
    }));
  }, [qrisForm.emvPayload, qrisPreview.error, qrisPreview.merchantCity, qrisPreview.merchantName]);

  React.useEffect(() => {
    async function decodeQrisFromImageAsset() {
      if (!qrisImageAsset?.id || !qrisImageAsset.url) {
        lastDecodedQrisAssetIdRef.current = null;
        return;
      }

      if (lastDecodedQrisAssetIdRef.current === qrisImageAsset.id) {
        return;
      }

      const BarcodeDetectorCtor = (
        window as typeof window & {
          BarcodeDetector?: new (options?: { formats?: string[] }) => {
            detect: (source: ImageBitmap) => Promise<Array<{ rawValue?: string | null }>>;
          };
        }
      ).BarcodeDetector;

      if (!BarcodeDetectorCtor) {
        setQrisDecodeError(
          "Browser ini belum mendukung decode QR otomatis dari gambar. Paste EMV payload manual jika perlu."
        );
        lastDecodedQrisAssetIdRef.current = qrisImageAsset.id;
        return;
      }

      setQrisDecodeLoading(true);
      setQrisDecodeError("");

      try {
        const response = await fetch(qrisImageAsset.url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Gagal mengambil gambar QRIS.");
        }

        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
        const results = await detector.detect(bitmap);
        bitmap.close();

        const rawValue = results[0]?.rawValue?.trim();
        if (!rawValue) {
          throw new Error("QRIS pada gambar tidak berhasil dibaca.");
        }

        setQrisForm((current) => ({
          ...current,
          emvPayload: rawValue,
        }));
        lastDecodedQrisAssetIdRef.current = qrisImageAsset.id;
      } catch (error) {
        setQrisDecodeError(
          error instanceof Error
            ? error.message
            : "QRIS pada gambar tidak berhasil dibaca."
        );
      } finally {
        setQrisDecodeLoading(false);
      }
    }

    void decodeQrisFromImageAsset();
  }, [qrisImageAsset]);

  if (!data?.event) {
    return (
      <Card className="border-white/80 bg-white/90">
        <CardContent className="p-6 text-sm text-muted-foreground">
          Event aktif belum tersedia. Buat atau aktifkan event dulu sebelum mengatur setting.
        </CardContent>
      </Card>
    );
  }

  function openCreateBankAccount() {
    setBankError("");
    setBankEditor({
      accountName: "",
      accountNumber: "",
      bankName: "",
      isActive: true,
    });
  }

  function openEditBankAccount(account: NonNullable<EventSettingData>["paymentChannels"][number]) {
    setBankError("");
    setBankEditor({
      accountName: account.accountName ?? "",
      accountNumber: account.accountNumber ?? "",
      bankName: account.bankName ?? "",
      id: account.id,
      isActive: account.isActive,
    });
  }

  function openCreateTemplate() {
    setTemplateError("");
    setTemplateEditor({
      bodyTemplate: "",
      isActive: true,
      key: "",
      title: "",
    });
  }

  function openEditTemplate(template: NonNullable<EventSettingData>["templates"][number]) {
    setTemplateError("");
    setTemplateEditor({
      bodyTemplate: template.bodyTemplate,
      id: template.id,
      isActive: template.isActive,
      key: template.key,
      title: template.title,
    });
  }

  function saveProfile() {
    setProfileError("");
    startSaving(async () => {
      const parseNumbers = (raw: string) =>
        raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

      const result = await updateEventProfile({
        endDate: profileForm.endDate,
        logoAssetId: logoAsset?.id || null,
        name: profileForm.name,
        startDate: profileForm.startDate,
        targetBooths: profileForm.targetBooths ? Number(profileForm.targetBooths) : null,
        targetVisitors: profileForm.targetVisitors ? Number(profileForm.targetVisitors) : null,
        venue: profileForm.venue,
        financeWaNumbers: parseNumbers(profileForm.financeWaNumbers),
        leaderWaNumbers: parseNumbers(profileForm.leaderWaNumbers),
        eventTeamWaNumbers: parseNumbers(profileForm.eventTeamWaNumbers),
      });

      if (!result.success) {
        setProfileError(result.error ?? "Gagal menyimpan profil event.");
        return;
      }

      router.refresh();
    });
  }

  function saveBankAccount() {
    if (!bankEditor) {
      return;
    }

    setBankError("");
    startSaving(async () => {
      const result = await upsertPaymentChannel(bankEditor);

      if (!result.success) {
        setBankError(result.error ?? "Gagal menyimpan rekening pembayaran.");
        return;
      }

      setBankEditor(null);
      router.refresh();
    });
  }

  function saveQris() {
    setQrisError("");
    startSaving(async () => {
      const result = await upsertQrisConfig({
        emvPayload: qrisForm.emvPayload,
        expiryMinutes: qrisForm.expiryMinutes ? Number(qrisForm.expiryMinutes) : 15,
        imageAssetId: qrisImageAsset?.id || null,
        isEnabled: qrisForm.isEnabled,
      });

      if (!result.success) {
        setQrisError(result.error ?? "Gagal menyimpan pengaturan QRIS.");
        return;
      }

      router.refresh();
    });
  }

  function saveWhatsapp() {
    setWhatsappError("");
    startSaving(async () => {
      const result = await upsertWhatsappConfig({
        apiBaseUrl: whatsappForm.apiBaseUrl,
        username: whatsappForm.username,
        password: whatsappForm.password,
        deviceId: whatsappForm.deviceId,
        senderNumber: whatsappForm.senderNumber,
        webhookSecret: whatsappForm.webhookSecret,
        sendDelayMs: whatsappForm.sendDelayMs,
        isActive: whatsappForm.isActive,
      });

      if (!result.success) {
        setWhatsappError(result.error ?? "Gagal menyimpan WhatsApp gateway.");
        return;
      }

      router.refresh();
    });
  }

  function savePricePhase(phase: PricePhase) {
    setPricePhaseError("");
    startSaving(async () => {
      const form = pricePhaseForm[phase];
      const result = await updatePricePhaseSchedule({
        phase,
        startsAt: form.startsAt || null,
        endsAt: form.endsAt || null,
      });

      if (!result.success) {
        setPricePhaseError(result.error ?? "Gagal menyimpan jadwal fase harga.");
        return;
      }

      router.refresh();
    });
  }

  function saveTemplate() {
    if (!templateEditor) {
      return;
    }

    setTemplateError("");
    startSaving(async () => {
      const result = await upsertMessageTemplate(templateEditor);

      if (!result.success) {
        setTemplateError(result.error ?? "Gagal menyimpan template pesan.");
        return;
      }

      setTemplateEditor(null);
      router.refresh();
    });
  }

  function removeBankAccount(id: string) {
    setBankError("");
    startSaving(async () => {
      const result = await deletePaymentChannel(id);

      if (!result.success) {
        setBankError(result.error ?? "Gagal menghapus rekening pembayaran.");
        return;
      }

      if (bankEditor?.id === id) {
        setBankEditor(null);
      }

      router.refresh();
    });
  }

  function removeTemplate(id: string) {
    setTemplateError("");
    startSaving(async () => {
      const result = await deleteMessageTemplate(id);

      if (!result.success) {
        setTemplateError(result.error ?? "Gagal menghapus template pesan.");
        return;
      }

      if (templateEditor?.id === id) {
        setTemplateEditor(null);
      }

      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-5">
        <div className="rounded-[28px] border border-white/80 bg-white/90 p-2 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="grid gap-2 md:grid-cols-4">
            <TabButton
              active={activeTab === "profile"}
              description="Identitas, target, dan jadwal event"
              label="Profile Event"
              onClick={() => setActiveTab("profile")}
            />
            <TabButton
              active={activeTab === "payment"}
              description="Rekening pembayaran dan konfigurasi QRIS"
              label="Pembayaran"
              onClick={() => setActiveTab("payment")}
            />
            <TabButton
              active={activeTab === "price"}
              description="Jadwal early bird, pre-sale, dan regular"
              label="Fase Harga"
              onClick={() => setActiveTab("price")}
            />
            <TabButton
              active={activeTab === "whatsapp"}
              description="Gateway WhatsApp dan template pesan"
              label="WhatsApp"
              onClick={() => setActiveTab("whatsapp")}
            />
            <TabButton
              active={activeTab === "frontend"}
              description="Menu Navigasi dan Homepage event"
              label="Front-End"
              onClick={() => setActiveTab("frontend")}
            />
          </div>
        </div>

        {activeTab === "profile" ? (
          <Card className="border-white/80 bg-white/90">
            <CardHeader className="border-b border-border/60">
              <CardTitle>Profile Event</CardTitle>
              <CardDescription>
                Bagian ini mengatur identitas event yang akan tampil di invoice, halaman publik,
                dan modul operasional lain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-4 md:grid-cols-2">
                <FieldBlock label="Nama Event">
                  <Input
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Contoh: FORBIS Expo 2026"
                    value={profileForm.name}
                  />
                </FieldBlock>
                <FieldBlock label="Tempat Event">
                  <Input
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, venue: event.target.value }))
                    }
                    placeholder="Contoh: New BPPM Gontor"
                    value={profileForm.venue}
                  />
                </FieldBlock>
                <FieldBlock label="Logo Event">
                  <MediaPicker
                    value={logoAsset}
                    onChange={setLogoAsset}
                    accept="image"
                    folder="public/event-logos"
                    visibility="public"
                    placeholder="Pilih atau upload logo event..."
                  />
                </FieldBlock>
                <FieldBlock label="Target Peserta Booth">
                  <Input
                    min={0}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        targetBooths: event.target.value,
                      }))
                    }
                    placeholder="100"
                    type="number"
                    value={profileForm.targetBooths}
                  />
                </FieldBlock>
                <FieldBlock label="Target Pengunjung">
                  <Input
                    min={0}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        targetVisitors: event.target.value,
                      }))
                    }
                    placeholder="5000"
                    type="number"
                    value={profileForm.targetVisitors}
                  />
                </FieldBlock>
                <FieldBlock label="Slug Event">
                  <Input readOnly value={data.event.slug} />
                </FieldBlock>
                <FieldBlock label="Waktu Mulai Event">
                  <Input
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                    type="datetime-local"
                    value={profileForm.startDate}
                  />
                </FieldBlock>
                <FieldBlock label="Waktu Selesai Event">
                  <Input
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                    type="datetime-local"
                    value={profileForm.endDate}
                  />
                </FieldBlock>
                <FieldBlock label="Schema Tenant">
                  <Input readOnly value={data.event.schemaName} />
                </FieldBlock>
                <FieldBlock
                  hint="Satu nomor per baris (atau pisahkan koma). Penerima notif pencairan & pembayaran besar."
                  label="Nomor WA Tim Finance"
                >
                  <textarea
                    className="min-h-20 w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, financeWaNumbers: event.target.value }))
                    }
                    placeholder={"6281234567890\n6289876543210"}
                    value={profileForm.financeWaNumbers}
                  />
                </FieldBlock>
                <FieldBlock
                  hint="Satu nomor per baris. Penerima ringkasan harian & milestone booth penuh."
                  label="Nomor WA Pimpinan / Ketua"
                >
                  <textarea
                    className="min-h-20 w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, leaderWaNumbers: event.target.value }))
                    }
                    placeholder={"6281234567890"}
                    value={profileForm.leaderWaNumbers}
                  />
                </FieldBlock>
                <FieldBlock
                  hint="Satu nomor per baris. Penerima notif peserta baru terkonfirmasi."
                  label="Nomor WA Tim Acara"
                >
                  <textarea
                    className="min-h-20 w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                    onChange={(event) =>
                      setProfileForm((current) => ({ ...current, eventTeamWaNumbers: event.target.value }))
                    }
                    placeholder={"6281234567890"}
                    value={profileForm.eventTeamWaNumbers}
                  />
                </FieldBlock>
              </div>

              {profileError ? <ErrorBox>{profileError}</ErrorBox> : null}

              <div className="flex justify-end border-t border-border/70 pt-5">
                <Button disabled={isSaving} onClick={saveProfile} type="button">
                  {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Simpan Profile Event
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeTab === "payment" ? (
          <div className="space-y-4">
            {/* Jatuh Tempo Invoice */}
            <Card className="border-white/80 bg-white/90">
              <CardHeader className="border-b border-border/60">
                <CardTitle>Jatuh Tempo Invoice</CardTitle>
                <CardDescription>
                  Batas waktu pembayaran sejak invoice diterbitkan. Jika terlewat, booth dikembalikan ke status tersedia.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex items-end gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="due-days">Masa berlaku (hari)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="due-days"
                        type="number"
                        min={1}
                        max={30}
                        value={dueDaysValue}
                        onChange={(e) => { setDueDaysValue(e.target.value); setDueDaysSaved(false); setDueDaysError(""); }}
                        className="w-28"
                      />
                      <span className="text-sm text-muted-foreground">hari sejak terbit</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      const days = parseInt(dueDaysValue, 10);
                      if (!days || days < 1) { setDueDaysError("Minimal 1 hari."); return; }
                      setDueDaysError("");
                      startSaving(async () => {
                        const res = await updateInvoiceDueDays(days);
                        if (!res.success) { setDueDaysError(res.error ?? "Gagal."); return; }
                        setDueDaysSaved(true);
                        setTimeout(() => setDueDaysSaved(false), 3000);
                      });
                    }}
                  >
                    {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Simpan
                  </Button>
                  {dueDaysSaved && <span className="text-sm text-emerald-600">Tersimpan ✓</span>}
                </div>
                {dueDaysError && <p className="mt-2 text-sm text-destructive">{dueDaysError}</p>}
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/90">
              <CardHeader className="border-b border-border/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Rekening Pembayaran</CardTitle>
                    <CardDescription>
                      Rekening manual yang akan tampil di invoice. Satu event bisa punya lebih
                      dari satu rekening.
                    </CardDescription>
                  </div>
                  <Button onClick={openCreateBankAccount} type="button">
                    <Plus className="mr-2 size-4" />
                    Tambah Rekening
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Rekening</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead>Nomor Rekening</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px] text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.paymentChannels.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium text-primary-950">
                          {account.accountName || "-"}
                        </TableCell>
                        <TableCell>{account.bankName || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {account.accountNumber || "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge active={account.isActive} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <IconButton
                              icon={<Pencil className="size-4" />}
                              label="Edit rekening"
                              onClick={() => openEditBankAccount(account)}
                            />
                            <IconButton
                              destructive
                              icon={<Trash2 className="size-4" />}
                              label="Hapus rekening"
                              onClick={() => removeBankAccount(account.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.paymentChannels.length === 0 ? (
                      <EmptyRow colSpan={5} label="Belum ada rekening pembayaran." />
                    ) : null}
                  </TableBody>
                </Table>

                {bankError ? <div className="mt-4"><ErrorBox>{bankError}</ErrorBox></div> : null}
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/90">
              <CardHeader className="border-b border-border/60">
                <CardTitle>QRIS</CardTitle>
                <CardDescription>
                  QRIS dipisah dari rekening karena akan dipakai untuk mesin QRIS dynamic nominal
                  per invoice sesuai [docs/arsitektur-qris.md](/Users/webane/sites/jalamandala/docs/arsitektur-qris.md:1).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldBlock label="Status QRIS">
                    <select
                      className="h-11 rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                      onChange={(event) =>
                        setQrisForm((current) => ({
                          ...current,
                          isEnabled: event.target.value === "enabled",
                        }))
                      }
                      value={qrisForm.isEnabled ? "enabled" : "disabled"}
                    >
                      <option value="disabled">Nonaktif</option>
                      <option value="enabled">Aktif</option>
                    </select>
                  </FieldBlock>
                  <FieldBlock label="Durasi Expired (Menit)">
                    <Input
                      min={1}
                      onChange={(event) =>
                        setQrisForm((current) => ({
                          ...current,
                          expiryMinutes: event.target.value,
                        }))
                      }
                      type="number"
                      value={qrisForm.expiryMinutes}
                    />
                  </FieldBlock>
                </div>

                <FieldBlock
                  hint="Paste EMV payload QRIS statis merchant. Sistem akan parse merchant name dan city."
                  label="EMV Payload QRIS"
                >
                  <textarea
                    className="min-h-36 w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                    onChange={(event) =>
                      setQrisForm((current) => ({
                        ...current,
                        emvPayload: event.target.value,
                      }))
                    }
                    placeholder="000201010211..."
                    value={qrisForm.emvPayload}
                  />
                </FieldBlock>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldBlock label="Merchant Name">
                    <Input readOnly value={qrisPreview.merchantName ?? qrisForm.merchantName} />
                  </FieldBlock>
                  <FieldBlock label="Merchant City">
                    <Input readOnly value={qrisPreview.merchantCity ?? qrisForm.merchantCity} />
                  </FieldBlock>
                </div>

                <FieldBlock
                  hint="Upload gambar QRIS merchant. Sistem akan mencoba membaca QR secara otomatis dan mengisi EMV payload."
                  label="QRIS Image"
                >
                  <MediaPicker
                    value={qrisImageAsset}
                    onChange={setQrisImageAsset}
                    accept="image"
                    folder="public/qris"
                    visibility="public"
                    placeholder="Pilih atau upload gambar QRIS..."
                  />
                </FieldBlock>

                {qrisPreview.error ? <ErrorBox>{qrisPreview.error}</ErrorBox> : null}
                {qrisDecodeLoading ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    Membaca QRIS dari gambar...
                  </div>
                ) : null}
                {qrisDecodeError ? <ErrorBox>{qrisDecodeError}</ErrorBox> : null}
                {qrisError ? <ErrorBox>{qrisError}</ErrorBox> : null}

                <div className="flex justify-end border-t border-border/70 pt-5">
                  <Button disabled={isSaving} onClick={saveQris} type="button">
                    {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Simpan QRIS
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "price" ? (
          <div className="space-y-4">
            <Card className="border-white/80 bg-white/90">
              <CardHeader className="border-b border-border/60">
                <CardTitle>Jadwal Fase Harga Booth</CardTitle>
                <CardDescription>
                  Setiap fase berlaku sesuai rentang tanggal yang diatur. Semua waktu dalam WIB (UTC+7).
                  Jika tidak ada fase yang aktif saat ini, sistem akan memakai harga <strong>regular</strong> sebagai fallback.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {(["early_bird", "pre_sale", "regular"] as const).map((phase) => (
                  <div
                    key={phase}
                    className="rounded-2xl border border-border/70 bg-white p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{PRICE_PHASE_LABELS[phase]}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Kode fase: <span className="font-mono">{phase}</span>
                        </p>
                      </div>
                      <Button
                        disabled={isSaving}
                        onClick={() => savePricePhase(phase)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {isSaving ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
                        Simpan
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldBlock
                        hint="Tanggal mulai berlakunya fase ini. Kosongkan jika tidak ada batas awal."
                        label="Mulai Berlaku (WIB)"
                      >
                        <Input
                          type="datetime-local"
                          value={pricePhaseForm[phase].startsAt}
                          onChange={(e) =>
                            setPricePhaseForm((prev) => ({
                              ...prev,
                              [phase]: { ...prev[phase], startsAt: e.target.value },
                            }))
                          }
                        />
                      </FieldBlock>
                      <FieldBlock
                        hint="Tanggal berakhirnya fase ini. Kosongkan jika tidak ada batas akhir."
                        label="Berakhir (WIB)"
                      >
                        <Input
                          type="datetime-local"
                          value={pricePhaseForm[phase].endsAt}
                          onChange={(e) =>
                            setPricePhaseForm((prev) => ({
                              ...prev,
                              [phase]: { ...prev[phase], endsAt: e.target.value },
                            }))
                          }
                        />
                      </FieldBlock>
                    </div>
                  </div>
                ))}

                {pricePhaseError ? (
                  <ErrorBox>{pricePhaseError}</ErrorBox>
                ) : null}

                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <strong>Catatan:</strong> Perubahan jadwal di sini berlaku secara global untuk semua zona booth.
                  Sistem mengecek fase aktif saat admin membuat tagihan.
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {activeTab === "whatsapp" ? (
          <div className="space-y-4">
            <Card className="border-white/80 bg-white/90">
              <CardHeader className="border-b border-border/60">
                <CardTitle>Konfigurasi GOWA</CardTitle>
                <CardDescription>
                  Gateway: GOWA (go-whatsapp-web-multidevice by aldinokemal), self-hosted di SumoPod.
                  Semua field sesuai env vars <code>GOWA_*</code> di arsitektur.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">WhatsApp Notifikasi</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Aktifkan/nonaktifkan seluruh notifikasi WhatsApp</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={whatsappForm.isActive}
                    onClick={() => setWhatsappForm((c) => ({ ...c, isActive: !c.isActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      whatsappForm.isActive ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
                        whatsappForm.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldBlock
                    hint="Base URL GOWA REST API (SumoPod / self-hosted)"
                    label="Gateway URL"
                  >
                    <Input
                      onChange={(event) =>
                        setWhatsappForm((current) => ({
                          ...current,
                          apiBaseUrl: event.target.value,
                        }))
                      }
                      placeholder="https://gowa-xxx.sumopod.my.id"
                      value={whatsappForm.apiBaseUrl}
                    />
                  </FieldBlock>
                  <FieldBlock
                    hint="Format: 628xxx:xx (dari SumoPod)"
                    label="Device ID"
                  >
                    <Input
                      onChange={(event) =>
                        setWhatsappForm((current) => ({
                          ...current,
                          deviceId: event.target.value,
                        }))
                      }
                      placeholder="a0a53a8e-70a4-4a07-bd96-60117115cc00"
                      value={whatsappForm.deviceId}
                    />
                  </FieldBlock>
                  <FieldBlock label="Username">
                    <Input
                      onChange={(event) =>
                        setWhatsappForm((current) => ({
                          ...current,
                          username: event.target.value,
                        }))
                      }
                      placeholder="APP_BASIC_AUTH username di SumoPod"
                      value={whatsappForm.username}
                    />
                  </FieldBlock>
                  <FieldBlock label="Password">
                    <Input
                      type="password"
                      onChange={(event) =>
                        setWhatsappForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      placeholder="APP_BASIC_AUTH password di SumoPod"
                      value={whatsappForm.password}
                    />
                  </FieldBlock>
                  <FieldBlock
                    hint="Nomor WhatsApp yang login di GOWA"
                    label="Nomor Pengirim"
                  >
                    <Input
                      onChange={(event) =>
                        setWhatsappForm((current) => ({
                          ...current,
                          senderNumber: event.target.value,
                        }))
                      }
                      placeholder="6287776967723"
                      value={whatsappForm.senderNumber}
                    />
                  </FieldBlock>
                  <FieldBlock
                    hint="Sama dengan WHATSAPP_WEBHOOK_SECRET di SumoPod"
                    label="Webhook Secret"
                  >
                    <Input
                      onChange={(event) =>
                        setWhatsappForm((current) => ({
                          ...current,
                          webhookSecret: event.target.value,
                        }))
                      }
                      placeholder="secret123"
                      value={whatsappForm.webhookSecret}
                    />
                  </FieldBlock>
                  <FieldBlock
                    hint="Delay antar pengiriman pesan (anti-ban). Default: 2000ms"
                    label="Delay Pesan (ms)"
                  >
                    <Input
                      type="number"
                      min={0}
                      onChange={(event) =>
                        setWhatsappForm((current) => ({
                          ...current,
                          sendDelayMs: Number(event.target.value),
                        }))
                      }
                      placeholder="2000"
                      value={whatsappForm.sendDelayMs}
                    />
                  </FieldBlock>
                </div>

                {whatsappError ? <ErrorBox>{whatsappError}</ErrorBox> : null}

                <div className="flex justify-end border-t border-border/70 pt-5">
                  <Button disabled={isSaving} onClick={saveWhatsapp} type="button">
                    {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Simpan WhatsApp Gateway
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/90">
              <CardHeader className="border-b border-border/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Template Pesan WhatsApp</CardTitle>
                    <CardDescription>
                      Template default untuk booking diterima, invoice terbit, dan invoice
                      terbayar. Variabel akan kita rapikan pada fase otomasi.
                    </CardDescription>
                  </div>
                  <Button onClick={openCreateTemplate} type="button" variant="outline">
                    <Plus className="mr-2 size-4" />
                    Tambah Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Judul Template</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Isi Pesan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px] text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium text-primary-950">
                          {template.title}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {template.key}
                        </TableCell>
                        <TableCell className="max-w-[560px] whitespace-normal text-muted-foreground">
                          {template.bodyTemplate}
                        </TableCell>
                        <TableCell>
                          <StatusBadge active={template.isActive} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <IconButton
                              icon={<Pencil className="size-4" />}
                              label="Edit template"
                              onClick={() => openEditTemplate(template)}
                            />
                            <IconButton
                              destructive
                              icon={<Trash2 className="size-4" />}
                              label="Hapus template"
                              onClick={() => removeTemplate(template.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.templates.length === 0 ? (
                      <EmptyRow colSpan={5} label="Belum ada template pesan WhatsApp." />
                    ) : null}
                  </TableBody>
                </Table>

                {templateError ? (
                  <div className="mt-4">
                    <ErrorBox>{templateError}</ErrorBox>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      {bankEditor ? (
        <ModalFrame
          title={bankEditor.id ? "Edit Rekening Pembayaran" : "Tambah Rekening Pembayaran"}
          description="Masukkan rekening manual yang akan tampil di invoice."
          onClose={() => setBankEditor(null)}
        >
          <div className="space-y-4">
            <FieldBlock label="Nama Rekening">
              <Input
                onChange={(event) =>
                  setBankEditor((current) =>
                    current ? { ...current, accountName: event.target.value } : current
                  )
                }
                placeholder="Contoh: Yayasan FORBIS"
                value={bankEditor.accountName}
              />
            </FieldBlock>
            <FieldBlock label="Bank Account">
              <Input
                onChange={(event) =>
                  setBankEditor((current) =>
                    current ? { ...current, bankName: event.target.value } : current
                  )
                }
                placeholder="Contoh: BCA"
                value={bankEditor.bankName}
              />
            </FieldBlock>
            <FieldBlock label="Nomor Rekening">
              <Input
                onChange={(event) =>
                  setBankEditor((current) =>
                    current ? { ...current, accountNumber: event.target.value } : current
                  )
                }
                placeholder="Contoh: 1234567890"
                value={bankEditor.accountNumber}
              />
            </FieldBlock>
            <FieldBlock label="Status Rekening">
              <select
                className="h-11 rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                onChange={(event) =>
                  setBankEditor((current) =>
                    current ? { ...current, isActive: event.target.value === "active" } : current
                  )
                }
                value={bankEditor.isActive ? "active" : "inactive"}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </FieldBlock>

            {bankError ? <ErrorBox>{bankError}</ErrorBox> : null}

            <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
              <Button onClick={() => setBankEditor(null)} type="button" variant="outline">
                Batal
              </Button>
              <Button disabled={isSaving} onClick={saveBankAccount} type="button">
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Simpan Rekening
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {templateEditor ? (
        <ModalFrame
          title={templateEditor.id ? "Edit Template Pesan" : "Tambah Template Pesan"}
          description="Template ini akan dipakai oleh modul WhatsApp otomatis di langkah berikutnya."
          onClose={() => setTemplateEditor(null)}
        >
          <div className="space-y-4">
            <FieldBlock label="Judul Template">
              <Input
                onChange={(event) =>
                  setTemplateEditor((current) =>
                    current ? { ...current, title: event.target.value } : current
                  )
                }
                placeholder="Contoh: Booking Diterima"
                value={templateEditor.title}
              />
            </FieldBlock>
            <FieldBlock label="Key Template">
              <Input
                onChange={(event) =>
                  setTemplateEditor((current) =>
                    current ? { ...current, key: event.target.value } : current
                  )
                }
                placeholder="booking_diterima"
                value={templateEditor.key}
              />
            </FieldBlock>
            <FieldBlock label="Isi Pesan">
              <textarea
                className="min-h-36 w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                onChange={(event) =>
                  setTemplateEditor((current) =>
                    current ? { ...current, bodyTemplate: event.target.value } : current
                  )
                }
                placeholder="Halo {{nama}}, invoice Anda sudah terbit..."
                value={templateEditor.bodyTemplate}
              />
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 mt-1">
                <p className="text-xs font-semibold text-slate-500 mb-2">Klik variabel untuk insert:</p>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    ['{{nama}}', 'Nama peserta/vendor'],
                    ['{{perusahaan}}', 'Nama perusahaan'],
                    ['{{invoice_number}}', 'Nomor invoice'],
                    ['{{total}}', 'Total tagihan (Rp)'],
                    ['{{jatuh_tempo}}', 'Tanggal jatuh tempo'],
                    ['{{jumlah}}', 'Jumlah pencairan/bayar (Rp)'],
                    ['{{bank}}', 'Nama bank tujuan'],
                    ['{{rekening}}', 'Nomor rekening'],
                    ['{{atas_nama}}', 'Nama pemilik rekening'],
                    ['{{alasan}}', 'Alasan penolakan'],
                    ['{{waktu}}', 'Waktu transfer'],
                    ['{{biaya_transfer}}', 'Biaya transfer (Rp)'],
                    ['{{link_invoice}}', 'URL invoice publik'],
                    ['{{link_portal}}', 'URL vendor portal'],
                    ['{{link_review}}', 'URL admin review pencairan'],
                    ['{{kode_otp}}', 'Kode OTP 6 digit'],
                    ['{{email}}', 'Email akun vendor'],
                    ['{{password}}', 'Password sementara vendor'],
                  ] as [string, string][]).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      title={label}
                      onClick={() =>
                        setTemplateEditor((current) =>
                          current ? { ...current, bodyTemplate: current.bodyTemplate + v } : current
                        )
                      }
                      className="rounded-lg border border-primary-200 bg-primary-50 px-2 py-0.5 font-mono text-xs text-primary-700 hover:bg-primary-100"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </FieldBlock>
            <FieldBlock label="Status Template">
              <select
                className="h-11 rounded-2xl border border-input bg-white px-3 text-sm outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-100"
                onChange={(event) =>
                  setTemplateEditor((current) =>
                    current ? { ...current, isActive: event.target.value === "active" } : current
                  )
                }
                value={templateEditor.isActive ? "active" : "inactive"}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </FieldBlock>

            {templateError ? <ErrorBox>{templateError}</ErrorBox> : null}

            <div className="flex justify-end gap-3 border-t border-border/70 pt-5">
              <Button onClick={() => setTemplateEditor(null)} type="button" variant="outline">
                Batal
              </Button>
              <Button disabled={isSaving} onClick={saveTemplate} type="button">
                {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Simpan Template
              </Button>
            </div>
          </div>
        </ModalFrame>
      ) : null}

      {activeTab === "frontend" ? (
        <FrontendSettings eventId={data.event.id} frontendConfig={frontendConfig} frontendTargets={frontendTargets} />
      ) : null}
    </>
  );
}

function FieldBlock({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function TabButton({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "rounded-[22px] border px-4 py-3 text-left transition",
        active
          ? "border-primary/20 bg-primary/10 shadow-[0_10px_24px_rgba(29,78,216,0.10)]"
          : "border-transparent bg-white/70 hover:border-border/80 hover:bg-white"
      )}
      onClick={onClick}
      type="button"
    >
      <p className={cn("text-sm font-semibold", active ? "text-primary-800" : "text-foreground")}>
        {label}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </button>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {children}
    </div>
  );
}

function ModalFrame({
  children,
  description,
  onClose,
  title,
}: {
  children: React.ReactNode;
  description: string;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-border/70 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700">
              Konfigurasi
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-primary-950">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button
            className="inline-flex size-10 items-center justify-center rounded-2xl border border-border/80 bg-white text-muted-foreground hover:bg-muted"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      className={
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
      }
    >
      {active ? "Aktif" : "Nonaktif"}
    </Badge>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell className="py-8 text-center text-muted-foreground" colSpan={colSpan}>
        {label}
      </TableCell>
    </TableRow>
  );
}

function IconButton({
  destructive,
  icon,
  label,
  onClick,
}: {
  destructive?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex size-9 items-center justify-center rounded-xl border transition ${
        destructive
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-border/70 bg-white text-muted-foreground hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
      }`}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
