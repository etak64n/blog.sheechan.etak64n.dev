// Page shell: theme scripts, CSP, site header/footer, and the layout() wrapper.

import { type Lang, T } from './i18n'
import { STYLE } from './styles'
import { FAVICON, GITHUB_BLOG, GITHUB_CREATOR, GITHUB_REPORTER, SITE_ORIGIN, basePath, esc, icon } from './helpers'

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.dataset.theme = saved;
    }
  } catch (e) {}
})();
`

export const THEME_TOGGLE_SCRIPT = `
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
(function () {
  var links = document.querySelectorAll('.toc a[data-toc]');
  if (!links.length || !('IntersectionObserver' in window)) return;
  var byId = {};
  var heads = [];
  links.forEach(function (a) {
    var id = a.getAttribute('data-toc');
    byId[id] = a;
    var el = document.getElementById(id);
    if (el) heads.push(el);
  });
  var current = null;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        if (current) current.classList.remove('active');
        current = byId[e.target.id];
        if (current) current.classList.add('active');
      }
    });
  }, { rootMargin: '-80px 0px -72% 0px', threshold: 0 });
  heads.forEach(function (h) { obs.observe(h); });
})();
`

// Strict CSP owned by the Worker (version-controlled, portable, and — unlike a
// zone-level policy with 'unsafe-inline' — an actual XSS backstop). The two
// inline scripts are allowed by their SHA-256 hashes, computed from the script
// constants at runtime so they can never drift. Inline styles keep
// 'unsafe-inline' (hashing style attributes is impractical and CSS can't
// execute JS). Memoized after first computation.
export async function sha256Base64(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  let bin = ''
  for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b)
  return btoa(bin)
}

export let cspCache: string | undefined
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

export type NavKey = 'posts' | 'index' | 'popular' | 'tags' | 'archive' | 'about'

export type LayoutOpts = {
  title: string
  description?: string
  canonicalPath?: string
  ogImage?: string
  head?: string
  nav?: NavKey
  lang: Lang
}

export function navLink(base: string, path: string, label: string, key: NavKey, current?: NavKey): string {
  const active = key === current
  return `<a class="textlink${active ? ' active' : ''}" href="${base}${path}"${active ? ' aria-current="page"' : ''}>${label}</a>`
}

export function layout(opts: LayoutOpts, main: string): string {
  const { lang } = opts
  const t = T[lang]
  const base = basePath(lang)
  const description = opts.description ?? t.desc
  const path = opts.canonicalPath ?? '/'
  const ogImage = opts.ogImage ? `${SITE_ORIGIN}${opts.ogImage}` : `${SITE_ORIGIN}/og.png`
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
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="${esc(t.siteName)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'ja_JP'}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(opts.title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(ogImage)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" hreflang="ja" href="${esc(jaUrl)}">
<link rel="alternate" hreflang="en" href="${esc(enUrl)}">
<link rel="alternate" hreflang="x-default" href="${esc(jaUrl)}">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0F1B33">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#F8FBFF">
<link rel="icon" href="${FAVICON}">
<link rel="alternate" type="application/rss+xml" title="${esc(t.siteName)}" href="${base}/feed.xml">
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
    <a class="logo" href="${base}/" aria-label="${esc(t.siteName)}">
      <img class="logo-img logo-for-light" src="/logo-title.webp" width="1395" height="240" alt="${esc(t.siteName)}" fetchpriority="high" decoding="async">
      <img class="logo-img logo-for-dark" src="/logo-title-dark.webp" width="1395" height="240" alt="" aria-hidden="true" fetchpriority="high" decoding="async">
    </a>
    <div class="nav-right">
      <nav class="site-nav" id="site-nav" aria-label="Site navigation">
        ${navLink(base, '/posts', 'Posts', 'posts', opts.nav)}
        ${navLink(base, '/list', 'Index', 'index', opts.nav)}
        ${navLink(base, '/popular', 'Popular', 'popular', opts.nav)}
        ${navLink(base, '/tags', 'Tags', 'tags', opts.nav)}
        ${navLink(base, '/archive', 'Archive', 'archive', opts.nav)}
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
    <div class="wrap footer-grid">
      <div class="fcol fcol-brand">
        <a class="fbrand" href="${base}/" aria-label="${esc(t.siteName)}">
          <img class="logo-img" src="/logo-title-dark.webp" width="1395" height="240" alt="${esc(t.siteName)}" loading="lazy" decoding="async">
        </a>
        <p class="ftag">${esc(t.footerTag)}</p>
      </div>
      <nav class="fcol" aria-label="Explore">
        <h2 class="fhead">Explore</h2>
        <ul>
          <li><a href="${base}/">Home</a></li>
          <li><a href="${base}/posts">Posts</a></li>
          <li><a href="${base}/list">Index</a></li>
          <li><a href="${base}/tags">Tags</a></li>
          <li><a href="${base}/archive">Archive</a></li>
          <li><a href="${base}/search">Search</a></li>
          <li><a href="${base}/feed.xml">RSS</a></li>
          <li><a href="${base}/about">About</a></li>
        </ul>
      </nav>
      <nav class="fcol" aria-label="GitHub">
        <h2 class="fhead">GitHub</h2>
        <ul>
          <li><a href="${GITHUB_BLOG}" rel="noopener">blog</a></li>
          <li><a href="${GITHUB_REPORTER}" rel="noopener">reporter</a></li>
        </ul>
      </nav>
      <nav class="fcol" aria-label="Creator">
        <h2 class="fhead">Creator</h2>
        <ul>
          <li><a href="${GITHUB_CREATOR}" rel="noopener">etak64n</a></li>
        </ul>
      </nav>
    </div>
    <div class="wrap fbar">
      <span>© shiichan blog</span>
    </div>
  </div>
</footer>
<script>${THEME_TOGGLE_SCRIPT}</script>
</body>
</html>`
}

