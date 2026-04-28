"use client";

import * as React from "react";
import { Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

import {
  createWaRotatorAgent,
  deleteWaRotatorAgent,
  resetWaRotatorCounters,
  updateWaRotatorAgent,
} from "@/actions/wa-rotator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Agent = {
  id: string;
  name: string;
  greetingName: string;
  waNumber: string;
  isActive: boolean;
  sortOrder: number;
  totalClicks: number;
};

function AgentFormModal({
  agent,
  onClose,
  onSaved,
}: {
  agent?: Agent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, start] = React.useTransition();
  const [error, setError] = React.useState("");
  const [name, setName] = React.useState(agent?.name ?? "");
  const [greetingName, setGreetingName] = React.useState(agent?.greetingName ?? "");
  const [waNumber, setWaNumber] = React.useState(agent?.waNumber ?? "");
  const [sortOrder, setSortOrder] = React.useState(String(agent?.sortOrder ?? 0));

  function handleSubmit() {
    if (!name.trim() || !greetingName.trim() || !waNumber.trim()) {
      setError("Nama, sapaan, dan nomor WA wajib diisi.");
      return;
    }
    setError("");
    start(async () => {
      const result = agent
        ? await updateWaRotatorAgent(agent.id, { name, greetingName, waNumber, sortOrder: Number(sortOrder) })
        : await createWaRotatorAgent({ name, greetingName, waNumber, sortOrder: Number(sortOrder) });
      if (!result.success) { setError("Gagal menyimpan."); return; }
      onSaved();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
        <h3 className="mb-4 text-lg font-semibold">{agent ? "Edit Agen" : "Tambah Agen"}</h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Nama Lengkap *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="contoh: Rina Amelia" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Nama Sapaan *</label>
            <Input value={greetingName} onChange={(e) => setGreetingName(e.target.value)} placeholder="contoh: Kak Rina" />
            <p className="text-xs text-muted-foreground">Dipakai di pesan: "Halo Kak Rina, saya ingin bertanya..."</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Nomor WhatsApp *</label>
            <Input value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="628521xxxxxxx" />
            <p className="text-xs text-muted-foreground">Format internasional tanpa +, misal: 6285210001111</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Urutan</label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="max-w-24" />
          </div>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="mt-5 flex gap-3">
          <Button className="flex-1" disabled={isPending} onClick={handleSubmit} type="button">
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Simpan
          </Button>
          <Button className="flex-1" onClick={onClose} type="button" variant="outline">Batal</Button>
        </div>
      </div>
    </div>
  );
}

export function WaRotatorDashboard({
  initialAgents,
  isSuperAdmin,
}: {
  initialAgents: Agent[];
  isSuperAdmin: boolean;
}) {
  const [agents, setAgents] = React.useState(initialAgents);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<Agent | undefined>();
  const [isPending, start] = React.useTransition();
  const [confirmReset, setConfirmReset] = React.useState(false);

  const totalClicks = agents.reduce((s, a) => s + a.totalClicks, 0);

  function openAdd() { setEditingAgent(undefined); setModalOpen(true); }
  function openEdit(a: Agent) { setEditingAgent(a); setModalOpen(true); }

  function handleToggleActive(agent: Agent) {
    start(async () => {
      await updateWaRotatorAgent(agent.id, { isActive: !agent.isActive });
      setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, isActive: !a.isActive } : a));
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Hapus agen ini?")) return;
    start(async () => {
      await deleteWaRotatorAgent(id);
      setAgents((prev) => prev.filter((a) => a.id !== id));
    });
  }

  function handleReset() {
    start(async () => {
      await resetWaRotatorCounters();
      setAgents((prev) => prev.map((a) => ({ ...a, totalClicks: 0 })));
      setConfirmReset(false);
    });
  }

  return (
    <>
      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total Klik</p>
            <p className="mt-1 text-2xl font-bold">{totalClicks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Agen Aktif</p>
            <p className="mt-1 text-2xl font-bold">{agents.filter((a) => a.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">Total Agen</p>
            <p className="mt-1 text-2xl font-bold">{agents.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel agen */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-base">Daftar Agen CS</CardTitle>
          {isSuperAdmin && (
            <div className="flex gap-2">
              {confirmReset ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Reset semua counter?</span>
                  <Button size="sm" variant="destructive" disabled={isPending} onClick={handleReset}>
                    {isPending ? <Loader2 className="size-3 animate-spin" /> : "Ya, Reset"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmReset(false)}>Batal</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setConfirmReset(true)} className="gap-1.5 text-muted-foreground">
                  <RotateCcw className="size-3.5" /> Reset Counter
                </Button>
              )}
              <Button size="sm" onClick={openAdd} className="gap-1.5">
                <Plus className="size-4" /> Tambah Agen
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-neutral-50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Nama</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Nomor WA</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Klik</th>
                <th className="px-5 py-3 text-right font-medium text-muted-foreground">Share</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Status</th>
                {isSuperAdmin && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {agents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                    Belum ada agen. Tambahkan agen pertama.
                  </td>
                </tr>
              )}
              {agents.map((agent) => {
                const share = totalClicks > 0 ? Math.round((agent.totalClicks / totalClicks) * 100) : 0;
                return (
                  <tr key={agent.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">Sapaan: {agent.greetingName}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">{agent.waNumber}</td>
                    <td className="px-5 py-3 text-right font-semibold">{agent.totalClicks}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-primary-600"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{share}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {isSuperAdmin ? (
                        <button
                          onClick={() => handleToggleActive(agent)}
                          disabled={isPending}
                          className="cursor-pointer"
                          type="button"
                        >
                          {agent.isActive
                            ? <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Aktif</Badge>
                            : <Badge className="bg-neutral-100 text-neutral-500">Nonaktif</Badge>
                          }
                        </button>
                      ) : (
                        agent.isActive
                          ? <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Aktif</Badge>
                          : <Badge className="bg-neutral-100 text-neutral-500">Nonaktif</Badge>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(agent)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-neutral-100"
                            type="button"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(agent.id)}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50"
                            type="button"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pesan preview */}
      {agents.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">Preview Pesan WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Halo <strong>{agents.find((a) => a.isActive)?.greetingName ?? "[Nama Sapaan]"}</strong>, saya ingin bertanya tentang pendaftaran booth FORBIS National Economic Summit 2026. Boleh dibantu? 🙏
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Nama sapaan berubah sesuai giliran agen yang dipilih sistem.</p>
          </CardContent>
        </Card>
      )}

      {modalOpen && (
        <AgentFormModal
          agent={editingAgent}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
