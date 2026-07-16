/**
 * Single source of truth for the locales this landing supports.
 *
 * Consumed by LangSwitcher (the header control), BaseLayout (html lang,
 * og:locale, hreflang alternates) and every page that builds a cross-locale
 * URL. Add a locale here once and those surfaces follow.
 *
 * ⚠️ Adding a locale here is NOT enough to make it reachable. `worker.js` keeps
 * its own RESERVED_LOCALES list, and any locale missing from it falls through
 * the edge router to the root-mounted Angular SPA — so a brand-new `/xx/` would
 * answer 200 with the app shell rather than 404, which is why this failure
 * hides so well. The two lists must be kept in sync by hand: worker.js is
 * deliberately dependency-free and cannot import this file.
 *
 * Adding a locale, end to end:
 *   1. add it to `langs` below
 *   2. add it to RESERVED_LOCALES in worker.js
 *   3. write src/i18n/copy/<code>.ts against the Copy interface
 *   4. register it in src/i18n/copy/index.ts
 *   5. add src/pages/<code>/index.astro and src/pages/<code>/privacy.astro
 * The type-checker will tell you exactly which strings you still owe — that is
 * the main reason Copy is an explicit contract rather than a loose record.
 *
 * Why labels and not flag emoji
 * -----------------------------
 * Flags were considered and rejected across the ecosystem. Don't reintroduce
 * them without rereading this:
 *
 *  1. Flags mark countries, not languages. Russian is spoken well beyond
 *     Russia, and a Russian flag erases every one of those speakers. English:
 *     US, UK, Canada, Australia? None is neutral.
 *  2. Windows does not render flag emoji at all — those visitors see the bare
 *     regional-indicator letters in a box. It cannot be fixed from CSS.
 *  3. Screen readers announce flag emoji unpredictably across NVDA/JAWS/
 *     VoiceOver. The language name reads cleanly.
 *
 * A note on fonts: the brand font (Montserrat, see tokens.css) ships Latin and
 * Cyrillic, so this landing needs no per-script font gating. If you swap it for
 * a face that lacks a script you ship — Poppins, for one, has no Cyrillic at
 * all — that locale silently falls back to system-ui and the whole site looks
 * broken in that language only. Check the subsets before you change the font.
 */

export type LangCode = 'en' | 'ru';

export interface Lang {
  code: LangCode;
  /** The language's name in its own language. Never a flag, never a code. */
  label: string;
  /**
   * 2-letter badge for the switcher on narrow screens, where the native label
   * doesn't fit. The control must never collapse to a bare globe: that tells a
   * reader neither which language they're in nor that there is another one.
   *
   * Written out per locale rather than derived from `code`, because the
   * derivation is wrong exactly where it matters — 'pt-br' is "PT", 'zh-cn' is
   * "ZH". Latin letters on purpose («РУ» would be unreadable to the very
   * non-Russian speaker most likely to be hunting for this control).
   */
  short: string;
  /** BCP 47 tag, for lang=/hreflang= attributes. */
  tag: string;
  /** og:locale wants the underscored territory form. */
  ogLocale: string;
}

/**
 * English is the default and owns the bare root. Order: default first, then
 * alphabetical by code.
 */
export const DEFAULT_LOCALE: LangCode = 'en';

export const langs: Lang[] = [
  { code: 'en', label: 'English', short: 'EN', tag: 'en', ogLocale: 'en_GB' },
  { code: 'ru', label: 'Русский', short: 'RU', tag: 'ru', ogLocale: 'ru_RU' },
];

export const langByCode = (code: LangCode): Lang => {
  const lang = langs.find((l) => l.code === code);
  // Unreachable via LangCode, but reachable from a hand-written string — and a
  // throw names the locale, where a non-null assertion would hand the caller an
  // undefined that surfaces three frames later as "cannot read property tag".
  if (!lang) throw new Error(`Unknown locale: ${code}`);
  return lang;
};

/** Matches a leading locale segment, and only a whole segment. */
const LOCALE_PREFIX = new RegExp(
  `^/(${langs.map((l) => l.code).join('|')})(?=/|$)`,
);

/**
 * Detect the locale from a pathname: "/ru/privacy/" → "ru", "/" → "en".
 *
 * Only an exact locale segment counts. This matters more than it looks: an app
 * route like `/my` is also two letters, so anything that treats "any short
 * first segment" as a locale would swallow application routes. Same reasoning
 * as worker.js's explicit RESERVED_LOCALES list.
 */
export function localeFromPath(path: string): LangCode {
  return (path.match(LOCALE_PREFIX)?.[1] as LangCode) ?? DEFAULT_LOCALE;
}

/**
 * Strip the locale prefix to get the locale-independent route.
 * "/en/privacy/" → "/privacy/", "/ru/" → "/", "/" → "/".
 */
export function routeFromPath(path: string): string {
  return path.replace(LOCALE_PREFIX, '') || '/';
}

/**
 * Build the URL for a route in a given locale.
 *
 * The one asymmetry: the English *home* is the bare root `/`, not `/en/` —
 * that's the canonical front door and `/en/` 301s to it (see worker.js). Every
 * other page, English included, carries its locale prefix: `/en/privacy/`,
 * `/ru/privacy/`.
 *
 * That English prefix is load-bearing rather than cosmetic. This landing shares
 * one origin with the root-mounted Angular app, and the `/{locale}/*` subtree
 * is exactly what separates landing space from application space — an
 * unprefixed `/privacy` would collide with the app's route namespace.
 */
export function localeHref(code: LangCode, route = '/'): string {
  const r = route.startsWith('/') ? route : `/${route}`;
  if (code === DEFAULT_LOCALE && r === '/') return '/';
  return `/${code}${r === '/' ? '/' : r}`;
}
