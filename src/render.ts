import { marked } from 'marked'
import type { ArticleListRow, ArticleRow, SourceCount, TagCount } from './db'

const SITE_TITLE = 'sheechan blog'
const SITE_ORIGIN = 'https://blog.sheechan.etak64n.dev'
const SITE_DESCRIPTION =
  'AWS・Cloudflare・OpenAI・Anthropic の最新テックニュースを、しぃちゃんが毎日わかりやすくお届けするブログ'

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )

const fmtDate = (iso: string) => iso.slice(0, 10)

export function parseTags(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

// Brand accent per source; falls back to the site cyan for unknown sources
function sourceColor(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('aws') || n.includes('amazon')) return '#ff9900'
  if (n.includes('cloudflare')) return '#f6821f'
  if (n.includes('openai')) return '#4ecb9b'
  if (n.includes('anthropic')) return '#d97757'
  if (n.includes('windows') || n.includes('microsoft')) return '#4cc2ff'
  return '#3fd2ff'
}

// Lucide-style inline SVG icons (24x24 stroke), rendered at 14px via CSS
const ICONS: Record<string, string> = {
  'arrow-left': '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  'file-code': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>',
  rss: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
}

function icon(name: keyof typeof ICONS): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
}

const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#071120"/><rect width="64" height="64" rx="14" fill="none" stroke="#3fd2ff" stroke-width="3"/><text x="32" y="44" font-family="monospace" font-size="34" font-weight="bold" fill="#3fd2ff" text-anchor="middle">s_</text></svg>`,
  )

// Light-theme variable overrides. Applied twice: for the explicit
// data-theme="light" choice and as the no-JS prefers-color-scheme fallback.
const LIGHT_VARS = `
  color-scheme: light;
  --bg: #eef3fa;
  --panel: #ffffff;
  --panel-2: #e3ecf7;
  --line: #d3dff0;
  --line-bright: #aec4e3;
  --text: #152238;
  --dim: #4e6486;
  --cyan: #0284c7;
  --cyan-soft: #075985;
  --blue: #2f6fed;
  --accent-ink: #ffffff;
  --strong: #0b1526;
  --header-bg: rgba(255, 255, 255, .8);
  --hero-glow: rgba(37, 99, 235, .10);
  --grid-line: rgba(37, 99, 235, .06);
  --stat-bg: rgba(255, 255, 255, .6);
  --tag-bg: rgba(2, 132, 199, .06);
  --tag-bg-hover: rgba(2, 132, 199, .14);
  --accent-border: rgba(2, 132, 199, .55);
  --accent-border-soft: rgba(2, 132, 199, .4);
  --glow: rgba(2, 132, 199, .15);
  --selection: rgba(2, 132, 199, .25);
  --code-chip-bg: rgba(2, 132, 199, .08);
  --code-chip-border: rgba(2, 132, 199, .2);
  --featured-a: rgba(2, 132, 199, .08);
  --featured-b: rgba(47, 111, 237, .04);
  --grad-a: #0b3a66;
  --grad-b: #0369a1;
  --grad-c: #2f6fed;
`

const STYLE = `
:root {
  color-scheme: dark;
  --bg: #040810;
  --panel: #0a1322;
  --panel-2: #0d1a30;
  --line: #1b2a47;
  --line-bright: #2b4570;
  --text: #d7e2f5;
  --dim: #7e93b8;
  --cyan: #3fd2ff;
  --cyan-soft: #9be1ff;
  --blue: #4f8dff;
  --accent-ink: #04212e;
  --strong: #ffffff;
  --header-bg: rgba(4, 8, 16, .78);
  --hero-glow: rgba(63, 130, 255, .17);
  --grid-line: rgba(102, 148, 230, .05);
  --stat-bg: rgba(13, 26, 48, .5);
  --tag-bg: rgba(63, 210, 255, .05);
  --tag-bg-hover: rgba(63, 210, 255, .12);
  --accent-border: rgba(63, 210, 255, .55);
  --accent-border-soft: rgba(63, 210, 255, .4);
  --glow: rgba(63, 210, 255, .12);
  --selection: rgba(63, 210, 255, .3);
  --code-chip-bg: rgba(63, 210, 255, .08);
  --code-chip-border: rgba(63, 210, 255, .15);
  --featured-a: rgba(63, 210, 255, .09);
  --featured-b: rgba(79, 141, 255, .04);
  --grad-a: #eaf6ff;
  --grad-b: #9be1ff;
  --grad-c: #4f8dff;
  --mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --sans: 'IBM Plex Sans JP', -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
  --display: 'Chakra Petch', var(--mono);
}
:root[data-theme='light'] {${LIGHT_VARS}}
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) {${LIGHT_VARS}}
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: var(--sans);
  color: var(--text);
  line-height: 1.8;
  background:
    radial-gradient(1100px 480px at 50% -120px, var(--hero-glow), transparent 70%),
    var(--bg);
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(#000, transparent 90%);
  -webkit-mask-image: linear-gradient(#000, transparent 90%);
}
::selection { background: var(--selection); }
a { color: var(--cyan); -webkit-tap-highlight-color: transparent; }
button { -webkit-tap-highlight-color: transparent; }
:focus-visible { outline: 2px solid var(--cyan); outline-offset: 2px; border-radius: 4px; }
.wrap { max-width: 1140px; margin: 0 auto; padding: 0 20px; }
.icon { width: 14px; height: 14px; flex: none; }
.skip {
  position: absolute; left: -9999px;
  font-family: var(--mono); font-size: .8rem; font-weight: 600;
}
.skip:focus {
  left: 12px; top: 12px; position: fixed; z-index: 100;
  background: var(--cyan); color: var(--accent-ink); padding: .6em 1.2em; border-radius: 8px;
}

/* ---- header ---- */
.site-header {
  position: sticky; top: 0; z-index: 10;
  background: var(--header-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);
}
.site-header .wrap { display: flex; align-items: center; justify-content: space-between; height: 56px; }
.logo {
  font-family: var(--display); font-weight: 700; font-size: 1.05rem;
  letter-spacing: .04em; color: var(--text); text-decoration: none; white-space: nowrap;
}
.logo .dot { color: var(--cyan); }
.logo .cursor { color: var(--cyan); animation: blink 1.2s steps(1) infinite; }
.site-nav {
  display: flex; align-items: center; gap: .4em;
  font-family: var(--mono); font-size: .78rem; letter-spacing: .08em;
}
.site-nav a { color: var(--dim); text-decoration: none; text-transform: uppercase; }
.site-nav a.textlink { padding: .8em .6em; transition: color .2s ease; }
.site-nav a:hover { color: var(--cyan); }
.site-nav a.active { color: var(--cyan); }
.nav-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 8px; flex: none;
  color: var(--dim); background: none; border: none; cursor: pointer;
  transition: color .2s ease;
}
.nav-icon:hover { color: var(--cyan); }
.nav-icon .icon { width: 16px; height: 16px; }
.theme-toggle .sun, .theme-toggle .moon { display: none; line-height: 0; }
:root:not([data-theme='light']) .theme-toggle .sun { display: inline-flex; }
:root[data-theme='light'] .theme-toggle .moon { display: inline-flex; }
@media (prefers-color-scheme: light) {
  :root:not([data-theme]) .theme-toggle .sun { display: none; }
  :root:not([data-theme]) .theme-toggle .moon { display: inline-flex; }
}

/* ---- hero ---- */
/* Sections that share an element with .wrap must not reset its side padding,
   so vertical rhythm uses longhand padding only */
.hero { padding-top: 64px; padding-bottom: 40px; }
.hero .eyebrow {
  font-family: var(--mono); font-size: .75rem; letter-spacing: .18em;
  color: var(--cyan); text-transform: uppercase; margin: 0 0 .8em;
}
.hero h1 {
  font-family: var(--display); font-weight: 700; text-transform: uppercase;
  font-size: clamp(2.1rem, 6vw, 3.4rem); line-height: 1.05; letter-spacing: .02em;
  margin: 0 0 .35em;
  background: linear-gradient(92deg, var(--grad-a) 10%, var(--grad-b) 45%, var(--grad-c) 90%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero .lede { color: var(--dim); max-width: 40em; margin: 0 0 1.6em; }
.stats { display: flex; flex-wrap: wrap; gap: 10px; }
.stat {
  font-family: var(--mono); font-size: .74rem; letter-spacing: .06em;
  border: 1px solid var(--line-bright); border-radius: 6px;
  padding: .35em .9em; color: var(--dim); background: var(--stat-bg);
}
.stat b { color: var(--cyan); font-weight: 600; margin-left: .5em; }

/* ---- layout ---- */
.cols { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 30px; padding-bottom: 70px; }
@media (max-width: 920px) { .cols { grid-template-columns: 1fr; } }
.section-title {
  font-family: var(--display); font-weight: 600; font-size: .82rem;
  letter-spacing: .2em; text-transform: uppercase; color: var(--dim);
  margin: 3.2em 0 1.2em; display: flex; align-items: center; gap: .7em;
}
.section-title::before { content: '▍'; color: var(--cyan); }
.section-title::after {
  content: ''; flex: 1; height: 1px;
  background: linear-gradient(90deg, var(--line-bright), transparent);
}
.section-title:first-child { margin-top: 0; }

/* ---- cards ---- */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(265px, 1fr)); gap: 16px; }
.card {
  position: relative; display: flex; flex-direction: column; gap: .6em;
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  padding: 18px 20px; cursor: pointer;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  animation: rise .5s cubic-bezier(.2, .7, .3, 1) backwards;
}
.card:hover, .card:focus-within {
  transform: translateY(-3px);
  border-color: var(--accent-border);
  box-shadow: 0 6px 26px var(--glow);
}
.card h2, .card h3 { margin: 0; font-size: 1rem; line-height: 1.55; font-weight: 700; }
.card h2 a, .card h3 a { color: var(--text); text-decoration: none; transition: color .2s ease; }
.card:hover h2 a, .card:hover h3 a { color: var(--cyan); }
.card h2 a::after, .card h3 a::after { content: ''; position: absolute; inset: 0; }
.card .summary {
  margin: 0; font-size: .875rem; color: var(--dim);
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
@media (min-width: 700px) {
  .card.wide { grid-column: span 2; }
  .card.wide .summary { -webkit-line-clamp: 2; }
}
.card.featured {
  border-color: var(--line-bright);
  background: linear-gradient(155deg, var(--featured-a), var(--featured-b) 45%, transparent 75%), var(--panel);
  padding: 26px 28px;
}
.card.featured h2 { font-size: 1.3rem; }
.card.featured .summary { -webkit-line-clamp: unset; font-size: .92rem; }
.featured .corner { position: absolute; width: 14px; height: 14px; border: 2px solid var(--cyan); opacity: .65; }
.featured .corner.tl { top: 9px; left: 9px; border-right: none; border-bottom: none; border-top-left-radius: 3px; }
.featured .corner.br { bottom: 9px; right: 9px; border-left: none; border-top: none; border-bottom-right-radius: 3px; }
.latest-label {
  align-self: flex-start; font-family: var(--mono); font-size: .68rem; font-weight: 600;
  letter-spacing: .16em; color: var(--accent-ink); background: var(--cyan);
  border-radius: 4px; padding: .15em .8em;
}
.meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: .45em 1em;
  font-family: var(--mono); font-size: .72rem; color: var(--dim); letter-spacing: .03em;
}
.src { display: inline-flex; align-items: center; gap: .55em; }
.src i {
  width: 8px; height: 8px; border-radius: 2px; flex: none;
  background: var(--src-color, var(--cyan)); box-shadow: 0 0 8px var(--src-color, var(--cyan));
}
.tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
.tag {
  position: relative; z-index: 2;
  font-family: var(--mono); font-size: .72rem; letter-spacing: .02em;
  color: var(--cyan-soft); text-decoration: none;
  border: 1px solid var(--line); border-radius: 999px; padding: .25em .9em;
  background: var(--tag-bg);
  transition: border-color .2s ease, color .2s ease, background .2s ease;
}
.tag:hover { border-color: var(--cyan); color: var(--cyan); background: var(--tag-bg-hover); }
.tag.big { font-size: .78rem; padding: .35em 1em; }
.tag .n { color: var(--dim); margin-left: .5em; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }

/* ---- sidebar ---- */
.panel {
  background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
  padding: 20px 22px; margin-bottom: 18px;
  animation: rise .5s cubic-bezier(.2, .7, .3, 1) backwards;
}
.panel .section-title { margin: 0 0 1em; }
.panel .tag-row { margin: 0; }
.panel-more {
  display: inline-flex; align-items: center; gap: .4em; margin-top: 1em;
  font-family: var(--mono); font-size: .72rem; letter-spacing: .08em;
  color: var(--dim); text-decoration: none; transition: color .2s ease;
}
.panel-more:hover { color: var(--cyan); }
.src-list { list-style: none; margin: 0; padding: 0; font-size: .82rem; }
.src-list li { display: flex; align-items: center; gap: .6em; padding: .3em 0; color: var(--text); }
.src-list .n { margin-left: auto; font-family: var(--mono); font-size: .72rem; color: var(--dim); }
.about-text { margin: 0; font-size: .82rem; color: var(--dim); }
.about-text b { color: var(--cyan-soft); font-weight: 600; }

/* ---- article page ---- */
.article-wrap { max-width: 760px; margin: 0 auto; padding: 44px 20px 80px; }
.backlink {
  display: inline-flex; align-items: center; gap: .5em;
  font-family: var(--mono); font-size: .76rem; letter-spacing: .08em;
  color: var(--dim); text-decoration: none; padding: .5em 0;
  transition: color .2s ease;
}
.backlink:hover { color: var(--cyan); }
.article-title { font-size: clamp(1.4rem, 4vw, 1.9rem); line-height: 1.45; margin: .7em 0 .8em; }
.article-meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: .6em 1.2em;
  border: 1px solid var(--line); border-radius: 10px; background: var(--panel);
  padding: .7em 1.2em; margin-bottom: 2.5em;
}
.article-meta .spacer { flex: 1; }
.mdlink {
  display: inline-flex; align-items: center; gap: .5em;
  font-family: var(--mono); font-size: .72rem; font-weight: 600; letter-spacing: .06em;
  color: var(--cyan); text-decoration: none;
  border: 1px solid var(--accent-border-soft); border-radius: 6px; padding: .45em .9em;
  transition: background .2s ease;
}
.mdlink:hover { background: var(--tag-bg-hover); }
.srclink {
  display: inline-flex; align-items: center; gap: .4em;
  font-family: var(--mono); font-size: .72rem; color: var(--dim); text-decoration: none;
  padding: .45em 0; transition: color .2s ease;
}
.srclink:hover { color: var(--cyan); }

.prose { font-size: 1rem; }
.prose h2 {
  font-size: 1.25rem; line-height: 1.5; margin: 2.4em 0 .9em;
  padding-bottom: .45em; border-bottom: 1px solid var(--line);
}
.prose h3 { font-size: 1.08rem; margin: 2em 0 .8em; }
.prose h2::before, .prose h3::before {
  font-family: var(--mono); font-weight: 400; color: var(--cyan); opacity: .65;
}
.prose h2::before { content: '## '; }
.prose h3::before { content: '### '; }
.prose p { margin: 1.1em 0; }
.prose strong { color: var(--strong); }
.prose a { text-decoration-color: var(--accent-border-soft); text-underline-offset: 3px; }
.prose code {
  font-family: var(--mono); font-size: .86em; color: var(--cyan-soft);
  background: var(--code-chip-bg); border: 1px solid var(--code-chip-border);
  border-radius: 5px; padding: .08em .45em;
}
.prose pre {
  background: #081020; border: 1px solid #1b2a47; border-radius: 10px;
  padding: 1em 1.3em; overflow-x: auto; line-height: 1.6;
}
.prose pre code { background: none; border: none; padding: 0; color: #c9dcf7; font-size: .84rem; }
.prose blockquote {
  margin: 1.4em 0; padding: .2em 0 .2em 1.1em;
  border-left: 3px solid var(--blue); color: var(--dim);
}
.prose ul, .prose ol { padding-left: 1.6em; }
.prose li { margin: .4em 0; }
.prose li::marker { color: var(--cyan); }
.prose hr { border: none; border-top: 1px solid var(--line); margin: 2.5em 0; }
.prose table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; font-size: .88rem; }
.prose th, .prose td { border: 1px solid var(--line); padding: .5em .9em; text-align: left; }
.prose th { background: var(--panel-2); font-family: var(--mono); font-size: .78rem; }
.prose img { max-width: 100%; border-radius: 10px; }
.pipeline {
  font-family: var(--mono); font-size: .8rem; line-height: 2; color: var(--dim);
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
  padding: 1em 1.3em; overflow-x: auto; white-space: nowrap;
}
.pipeline b { color: var(--cyan); font-weight: 600; }

/* ---- tag page / misc ---- */
.page-head { padding-top: 52px; padding-bottom: 8px; }
.page-head h1 {
  font-family: var(--mono); font-weight: 600; font-size: clamp(1.6rem, 5vw, 2.4rem);
  margin: 0 0 .2em;
  background: linear-gradient(92deg, var(--grad-b), var(--grad-c));
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.page-head .count { font-family: var(--mono); font-size: .8rem; color: var(--dim); letter-spacing: .1em; }
.list-section { padding-top: 26px; padding-bottom: 70px; }
.notfound { text-align: center; padding-top: 120px; padding-bottom: 140px; }
.notfound h1 { font-family: var(--mono); font-size: 2rem; color: var(--cyan); margin: 0 0 .4em; }
.notfound p { color: var(--dim); }

/* ---- footer ---- */
.site-footer { border-top: 1px solid var(--line); padding: 26px 0 40px; }
.site-footer .wrap {
  display: flex; flex-wrap: wrap; gap: .5em 2em; justify-content: space-between;
  font-family: var(--mono); font-size: .72rem; color: var(--dim); letter-spacing: .05em;
}
.site-footer a { color: var(--dim); }
.site-footer a:hover { color: var(--cyan); }

/* ---- small screens ---- */
@media (max-width: 560px) {
  .logo { font-size: .95rem; }
  .site-nav { gap: .1em; font-size: .72rem; letter-spacing: .04em; }
  .site-nav a.textlink { padding: .8em .45em; }
  .nav-icon { width: 34px; height: 34px; }
  .hero { padding-top: 44px; padding-bottom: 32px; }
  .card.featured { padding: 20px 22px; }
}

@keyframes rise { from { opacity: 0; transform: translateY(14px); } }
@keyframes blink { 50% { opacity: 0; } }
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
`

type NavKey = 'posts' | 'tags' | 'about'

type LayoutOpts = {
  title: string
  description?: string
  canonicalPath?: string
  head?: string
  nav?: NavKey
}

function navLink(href: string, label: string, key: NavKey, current?: NavKey): string {
  const active = key === current
  return `<a class="textlink${active ? ' active' : ''}" href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`
}

function layout(opts: LayoutOpts, main: string): string {
  const description = opts.description ?? SITE_DESCRIPTION
  const canonical = opts.canonicalPath ? `${SITE_ORIGIN}${opts.canonicalPath}` : undefined
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="${esc(SITE_TITLE)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">\n<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#040810">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#eef3fa">
<link rel="icon" href="${FAVICON}">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE_TITLE)}" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
${opts.head ?? ''}
<script>${THEME_INIT_SCRIPT}</script>
<style>${STYLE}</style>
</head>
<body>
<a class="skip" href="#main">本文へスキップ</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/">sheechan<span class="dot">.</span>blog<span class="cursor" aria-hidden="true">▍</span></a>
    <nav class="site-nav">
      ${navLink('/', 'Posts', 'posts', opts.nav)}
      ${navLink('/tags', 'Tags', 'tags', opts.nav)}
      ${navLink('/about', 'About', 'about', opts.nav)}
      <a class="nav-icon" href="/feed.xml" aria-label="RSS フィード">${icon('rss')}</a>
      <button class="nav-icon theme-toggle" id="theme-toggle" type="button" aria-label="ライト/ダークテーマ切り替え">
        <span class="sun">${icon('sun')}</span><span class="moon">${icon('moon')}</span>
      </button>
    </nav>
  </div>
</header>
${main}
<footer class="site-footer">
  <div class="wrap">
    <span>${esc(SITE_TITLE)} — auto-generated tech news, written by sheechan</span>
    <span>daily update 10:07 JST / <a href="/feed.xml">RSS</a> / Hono + Cloudflare Workers + D1</span>
  </div>
</footer>
<script>${THEME_TOGGLE_SCRIPT}</script>
</body>
</html>`
}

function tagChip(tag: string, count?: number, big = false): string {
  const n = count !== undefined ? `<span class="n">${count}</span>` : ''
  return `<a class="tag${big ? ' big' : ''}" href="/tags/${encodeURIComponent(tag)}">#${esc(tag)}${n}</a>`
}

function sourceBadge(name: string): string {
  return `<span class="src" style="--src-color:${sourceColor(name)}"><i></i>${esc(name)}</span>`
}

function sourceList(sources: SourceCount[]): string {
  return `<ul class="src-list">
    ${sources.map((s) => `<li><span class="src" style="--src-color:${sourceColor(s.source_name)}"><i></i></span>${esc(s.source_name)}<span class="n">${s.count}</span></li>`).join('\n    ')}
  </ul>`
}

function articleCard(
  r: ArticleListRow,
  index: number,
  opts: { featured?: boolean; wide?: boolean } = {},
): string {
  const { featured = false, wide = false } = opts
  const tags = parseTags(r.tags)
  const chips = tags
    .slice(0, featured || wide ? 8 : 4)
    .map((t) => tagChip(t))
    .join('')
  const delay = Math.min(index * 45, 500)
  const heading = featured ? 'h2' : 'h3'
  const classes = ['card', featured && 'featured', wide && 'wide'].filter(Boolean).join(' ')
  return `
<article class="${classes}" style="animation-delay:${delay}ms">
  ${featured ? '<span class="corner tl" aria-hidden="true"></span><span class="corner br" aria-hidden="true"></span><span class="latest-label">LATEST</span>' : ''}
  <${heading}><a href="/posts/${esc(r.slug)}">${esc(r.title)}</a></${heading}>
  <p class="meta">${sourceBadge(r.source_name)}<span>${esc(fmtDate(r.published_at))}</span></p>
  <p class="summary">${esc(r.summary)}</p>
  ${chips ? `<p class="tag-row">${chips}</p>` : ''}
</article>`
}

export function renderIndexPage(
  rows: ArticleListRow[],
  tags: TagCount[],
  sources: SourceCount[],
): string {
  const totalArticles = sources.reduce((sum, s) => sum + s.count, 0)
  const [latest, ...rest] = rows

  const hero = `
<section class="hero wrap">
  <p class="eyebrow">// daily tech report — fully automated</p>
  <h1>Sheechan<br>Tech Report</h1>
  <p class="lede">${esc(SITE_DESCRIPTION)}だよ。むずかしいニュースも、しぃちゃんと一緒ならこわくない!</p>
  <div class="stats">
    <span class="stat">ARTICLES<b>${totalArticles}</b></span>
    <span class="stat">SOURCES<b>${sources.length}</b></span>
    <span class="stat">UPDATE<b>10:07 JST</b></span>
  </div>
</section>`

  // Bento rhythm: every fifth grid card stretches to a full row
  const mainCol = latest
    ? `
<h2 class="section-title">Latest Post</h2>
${articleCard(latest, 0, { featured: true })}
${
  rest.length
    ? `<h2 class="section-title">All Posts</h2>
<div class="card-grid">${rest.map((r, i) => articleCard(r, i + 1, { wide: i % 5 === 3 })).join('\n')}</div>`
    : ''
}`
    : '<p>まだ記事がありません。</p>'

  const sideCol = `
<div class="panel" id="tags" style="animation-delay:120ms">
  <h2 class="section-title">Tags</h2>
  <p class="tag-row">${tags.map((t) => tagChip(t.tag, t.count)).join('')}</p>
  <a class="panel-more" href="/tags">ALL TAGS ${icon('arrow-up-right')}</a>
</div>
<div class="panel" style="animation-delay:200ms">
  <h2 class="section-title">Sources</h2>
  ${sourceList(sources)}
</div>
<div class="panel" style="animation-delay:280ms">
  <h2 class="section-title">About</h2>
  <p class="about-text">このブログは全自動。<b>しぃちゃん</b>が毎日 10:07 JST にテックソースを巡回して、新着ニュースをわかりやすい日本語で紹介しているよ。記事 URL の末尾に <b>.md</b> を付けると Markdown 原文がそのまま読めるからね!</p>
  <a class="panel-more" href="/about">MORE ${icon('arrow-up-right')}</a>
</div>`

  return layout(
    { title: SITE_TITLE, canonicalPath: '/', nav: 'posts' },
    `${hero}\n<div class="cols wrap"><main id="main">${mainCol}</main><aside>${sideCol}</aside></div>`,
  )
}

export function renderTagsIndexPage(tags: TagCount[], sources: SourceCount[]): string {
  const totalArticles = sources.reduce((sum, s) => sum + s.count, 0)
  const maxCount = tags[0]?.count ?? 1
  const cloud = tags
    .map((t) => {
      const size = (0.75 + (t.count / maxCount) * 0.5).toFixed(2)
      return `<a class="tag big" style="font-size:${size}rem" href="/tags/${encodeURIComponent(t.tag)}">#${esc(t.tag)}<span class="n">${t.count}</span></a>`
    })
    .join('')
  const main = `
<section class="page-head wrap">
  <h1>TAGS</h1>
  <p class="count">${tags.length} TAGS / ${totalArticles} POSTS</p>
</section>
<section class="list-section wrap" id="main">
  <div class="tag-cloud">${cloud}</div>
</section>`
  return layout(
    { title: `Tags | ${SITE_TITLE}`, description: 'タグ一覧', canonicalPath: '/tags', nav: 'tags' },
    main,
  )
}

export function renderTagPage(tag: string, rows: ArticleListRow[]): string {
  const main = `
<section class="page-head wrap">
  <p><a class="backlink" href="/tags">${icon('arrow-left')}TAGS</a></p>
  <h1>#${esc(tag)}</h1>
  <p class="count">${rows.length} POST${rows.length === 1 ? '' : 'S'}</p>
</section>
<section class="list-section wrap" id="main">
  <div class="card-grid">${rows.map((r, i) => articleCard(r, i)).join('\n')}</div>
</section>`
  return layout(
    {
      title: `#${tag} | ${SITE_TITLE}`,
      description: `タグ「${tag}」の記事一覧`,
      canonicalPath: `/tags/${encodeURIComponent(tag)}`,
      nav: 'tags',
    },
    main,
  )
}

export function renderAboutPage(sources: SourceCount[]): string {
  const totalArticles = sources.reduce((sum, s) => sum + s.count, 0)
  const main = `
<div class="article-wrap" id="main">
  <p><a class="backlink" href="/">${icon('arrow-left')}INDEX</a></p>
  <article>
    <h1 class="article-title">このブログについて</h1>
    <div class="prose">
      <p>「${esc(SITE_TITLE)}」は、AWS・Cloudflare・OpenAI・Anthropic などのテックニュースを毎日お届けする<strong>全自動運営</strong>のブログだよ。新着のチェックから記事の執筆・公開まで、ぜんぶ自動で動いているの。いまは ${sources.length} ソースから ${totalArticles} 本の記事を公開中!</p>
      <h2>しぃちゃんについて</h2>
      <p>記事を書いているのは「しぃちゃん」。元気いっぱいだけど、技術的な正確さにはこだわる案内役だよ。むずかしい発表も「なにが発表されたの?」「今までどうだったの?」「これからどうなるの?」の流れでかみくだいて、最後の Dive Deep でしっかり深掘りするスタイルなの。</p>
      <h2>仕組み</h2>
      <div class="pipeline">GitHub Actions <b>(毎日 10:07 JST)</b> → 各ソースの新着チェック → 記事の自動生成 → OIDC 認証つき API で入稿 → <b>Cloudflare D1</b> に保存 → <b>Cloudflare Workers</b> が配信</div>
      <p>入稿 API は GitHub Actions の OIDC トークンでしか呼び出せないようにしているから、第三者が勝手に記事を投稿することはできないよ。</p>
      <h2>Markdown でも読めるよ</h2>
      <p>記事 URL の末尾に <code>.md</code> を付けると、front matter つきの Markdown 原文がそのまま返ってくるの。エディタで読みたいときや、AI に渡したいときに便利だよ。</p>
      <pre><code>curl ${esc(SITE_ORIGIN)}/posts/&lt;slug&gt;.md</code></pre>
      <h2>巡回中のソース</h2>
      ${sourceList(sources)}
      <p>更新情報は RSS(<a href="/feed.xml">/feed.xml</a>)でも配信しているよ。それじゃあ、また記事で会おうね!</p>
    </div>
  </article>
</div>`
  return layout(
    {
      title: `About | ${SITE_TITLE}`,
      description: `${SITE_TITLE} の紹介: 全自動テックニュースブログの仕組み`,
      canonicalPath: '/about',
      nav: 'about',
    },
    main,
  )
}

export async function renderArticlePage(row: ArticleRow): Promise<string> {
  // body_md was validated HTML-free at ingest, so the only HTML here comes from marked
  const bodyHtml = await marked.parse(row.body_md)
  const tags = parseTags(row.tags)
  const mdPath = `/posts/${row.slug}.md`
  const main = `
<div class="article-wrap" id="main">
  <p><a class="backlink" href="/">${icon('arrow-left')}INDEX</a></p>
  <article>
    <h1 class="article-title">${esc(row.title)}</h1>
    <div class="article-meta">
      <p class="meta" style="margin:0">${sourceBadge(row.source_name)}<span>${esc(fmtDate(row.published_at))}</span></p>
      ${tags.map((t) => tagChip(t)).join('')}
      <span class="spacer"></span>
      <a class="srclink" href="${esc(row.source_url)}" rel="noopener">原文${icon('arrow-up-right')}</a>
      <a class="mdlink" href="${esc(mdPath)}">${icon('file-code')}RAW .md</a>
    </div>
    <div class="prose">${bodyHtml}</div>
  </article>
</div>`
  return layout(
    {
      title: `${row.title} | ${SITE_TITLE}`,
      description: row.summary,
      canonicalPath: `/posts/${row.slug}`,
      head: `<link rel="alternate" type="text/markdown" href="${esc(mdPath)}">`,
      nav: 'posts',
    },
    main,
  )
}

export function renderArticleMarkdown(row: ArticleRow): string {
  const tags = parseTags(row.tags)
  return [
    '---',
    `title: ${JSON.stringify(row.title)}`,
    `source: ${JSON.stringify(row.source_name)}`,
    `source_url: ${row.source_url}`,
    `published_at: ${row.published_at}`,
    `tags: ${JSON.stringify(tags)}`,
    '---',
    '',
    `# ${row.title}`,
    '',
    row.body_md.trim(),
    '',
  ].join('\n')
}

export function renderRssFeed(rows: ArticleListRow[]): string {
  const items = rows
    .map(
      (r) => `  <item>
    <title>${esc(r.title)}</title>
    <link>${SITE_ORIGIN}/posts/${esc(r.slug)}</link>
    <guid isPermaLink="true">${SITE_ORIGIN}/posts/${esc(r.slug)}</guid>
    <description>${esc(r.summary)}</description>
    <pubDate>${new Date(r.published_at).toUTCString()}</pubDate>
${parseTags(r.tags)
  .map((t) => `    <category>${esc(t)}</category>`)
  .join('\n')}
  </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(SITE_TITLE)}</title>
  <link>${SITE_ORIGIN}/</link>
  <atom:link href="${SITE_ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>${esc(SITE_DESCRIPTION)}</description>
  <language>ja</language>
${rows[0] ? `  <lastBuildDate>${new Date(rows[0].published_at).toUTCString()}</lastBuildDate>\n` : ''}${items}
</channel>
</rss>`
}

export function renderNotFoundPage(): string {
  return layout(
    { title: `404 | ${SITE_TITLE}` },
    `<div class="notfound wrap" id="main">
  <h1>404 // NOT FOUND</h1>
  <p>ごめんね、このページは見つからなかったよ。</p>
  <p><a class="backlink" href="/">${icon('arrow-left')}INDEX</a></p>
</div>`,
  )
}
