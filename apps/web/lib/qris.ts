export type ParsedQrisTag = {
  tag: string;
  value: string;
};

export type ParsedQrisPayload = {
  tags: ParsedQrisTag[];
  values: Map<string, string>;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function parseQrisPayload(payload: string): ParsedQrisPayload {
  const normalized = normalizeText(payload);

  if (!normalized) {
    throw new Error("EMV payload QRIS kosong.");
  }

  let cursor = 0;
  const tags: ParsedQrisTag[] = [];
  const values = new Map<string, string>();

  while (cursor + 4 <= normalized.length) {
    const tag = normalized.slice(cursor, cursor + 2);
    const lengthValue = normalized.slice(cursor + 2, cursor + 4);
    const length = Number(lengthValue);

    if (!Number.isInteger(length) || length < 0) {
      throw new Error("EMV payload QRIS tidak valid.");
    }

    const valueStart = cursor + 4;
    const valueEnd = valueStart + length;

    if (valueEnd > normalized.length) {
      throw new Error("EMV payload QRIS tidak lengkap.");
    }

    const value = normalized.slice(valueStart, valueEnd);
    tags.push({ tag, value });
    values.set(tag, value);
    cursor = valueEnd;

    if (tag === "63") {
      break;
    }
  }

  if (tags.length === 0) {
    throw new Error("EMV payload QRIS tidak valid.");
  }

  return { tags, values };
}

export function parseQrisMerchantInfo(payload: string) {
  const { values } = parseQrisPayload(payload);

  return {
    merchantCity: values.get("60") ?? null,
    merchantName: values.get("59") ?? null,
  };
}

function encodeTlv(tag: string, value: string) {
  return `${tag}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16Ccitt(input: string) {
  let crc = 0xffff;

  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildDynamicQrisPayload(payload: string, amount: number) {
  const normalizedAmount = Math.round(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Nominal QRIS tidak valid.");
  }

  const { tags } = parseQrisPayload(payload);
  const filteredTags = tags.filter((entry) => entry.tag !== "54" && entry.tag !== "63");
  const dynamicTags = filteredTags.map((entry) =>
    entry.tag === "01"
      ? { tag: "01", value: "12" }
      : entry
  );

  const beforeCrc = [
    ...dynamicTags.map((entry) => encodeTlv(entry.tag, entry.value)),
    encodeTlv("54", String(normalizedAmount)),
    "6304",
  ].join("");

  const crc = crc16Ccitt(beforeCrc);
  return `${beforeCrc}${crc}`;
}

export function tryParseQrisPreview(payload: string) {
  const normalized = normalizeText(payload);

  if (!normalized) {
    return { error: "", merchantCity: "", merchantName: "" };
  }

  try {
    const { merchantCity, merchantName } = parseQrisMerchantInfo(normalized);
    return {
      error: "",
      merchantCity: merchantCity ?? "",
      merchantName: merchantName ?? "",
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "EMV payload QRIS tidak valid.",
      merchantCity: "",
      merchantName: "",
    };
  }
}
