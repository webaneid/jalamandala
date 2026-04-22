import QRCode from "qrcode";

import { buildDynamicQrisPayload, parseQrisMerchantInfo } from "@/lib/qris";

export async function generateDynamicQrisForInvoice(
  emvPayload: string,
  amount: number,
  expiryMinutes = 15
) {
  const payload = buildDynamicQrisPayload(emvPayload, amount);
  const { merchantCity, merchantName } = parseQrisMerchantInfo(payload);
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
  });

  return {
    amount: Math.round(amount),
    expiresAt: new Date(Date.now() + Math.max(expiryMinutes, 1) * 60 * 1000).toISOString(),
    merchantCity,
    merchantName,
    payload,
    qrDataUrl,
  };
}
