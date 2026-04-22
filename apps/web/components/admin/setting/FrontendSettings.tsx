"use client";

import * as React from "react";
import { Plus, GripVertical, Trash2, Link as LinkIcon, ExternalLink, RefreshCw } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { 
  saveEventHomepageSetting, 
  createEventNavMenu, 
  updateEventNavMenu, 
  deleteEventNavMenu, 
  reorderEventNavMenus,
  type FrontendRouteTarget 
} from "@/actions/front-end-menu";

function SortableMenuItem({ item, onUpdate, onDelete }: { item: any, onUpdate: (id: string, active: boolean) => void, onDelete: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white border border-border/60 rounded-xl shadow-sm mb-2 group">
      <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600">
        <GripVertical className="size-5" />
      </div>
      <div className="flex-1 flex items-center justify-between min-w-0">
        <div className="flex flex-col">
          <span className="font-semibold text-sm truncate">{item.label}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {item.sourceType}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[200px] font-mono">
              {item.sourceType === "external" ? item.externalUrl : item.systemKey || "page:" + item.pageId}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUpdate(item.id, !item.isActive)}
            className={item.isActive ? "text-slate-600" : "text-muted-foreground"}
            type="button"
          >
            {item.isActive ? "Aktif" : "Nonaktif"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(item.id)}
            type="button"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FrontendSettings({ 
  eventId, 
  frontendConfig, 
  frontendTargets 
}: { 
  eventId: string, 
  frontendConfig: any, 
  frontendTargets: any[] 
}) {
  const [homepageId, setHomepageId] = React.useState(frontendConfig?.homepagePageId || "");
  const [isSavingHomepage, setIsSavingHomepage] = React.useState(false);
  const [isSavingMenu, setIsSavingMenu] = React.useState(false);

  const [menus, setMenus] = React.useState(frontendConfig?.menus || []);

  const [newMenuLabel, setNewMenuLabel] = React.useState("");
  const [newMenuTarget, setNewMenuTarget] = React.useState("");
  const [newMenuExternal, setNewMenuExternal] = React.useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleSaveHomepage() {
    setIsSavingHomepage(true);
    await saveEventHomepageSetting(eventId, homepageId || null);
    setIsSavingHomepage(false);
  }

  async function handleAddMenu() {
    if (!newMenuLabel) return;
    
    setIsSavingMenu(true);

    let payload: any = {
      eventId,
      label: newMenuLabel,
      isActive: true,
      sortOrder: menus.length * 10,
    };

    if (newMenuTarget === "external") {
      if (!newMenuExternal) {
        setIsSavingMenu(false);
        return;
      }
      payload.sourceType = "external";
      payload.externalUrl = newMenuExternal;
      payload.openInNewTab = true;
    } else {
      const target = frontendTargets.find(t => t.key === newMenuTarget);
      if (!target) {
        setIsSavingMenu(false);
        return;
      }
      payload.sourceType = target.sourceType;
      if (target.sourceType === "page") payload.pageId = target.pageId;
      if (target.sourceType === "system") payload.systemKey = target.key;
    }

    await createEventNavMenu(payload);
    
    // reset form (we rely on parent refetching to update state, but we'll optimistic update for UX or just reload)
    window.location.reload(); 
    // Ideally we don't window.reload, but since Server Actions revalidatePath, 
    // the page will get new props if we do it properly, but here we manage local state.
  }

  async function handleUpdateActive(id: string, isActive: boolean) {
    setMenus(menus.map((m: any) => m.id === id ? { ...m, isActive } : m));
    await updateEventNavMenu(id, { isActive });
  }

  async function handleDeleteMenu(id: string) {
    setMenus(menus.filter((m: any) => m.id !== id));
    await deleteEventNavMenu(id);
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setMenus((items: any) => {
        const oldIndex = items.findIndex((i: any) => i.id === active.id);
        const newIndex = items.findIndex((i: any) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // auto save reorder
        const reorderPayload = newItems.map((item: any, idx: number) => ({ id: item.id, sortOrder: idx * 10 }));
        reorderEventNavMenus(reorderPayload);
        
        return newItems;
      });
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/80 bg-white/90">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Halaman Utama Website (Homepage)</CardTitle>
          <CardDescription>
            Pilih laman mana yang akan tampil saat pengunjung membuka root url website event Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Homepage Source</Label>
            <div className="flex items-center gap-3">
              <select
                className="flex h-10 w-full md:w-[400px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={homepageId}
                onChange={(e) => setHomepageId(e.target.value)}
              >
                <option value="">-- Gunakan Fallback Sistem --</option>
                {frontendTargets.filter((t: any) => t.isSelectableAsHomepage).map((t: any) => (
                  <option key={t.key} value={t.pageId || ""}>{t.label} ({t.pageType === "landing" ? "Landing Page" : "Laman Default"})</option>
                ))}
              </select>
              <Button onClick={handleSaveHomepage} disabled={isSavingHomepage} type="button">
                {isSavingHomepage ? "Menyimpan..." : "Simpan Homepage"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Jika tidak ada yang dipilih, sistem akan memprioritaskan Landing Page (jika ada) atau fallback default.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/80 bg-white/90">
        <CardHeader className="border-b border-border/60">
          <CardTitle>Menu Navigasi Publik</CardTitle>
          <CardDescription>
            Atur struktur menu yang akan tampil di navbar public frontend. Anda bisa menyusun urutannya dengan cara ditarik (drag & drop).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-1 space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <h3 className="font-semibold text-sm">Tambah Menu Baru</h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Target</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={newMenuTarget}
                  onChange={(e) => {
                    setNewMenuTarget(e.target.value);
                    if (e.target.value !== "external" && e.target.value !== "") {
                      const t = frontendTargets.find(x => x.key === e.target.value);
                      if (t) setNewMenuLabel(t.label);
                    } else if (e.target.value === "external") {
                      setNewMenuLabel("");
                    }
                  }}
                >
                  <option value="">-- Pilih Tujuan --</option>
                  <optgroup label="System Routes">
                    {frontendTargets.filter((t: any) => t.isSelectableAsMenu && t.sourceType === "system").map((t: any) => (
                      <option key={t.key} value={t.key}>{t.label} ({t.pathPattern})</option>
                    ))}
                  </optgroup>
                  <optgroup label="Event Pages">
                    {frontendTargets.filter((t: any) => t.isSelectableAsMenu && t.sourceType === "page").map((t: any) => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Eksternal">
                    <option value="external">🔗 Tautan Eksternal (Custom URL)</option>
                  </optgroup>
                </select>
              </div>

              {newMenuTarget === "external" && (
                <div className="space-y-1.5">
                  <Label>URL Eksternal</Label>
                  <Input 
                    type="url" 
                    placeholder="https://google.com" 
                    value={newMenuExternal} 
                    onChange={e => setNewMenuExternal(e.target.value)} 
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Label Navigasi</Label>
                <Input 
                  placeholder="Contoh: Info Tiket" 
                  value={newMenuLabel} 
                  onChange={e => setNewMenuLabel(e.target.value)} 
                />
              </div>

              <Button onClick={handleAddMenu} disabled={!newMenuTarget || !newMenuLabel || isSavingMenu} className="w-full" type="button">
                Tambah ke Menu
              </Button>
            </div>
          </div>

          <div className="md:col-span-2">
            {menus.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-2xl text-muted-foreground">
                Belum ada menu navigasi yang dibuat.
              </div>
            ) : (
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={menus}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-0.5">
                    {menus.map((item: any) => (
                      <SortableMenuItem 
                        key={item.id} 
                        item={item} 
                        onUpdate={handleUpdateActive}
                        onDelete={handleDeleteMenu} 
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
          
        </CardContent>
      </Card>
    </div>
  );
}
