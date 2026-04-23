import { TambahPesertaClient } from "@/components/admin/peserta/TambahPesertaClient";
import { getBoothFormOptions } from "@/lib/booth-form-options";


export const metadata = {
  title: "Tambah Peserta",
};

export default async function TambahPesertaPage() {
  const { boothCategories, boothGroups } = await getBoothFormOptions();

  return (
    <TambahPesertaClient
      boothCategoryOptions={boothCategories}
      boothGroupOptions={boothGroups}
    />
  );
}
