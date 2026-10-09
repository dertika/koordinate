import { de, type MessageKey } from './de';
import { en } from './en';

export type Lang = 'de' | 'en';
export const LANGS: Lang[] = ['de', 'en'];

const catalogs: Record<Lang, Partial<Record<MessageKey, string>>> = { de, en };
const STORAGE_KEY = 'koordinate:lang';

let current: Lang = detect();
const listeners = new Set<() => void>();

function detect(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LANGS as string[]).includes(stored)) return stored as Lang;
  } catch {
    /* Speicher nicht verfügbar */
  }
  // Deutsch ist Standard; Englisch nur, wenn der Browser explizit kein Deutsch bevorzugt
  // und Englisch an erster Stelle steht.
  const first = (navigator.languages?.[0] ?? navigator.language ?? 'de').toLowerCase();
  return first.startsWith('en') ? 'en' : 'de';
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignorieren */
  }
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Übersetzt einen Schlüssel; `{name}`-Platzhalter werden aus `vars` ersetzt. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let msg = catalogs[current][key] ?? de[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) msg = msg.replaceAll(`{${k}}`, String(v));
  }
  return msg;
}

export type { MessageKey };
