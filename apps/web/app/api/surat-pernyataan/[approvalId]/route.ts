import { eq } from "drizzle-orm"
import { type NextRequest, NextResponse } from "next/server"
import QRCode from "qrcode"

import { getCurrentParticipantSession } from "@/lib/participant-session"
import { db } from "@repo/db"
import {
  expoEvents,
  participantBusinesses,
  participants,
  participantTermsApprovals,
} from "@repo/db/schema/public"

const GOTENBERG_URL = process.env.GOTENBERG_URL ?? "http://localhost:3001"

function formatLongDate(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d)
}

function formatTime(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(d)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const { approvalId } = await params

  const session = await getCurrentParticipantSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const approval = await db.query.participantTermsApprovals.findFirst({
    where: eq(participantTermsApprovals.id, approvalId),
  })

  if (!approval || approval.participantId !== session.participantId) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 })
  }

  const [participant, event] = await Promise.all([
    db.query.participants.findFirst({
      where: eq(participants.id, session.participantId),
      columns: { name: true, organizationGroupName: true },
    }),
    db.query.expoEvents.findFirst({
      where: eq(expoEvents.id, approval.eventId),
      columns: { name: true },
    }),
  ])

  // Get first business of this participant
  const business = await db.query.participantBusinesses.findFirst({
    where: eq(participantBusinesses.participantId, session.participantId),
    columns: { companyName: true, brandName: true },
  })

  const approvedDate = approval.approvedAtWib ?? approval.approvedAt
  const qrData = approval.approvalToken
  const qrDataUrl = await QRCode.toDataURL(qrData, {
    margin: 1,
    width: 160,
    color: { dark: "#134397", light: "#ffffff" },
  })

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', serif;
    font-size: 12pt;
    color: #1e293b;
    background: #fff;
    padding: 40pt 48pt;
    line-height: 1.6;
  }
  .header {
    border-bottom: 2pt solid #134397;
    padding-bottom: 16pt;
    margin-bottom: 24pt;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  .header-left h1 {
    font-size: 13pt;
    font-weight: bold;
    color: #134397;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  .header-left p {
    font-size: 10pt;
    color: #64748b;
    margin-top: 2pt;
  }
  .token-box {
    font-family: monospace;
    font-size: 8pt;
    background: #f1f5f9;
    border: 1pt solid #e2e8f0;
    border-radius: 4pt;
    padding: 4pt 8pt;
    color: #64748b;
    text-align: right;
  }
  .title {
    text-align: center;
    margin-bottom: 24pt;
  }
  .title h2 {
    font-size: 15pt;
    font-weight: bold;
    color: #0f172a;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .title p {
    font-size: 11pt;
    color: #475569;
    margin-top: 4pt;
  }
  .body-text {
    margin-bottom: 20pt;
    text-align: justify;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 24pt;
  }
  table.data td {
    padding: 6pt 8pt;
    font-size: 11pt;
    vertical-align: top;
  }
  table.data td:first-child {
    width: 140pt;
    color: #64748b;
    white-space: nowrap;
  }
  table.data td:nth-child(2) {
    width: 10pt;
    color: #64748b;
  }
  table.data td:last-child {
    font-weight: bold;
    color: #0f172a;
  }
  table.data tr:nth-child(odd) td {
    background: #f8fafc;
  }
  .qr-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 24pt 0;
    gap: 8pt;
  }
  .qr-section img {
    width: 120pt;
    height: 120pt;
  }
  .qr-caption {
    font-size: 8pt;
    color: #94a3b8;
    text-align: center;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .declaration {
    border: 1pt solid #e2e8f0;
    border-radius: 6pt;
    background: #f8fafc;
    padding: 16pt;
    margin-bottom: 24pt;
    font-size: 10.5pt;
    color: #334155;
    text-align: justify;
  }
  .footer {
    border-top: 1pt solid #e2e8f0;
    padding-top: 12pt;
    font-size: 9pt;
    color: #94a3b8;
    text-align: center;
  }
  .date-stamp {
    font-size: 12pt;
    font-weight: bold;
    color: #134397;
    text-align: center;
    margin-bottom: 8pt;
  }
</style>
</head>
<body>

  <div class="header">
    <div class="header-left">
      <h1>${event?.name ?? "Expo Event"}</h1>
      <p>Panitia Penyelenggara</p>
    </div>
    <div class="token-box">
      Token: ${approval.approvalToken}<br/>
      ID: ${approval.id.slice(0, 8).toUpperCase()}
    </div>
  </div>

  <div class="title">
    <h2>Surat Pernyataan Persetujuan</h2>
    <p>${approval.termsPageTitle}</p>
  </div>

  <div class="body-text">
    Yang bertanda tangan di bawah ini telah membaca, memahami, dan menyetujui seluruh
    isi <strong>${approval.termsPageTitle}</strong> yang diterbitkan oleh panitia
    <strong>${event?.name ?? "Expo Event"}</strong>.
  </div>

  <table class="data">
    <tr>
      <td>Nama Lengkap</td>
      <td>:</td>
      <td>${participant?.name ?? "—"}</td>
    </tr>
    <tr>
      <td>Kelompok / Organisasi</td>
      <td>:</td>
      <td>${participant?.organizationGroupName ?? "—"}</td>
    </tr>
    ${business ? `
    <tr>
      <td>Nama Usaha</td>
      <td>:</td>
      <td>${business.companyName}${business.brandName && business.brandName !== business.companyName ? ` (${business.brandName})` : ""}</td>
    </tr>` : ""}
    <tr>
      <td>Tanggal Persetujuan</td>
      <td>:</td>
      <td>${formatLongDate(approvedDate)}</td>
    </tr>
    <tr>
      <td>Waktu</td>
      <td>:</td>
      <td>${formatTime(approvedDate)} WIB</td>
    </tr>
  </table>

  <div class="qr-section">
    <div class="date-stamp">${formatLongDate(approvedDate)}</div>
    <img src="${qrDataUrl}" alt="QR Verifikasi" />
    <p class="qr-caption">Scan untuk verifikasi keaslian dokumen</p>
  </div>

  <div class="declaration">
    Pernyataan ini dibuat secara digital dan memiliki kekuatan hukum yang sama dengan
    tanda tangan basah. Persetujuan dilakukan melalui sistem elektronik Jalamandala
    pada <strong>${formatLongDate(approvedDate)} pukul ${formatTime(approvedDate)} WIB</strong>
    dan tercatat dengan token unik <strong>${approval.approvalToken}</strong>.
  </div>

  <div class="footer">
    Dokumen ini diterbitkan secara otomatis oleh sistem Jalamandala · Webane Indonesia<br/>
    Keaslian dokumen dapat diverifikasi melalui kode QR di atas.
  </div>

</body>
</html>`

  try {
    const formData = new FormData()
    formData.append("files", new Blob([html], { type: "text/html" }), "index.html")
    formData.append("marginTop", "0")
    formData.append("marginBottom", "0")
    formData.append("marginLeft", "0")
    formData.append("marginRight", "0")
    formData.append("paperWidth", "8.27")  // A4
    formData.append("paperHeight", "11.69")

    const res = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
      method: "POST",
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error("Gotenberg error:", errText)
      return NextResponse.json({ error: "Gagal generate PDF" }, { status: 500 })
    }

    const pdfBuffer = await res.arrayBuffer()
    const fileName = `surat-pernyataan-${participant?.name?.toLowerCase().replace(/\s+/g, "-") ?? "peserta"}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err) {
    console.error("PDF generation failed:", err)
    return NextResponse.json({ error: "Gagal menghubungi layanan PDF" }, { status: 500 })
  }
}
