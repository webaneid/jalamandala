"use client";

import Link from "next/link";
import { Plus, Pencil, FileText, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AdminEmptyState } from "@/components/admin/admin-empty-state";

type PageRecord = {
  id: string;
  title: string;
  slug: string;
  pageType: string;
  status: string;
  updatedAt: string;
};

export function PageDashboard({ pages, eventId }: { pages: PageRecord[]; eventId: string }) {
  if (pages.length === 0) {
    return (
      <AdminEmptyState
        icon={FileText}
        title="Belum ada laman"
        description="Event ini belum memiliki halaman statis. Buat laman pertama seperti Landing Page atau Syarat & Ketentuan."
        action={
          <Link href="/admin/laman/tambah" className={buttonVariants({ className: "rounded-2xl gap-2" })}>
            <Plus className="size-4" />
            Tambah Laman
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link href="/admin/laman/tambah" className={buttonVariants({ className: "rounded-2xl gap-2 h-11" })}>
          <Plus className="size-4" />
          Buat Laman Pertama
        </Link>
      </div>

      <Card className="rounded-[28px] border-none bg-white/72 shadow-none overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Judul & URL</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Tipe</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Status</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground">Update Terakhir</th>
                  <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground text-base tracking-[-0.02em]">{page.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Globe className="size-3" />
                        /{page.slug}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                        {page.pageType}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant="outline" 
                        className={
                          page.status === "published" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : page.status === "archived"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                        }
                      >
                        {page.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(page.updatedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/laman/${page.id}`} className={buttonVariants({ variant: "outline", size: "sm", className: "rounded-xl gap-2" })}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
