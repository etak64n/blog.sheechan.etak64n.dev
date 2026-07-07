import { marked } from 'marked'
import type { ArticleListRow, ArticleRow, MonthCount, SearchHit, SourceCount, TagCount } from './db'
import { SNIP_CLOSE, SNIP_OPEN } from './db'

// Render-side XSS guard: marked does not sanitize URL schemes, so neutralize
// any link/image target that is not http(s), mailto, a fragment, or a relative
// path. Defense in depth — schema.ts already rejects these at ingest.
const SAFE_URL = /^(?:https?:|mailto:|#|\/|\.{0,2}\/)/i
const attr = (s: string) => s.replace(/"/g, '&quot;')
// Browsers ignore whitespace/control chars inside a scheme, so strip them
// before matching; return the original href only if it passes.
const STRIP_CTRL = new RegExp('[\\u0000-\\u0020]+', 'g')
function safeUrl(href: string): string {
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
  },
})

const SITE_TITLE = 'shiichan blog'
const SITE_ORIGIN = 'https://blog.shiichan.etak64n.dev'
const SITE_DESCRIPTION =
  'AWS・Cloudflare・OpenAI・Anthropic の最新テックニュースを、しぃちゃんが毎日わかりやすくお届けするブログ'

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )

const fmtDate = (iso: string) => iso.slice(0, 10)

// ---- i18n ----
export type Lang = 'ja' | 'en'

const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// '2026-07' -> '2026年7月' (ja) / 'July 2026' (en)
function fmtMonth(month: string, lang: Lang): string {
  const [y, m] = month.split('-')
  return lang === 'en' ? `${EN_MONTHS[Number(m) - 1]} ${y}` : `${y}年${Number(m)}月`
}

// Path prefix for a language ('' for Japanese, '/en' for English)
const basePath = (lang: Lang): string => (lang === 'en' ? '/en' : '')

// Article field pickers: prefer the English column, fall back to Japanese
const artTitle = (r: { title: string; title_en: string | null }, lang: Lang): string =>
  lang === 'en' ? r.title_en || r.title : r.title
const artSummary = (r: { summary: string; summary_en: string | null }, lang: Lang): string =>
  lang === 'en' ? r.summary_en || r.summary : r.summary
const artBody = (r: { body_md: string; body_md_en: string | null }, lang: Lang): string =>
  lang === 'en' ? r.body_md_en || r.body_md : r.body_md

const SITE_DESCRIPTION_EN =
  'Daily, easy-to-read summaries of the latest AWS, Cloudflare, OpenAI and Anthropic news — by shiichan.'

type Strings = {
  htmlLang: string
  desc: string
  skip: string
  heroH1: string
  heroLede: string
  latestPosts: string
  popularWeek: [string, string]
  about: string
  aboutPanel: string
  aboutGreeting: string
  sources: string
  tags: string
  archive: string
  viewAll: string
  allTags: string
  allMonths: string
  more: string
  searchTitle: string
  searchPlaceholder: string
  searchAria: string
  searchPrompt: string
  searchHint: string
  searchNo: (q: string) => string
  hits: (n: number, q: string) => string
  tagsCount: (nTags: number, nPosts: number) => string
  postsCount: (n: number) => string
  monthsCount: (nMonths: number, nPosts: number) => string
  source: string
  notFoundBody: string
  footerTag: string
  footerRight: string
  rssDesc: string
}

const T: Record<Lang, Strings> = {
  ja: {
    htmlLang: 'ja',
    desc: SITE_DESCRIPTION,
    skip: '本文へスキップ',
    heroH1: 'テックニュースを、わかりやすく。',
    heroLede:
      'しぃちゃんが、AWS・Cloudflare・OpenAI・Anthropic の最新ニュースを毎日チェックして、やさしくまとめてお届けするよ。むずかしい発表も、これを読めばだいじょうぶ！',
    latestPosts: 'Latest Posts',
    popularWeek: ['Popular', 'this week'],
    about: 'About',
    aboutPanel:
      'テックニュースが大好きな<b>しぃちゃん</b>が、毎日気になった発表をわかりやすく紹介するブログだよ。むずかしい話も、いっしょに読めばこわくない！',
    aboutGreeting:
      'やっほー、しぃちゃんだよ！毎日、AWS・Cloudflare・OpenAI・Anthropic といったテックの発表をチェックして、気になったニュースをわかりやすく紹介しているよ。',
    sources: 'Sources',
    tags: 'Tags',
    archive: 'Archive',
    viewAll: '全ての記事を見る',
    allTags: 'ALL TAGS',
    allMonths: 'ALL MONTHS',
    more: 'MORE',
    searchTitle: 'SEARCH',
    searchPlaceholder: 'キーワードで検索',
    searchAria: '記事を検索',
    searchPrompt: 'TYPE KEYWORDS TO SEARCH',
    searchHint: 'タイトル・本文からキーワードで探せるよ。スペース区切りで AND 検索になるからね。',
    searchNo: (q) => `「${q}」に合う記事は見つからなかったよ。別のキーワードでも試してみてね。`,
    hits: (n, q) => `${n} 件ヒット &mdash; 「${q}」`,
    tagsCount: (nt, np) => `${nt} TAGS / ${np} POSTS`,
    postsCount: (n) => `${n} 件`,
    monthsCount: (nm, np) => `${nm} ヶ月 / ${np} 件`,
    source: '原文',
    notFoundBody: 'ごめんね、このページは見つからなかったよ。',
    footerTag: 'shiichan blog — daily tech news, written by shiichan',
    footerRight: '毎日更新',
    rssDesc: SITE_DESCRIPTION,
  },
  en: {
    htmlLang: 'en',
    desc: SITE_DESCRIPTION_EN,
    skip: 'Skip to content',
    heroH1: 'Tech news, made simple.',
    heroLede:
      'shiichan checks the latest AWS, Cloudflare, OpenAI and Anthropic announcements every day and sums them up in plain language. Even the tricky ones — you’ve got this!',
    latestPosts: 'Latest Posts',
    popularWeek: ['Popular', 'this week'],
    about: 'About',
    aboutPanel:
      '<b>shiichan</b> loves tech news and rounds up the announcements she finds interesting, in plain language, every day. Even the hard stuff is friendlier when we read it together!',
    aboutGreeting:
      'Hi, I’m shiichan! Every day I check tech announcements from AWS, Cloudflare, OpenAI and Anthropic, and write up the ones I find interesting in plain, easy-to-read English.',
    sources: 'Sources',
    tags: 'Tags',
    archive: 'Archive',
    viewAll: 'View all posts',
    allTags: 'ALL TAGS',
    allMonths: 'ALL MONTHS',
    more: 'MORE',
    searchTitle: 'SEARCH',
    searchPlaceholder: 'Search by keyword',
    searchAria: 'Search articles',
    searchPrompt: 'TYPE KEYWORDS TO SEARCH',
    searchHint: 'Search titles and body text. Space-separated terms are matched with AND.',
    searchNo: (q) => `No articles matched “${q}”. Try a different keyword.`,
    hits: (n, q) => `${n} HIT${n === 1 ? '' : 'S'} FOR &ldquo;${q}&rdquo;`,
    tagsCount: (nt, np) => `${nt} TAGS / ${np} POSTS`,
    postsCount: (n) => `${n} POST${n === 1 ? '' : 'S'}`,
    monthsCount: (nm, np) => `${nm} MONTH${nm === 1 ? '' : 'S'} / ${np} POSTS`,
    source: 'Source',
    notFoundBody: 'Sorry, this page could not be found.',
    footerTag: 'shiichan blog — daily tech news, written by shiichan',
    footerRight: 'Daily updates',
    rssDesc: SITE_DESCRIPTION_EN,
  },
}

export function parseTags(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

// Bright brand color for the small source dot on the article page
function sourceColor(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('aws') || n.includes('amazon')) return '#ff9900'
  if (n.includes('cloudflare')) return '#f6821f'
  if (n.includes('openai')) return '#4ecb9b'
  if (n.includes('anthropic')) return '#d97757'
  if (n.includes('windows') || n.includes('microsoft')) return '#4cc2ff'
  return '#60B5FA'
}

// AA-corrected brand color used for genre tags and thumbnail washes. Mid-tone
// so it reads on light surfaces; dark mode lightens it via CSS color-mix.
function sourceBrand(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('aws') || n.includes('amazon')) return '#C77A00'
  if (n.includes('cloudflare')) return '#C25E12'
  if (n.includes('openai')) return '#1A9C78'
  if (n.includes('anthropic')) return '#B4653F'
  if (n.includes('windows') || n.includes('microsoft')) return '#2B7DC4'
  return '#2E6FD0'
}

// Lucide-style inline SVG icons (24x24 stroke), rendered at 14px via CSS
const ICONS: Record<string, string> = {
  'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  'file-code': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
}

function icon(name: keyof typeof ICONS): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
}

const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#1E3A8A"/><path d="M12 30 L22 23 L32 30 L42 23 L52 30" stroke="#8CC5F8" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 44 L22 37 L32 44 L42 37 L52 44" stroke="#8CC5F8" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/></svg>`,
  )

// Aquarius wave mark — the brand's signature motif (two stacked wavy lines)
const WAVE_MARK = `<svg class="wave-mark" viewBox="0 0 48 26" fill="none" aria-hidden="true"><path d="M3 9 L11 4 L19 9 L27 4 L35 9 L43 4" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 21 L13 16 L21 21 L29 16 L37 21 L45 16" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/></svg>`

const WAVE_PATH =
  'M0 6 Q 15 0 30 6 T 60 6 T 90 6 T 120 6 T 150 6 T 180 6 T 210 6 T 240 6 T 270 6 T 300 6 T 330 6 T 360 6 T 390 6 T 420 6 T 450 6 T 480 6'
const WAVE_DIVIDER = `<div class="wave-divider" aria-hidden="true"><svg viewBox="0 0 480 12" preserveAspectRatio="none"><path d="${WAVE_PATH}" fill="none" stroke="currentColor" stroke-width="2"/></svg></div>`

// Light-theme variable overrides. Applied twice: for the explicit
// data-theme="light" choice and as the no-JS prefers-color-scheme fallback.
// Color tokens per theme. The shii design system is light-first; dark is the
// deep-navy "night sea". Static brand/type tokens live in :root below.
const LIGHT_VARS = `
  color-scheme: light;
  --bg: #F8FBFF;
  --surface: #FFFFFF;
  --surface-2: #EEF5FD;
  --text: #1E2A44;
  --muted: #5A6B8C;
  --heading: #1E3A8A;
  --primary: #1E3A8A;
  --primary-hover: #2B4DA8;
  --on-primary: #FFFFFF;
  --accent: #3B8FE0;
  --line: #D8E6F5;
  --line-strong: #BFD6EF;
  --shadow-soft: 0 2px 8px rgba(30, 58, 138, .08);
  --shadow-lift: 0 8px 22px rgba(30, 58, 138, .14);
`

const DARK_VARS = `
  color-scheme: dark;
  --bg: #0F1B33;
  --surface: #182747;
  --surface-2: #12203C;
  --text: #DCE8F8;
  --muted: #93A7CC;
  --heading: #EAF3FE;
  --primary: #8CC5F8;
  --primary-hover: #A9D2F3;
  --on-primary: #0F1B33;
  --accent: #60B5FA;
  --line: #2A3D63;
  --line-strong: #38507D;
  --shadow-soft: 0 2px 8px rgba(0, 0, 0, .30);
  --shadow-lift: 0 8px 22px rgba(0, 0, 0, .42);
`

const STYLE = `
:root {
  --navy: #1E3A8A;
  --aqua: #60B5FA;
  --sky: #A9D2F3;
  --gold: #DAAE6D;
  --code-bg: #16244A;
  --code-text: #DCE8F8;
  --tag-bg: color-mix(in srgb, var(--accent) 12%, transparent);
  --tag-bg-hover: color-mix(in srgb, var(--accent) 24%, transparent);
  --sel: color-mix(in srgb, var(--accent) 28%, transparent);
  --wave-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 12'%3E%3Cpath d='M1 8 Q4 3 7 8 T13 8 T19 8 T25 8' fill='none' stroke='%23000' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E");
  --mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --sans: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', sans-serif;
  --display: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', var(--sans);
  ${LIGHT_VARS}
}
@media (prefers-color-scheme: dark) { :root:not([data-theme]) {${DARK_VARS}} }
:root[data-theme='dark'] {${DARK_VARS}}
:root[data-theme='light'] {${LIGHT_VARS}}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  overflow-x: clip;
  font-family: var(--sans);
  color: var(--text);
  line-height: 1.8;
  background:
    radial-gradient(1200px 420px at 50% -160px, color-mix(in srgb, var(--sky) 55%, transparent), transparent 70%),
    var(--bg);
}
::selection { background: var(--sel); }
a { color: var(--primary); -webkit-tap-highlight-color: transparent; }
button { -webkit-tap-highlight-color: transparent; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
.wrap { max-width: 1140px; margin: 0 auto; padding: 0 20px; }
.icon { width: 15px; height: 15px; flex: none; }
.skip { position: absolute; left: -9999px; font-family: var(--mono); font-size: .8rem; font-weight: 600; }
.skip:focus {
  left: 12px; top: 12px; position: fixed; z-index: 100;
  background: var(--primary); color: var(--on-primary); padding: .6em 1.2em; border-radius: 8px;
}

/* ---- header ---- */
.site-header {
  position: sticky; top: 0; z-index: 10;
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.site-header .wrap { display: flex; align-items: center; justify-content: space-between; height: 60px; }
.logo {
  display: inline-flex; align-items: center; gap: .55em;
  font-family: var(--display); font-weight: 700; font-size: 1.15rem;
  color: var(--heading); text-decoration: none; white-space: nowrap;
}
.logo .wave-mark { width: 30px; height: 18px; color: var(--accent); flex: none; }
.logo .dot { color: var(--accent); }
.nav-right { display: flex; align-items: center; gap: .4em; }
.nav-controls { display: flex; align-items: center; gap: .1em; }
.lang-switch {
  display: inline-flex; align-items: center; margin-right: .3em;
  border: 1.5px solid var(--line-strong); border-radius: 999px;
  background: var(--surface-2); padding: 2px;
  font-family: var(--mono); font-size: .68rem; font-weight: 700; letter-spacing: .02em;
}
.lang-switch a {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 26px; padding: .3em .55em; border-radius: 999px;
  color: var(--muted); text-decoration: none;
  transition: color .15s ease, background .15s ease;
}
.lang-switch a:not(.on):hover { color: var(--primary); }
.lang-switch a.on { color: var(--on-primary); background: var(--primary); box-shadow: var(--shadow-soft); }
.site-nav { display: flex; align-items: center; gap: .3em; font-family: var(--sans); font-size: .9rem; }
.site-nav a { color: var(--muted); text-decoration: none; font-weight: 500; }
.site-nav a.textlink { padding: .6em .7em; border-radius: 8px; transition: color .15s ease, background .15s ease; }
.site-nav a.textlink:hover { color: var(--primary); background: var(--tag-bg); }
.site-nav a.active { color: var(--primary); }
.menu-only { display: none; }
.nav-controls .menu-toggle { display: none; }
.menu-toggle .i-menu { display: inline-flex; line-height: 0; }
.menu-toggle .i-close { display: none; line-height: 0; }
.menu-toggle[aria-expanded='true'] .i-menu { display: none; }
.menu-toggle[aria-expanded='true'] .i-close { display: inline-flex; }
.nav-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 10px; flex: none;
  color: var(--muted); background: none; border: none; cursor: pointer;
  transition: color .15s ease, background .15s ease;
}
.nav-icon:hover { color: var(--primary); background: var(--tag-bg); }
.nav-icon .icon { width: 17px; height: 17px; }
.theme-toggle .sun, .theme-toggle .moon { display: none; line-height: 0; }
:root .theme-toggle .moon { display: inline-flex; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .theme-toggle .moon { display: none; }
  :root:not([data-theme]) .theme-toggle .sun { display: inline-flex; }
}
:root[data-theme='light'] .theme-toggle .moon { display: inline-flex; }
:root[data-theme='light'] .theme-toggle .sun { display: none; }
:root[data-theme='dark'] .theme-toggle .moon { display: none; }
:root[data-theme='dark'] .theme-toggle .sun { display: inline-flex; }

/* header search */
.header-search {
  display: flex; align-items: center; gap: .55em;
  border: 1.5px solid var(--line-strong); border-radius: 999px;
  background: var(--surface); padding: 0 .9em; height: 38px; width: 220px; margin-right: .3em;
  transition: border-color .15s ease, box-shadow .15s ease;
}
.header-search:focus-within { border-color: var(--accent); box-shadow: var(--shadow-soft); }
.header-search .icon { color: var(--muted); }
.hs-input {
  flex: 1; min-width: 0; background: none; border: none;
  font-family: var(--sans); font-size: .88rem; color: var(--text);
}
.hs-input:focus, .hs-input:focus-visible { outline: none; }
.hs-input::placeholder { color: var(--muted); }
.hs-kbd {
  font-family: var(--mono); font-size: .66rem; color: var(--muted);
  border: 1px solid var(--line); border-radius: 5px; padding: .1em .45em; background: var(--surface-2);
}
.nav-search { display: none; }

/* ---- hero banner: edge-to-edge on narrow screens, but never wider than the
   text column (wrap 1140 minus its 20px gutters = 1100) so on a maximized
   window its left/right edges line up exactly with the body text ---- */
.hero-banner {
  display: block; width: 100%; max-width: 1100px; margin: 0 auto;
  height: auto; aspect-ratio: 1731 / 909; background: #fff;
}
.hero { padding-top: 0; padding-bottom: 8px; }
.hero-copy { margin: 26px 0 4px; }
.hero-copy h1 {
  font-family: var(--display); font-weight: 700; color: var(--heading);
  font-size: clamp(1.6rem, 4.2vw, 2.4rem); line-height: 1.3; margin: 0 0 .2em; text-wrap: balance;
}
.hero-copy .lede { color: var(--muted); margin: 0 0 1.1em; }
.stats { display: flex; flex-wrap: wrap; gap: 10px; }
.stat {
  font-family: var(--mono); font-size: .74rem; letter-spacing: .04em;
  border: 1px solid var(--line-strong); border-radius: 999px;
  padding: .38em 1em; color: var(--muted); background: var(--surface);
}
.stat b { color: var(--primary); font-weight: 700; margin-left: .5em; }

/* ---- wave divider ---- */
.wave-divider { color: var(--accent); margin: 30px 0 4px; }
.wave-divider svg { display: block; width: 100%; height: 12px; }

/* ---- layout ---- */
.cols { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 30px; padding-bottom: 60px; }
@media (max-width: 920px) { .cols { grid-template-columns: 1fr; } }
.section-title {
  font-family: var(--display); font-weight: 700; font-size: 1.15rem;
  color: var(--heading); margin: 2.4em 0 1em; display: flex; align-items: center; gap: .55em;
}
.section-title::before {
  content: ''; width: 20px; height: 12px; flex: none;
  background: var(--accent);
  -webkit-mask: var(--wave-mask) center / contain no-repeat; mask: var(--wave-mask) center / contain no-repeat;
}
.section-title:first-child { margin-top: 0; }

/* ---- cards (thumbnail + genre tag + title + meta, per design-system) ---- */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(265px, 1fr)); gap: 18px; }
.card {
  position: relative; display: flex; flex-direction: column;
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
  overflow: hidden; cursor: pointer; box-shadow: var(--shadow-soft);
  transition: transform .15s ease, box-shadow .15s ease;
  animation: rise .5s ease backwards;
}
.card:hover, .card:focus-within { transform: translateY(-4px); box-shadow: var(--shadow-lift); }
.thumb {
  position: relative; aspect-ratio: 16 / 9; display: flex; align-items: flex-end;
  background: linear-gradient(140deg, var(--thumb-a, var(--sky)), var(--thumb-b, var(--aqua)));
}
.thumb .wave { width: 100%; height: 26px; display: block; color: rgba(255, 255, 255, .9); }
.thumb .latest-label {
  position: absolute; top: 12px; left: 12px;
  font-family: var(--mono); font-size: .64rem; font-weight: 700; letter-spacing: .14em;
  color: var(--on-primary); background: var(--primary); border-radius: 999px; padding: .25em 1em;
}
.card-body { display: flex; flex-direction: column; gap: .5em; padding: 14px 18px 18px; }
.card-body h2, .card-body h3 {
  margin: 0; font-family: var(--display); font-size: 1.05rem; line-height: 1.5; font-weight: 700;
}
.card-body h2 a, .card-body h3 a { color: var(--heading); text-decoration: none; transition: color .15s ease; }
.card:hover .card-body h2 a, .card:hover .card-body h3 a { color: var(--primary); }
.card-body h2 a::after, .card-body h3 a::after { content: ''; position: absolute; inset: 0; }
.card-meta { font-family: var(--mono); font-size: .72rem; color: var(--muted); }
.card .summary {
  margin: 0; font-size: .86rem; color: var(--muted);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.genre-tag {
  align-self: flex-start; font-family: var(--mono); font-size: .72rem; font-weight: 600;
  color: var(--brand, var(--primary));
  background: color-mix(in srgb, var(--brand, var(--accent)) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--brand, var(--accent)) 38%, transparent);
  border-radius: 6px; padding: .18em .7em;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) .genre-tag { color: color-mix(in srgb, var(--brand, var(--accent)) 55%, #EAF3FE); }
}
:root[data-theme='dark'] .genre-tag { color: color-mix(in srgb, var(--brand, var(--accent)) 55%, #EAF3FE); }
/* ---- tags (chips) ---- */
.tag-row { display: flex; flex-wrap: wrap; gap: 8px; }
.tag {
  position: relative; z-index: 2;
  font-family: var(--mono); font-size: .72rem; font-weight: 600;
  color: var(--primary); text-decoration: none;
  border: 1px solid var(--line-strong); border-radius: 8px; padding: .22em .8em;
  background: var(--tag-bg); transition: border-color .15s ease, background .15s ease;
}
.tag:hover { border-color: var(--accent); background: var(--tag-bg-hover); }
.tag.big { font-size: .82rem; padding: .3em 1em; }
.tag .n { color: var(--muted); margin-left: .5em; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: .4em 1em;
  font-family: var(--mono); font-size: .72rem; color: var(--muted);
}
.src { display: inline-flex; align-items: center; gap: .5em; }
.src i { width: 8px; height: 8px; border-radius: 999px; flex: none; background: var(--src-color, var(--accent)); }
.card mark { background: var(--sel); color: inherit; border-radius: 3px; padding: 0 .12em; }

/* ---- sidebar ---- */
.panel {
  background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
  padding: 22px 24px; margin-bottom: 18px; box-shadow: var(--shadow-soft);
  animation: rise .5s ease backwards;
}
.panel .section-title { margin: 0 0 1em; font-size: 1.02rem; }
.panel .tag-row { margin: 0; }
.panel-more {
  display: inline-flex; align-items: center; gap: .4em; margin-top: 1em;
  font-family: var(--mono); font-size: .74rem; color: var(--muted); text-decoration: none;
  transition: color .15s ease;
}
.panel-more:hover { color: var(--primary); }
.src-list { list-style: none; margin: 0; padding: 0; font-size: .85rem; }
.src-list li { display: flex; align-items: center; gap: .55em; padding: .32em 0; color: var(--text); }
.src-list .n { margin-left: auto; font-family: var(--mono); font-size: .72rem; color: var(--muted); }
.src-list a { color: var(--text); text-decoration: none; transition: color .15s ease; }
.src-list a:hover { color: var(--primary); }
.pop-list { list-style: none; margin: 0; padding: 0; }
.pop-list li {
  display: grid; grid-template-columns: auto 1fr; align-items: baseline;
  column-gap: .7em; row-gap: .2em; padding: .6em 0; border-top: 1px solid var(--line);
}
.pop-list li:first-child { border-top: none; padding-top: 0; }
.pop-list .rank {
  grid-row: span 2; align-self: center;
  font-family: var(--display); font-weight: 700; font-size: 1.1rem;
  color: var(--accent); width: 1.1em; text-align: center;
}
.pop-list a { color: var(--text); text-decoration: none; font-size: .88rem; line-height: 1.5; font-weight: 500; }
.pop-list a:hover { color: var(--primary); }
.pop-list .pop-meta { font-family: var(--mono); font-size: .68rem; color: var(--muted); }
.pop-week { font-family: var(--mono); font-weight: 400; font-size: .62rem; letter-spacing: .08em; color: var(--muted); }
.about-text { margin: 0; font-size: .85rem; color: var(--muted); }
.about-text b { color: var(--primary); font-weight: 700; }
.more-row { margin-top: 24px; }
.more-row .panel-more { font-size: .82rem; }

/* ---- about hero ---- */
.about-hero { display: flex; align-items: center; gap: 26px; margin-bottom: 8px; }
.about-avatar {
  width: 150px; height: 150px; flex: none; border-radius: 999px; object-fit: cover;
  background: var(--surface); border: 3px solid var(--surface);
  box-shadow: 0 0 0 3px var(--accent), var(--shadow-lift);
}
.about-intro .article-title { margin: 0 0 .3em; }
.about-intro p { margin: 0; color: var(--muted); }
@media (max-width: 560px) {
  .about-hero { flex-direction: column; text-align: center; gap: 18px; }
  .about-avatar { width: 128px; height: 128px; }
}
.profile {
  margin: 2em 0 0; padding: 6px 20px; border: 1px solid var(--line);
  border-radius: 14px; background: var(--surface); box-shadow: var(--shadow-soft);
}
.profile > div {
  display: grid; grid-template-columns: 7.5em 1fr; gap: .5em 1em;
  padding: .7em 0; border-top: 1px solid var(--line);
}
.profile > div:first-child { border-top: none; }
.profile dt { margin: 0; font-family: var(--mono); font-size: .78rem; color: var(--accent); font-weight: 600; }
.profile dd { margin: 0; font-size: .92rem; }
@media (max-width: 480px) {
  .profile > div { grid-template-columns: 1fr; gap: .1em; }
}

/* ---- article page ---- */
.article-wrap { max-width: 760px; margin: 0 auto; padding: 40px 20px 80px; }
.backlink {
  display: inline-flex; align-items: center; gap: .5em;
  font-family: var(--mono); font-size: .78rem; color: var(--muted); text-decoration: none; padding: .5em 0;
  transition: color .15s ease;
}
.backlink:hover { color: var(--primary); }
.article-title {
  font-family: var(--display); font-weight: 700; color: var(--heading);
  font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.4; margin: .6em 0 .7em; text-wrap: balance;
}
.article-meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: .6em 1.2em;
  border: 1px solid var(--line); border-radius: 14px; background: var(--surface);
  padding: .8em 1.3em; margin-bottom: 2.4em; box-shadow: var(--shadow-soft);
}
.article-meta .spacer { flex: 1; }
.mdlink {
  display: inline-flex; align-items: center; gap: .5em;
  font-family: var(--mono); font-size: .72rem; font-weight: 700; color: var(--primary); text-decoration: none;
  border: 1.5px solid var(--line-strong); border-radius: 999px; padding: .4em 1em; transition: background .15s ease, border-color .15s ease;
}
.mdlink:hover { background: var(--tag-bg); border-color: var(--accent); }
.srclink {
  display: inline-flex; align-items: center; gap: .4em;
  font-family: var(--mono); font-size: .72rem; color: var(--muted); text-decoration: none; padding: .4em 0; transition: color .15s ease;
}
.srclink:hover { color: var(--primary); }

.prose { font-size: 1rem; }
.prose h2 {
  font-family: var(--display); font-weight: 700; color: var(--heading);
  font-size: 1.3rem; line-height: 1.5; margin: 2.4em 0 .8em; padding-bottom: .4em;
  border-bottom: 2px solid var(--line);
}
.prose h3 { font-family: var(--display); font-weight: 700; color: var(--heading); font-size: 1.1rem; margin: 2em 0 .7em; }
.prose p { margin: 1.1em 0; }
.prose strong { color: var(--heading); font-weight: 700; }
.prose a { color: var(--primary); text-underline-offset: 3px; text-decoration-color: var(--accent); }
.prose a:hover { text-decoration-style: wavy; }
.prose code {
  font-family: var(--mono); font-size: .86em; color: var(--primary);
  background: color-mix(in srgb, var(--sky) 22%, transparent);
  border-radius: 5px; padding: .08em .45em;
}
.prose pre {
  background: var(--code-bg); border-radius: 10px; padding: 1em 1.3em; overflow-x: auto;
  line-height: 1.7; box-shadow: var(--shadow-soft);
}
.prose pre code { background: none; padding: 0; color: var(--code-text); font-size: .86rem; }
.prose blockquote {
  margin: 1.4em 0; padding: .6em 1.1em; border-left: 3px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent); color: var(--muted); border-radius: 0 8px 8px 0;
}
.prose ul, .prose ol { padding-left: 1.6em; }
.prose li { margin: .4em 0; }
.prose li::marker { color: var(--accent); }
.prose hr { border: none; border-top: 1px solid var(--line); margin: 2.5em 0; }
.prose table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; font-size: .88rem; }
.prose th, .prose td { border: 1px solid var(--line); padding: .5em .9em; text-align: left; }
.prose th { background: var(--surface-2); font-family: var(--mono); font-size: .78rem; color: var(--heading); }
.prose img { max-width: 100%; border-radius: 12px; }

/* ---- search page ---- */
.search-form {
  display: flex; align-items: center; gap: .7em; max-width: 640px;
  border: 1.5px solid var(--line-strong); border-radius: 999px; background: var(--surface);
  padding: 0 1.1em; height: 54px; margin-bottom: 34px; box-shadow: var(--shadow-soft);
  transition: border-color .15s ease;
}
.search-form:focus-within { border-color: var(--accent); }
.search-form .icon { width: 18px; height: 18px; color: var(--muted); }
.search-form .hs-input { font-size: 1rem; height: 100%; }
.search-btn {
  font-family: var(--sans); font-size: .82rem; font-weight: 700; color: var(--on-primary);
  background: var(--primary); border: none; border-radius: 999px; padding: .55em 1.4em; cursor: pointer;
  transition: background .15s ease, transform .15s ease;
}
.search-btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
.search-hint { color: var(--muted); font-size: .9rem; }

/* ---- archive ---- */
.month-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
.month-list a {
  display: flex; align-items: baseline; gap: .8em; background: var(--surface);
  border: 1px solid var(--line); border-radius: 14px; padding: 1em 1.3em; text-decoration: none;
  color: var(--text); box-shadow: var(--shadow-soft); transition: transform .15s ease, box-shadow .15s ease;
}
.month-list a:hover { transform: translateY(-3px); box-shadow: var(--shadow-lift); }
.month-list .m { font-family: var(--mono); font-weight: 600; color: var(--primary); white-space: nowrap; }
.month-list .n { margin-left: auto; font-family: var(--mono); font-size: .72rem; color: var(--muted); white-space: nowrap; }

/* ---- page head / misc ---- */
.page-head { padding-top: 44px; padding-bottom: 8px; }
.page-head h1 {
  font-family: var(--display); font-weight: 700; color: var(--heading);
  font-size: clamp(1.7rem, 5vw, 2.4rem); margin: 0 0 .2em;
}
.page-head .count { font-family: var(--mono); font-size: .8rem; color: var(--muted); }
.list-section { padding-top: 24px; padding-bottom: 64px; }
.notfound { text-align: center; padding-top: 100px; padding-bottom: 130px; }
.notfound h1 { font-family: var(--display); font-size: 2rem; color: var(--primary); margin: 0 0 .4em; }
.notfound p { color: var(--muted); }

/* ---- footer ---- */
.site-footer { margin-top: 20px; }
.footer-wave { display: block; width: 100%; height: 16px; color: var(--navy); }
.footer-inner { background: var(--navy); color: #EAF3FE; padding: 26px 0 38px; }
.footer-inner .wrap {
  display: flex; flex-wrap: wrap; gap: .8em 2em; justify-content: space-between; align-items: center;
  font-family: var(--mono); font-size: .74rem; color: #A9C4EE;
}
.footer-inner .fbrand { display: inline-flex; align-items: center; gap: .55em; color: #EAF3FE; font-family: var(--display); font-weight: 700; }
.footer-inner .fbrand .wave-mark { width: 26px; height: 16px; color: #EAF3FE; }
.footer-inner a { color: #EAF3FE; }
.jelly { display: inline-block; animation: bob 3.5s ease-in-out infinite; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

/* ---- mobile: collapse nav into a hamburger dropdown ---- */
@media (max-width: 760px) {
  .nav-controls .menu-toggle { display: inline-flex; }
  .bar-only { display: none; }
  .menu-only { display: block; }
  .site-nav {
    position: absolute; top: 100%; left: 0; right: 0;
    flex-direction: column; align-items: stretch; gap: 0;
    background: var(--surface); border-bottom: 1px solid var(--line);
    box-shadow: var(--shadow-lift); padding: 6px 0;
    max-height: calc(100dvh - 60px); overflow-y: auto;
    display: none;
  }
  .site-nav.open { display: flex; animation: rise .2s ease; }
  .site-nav a.textlink {
    padding: .95em 24px; border-radius: 0; width: 100%; font-size: 1rem;
  }
  .site-nav a.textlink:hover, .site-nav a.active { background: var(--tag-bg); }
}
@media (max-width: 560px) {
  .logo { font-size: .95rem; gap: .4em; }
  .logo .wave-mark { width: 24px; }
  .logo-suffix { display: none; }
  .nav-icon { width: 34px; height: 34px; }
}

@keyframes rise { from { opacity: 0; transform: translateY(14px); } }
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
  html { scroll-behavior: auto; }
}
`

// Runs before paint: resolve saved choice (or system preference) into data-theme
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.dataset.theme = saved;
    }
  } catch (e) {}
})();
`

const THEME_TOGGLE_SCRIPT = `
(function () {
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var root = document.documentElement;
    var current = root.dataset.theme ||
      (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    var next = current === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
})();
(function () {
  var btn = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  function setOpen(open) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('open', open);
  }
  btn.addEventListener('click', function () {
    setOpen(btn.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();
(function () {
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      var input = document.querySelector('.hs-input');
      if (input && input.offsetParent !== null) { input.focus(); }
      else { location.href = '/search'; }
    }
  });
})();
`

// Strict CSP owned by the Worker (version-controlled, portable, and — unlike a
// zone-level policy with 'unsafe-inline' — an actual XSS backstop). The two
// inline scripts are allowed by their SHA-256 hashes, computed from the script
// constants at runtime so they can never drift. Inline styles keep
// 'unsafe-inline' (hashing style attributes is impractical and CSS can't
// execute JS). Memoized after first computation.
async function sha256Base64(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  let bin = ''
  for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b)
  return btoa(bin)
}

let cspCache: string | undefined
export async function contentSecurityPolicy(): Promise<string> {
  if (cspCache) return cspCache
  const hashes = await Promise.all(
    [THEME_INIT_SCRIPT, THEME_TOGGLE_SCRIPT].map(async (s) => `'sha256-${await sha256Base64(s)}'`),
  )
  cspCache = [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
  return cspCache
}

type NavKey = 'posts' | 'tags' | 'about'

type LayoutOpts = {
  title: string
  description?: string
  canonicalPath?: string
  head?: string
  nav?: NavKey
  lang: Lang
}

function navLink(base: string, path: string, label: string, key: NavKey, current?: NavKey): string {
  const active = key === current
  return `<a class="textlink${active ? ' active' : ''}" href="${base}${path}"${active ? ' aria-current="page"' : ''}>${label}</a>`
}

function layout(opts: LayoutOpts, main: string): string {
  const { lang } = opts
  const t = T[lang]
  const base = basePath(lang)
  const description = opts.description ?? t.desc
  const path = opts.canonicalPath ?? '/'
  const canonical = `${SITE_ORIGIN}${base}${path}`
  const jaUrl = `${SITE_ORIGIN}${path}`
  const enUrl = `${SITE_ORIGIN}/en${path}`
  const langSwitch = `<div class="lang-switch">
        <a href="${path}"${lang === 'ja' ? ' class="on" aria-current="true"' : ''}>JA</a>
        <a href="/en${path}"${lang === 'en' ? ' class="on" aria-current="true"' : ''}>EN</a>
      </div>`
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="${esc(SITE_TITLE)}">
<meta property="og:url" content="${esc(canonical)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" hreflang="ja" href="${esc(jaUrl)}">
<link rel="alternate" hreflang="en" href="${esc(enUrl)}">
<link rel="alternate" hreflang="x-default" href="${esc(jaUrl)}">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0F1B33">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#F8FBFF">
<link rel="icon" href="${FAVICON}">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE_TITLE)}" href="${base}/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Noto+Sans+JP:wght@400;500;700&family=Zen+Maru+Gothic:wght@500;700&display=swap" rel="stylesheet">
${opts.head ?? ''}
<script>${THEME_INIT_SCRIPT}</script>
<style>${STYLE}</style>
</head>
<body>
<a class="skip" href="#main">${esc(t.skip)}</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="${base}/">${WAVE_MARK}shiichan<span class="logo-suffix"><span class="dot">.</span>blog</span></a>
    <div class="nav-right">
      <nav class="site-nav" id="site-nav" aria-label="Site navigation">
        ${navLink(base, '/posts', 'Posts', 'posts', opts.nav)}
        ${navLink(base, '/tags', 'Tags', 'tags', opts.nav)}
        ${navLink(base, '/about', 'About', 'about', opts.nav)}
        <a class="textlink menu-only" href="${base}/search">Search</a>
        <a class="textlink menu-only" href="${base}/feed.xml">RSS</a>
        <form class="header-search bar-only" action="${base}/search" method="get" target="_blank" rel="noopener" role="search">
          ${icon('search')}
          <input class="hs-input" type="search" name="q" placeholder="Search" aria-label="${esc(t.searchAria)}" maxlength="100">
          <kbd class="hs-kbd" aria-hidden="true">⌘K</kbd>
        </form>
        <a class="nav-icon nav-rss bar-only" href="${base}/feed.xml" aria-label="RSS">${icon('rss')}</a>
      </nav>
      <div class="nav-controls">
        ${langSwitch}
        <button class="nav-icon theme-toggle" id="theme-toggle" type="button" aria-label="Toggle light/dark theme">
          <span class="sun">${icon('sun')}</span><span class="moon">${icon('moon')}</span>
        </button>
        <button class="nav-icon menu-toggle" id="menu-toggle" type="button" aria-label="Menu" aria-controls="site-nav" aria-expanded="false">
          <span class="i-menu">${icon('menu')}</span><span class="i-close">${icon('x')}</span>
        </button>
      </div>
    </div>
  </div>
</header>
${main}
<footer class="site-footer">
  <svg class="footer-wave" viewBox="0 0 480 16" preserveAspectRatio="none" aria-hidden="true"><path d="M0 16 L0 9 Q 20 0 40 9 T 80 9 T 120 9 T 160 9 T 200 9 T 240 9 T 280 9 T 320 9 T 360 9 T 400 9 T 440 9 T 480 9 L480 16 Z" fill="currentColor"/></svg>
  <div class="footer-inner">
    <div class="wrap">
      <span class="fbrand">${WAVE_MARK}shiichan blog</span>
      <span>${esc(t.footerRight)} / <a href="${base}/search">Search</a> / <a href="${base}/archive">Archive</a> / <a href="${base}/feed.xml">RSS</a> <span class="jelly" aria-hidden="true">🪼</span></span>
    </div>
  </div>
</footer>
<script>${THEME_TOGGLE_SCRIPT}</script>
</body>
</html>`
}

function tagChip(base: string, tag: string, count?: number, big = false): string {
  const n = count !== undefined ? `<span class="n">${count}</span>` : ''
  return `<a class="tag${big ? ' big' : ''}" href="${base}/tags/${encodeURIComponent(tag)}">#${esc(tag)}${n}</a>`
}

function sourceBadge(name: string): string {
  return `<span class="src" style="--src-color:${sourceColor(name)}"><i></i>${esc(name)}</span>`
}

function sourceList(sources: SourceCount[]): string {
  return `<ul class="src-list">
    ${sources.map((s) => `<li><span class="src" style="--src-color:${sourceColor(s.source_name)}"><i></i></span>${esc(s.source_name)}<span class="n">${s.count}</span></li>`).join('\n    ')}
  </ul>`
}

// Thumbnail wave line (echoes the aquarius motif), white over the gradient
const THUMB_WAVE = `<svg class="wave" viewBox="0 0 480 26" preserveAspectRatio="none" aria-hidden="true"><path d="M0 14 Q 20 4 40 14 T 80 14 T 120 14 T 160 14 T 200 14 T 240 14 T 280 14 T 320 14 T 360 14 T 400 14 T 440 14 T 480 14" fill="none" stroke="currentColor" stroke-width="3"/></svg>`

// Uniform article card: every card is the same size. `latest` only adds a
// LATEST ribbon; `summaryHtml` (search snippets) shows a short excerpt.
function articleCard(
  r: ArticleListRow,
  index: number,
  lang: Lang,
  opts: { latest?: boolean; summaryHtml?: string } = {},
): string {
  const { latest = false, summaryHtml } = opts
  const base = basePath(lang)
  const delay = Math.min(index * 45, 500)
  const brand = sourceBrand(r.source_name)
  // Thumbnail wash: blue-family gradient (per design system) with only a faint
  // brand tint so each source is subtly recognizable without going muddy
  const thumbStyle = `--brand:${brand};--thumb-a:color-mix(in srgb, ${brand} 12%, #DCEBFA);--thumb-b:color-mix(in srgb, ${brand} 20%, var(--aqua))`
  const summary = summaryHtml !== undefined ? `<p class="summary">${summaryHtml}</p>` : ''
  return `
<article class="card" style="animation-delay:${delay}ms">
  <div class="thumb" style="${thumbStyle}" aria-hidden="true">
    ${latest ? '<span class="latest-label">LATEST</span>' : ''}
    ${THUMB_WAVE}
  </div>
  <div class="card-body">
    <span class="genre-tag" style="--brand:${brand}">${esc(r.source_name)}</span>
    <h3><a href="${base}/posts/${esc(r.slug)}">${esc(artTitle(r, lang))}</a></h3>
    <p class="card-meta">${esc(fmtDate(r.published_at))}</p>
    ${summary}
  </div>
</article>`
}

// FTS snippets arrive with control-char markers; escape first, then mark
function snippetHtml(snip: string): string {
  return esc(snip).replaceAll(SNIP_OPEN, '<mark>').replaceAll(SNIP_CLOSE, '</mark>')
}

function popularPanel(popular: ArticleListRow[], lang: Lang): string {
  if (popular.length === 0) return ''
  const base = basePath(lang)
  const [pop, week] = T[lang].popularWeek
  const items = popular
    .map(
      (r, i) => `<li>
      <span class="rank">${i + 1}</span>
      <a href="${base}/posts/${esc(r.slug)}">${esc(artTitle(r, lang))}</a>
      <span class="pop-meta">${sourceBadge(r.source_name)}</span>
    </li>`,
    )
    .join('\n    ')
  return `
<div class="panel" style="animation-delay:80ms">
  <h2 class="section-title">${esc(pop)} <span class="pop-week">${esc(week)}</span></h2>
  <ol class="pop-list">
    ${items}
  </ol>
</div>`
}

type IndexData = {
  latest: ArticleListRow[]
  popular: ArticleListRow[]
  tags: TagCount[]
  sources: SourceCount[]
  months: MonthCount[]
  total: number
}

export function renderIndexPage(data: IndexData, lang: Lang): string {
  const { latest: rows, popular, tags, sources, months, total } = data
  const t = T[lang]
  const base = basePath(lang)

  const hero = `
<img class="hero-banner" src="/hero.webp" srcset="/hero-800.webp 800w, /hero-1200.webp 1200w, /hero.webp 1731w"
  sizes="100vw" width="1731" height="909"
  alt="A smiling shiichan working at her laptop — Shiichan Tech Blog" fetchpriority="high" decoding="async">
<section class="hero wrap">
  <div class="hero-copy">
    <h1>${esc(t.heroH1)}</h1>
    <p class="lede">${esc(t.heroLede)}</p>
    <div class="stats">
      <span class="stat">ARTICLES<b>${total}</b></span>
      <span class="stat">SOURCES<b>${sources.length}</b></span>
      <span class="stat">UPDATE<b>DAILY</b></span>
    </div>
  </div>
</section>`

  // One uniform grid; the newest card carries a LATEST ribbon
  const mainCol = rows.length
    ? `
<h2 class="section-title">${esc(t.latestPosts)}</h2>
<div class="card-grid">${rows.map((r, i) => articleCard(r, i, lang, { latest: i === 0 })).join('\n')}</div>
<p class="more-row"><a class="panel-more" href="${base}/posts">${esc(t.viewAll)} ${icon('arrow-up-right')}</a></p>`
    : '<p>No articles yet.</p>'

  const sideCol = `
${popularPanel(popular, lang)}
<div class="panel" id="tags" style="animation-delay:120ms">
  <h2 class="section-title">${esc(t.tags)}</h2>
  <p class="tag-row">${tags.map((tg) => tagChip(base, tg.tag, tg.count)).join('')}</p>
  <a class="panel-more" href="${base}/tags">${t.allTags} ${icon('arrow-up-right')}</a>
</div>
<div class="panel" style="animation-delay:200ms">
  <h2 class="section-title">${esc(t.sources)}</h2>
  ${sourceList(sources)}
</div>
<div class="panel" style="animation-delay:240ms">
  <h2 class="section-title">${esc(t.archive)}</h2>
  <ul class="src-list">
    ${months
      .slice(0, 12)
      .map(
        (m) =>
          `<li><a href="${base}/archive/${esc(m.month)}">${fmtMonth(m.month, lang)}</a><span class="n">${m.count}</span></li>`,
      )
      .join('\n    ')}
  </ul>
  <a class="panel-more" href="${base}/archive">${t.allMonths} ${icon('arrow-up-right')}</a>
</div>
<div class="panel" style="animation-delay:280ms">
  <h2 class="section-title">${esc(t.about)}</h2>
  <p class="about-text">${t.aboutPanel}</p>
  <a class="panel-more" href="${base}/about">${t.more} ${icon('arrow-up-right')}</a>
</div>`

  return layout(
    { title: SITE_TITLE, canonicalPath: '/', lang },
    `${hero}\n<div class="wrap">${WAVE_DIVIDER}</div>\n<div class="cols wrap"><main id="main">${mainCol}</main><aside>${sideCol}</aside></div>`,
  )
}

export function renderAllPostsPage(rows: ArticleListRow[], total: number, lang: Lang): string {
  const t = T[lang]
  const main = `
<section class="page-head wrap">
  <h1>ALL POSTS</h1>
  <p class="count">${t.postsCount(total)}</p>
</section>
<section class="list-section wrap" id="main">
  <div class="card-grid">${rows.map((r, i) => articleCard(r, i, lang)).join('\n')}</div>
</section>`
  return layout(
    {
      title: `Posts | ${SITE_TITLE}`,
      description: lang === 'en' ? 'All posts on shiichan blog' : `${SITE_TITLE} の全記事一覧`,
      canonicalPath: '/posts',
      nav: 'posts',
      lang,
    },
    main,
  )
}

export function renderTagsIndexPage(tags: TagCount[], sources: SourceCount[], lang: Lang): string {
  const t = T[lang]
  const base = basePath(lang)
  const totalArticles = sources.reduce((sum, s) => sum + s.count, 0)
  const maxCount = tags[0]?.count ?? 1
  const cloud = tags
    .map((tg) => {
      const size = (0.75 + (tg.count / maxCount) * 0.5).toFixed(2)
      return `<a class="tag big" style="font-size:${size}rem" href="${base}/tags/${encodeURIComponent(tg.tag)}">#${esc(tg.tag)}<span class="n">${tg.count}</span></a>`
    })
    .join('')
  const main = `
<section class="page-head wrap">
  <h1>TAGS</h1>
  <p class="count">${t.tagsCount(tags.length, totalArticles)}</p>
</section>
<section class="list-section wrap" id="main">
  <div class="tag-cloud">${cloud}</div>
</section>`
  return layout(
    {
      title: `Tags | ${SITE_TITLE}`,
      description: lang === 'en' ? 'All tags' : 'タグ一覧',
      canonicalPath: '/tags',
      nav: 'tags',
      lang,
    },
    main,
  )
}

export function renderTagPage(tag: string, rows: ArticleListRow[], lang: Lang): string {
  const t = T[lang]
  const base = basePath(lang)
  const main = `
<section class="page-head wrap">
  <p><a class="backlink" href="${base}/tags">${icon('arrow-left')}TAGS</a></p>
  <h1>#${esc(tag)}</h1>
  <p class="count">${t.postsCount(rows.length)}</p>
</section>
<section class="list-section wrap" id="main">
  <div class="card-grid">${rows.map((r, i) => articleCard(r, i, lang)).join('\n')}</div>
</section>`
  return layout(
    {
      title: `#${tag} | ${SITE_TITLE}`,
      description: lang === 'en' ? `Articles tagged “${tag}”` : `タグ「${tag}」の記事一覧`,
      canonicalPath: `/tags/${encodeURIComponent(tag)}`,
      nav: 'tags',
      lang,
    },
    main,
  )
}

export function renderAboutPage(lang: Lang): string {
  const t = T[lang]
  const base = basePath(lang)
  const main = `
<div class="article-wrap" id="main">
  <p><a class="backlink" href="${base}/">${icon('arrow-left')}INDEX</a></p>
  <article>
    <div class="about-hero">
      <img class="about-avatar" src="/shiichan.webp" width="512" height="512" decoding="async"
        alt="shiichan smiling and waving">
      <div class="about-intro">
        <h1 class="article-title">About me</h1>
        <p>${esc(t.aboutGreeting)}</p>
      </div>
    </div>
  </article>
</div>`
  return layout(
    {
      title: `About | ${SITE_TITLE}`,
      description: lang === 'en' ? 'About shiichan' : `${SITE_TITLE} としぃちゃんの紹介`,
      canonicalPath: '/about',
      nav: 'about',
      lang,
      head: `<meta property="og:image" content="${SITE_ORIGIN}/shiichan.webp">`,
    },
    main,
  )
}

export function renderSearchPage(query: string, rows: SearchHit[], lang: Lang): string {
  const t = T[lang]
  const count = query ? t.hits(rows.length, esc(query)) : t.searchPrompt
  const results = !query
    ? `<p class="search-hint">${esc(t.searchHint)}</p>`
    : rows.length
      ? `<div class="card-grid">${rows
          .map((r, i) =>
            articleCard(r, i, lang, { summaryHtml: r.snip ? snippetHtml(r.snip) : undefined }),
          )
          .join('\n')}</div>`
      : `<p class="search-hint">${esc(t.searchNo(query))}</p>`
  const main = `
<section class="page-head wrap">
  <h1>SEARCH</h1>
  <p class="count">${count}</p>
</section>
<section class="list-section wrap" id="main">
  <form class="search-form" action="${basePath(lang)}/search" method="get" role="search">
    ${icon('search')}
    <input class="hs-input" type="search" name="q" value="${esc(query)}" placeholder="${esc(t.searchPlaceholder)}"
      aria-label="${esc(t.searchAria)}" maxlength="100" ${query ? '' : 'autofocus'}>
    <button class="search-btn" type="submit">Search</button>
  </form>
  ${results}
</section>`
  return layout(
    {
      title: query ? `${query} | ${SITE_TITLE}` : `Search | ${SITE_TITLE}`,
      description: lang === 'en' ? 'Search articles' : '記事検索',
      canonicalPath: '/search',
      lang,
    },
    main,
  )
}

export function renderArchiveIndexPage(months: MonthCount[], lang: Lang): string {
  const t = T[lang]
  const base = basePath(lang)
  const total = months.reduce((sum, m) => sum + m.count, 0)
  const list = months
    .map(
      (m) =>
        `<li><a href="${base}/archive/${esc(m.month)}"><b class="m">${esc(m.month)}</b>${fmtMonth(m.month, lang)}<span class="n">${t.postsCount(m.count)}</span></a></li>`,
    )
    .join('\n')
  const main = `
<section class="page-head wrap">
  <h1>ARCHIVE</h1>
  <p class="count">${t.monthsCount(months.length, total)}</p>
</section>
<section class="list-section wrap" id="main">
  <ul class="month-list">${list}</ul>
</section>`
  return layout(
    {
      title: `Archive | ${SITE_TITLE}`,
      description: lang === 'en' ? 'Monthly archive' : '月別アーカイブ',
      canonicalPath: '/archive',
      lang,
    },
    main,
  )
}

export function renderArchiveMonthPage(month: string, rows: ArticleListRow[], lang: Lang): string {
  const t = T[lang]
  const base = basePath(lang)
  const main = `
<section class="page-head wrap">
  <p><a class="backlink" href="${base}/archive">${icon('arrow-left')}ARCHIVE</a></p>
  <h1>${esc(month)}</h1>
  <p class="count">${fmtMonth(month, lang)} / ${t.postsCount(rows.length)}</p>
</section>
<section class="list-section wrap" id="main">
  <div class="card-grid">${rows.map((r, i) => articleCard(r, i, lang)).join('\n')}</div>
</section>`
  return layout(
    {
      title: `${fmtMonth(month, lang)} | ${SITE_TITLE}`,
      description: lang === 'en' ? `Posts from ${fmtMonth(month, lang)}` : `${fmtMonth(month, lang)}の記事一覧`,
      canonicalPath: `/archive/${month}`,
      lang,
    },
    main,
  )
}

export async function renderArticlePage(row: ArticleRow, lang: Lang): Promise<string> {
  const t = T[lang]
  const base = basePath(lang)
  const title = artTitle(row, lang)
  // body_md was validated HTML-free at ingest, so the only HTML here comes from marked
  const bodyHtml = await marked.parse(artBody(row, lang))
  const tags = parseTags(row.tags)
  const mdPath = `${base}/posts/${row.slug}.md`
  const main = `
<div class="article-wrap" id="main">
  <p><a class="backlink" href="${base}/">${icon('arrow-left')}INDEX</a></p>
  <article>
    <h1 class="article-title">${esc(title)}</h1>
    <div class="article-meta">
      <p class="meta" style="margin:0">${sourceBadge(row.source_name)}<span>${esc(fmtDate(row.published_at))}</span></p>
      ${tags.map((tg) => tagChip(base, tg)).join('')}
      <span class="spacer"></span>
      <a class="srclink" href="${esc(row.source_url)}" rel="noopener">${esc(t.source)}${icon('arrow-up-right')}</a>
      <a class="mdlink" href="${esc(mdPath)}">${icon('file-code')}RAW .md</a>
    </div>
    <div class="prose">${bodyHtml}</div>
  </article>
</div>`
  return layout(
    {
      title: `${title} | ${SITE_TITLE}`,
      description: artSummary(row, lang),
      canonicalPath: `/posts/${row.slug}`,
      head: `<link rel="alternate" type="text/markdown" href="${esc(mdPath)}">`,
      nav: 'posts',
      lang,
    },
    main,
  )
}

export function renderArticleMarkdown(row: ArticleRow, lang: Lang): string {
  const tags = parseTags(row.tags)
  const title = artTitle(row, lang)
  return [
    '---',
    `title: ${JSON.stringify(title)}`,
    `source: ${JSON.stringify(row.source_name)}`,
    `source_url: ${row.source_url}`,
    `published_at: ${row.published_at}`,
    `tags: ${JSON.stringify(tags)}`,
    '---',
    '',
    `# ${title}`,
    '',
    artBody(row, lang).trim(),
    '',
  ].join('\n')
}

export function renderRssFeed(rows: ArticleListRow[], lang: Lang): string {
  const base = basePath(lang)
  const items = rows
    .map(
      (r) => `  <item>
    <title>${esc(artTitle(r, lang))}</title>
    <link>${SITE_ORIGIN}${base}/posts/${esc(r.slug)}</link>
    <guid isPermaLink="true">${SITE_ORIGIN}${base}/posts/${esc(r.slug)}</guid>
    <description>${esc(artSummary(r, lang))}</description>
    <pubDate>${new Date(r.published_at).toUTCString()}</pubDate>
${parseTags(r.tags)
  .map((tg) => `    <category>${esc(tg)}</category>`)
  .join('\n')}
  </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(SITE_TITLE)}</title>
  <link>${SITE_ORIGIN}${base}/</link>
  <atom:link href="${SITE_ORIGIN}${base}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${esc(T[lang].rssDesc)}</description>
  <language>${T[lang].htmlLang}</language>
${rows[0] ? `  <lastBuildDate>${new Date(rows[0].published_at).toUTCString()}</lastBuildDate>\n` : ''}${items}
</channel>
</rss>`
}

export function renderNotFoundPage(lang: Lang): string {
  const base = basePath(lang)
  return layout(
    { title: `404 | ${SITE_TITLE}`, lang },
    `<div class="notfound wrap" id="main">
  <h1>404 // NOT FOUND</h1>
  <p>${esc(T[lang].notFoundBody)}</p>
  <p><a class="backlink" href="${base}/">${icon('arrow-left')}INDEX</a></p>
</div>`,
  )
}
