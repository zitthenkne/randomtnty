import { STORAGE_KEYS, safeLocalStorageGet, safeLocalStorageSet } from "./utils.js";

const listeners = new Set();
let currentLang = "en";
let packs = {};
let fallbackPack = {};

async function loadPack(code) {
  if (packs[code]) return packs[code];

  try {
    const response = await fetch(`/lang/${code}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Language pack unavailable");
    const payload = await response.json();
    packs[code] = payload;
    return payload;
  } catch {
    return {};
  }
}

function normalizeLanguageCode(rawCode) {
  return "vi";
}

export async function initI18n(defaultLang = "en") {
  const stored = safeLocalStorageGet(STORAGE_KEYS.language);
  const fromUrl = new URL(window.location.href).searchParams.get("lang");
  const fromNavigator = normalizeLanguageCode(navigator.language);
  currentLang = normalizeLanguageCode(stored || fromUrl || fromNavigator || defaultLang);

  // Persist URL-sourced language so subsequent visits without ?lang keep the choice.
  if (!stored && fromUrl && normalizeLanguageCode(fromUrl) !== "en") {
    safeLocalStorageSet(STORAGE_KEYS.language, currentLang);
  }

  fallbackPack = await loadPack("en");
  packs.en = fallbackPack;

  if (currentLang !== "en") {
    await loadPack(currentLang);
  }

  return currentLang;
}

export function getCurrentLanguage() {
  return currentLang;
}

export async function setLanguage(nextCode) {
  const normalized = normalizeLanguageCode(nextCode);
  if (!packs[normalized]) {
    await loadPack(normalized);
  }
  currentLang = normalized;
  safeLocalStorageSet(STORAGE_KEYS.language, normalized);
  listeners.forEach((cb) => cb(normalized));
}

export function onLanguageChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function t(key, params = {}) {
  const pack = packs[currentLang] || {};
  const fallback = fallbackPack || {};
  let value = pack[key] ?? fallback[key] ?? key;
  if (typeof value !== "string") {
    return value;
  }

  Object.entries(params).forEach(([param, paramValue]) => {
    value = value.replaceAll(`{${param}}`, String(paramValue));
  });
  return value;
}

export function getPack() {
  return packs[currentLang] || fallbackPack || {};
}

export function applyTranslations(root = document) {
  const textElements = root.querySelectorAll("[data-i18n]");
  textElements.forEach((element) => {
    const key = element.dataset.i18n;
    const resolved = t(key);
    if (typeof resolved === "string") {
      element.textContent = resolved;
    }
  });

  const placeholders = root.querySelectorAll("[data-i18n-placeholder]");
  placeholders.forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    element.setAttribute("placeholder", t(key));
  });

  const ariaElements = root.querySelectorAll("[data-i18n-aria-label]");
  ariaElements.forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    element.setAttribute("aria-label", t(key));
  });

  const titleElements = root.querySelectorAll("[data-i18n-title]");
  titleElements.forEach((element) => {
    const key = element.dataset.i18nTitle;
    element.setAttribute("title", t(key));
  });

  document.documentElement.lang = currentLang;
}

export function templateLabel(templateKey) {
  return t(`template_name_${templateKey}`);
}

export function templateEntries(templateKey) {
  const value = t(`template_entries_${templateKey}`);
  if (Array.isArray(value)) return value;
  return [];
}
