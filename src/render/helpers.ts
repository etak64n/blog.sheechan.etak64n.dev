// Pure rendering helpers: escaping, autospacing, icons, source colors, hero art.
import { marked } from 'marked'

import { type Lang, T } from './i18n'

// Render-side XSS guard: marked does not sanitize URL schemes, so neutralize
// any link/image target that is not http(s), mailto, a fragment, or a relative
// path. Defense in depth — schema.ts already rejects these at ingest.
export const SAFE_URL = /^(?:https?:|mailto:|#|\/|\.{0,2}\/)/i
export const attr = (s: string) => s.replace(/"/g, '&quot;')
// Browsers ignore whitespace/control chars inside a scheme, so strip them
// before matching; return the original href only if it passes.
export const STRIP_CTRL = new RegExp('[\\u0000-\\u0020]+', 'g')
export function safeUrl(href: string): string {
  return SAFE_URL.test(href.replace(STRIP_CTRL, '')) ? href : '#'
}

marked.use({
  renderer: {
    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens)
      return `<a href="${attr(safeUrl(href))}"${title ? ` title="${attr(title)}"` : ''}>${text}</a>`
    },
    image({ href, title, text }) {
      return `<img src="${attr(safeUrl(href))}" alt="${attr(text)}"${title ? ` title="${attr(title)}"` : ''}>`
    },
    // id comes from a per-article lexer pass (see renderArticlePage) so headings
    // can be linked from the table of contents
    heading({ tokens, depth, id }: { tokens: unknown[]; depth: number; id?: string }) {
      const text = this.parser.parseInline(tokens as never)
      return `<h${depth}${id ? ` id="${attr(id)}"` : ''}>${text}</h${depth}>\n`
    },
  },
})

export const SITE_TITLE = 'shiichan blog'
export const SITE_ORIGIN = 'https://blog.shiichan.etak64n.dev'
export const GITHUB_BLOG = 'https://github.com/etak64n/blog.shiichan.etak64n.dev'
export const GITHUB_REPORTER = 'https://github.com/etak64n/shiichan-reporter'
export const GITHUB_CREATOR = 'https://github.com/etak64n'

export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )

// Insert a half-width space between Japanese (kana/kanji) and ASCII
// alphanumerics, per Japanese typography ("Serverlessで" -> "Serverless で").
export const JP_CHARS = 'ぁ-ゖァ-ヺー㐀-䶿一-鿿ｦ-ﾟ'
export const JP_BEFORE_ANS = new RegExp('([' + JP_CHARS + '])([A-Za-z0-9])', 'g')
export const ANS_BEFORE_JP = new RegExp('([A-Za-z0-9])([' + JP_CHARS + '])', 'g')
export function autospace(s: string): string {
  return s.replace(JP_BEFORE_ANS, '$1 $2').replace(ANS_BEFORE_JP, '$1 $2')
}

// Same, applied to rendered HTML: leaves tag markup and <pre>/<code> content untouched
export function autospaceHtml(html: string): string {
  return html.replace(/<(pre|code)\b[^>]*>[\s\S]*?<\/\1>|<[^>]+>|[^<]+/g, (m) =>
    m[0] === '<' ? m : autospace(m),
  )
}

export const fmtDate = (iso: string) => iso.slice(0, 10)

// Render a stored UTC timestamp as a <time> element. The SSR text is the UTC
// date (graceful no-JS fallback); the LOCALIZE_DATES client script rewrites it
// to the viewer's local date. Keeping the HTML timezone-neutral means edge
// caching still works — each visitor's browser localizes the same cached HTML.
export const localDate = (iso: string) =>
  `<time class="ldate" datetime="${attr(iso)}">${esc(fmtDate(iso))}</time>`

// A localized date that links to that day's list page. The href uses the UTC
// date for SSR; the LOCALIZE_DATES client script rewrites both the text and the
// href to the viewer's local date so the label and its /day target agree.
export const localDateLink = (iso: string, base: string) =>
  `<a class="dlink" href="${base}/day/${esc(fmtDate(iso))}">${localDate(iso)}</a>`

// ---- i18n ----

export const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// '2026-07' -> '2026年7月' (ja) / 'July 2026' (en)
export function fmtMonth(month: string, lang: Lang): string {
  const [y, m] = month.split('-')
  return lang === 'en' ? `${EN_MONTHS[Number(m) - 1]} ${y}` : `${y}年${Number(m)}月`
}

// '2026-07-07' -> '2026年7月7日' (ja) / 'July 7, 2026' (en)
export function fmtFullDate(date: string, lang: Lang): string {
  const [y, m, d] = date.split('-')
  return lang === 'en'
    ? `${EN_MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`
    : `${y}年${Number(m)}月${Number(d)}日`
}

// Path prefix for a language ('' for Japanese, '/en' for English)
export const basePath = (lang: Lang): string => (lang === 'en' ? '/en' : '')

// Article field pickers: prefer the English column, fall back to Japanese
export const artTitle = (r: { title: string; title_en: string | null }, lang: Lang): string =>
  lang === 'en' ? r.title_en || r.title : autospace(r.title)
export const artSummary = (r: { summary: string; summary_en: string | null }, lang: Lang): string =>
  lang === 'en' ? r.summary_en || r.summary : autospace(r.summary)
export const artBody = (r: { body_md: string; body_md_en: string | null }, lang: Lang): string =>
  lang === 'en' ? r.body_md_en || r.body_md : r.body_md



export function parseTags(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

// Bright brand color for the small source dot on the article page
export function sourceColor(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('aws') || n.includes('amazon')) return '#ff9900'
  if (n.includes('cloudflare')) return '#f6821f'
  if (n.includes('openai')) return '#8b93a1' // OpenAI is monochrome (black/white)
  if (n.includes('anthropic') || n.includes('claude')) return '#d97757'
  if (n.includes('windows') || n.includes('microsoft')) return '#4cc2ff'
  return '#60B5FA'
}

// AA-corrected brand color used for genre tags and thumbnail washes. Mid-tone
// so it reads on light surfaces; dark mode lightens it via CSS color-mix.
export function sourceBrand(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('aws') || n.includes('amazon')) return '#C77A00'
  if (n.includes('cloudflare')) return '#C25E12'
  if (n.includes('openai')) return '#3a3f4b' // OpenAI mono: near-black in light, lightens in dark
  if (n.includes('anthropic') || n.includes('claude')) return '#B4653F'
  if (n.includes('windows') || n.includes('microsoft')) return '#2B7DC4'
  return '#2E6FD0'
}

export type ArticleKind = 'Blog' | 'News' | 'Changelog' | 'Release Notes'

// Map a source name to one of the four content kinds shown in the index table.
export function articleKind(sourceName: string): ArticleKind {
  if (/release\s*notes/i.test(sourceName)) return 'Release Notes'
  if (/changelog|what'?s\s*new/i.test(sourceName)) return 'Changelog'
  if (/news/i.test(sourceName)) return 'News'
  return 'Blog'
}

// Lucide-style inline SVG icons (24x24 stroke), rendered at 14px via CSS
export const ICONS: Record<string, string> = {
  'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  'file-code': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  wave: '<path d="M2 11c1.8-3 4.2-3 6 0s4.2 3 6 0 4.2-3 6 0"/><path d="M2 16c1.8-3 4.2-3 6 0s4.2 3 6 0 4.2-3 6 0" opacity="0.5"/>',
}

export function icon(name: keyof typeof ICONS): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
}

// Vendor an article's source maps to for the hero illustration (public/heroes)
export function sourceVendor(name: string): 'aws' | 'cloudflare' | 'openai' | 'anthropic' | null {
  const n = name.toLowerCase()
  if (n.includes('aws') || n.includes('amazon')) return 'aws'
  if (n.includes('cloudflare')) return 'cloudflare'
  if (n.includes('openai')) return 'openai'
  if (n.includes('anthropic') || n.includes('claude')) return 'anthropic'
  return null
}

// Emotions available per vendor
export const ALL_EMOTIONS = ['happy', 'confused', 'thinking', 'smug', 'energetic'] as const
export const HERO_EMOTIONS: Record<string, readonly string[]> = {
  aws: ALL_EMOTIONS,
  cloudflare: ALL_EMOTIONS,
  anthropic: ALL_EMOTIONS,
  openai: ALL_EMOTIONS,
}

// Neutral placeholder for articles whose source has no character art
export const HERO_PLACEHOLDER = '/heroes/placeholder.svg'

// Pick a hero illustration for an article from its source + emotion, falling
// back to "happy" (and to the neutral placeholder for sources we have no art for)
export function heroImage(source: string, emotion: string | null): string {
  const vendor = sourceVendor(source)
  if (!vendor) return HERO_PLACEHOLDER
  const avail = HERO_EMOTIONS[vendor]
  const emo = emotion && avail.includes(emotion) ? emotion : 'happy'
  return `/heroes/${vendor}-${emo}.webp`
}

export const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#1E3A8A"/><path d="M12 30 L22 23 L32 30 L42 23 L52 30" stroke="#8CC5F8" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 44 L22 37 L32 44 L42 37 L52 44" stroke="#8CC5F8" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/></svg>`,
  )

// Aquarius wave mark — the brand's signature motif (two stacked wavy lines)
export const WAVE_MARK = `<svg class="wave-mark" viewBox="0 0 48 26" fill="none" aria-hidden="true"><path d="M3 9 L11 4 L19 9 L27 4 L35 9 L43 4" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 21 L13 16 L21 21 L29 16 L37 21 L45 16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/></svg>`

export const WAVE_PATH =
  'M0 6 Q 15 0 30 6 T 60 6 T 90 6 T 120 6 T 150 6 T 180 6 T 210 6 T 240 6 T 270 6 T 300 6 T 330 6 T 360 6 T 390 6 T 420 6 T 450 6 T 480 6'
export const WAVE_DIVIDER = `<div class="wave-divider" aria-hidden="true"><svg viewBox="0 0 480 12" preserveAspectRatio="none"><path d="${WAVE_PATH}" fill="none" stroke="currentColor" stroke-width="2"/></svg></div>`

// Light-theme variable overrides. Applied twice: for the explicit
// data-theme="light" choice and as the no-JS prefers-color-scheme fallback.
// Color tokens per theme. The shii design system is light-first; dark is the
// deep-navy "night sea". Static brand/type tokens live in :root below.
