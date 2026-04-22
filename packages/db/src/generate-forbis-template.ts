import * as XLSX from 'xlsx';
import { join } from 'node:path';

const HEADERS = [
  'forbis_member_id',
  'name',
  'email',
  'phone',
  'whatsapp',
  'is_kmi_alumni',
  'kmi_year',
  'company_name',
  'booth_name',
  'requested_booth_category_slug',
  'company_description',
  'company_phone',
  'company_whatsapp',
  'company_address',
  'company_province_code',
  'company_province_name',
  'company_regency_code',
  'company_regency_name',
  'company_district_code',
  'company_district_name',
  'company_village_code',
  'company_village_name',
  'legal_entity',
  'business_category',
  'business_sector',
  'brand_name',
  'product_tags',
  'partnership_concepts',
];

const EXAMPLE_ROW = [
  '2016-00001',        // forbis_member_id
  'Ahmad Fulan',       // name
  'ahmad@example.com', // email
  '08123456789',       // phone
  '08123456789',       // whatsapp
  'Ya',                // is_kmi_alumni (Ya/Tidak)
  '2010',              // kmi_year
  'PT Usaha Mandiri',  // company_name
  'Batik Nusantara',   // booth_name
  'fashion',           // requested_booth_category_slug
  'Produsen batik tulis tangan berkualitas tinggi dari Jawa Tengah.', // company_description
  '08123456789',       // company_phone
  '08123456789',       // company_whatsapp
  'Jl. Batik No. 1, Pekalongan', // company_address
  '33',                // company_province_code
  'Jawa Tengah',       // company_province_name
  '3375',              // company_regency_code
  'Kota Pekalongan',   // company_regency_name
  '337501',            // company_district_code
  'Pekalongan Barat',  // company_district_name
  '3375010001',        // company_village_code
  'Medono',            // company_village_name
  'PT',                // legal_entity
  'fashion',           // business_category
  'tekstil',           // business_sector
  'Batik Fulan',       // brand_name
  'batik,kain,tekstil', // product_tags (pisahkan koma)
  'distribusi,reseller', // partnership_concepts (pisahkan koma)
];

function generate() {
  const wb = XLSX.utils.book_new();

  // Sheet utama: forbis_members
  const wsData = [HEADERS, EXAMPLE_ROW];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Lebar kolom otomatis berdasarkan header
  ws['!cols'] = HEADERS.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

  XLSX.utils.book_append_sheet(wb, ws, 'forbis_members');

  // Sheet petunjuk
  const guideData = [
    ['PETUNJUK PENGISIAN TEMPLATE IMPORT ANGGOTA FORBIS'],
    [],
    ['Kolom', 'Keterangan', 'Wajib?', 'Contoh'],
    ['forbis_member_id', 'Nomor ID anggota FORBIS', 'Tidak', '2016-00001'],
    ['name', 'Nama lengkap anggota', 'YA', 'Ahmad Fulan'],
    ['email', 'Alamat email anggota', 'Tidak', 'ahmad@example.com'],
    ['phone', 'Nomor telepon', 'Tidak', '08123456789'],
    ['whatsapp', 'Nomor WhatsApp', 'Tidak', '08123456789'],
    ['is_kmi_alumni', 'Alumni Pondok Gontor?', 'Tidak', 'Ya / Tidak'],
    ['kmi_year', 'Tahun lulus KMI (4 digit)', 'Tidak', '2010'],
    ['company_name', 'Nama perusahaan/usaha', 'Tidak', 'PT Usaha Mandiri'],
    ['booth_name', 'Nama booth di expo', 'Tidak', 'Batik Nusantara'],
    ['requested_booth_category_slug', 'Slug kategori booth yang diinginkan', 'Tidak', 'fashion'],
    ['company_description', 'Deskripsi singkat usaha', 'Tidak', 'Produsen batik...'],
    ['company_phone', 'Telepon kantor', 'Tidak', '08123456789'],
    ['company_whatsapp', 'WhatsApp kantor', 'Tidak', '08123456789'],
    ['company_address', 'Alamat lengkap usaha', 'Tidak', 'Jl. Batik No.1'],
    ['company_province_code', 'Kode BPS provinsi', 'Tidak', '33'],
    ['company_province_name', 'Nama provinsi', 'Tidak', 'Jawa Tengah'],
    ['company_regency_code', 'Kode BPS kabupaten/kota', 'Tidak', '3375'],
    ['company_regency_name', 'Nama kabupaten/kota', 'Tidak', 'Kota Pekalongan'],
    ['company_district_code', 'Kode BPS kecamatan', 'Tidak', '337501'],
    ['company_district_name', 'Nama kecamatan', 'Tidak', 'Pekalongan Barat'],
    ['company_village_code', 'Kode BPS desa/kelurahan', 'Tidak', '3375010001'],
    ['company_village_name', 'Nama desa/kelurahan', 'Tidak', 'Medono'],
    ['legal_entity', 'Badan hukum usaha', 'Tidak', 'PT / CV / UD / Perorangan'],
    ['business_category', 'Kategori usaha', 'Tidak', 'fashion'],
    ['business_sector', 'Bidang usaha', 'Tidak', 'tekstil'],
    ['brand_name', 'Nama brand/merek', 'Tidak', 'Batik Fulan'],
    ['product_tags', 'Tag produk, pisahkan dengan koma', 'Tidak', 'batik,kain,tekstil'],
    ['partnership_concepts', 'Konsep kemitraan, pisahkan dengan koma', 'Tidak', 'distribusi,reseller'],
    [],
    ['CATATAN:'],
    ['- Baris pertama (header) tidak boleh diubah.'],
    ['- Sheet harus bernama "forbis_members" atau gunakan sheet pertama.'],
    ['- Kolom is_kmi_alumni: isi "Ya" atau "Tidak" (atau kosongkan).'],
    ['- product_tags & partnership_concepts: pisahkan nilai dengan koma tanpa spasi.'],
    ['- Import menggunakan perintah: bun run db:import:forbis-members ./namafile.xlsx'],
    ['- Untuk dry run (tanpa simpan): tambahkan flag --dry-run'],
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 35 }, { wch: 45 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Petunjuk');

  const outPath = join(import.meta.dir, '../../../docs/templates/template-import-anggota-forbis.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(`✓ Template ditulis ke: ${outPath}`);
}

generate();
