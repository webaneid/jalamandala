import { requireRoles } from "@/lib/admin-auth";
import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { BookUser, Search } from "lucide-react";

import { db } from "@repo/db";
import { forbisMembers } from "@repo/db/schema/public";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExportForbisDialog } from "@/components/admin/anggota-forbis/ExportForbisDialog";
import { ImportForbisDialog } from "@/components/admin/anggota-forbis/ImportForbisDialog";
import { ForbisMemberFormDialog } from "@/components/admin/anggota-forbis/ForbisMemberFormDialog";
import { DeleteForbisMemberButton } from "@/components/admin/anggota-forbis/DeleteForbisMemberButton";

interface Props {
  searchParams: Promise<{ q?: string }>;
}


export const metadata = {
  title: "Anggota FORBIS",
};

export default async function AnggotaForbisPage({ searchParams }: Props) {
  await requireRoles(["admin"]);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const filters = [eq(forbisMembers.isActive, true)];
  if (query) {
    filters.push(
      or(
        ilike(forbisMembers.name, `%${query}%`),
        ilike(forbisMembers.email, `%${query}%`),
        ilike(forbisMembers.forbisMemberId, `%${query}%`),
        ilike(forbisMembers.phone, `%${query}%`),
        ilike(forbisMembers.companyName, `%${query}%`),
      )!
    );
  }

  const [members, totalResult] = await Promise.all([
    db.query.forbisMembers.findMany({
      where: and(...filters),
      orderBy: (t) => [asc(t.name)],
      limit: 200,
    }),
    db.select({ total: count() }).from(forbisMembers).where(eq(forbisMembers.isActive, true)),
  ]);
  const totalAll = totalResult[0]?.total ?? 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Database Referensi"
        title="Anggota FORBIS"
        description="Data master anggota FORBIS. Digunakan untuk auto-populate form pendaftaran peserta expo."
      />

      <Card className="rounded-[28px] border-none bg-white/72 shadow-none">
        <CardContent className="p-5 sm:p-6">
          {/* Toolbar */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <form method="GET" className="flex flex-1 gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-2xl border border-border/80 bg-white/80 pl-10 pr-4 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                  defaultValue={query}
                  name="q"
                  placeholder="Cari nama, email, ID, perusahaan..."
                  type="search"
                />
              </div>
              <button
                className="h-10 rounded-2xl border border-border/80 bg-white/80 px-4 text-sm font-medium hover:bg-white"
                type="submit"
              >
                Cari
              </button>
            </form>

            <ForbisMemberFormDialog />
            <ImportForbisDialog />
            <ExportForbisDialog
              totalAll={totalAll}
              totalSearch={members.length}
              searchQuery={query}
            />
          </div>

          {/* Stats */}
          <p className="mb-4 text-xs text-muted-foreground">
            Menampilkan <span className="font-semibold text-foreground">{members.length}</span> anggota
            {query && <> untuk pencarian &ldquo;{query}&rdquo;</>}
            {members.length === 200 && !query && (
              <span className="ml-1">(dibatasi 200, gunakan pencarian untuk mempersempit)</span>
            )}
          </p>

          {/* Table */}
          {members.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <BookUser className="size-10 opacity-30" />
              <p className="text-sm">{query ? "Tidak ada anggota yang cocok." : "Belum ada data anggota FORBIS."}</p>
              {!query && (
                <p className="text-xs">Gunakan tombol &ldquo;Import Excel&rdquo; di atas untuk upload data.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 pr-4">Nama</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Telepon</th>
                    <th className="pb-3 pr-4">Perusahaan</th>
                    <th className="pb-3 pr-4">ID FORBIS</th>
                    <th className="pb-3 pr-4">KMI</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {members.map((m) => (
                    <tr key={m.id} className="group hover:bg-primary/3">
                      <td className="py-3 pr-4 font-medium">{m.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{m.email ?? <span className="opacity-40">—</span>}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{m.phone ?? <span className="opacity-40">—</span>}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{m.companyName ?? <span className="opacity-40">—</span>}</td>
                      <td className="py-3 pr-4 text-muted-foreground font-mono text-xs">{m.forbisMemberId ?? <span className="opacity-40">—</span>}</td>
                      <td className="py-3 pr-4">
                        {m.isKmiAlumni
                          ? <Badge variant="secondary" className="text-xs">Alumni KMI {m.kmiYear ?? ""}</Badge>
                          : <span className="opacity-40 text-xs">—</span>}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ForbisMemberFormDialog member={m} />
                          <DeleteForbisMemberButton id={m.id} name={m.name} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
