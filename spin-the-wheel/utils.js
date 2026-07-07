export const STORAGE_KEYS = {
  state: "wheel_spinner_state_v2",
  language: "wheel_spinner_language",
  themeMode: "wheel_spinner_theme_mode",
  firstRunHintDismissed: "wheel_spinner_hint_dismissed",
  recentWheels: "wheel_spinner_recent_wheels"
};

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function debounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

export function deepClone(value) {
  return structuredClone(value);
}

export function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function normalizeAngle(angle) {
  const tau = Math.PI * 2;
  let next = angle % tau;
  if (next < 0) next += tau;
  return next;
}

export function cryptoRandom() {
  const data = new Uint32Array(1);
  crypto.getRandomValues(data);
  return data[0] / 0x100000000;
}

export function randomIndex(length) {
  if (length <= 0) return -1;
  return Math.floor(cryptoRandom() * length);
}

export function weightedPick(items, getWeight) {
  const weights = items.map((item) => Math.max(0, Number(getWeight(item)) || 0));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    return { index: randomIndex(items.length), randomValue: cryptoRandom(), total: 0 };
  }

  const randomValue = cryptoRandom() * total;
  let cumulative = 0;
  for (let i = 0; i < items.length; i += 1) {
    cumulative += weights[i];
    if (randomValue <= cumulative) {
      return { index: i, randomValue, total };
    }
  }

  return { index: items.length - 1, randomValue, total };
}

export function autoContrastColor(backgroundHex) {
  const hex = backgroundHex.replace("#", "");
  if (![3, 6].includes(hex.length)) return "#FFFFFF";
  const normalized = hex.length === 3 ? hex.split("").map((x) => `${x}${x}`).join("") : hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "#0b1224" : "#f4f8ff";
}

export function formatTimestamp(timestamp, locale = "en") {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}

export function parseBulkEntries(text) {
  const clean = text.replace(/\r/g, "\n").trim();
  if (!clean) return [];

  const lineFirst = clean.includes("\n");
  if (lineFirst) {
    return clean
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => parseRow(line));
  }

  const delimiter = clean.includes("\t") ? "\t" : ",";
  return clean.split(delimiter).map((token) => token.trim()).filter(Boolean).map((label) => ({ label }));
}

function parseRow(row) {
  if (row.includes("\t")) {
    const [label, maybeWeight] = row.split("\t").map((item) => item.trim());
    return normalizeParsed(label, maybeWeight, null);
  }

  if (row.includes("|")) {
    const [maybeWeight, label, color] = row.split("|").map((item) => item.trim());
    const asWeight = Number.parseFloat(maybeWeight);
    if (!Number.isNaN(asWeight) && label) {
      return normalizeParsed(label, maybeWeight, color);
    }
  }

  if (row.includes(",")) {
    const [first, second] = row.split(",").map((item) => item.trim());
    const secondWeight = Number.parseFloat(second);
    if (!Number.isNaN(secondWeight)) {
      return normalizeParsed(first, second, null);
    }
  }

  return normalizeParsed(row, null, null);
}

function normalizeParsed(label, maybeWeight, color) {
  if (!label) return [];
  const parsedWeight = Number.parseFloat(maybeWeight ?? "");
  return [{
    label,
    weight: Number.isFinite(parsedWeight) ? clamp(parsedWeight, 0.1, 100) : 1,
    sliceColor: color || null
  }];
}

export function shuffleArray(items) {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

export function sortEntriesAZ(entries) {
  return [...entries].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

export function hasEqualWeights(entries) {
  if (entries.length <= 1) return true;
  const first = entries[0]?.weight ?? 1;
  return entries.every((entry) => Math.abs((entry.weight ?? 1) - first) < 0.00001);
}

export function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore quota/security errors for local-first fallback.
  }
}

export function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export function parseCsvRows(input) {
  const text = (input || "").replace(/\r\n?/g, "\n");
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(current.trim());
      if (row.some((item) => item.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((item) => item.length > 0)) {
    rows.push(row);
  }
  return rows;
}

export function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
