// Design-system CSS (light-first, theme-aware). Inlined into <style> by layout().
// Split out of render.ts to keep styling separate from markup logic.

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

export const STYLE = `
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
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
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
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 0; }
.wrap { width: 100%; max-width: 1140px; margin: 0 auto; padding: 0 20px; min-width: 0; }
.icon { width: 15px; height: 15px; flex: none; }
.skip { position: absolute; left: -9999px; font-family: var(--mono); font-size: .8rem; font-weight: 600; }
.skip:focus {
  left: 12px; top: 12px; position: fixed; z-index: 100;
  background: var(--primary); color: var(--on-primary); padding: .6em 1.2em; border-radius: 0;
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
  border: 1.5px solid var(--line-strong); border-radius: 0;
  background: var(--surface-2); padding: 2px;
  font-family: var(--mono); font-size: .68rem; font-weight: 700; letter-spacing: .02em;
}
.lang-switch a {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 26px; padding: .3em .55em; border-radius: 0;
  color: var(--muted); text-decoration: none;
  transition: color .15s ease, background .15s ease;
}
.lang-switch a:not(.on):hover { color: var(--primary); }
.lang-switch a.on { color: var(--on-primary); background: var(--primary); box-shadow: var(--shadow-soft); }
.site-nav { display: flex; align-items: center; gap: .3em; font-family: var(--sans); font-size: .9rem; }
.site-nav a { color: var(--muted); text-decoration: none; font-weight: 500; }
.site-nav a.textlink { padding: .6em .7em; border-radius: 0; transition: color .15s ease, background .15s ease; }
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
  width: 38px; height: 38px; border-radius: 0; flex: none;
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
  border: 1.5px solid var(--line-strong); border-radius: 0;
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
  border: 1px solid var(--line); border-radius: 0; padding: .1em .45em; background: var(--surface-2);
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
/* Categories (sources) and tags: single horizontally-scrollable rows */
.hero-cats, .hero-tags {
  display: flex; flex-wrap: nowrap; gap: 8px;
  overflow-x: auto; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch;
  scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent;
}
.hero-cats { margin-bottom: 8px; }
.hero-tags { padding-bottom: 8px; }
.hero-cats::-webkit-scrollbar, .hero-tags::-webkit-scrollbar { height: 6px; }
.hero-cats::-webkit-scrollbar-thumb, .hero-tags::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 0; }
.hero-cats::-webkit-scrollbar-track, .hero-tags::-webkit-scrollbar-track { background: transparent; }
.hero-tags .tag { flex: none; }
.cat {
  flex: none; display: inline-flex; align-items: center; gap: .5em;
  font-family: var(--mono); font-size: .74rem; font-weight: 600; white-space: nowrap;
  color: var(--text); text-decoration: none;
  border: 1px solid var(--line-strong); border-radius: 0; padding: .3em .9em;
  background: var(--surface); transition: border-color .15s ease, color .15s ease;
}
.cat i { width: 8px; height: 8px; border-radius: 0; flex: none; background: var(--src-color, var(--accent)); }
.cat:hover { border-color: var(--accent); color: var(--primary); }
.cat .n { color: var(--muted); }

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
.day-link { color: inherit; text-decoration: none; transition: color .15s ease; }
.day-link:hover { color: var(--primary); }

/* ---- home: day rows (main) + Hot Topics rail ---- */
.home-cols {
  display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 34px;
  padding: 6px 0 60px; align-items: start;
}
.home-main-col { min-width: 0; }
.day-block + .day-block { margin-top: 22px; }
/* the day heading drives its own top space; keep it tight on the home rows */
.day-block .section-title { margin: 1.1em 0 .8em; }
.day-block:first-child .section-title { margin-top: .2em; }
.day-row {
  display: flex; gap: 18px; overflow-x: auto; padding: 4px 2px 12px;
  scroll-snap-type: x proximity; overscroll-behavior-x: contain; -webkit-overflow-scrolling: touch;
  scrollbar-width: thin; scrollbar-color: var(--line-strong) transparent;
}
.day-row::-webkit-scrollbar { height: 8px; }
.day-row::-webkit-scrollbar-thumb { background: var(--line-strong); }
.day-row::-webkit-scrollbar-track { background: transparent; }
/* 3 cards across the main column; scroll horizontally for the rest of the day */
.day-row > .card { flex: 0 0 calc((100% - 2 * 18px) / 3); min-width: 232px; scroll-snap-align: start; }
.day-more { display: none; }
/* Hot Topics rail */
.home-rail { min-width: 0; }
.hot-topics { position: sticky; top: 76px; }
.hot-head::before { display: none; }
.hot-head .icon { width: 20px; height: 20px; color: var(--accent); }
.hot-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.hot-item { border-top: 1px solid var(--line); }
.hot-item:first-child { border-top: none; }
.hot-item a {
  display: flex; flex-direction: column; gap: 7px; align-items: flex-start;
  min-width: 0; padding: 13px 0; text-decoration: none; color: var(--heading);
}
.hot-cat {
  display: inline-flex; align-items: center; gap: .45em;
  font-family: var(--mono); font-size: .68rem; font-weight: 700; white-space: nowrap;
  color: var(--text); border: 1px solid var(--line-strong); padding: .22em .7em; background: var(--surface);
}
.hot-cat i { width: 7px; height: 7px; flex: none; background: var(--src-color, var(--accent)); }
.hot-title {
  max-width: 100%; min-width: 0;
  font-family: var(--display); font-weight: 700; font-size: .92rem; line-height: 1.4;
  word-break: auto-phrase; overflow-wrap: anywhere; transition: color .15s ease;
}
.hot-item a:hover .hot-title { color: var(--primary); }
.hot-meta {
  display: flex; align-items: center; justify-content: space-between; gap: .5em; width: 100%;
  font-family: var(--mono); font-size: .72rem; color: var(--muted);
}
.hot-meta .stars { font-size: 1rem; }
.hot-date { color: var(--muted); }
@media (max-width: 900px) {
  .home-cols { grid-template-columns: 1fr; gap: 40px; }
  .hot-topics { position: static; }
}
/* Small screens: stop the horizontal scroll — show the first few and a "more" link */
@media (max-width: 640px) {
  .day-row { flex-direction: column; overflow: visible; gap: 14px; padding: 4px 0 0; }
  .day-row > .card { flex: none; min-width: 0; width: 100%; }
  .day-row > .card:nth-child(n + 4) { display: none; }
  .day-more { display: block; }
}

/* ---- cards (thumbnail + genre tag + title + meta, per design-system) ---- */
.card-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
@media (max-width: 1000px) { .card-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 720px) { .card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 460px) { .card-grid { grid-template-columns: 1fr; } }
.card {
  position: relative; display: flex; flex-direction: column;
  background: var(--surface); border: 1px solid var(--line); border-radius: 0;
  overflow: hidden; cursor: pointer; box-shadow: var(--shadow-soft);
  transition: transform .15s ease, box-shadow .15s ease;
  animation: rise .5s ease backwards;
}
.card:hover, .card:focus-within { transform: translateY(-4px); box-shadow: var(--shadow-lift); }
.thumb {
  position: relative; aspect-ratio: 16 / 9; overflow: hidden;
  background: linear-gradient(140deg, var(--thumb-a, var(--sky)), var(--thumb-b, var(--aqua)));
}
.thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.thumb .latest-label {
  position: absolute; top: 12px; left: 12px;
  font-family: var(--mono); font-size: .64rem; font-weight: 700; letter-spacing: .14em;
  color: var(--on-primary); background: var(--primary); border-radius: 0; padding: .25em 1em;
}
.card-body { display: flex; flex-direction: column; gap: .5em; padding: 14px 18px 18px; flex: 1; }
.card-body h2, .card-body h3 {
  margin: 0; font-family: var(--display); font-size: 1.05rem; line-height: 1.5; font-weight: 700;
}
.card-body h2 a, .card-body h3 a { color: var(--heading); text-decoration: none; transition: color .15s ease; }
.card:hover .card-body h2 a, .card:hover .card-body h3 a { color: var(--primary); }
.card-body h2 a::after, .card-body h3 a::after { content: ''; position: absolute; inset: 0; }
.card-meta {
  display: flex; align-items: center; justify-content: space-between; gap: .5em;
  margin-top: auto; padding-top: .5em;
  font-family: var(--mono); font-size: .72rem; color: var(--muted);
}
.card-date { color: var(--muted); }
.stars { color: #F5A623; letter-spacing: 1.5px; font-size: .9rem; line-height: 1; white-space: nowrap; }
.card .stars { font-size: 1.15rem; }
.card .summary {
  margin: 0; font-size: .86rem; color: var(--muted);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.genre-tag {
  align-self: flex-start; font-family: var(--mono); font-size: .72rem; font-weight: 600;
  color: var(--brand, var(--primary));
  background: color-mix(in srgb, var(--brand, var(--accent)) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--brand, var(--accent)) 38%, transparent);
  border-radius: 0; padding: .18em .7em;
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
  border: 1px solid var(--line-strong); border-radius: 0; padding: .22em .8em;
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
.src i { width: 8px; height: 8px; border-radius: 0; flex: none; background: var(--src-color, var(--accent)); }
.card mark { background: var(--sel); color: inherit; border-radius: 0; padding: 0 .12em; }

/* ---- sidebar ---- */
.panel {
  background: var(--surface); border: 1px solid var(--line); border-radius: 0;
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
.pagination {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  margin-top: 40px; font-family: var(--mono); font-size: .82rem;
}
.pg-btn {
  display: inline-flex; align-items: center; gap: .4em;
  color: var(--primary); text-decoration: none; font-weight: 600;
  border: 1.5px solid var(--line-strong); border-radius: 0; padding: .5em 1.2em;
  background: var(--surface); transition: background .15s ease, border-color .15s ease;
}
.pg-btn:hover { background: var(--tag-bg); border-color: var(--accent); }
.pg-btn.disabled { color: var(--muted); opacity: .45; pointer-events: none; }
.pg-info { color: var(--muted); }

/* ---- about hero ---- */
.about-hero { display: flex; align-items: center; gap: 26px; margin-bottom: 8px; }
.about-avatar {
  width: 150px; height: 150px; flex: none; border-radius: 0; object-fit: cover;
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
  border-radius: 0; background: var(--surface); box-shadow: var(--shadow-soft);
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
  font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.4; margin: .6em 0 .7em;
  /* break at natural Japanese phrase boundaries instead of mid-word */
  word-break: auto-phrase; line-break: strict;
}
.article-meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: .6em 1em; margin: 0 0 1.4em;
}
.article-meta .spacer { flex: 1; }
.meta-date { font-family: var(--mono); font-size: .74rem; color: var(--muted); }
.metabtn {
  display: inline-flex; align-items: center; gap: .45em;
  font-family: var(--mono); font-size: .72rem; font-weight: 700; color: var(--primary); text-decoration: none;
  border: 1.5px solid var(--line-strong); padding: .4em 1em;
  transition: background .15s ease, border-color .15s ease, color .15s ease;
}
.metabtn:hover { background: var(--tag-bg); border-color: var(--accent); }
/* External-link "blog card" pointing to the original announcement (after the greeting) */
.linkcard {
  display: flex; align-items: stretch; gap: 16px; margin: 10px 0 26px; min-height: 116px;
  border: 1px solid var(--line); background: var(--surface); overflow: hidden;
  text-decoration: none; color: var(--text);
  transition: border-color .15s ease, box-shadow .15s ease;
}
.linkcard:hover { border-color: var(--accent); box-shadow: var(--shadow-soft); }
.linkcard-body {
  display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1;
  padding: 16px 4px 16px 18px; justify-content: center;
}
.linkcard-title {
  display: flex; align-items: center; gap: .4em;
  font-family: var(--display); font-weight: 700; font-size: 1rem; color: var(--heading);
}
.linkcard-title svg { width: 14px; height: 14px; flex: none; color: var(--muted); }
.linkcard:hover .linkcard-title svg { color: var(--primary); }
.linkcard-host {
  display: flex; align-items: center; gap: .45em;
  font-family: var(--mono); font-size: .74rem; color: var(--muted);
  overflow: hidden; white-space: nowrap;
}
.linkcard-host > span { overflow: hidden; text-overflow: ellipsis; }
.linkcard-favicon { width: 16px; height: 16px; flex: none; border-radius: 3px; }
/* Open Graph preview image (the link-embed thumbnail). ~2:1 like most OG images,
   so the whole picture shows with minimal cropping. */
.linkcard-thumb { flex: none; width: 224px; align-self: stretch; overflow: hidden; background: var(--surface-2); }
.linkcard-thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
/* Vendor-logo fallback when no OG image is cached */
.linkcard-logo {
  flex: none; width: 132px; align-self: stretch; display: flex; align-items: center; justify-content: center;
  padding: 14px; background: var(--surface-2); border-left: 1px solid var(--line);
}
.linkcard-logo img { display: block; width: 48px; height: 48px; object-fit: contain; }
@media (max-width: 480px) {
  .linkcard { min-height: 96px; }
  .linkcard-thumb { width: 140px; }
  .linkcard-logo { width: 96px; padding: 10px; }
  .linkcard-logo img { width: 40px; height: 40px; }
}

/* ---- article: ToC sidebar + hero + tags ---- */
.article-layout { max-width: 1140px; margin: 0 auto; padding: 18px 20px 80px; }
.article-layout.has-toc {
  display: grid; grid-template-columns: 200px minmax(0, 760px);
  gap: 40px; justify-content: center; align-items: start;
}
.article-col { min-width: 0; }
.article-layout:not(.has-toc) .article-col { max-width: 760px; margin: 0 auto; }
.article-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: 0;
  padding: 28px 32px 44px; box-shadow: var(--shadow-soft); margin-top: .4em;
}
/* Related posts sit below everything, spanning the full width under the ToC */
.related { margin-top: 44px; }
.related .section-title { margin-top: 0; }
.article-layout.has-toc > .related { grid-column: 1 / -1; }
.article-layout:not(.has-toc) > .related { max-width: 760px; margin-left: auto; margin-right: auto; }
@media (max-width: 1080px) {
  .article-layout > .related { max-width: 760px; margin-left: auto; margin-right: auto; }
}
@media (max-width: 560px) {
  .article-card { padding: 20px 20px 32px; border-radius: 0; }
}
.toc { position: sticky; top: 76px; align-self: start; }
.toc-title {
  font-family: var(--display); font-weight: 700; font-size: .82rem;
  color: var(--heading); margin: 0 0 .6em; letter-spacing: .04em;
}
.toc ul { list-style: none; margin: 0; padding: 0; }
.toc a {
  display: block; color: var(--muted); text-decoration: none;
  font-size: .85rem; line-height: 1.5; padding: .35em 0 .35em .9em;
  border-left: 2px solid var(--line); transition: color .15s ease, border-color .15s ease;
}
.toc a:hover { color: var(--primary); }
.toc a.active { color: var(--primary); border-left-color: var(--primary); font-weight: 600; }
.toc-h3 a { padding-left: 1.7em; font-size: .8rem; }
.article-hero {
  position: relative; border-radius: 0; overflow: hidden;
  margin-bottom: 22px; box-shadow: var(--shadow-soft); border: 1px solid var(--line);
}
.article-hero img { display: block; width: 100%; height: auto; }
.article-hero-src {
  position: absolute; top: 14px; left: 16px;
  font-family: var(--mono); font-size: .72rem; font-weight: 700; color: var(--brand, var(--primary));
  background: rgba(255, 255, 255, .9); border-radius: 0; padding: .25em .9em;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .12);
}
.article-tags { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 2.4em; }
@media (max-width: 1080px) {
  .article-layout.has-toc { display: block; }
  .toc { display: none; }
  .article-col { max-width: 760px; margin: 0 auto; }
}

.prose { font-size: 1rem; }
.prose h2 {
  font-family: var(--display); font-weight: 700; color: var(--heading);
  font-size: 1.3rem; line-height: 1.5; margin: 2.4em 0 .8em; padding-bottom: .4em;
  border-bottom: 2px solid var(--line); scroll-margin-top: 76px;
}
.prose h3 { font-family: var(--display); font-weight: 700; color: var(--heading); font-size: 1.1rem; margin: 2em 0 .7em; scroll-margin-top: 76px; }
.prose p { margin: 1.1em 0; }
.prose strong { color: var(--heading); font-weight: 700; }
.prose a { color: var(--primary); text-underline-offset: 3px; text-decoration-color: var(--accent); }
.prose a:hover { text-decoration-style: wavy; }
.prose code {
  font-family: var(--mono); font-size: .86em; color: var(--primary);
  background: color-mix(in srgb, var(--sky) 22%, transparent);
  border-radius: 0; padding: .08em .45em;
}
.prose pre {
  background: var(--code-bg); border-radius: 0; padding: 1em 1.3em; overflow-x: auto;
  line-height: 1.7; box-shadow: var(--shadow-soft);
}
.prose pre code { background: none; padding: 0; color: var(--code-text); font-size: .86rem; }
.prose blockquote {
  margin: 1.4em 0; padding: .6em 1.1em; border-left: 3px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent); color: var(--muted); border-radius: 0;
}
.prose ul, .prose ol { padding-left: 1.6em; }
.prose li { margin: .4em 0; }
.prose li::marker { color: var(--accent); }
.prose hr { border: none; border-top: 1px solid var(--line); margin: 2.5em 0; }
.prose table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; font-size: .88rem; }
.prose th, .prose td { border: 1px solid var(--line); padding: .5em .9em; text-align: left; }
.prose th { background: var(--surface-2); font-family: var(--mono); font-size: .78rem; color: var(--heading); }
.prose img { max-width: 100%; border-radius: 0; }

/* ---- search page ---- */
.search-form {
  display: flex; align-items: center; gap: .7em; max-width: 640px;
  border: 1.5px solid var(--line-strong); border-radius: 0; background: var(--surface);
  padding: 0 1.1em; height: 54px; margin-bottom: 34px; box-shadow: var(--shadow-soft);
  transition: border-color .15s ease;
}
.search-form:focus-within { border-color: var(--accent); }
.search-form .icon { width: 18px; height: 18px; color: var(--muted); }
.search-form .hs-input { font-size: 1rem; height: 100%; }
.search-btn {
  font-family: var(--sans); font-size: .82rem; font-weight: 700; color: var(--on-primary);
  background: var(--primary); border: none; border-radius: 0; padding: .55em 1.4em; cursor: pointer;
  transition: background .15s ease, transform .15s ease;
}
.search-btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
.search-hint { color: var(--muted); font-size: .9rem; }

/* ---- archive ---- */
.month-list { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
.month-list a {
  display: flex; align-items: baseline; gap: .8em; background: var(--surface);
  border: 1px solid var(--line); border-radius: 0; padding: 1em 1.3em; text-decoration: none;
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
.page-head .src-head { margin: 0 0 .3em; }
.list-section { padding-top: 24px; padding-bottom: 64px; }
.notfound { text-align: center; padding-top: 100px; padding-bottom: 130px; }
.notfound h1 { font-family: var(--display); font-size: 2rem; color: var(--primary); margin: 0 0 .4em; }
.notfound p { color: var(--muted); }

/* ---- footer ---- */
.site-footer { margin-top: auto; }
.footer-wave { display: block; width: 100%; height: 16px; color: var(--navy); }
.footer-inner { background: var(--navy); color: #EAF3FE; padding: 26px 0 14px; }
.footer-grid {
  display: grid; grid-template-columns: 1.6fr repeat(3, 1fr); gap: 18px 28px; align-items: start;
}
.fcol-brand { max-width: 340px; }
.footer-inner .fbrand {
  display: inline-flex; align-items: center; gap: .5em; color: #FFFFFF;
  font-family: var(--display); font-weight: 700; font-size: 1.1rem; text-decoration: none;
}
.footer-inner .fbrand .wave-mark { width: 26px; height: 16px; color: #EAF3FE; }
.footer-inner .ftag { margin: 8px 0 0; color: #A9C4EE; font-size: .8rem; line-height: 1.5; }
.fhead {
  margin: 0 0 9px; font-family: var(--mono); font-size: .72rem; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase; color: #7FA9E6;
}
.fcol ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; line-height: 1.3; }
.footer-inner a { color: #D6E6FB; text-decoration: none; font-size: .86rem; line-height: 1.3; transition: color .15s ease; }
.footer-inner a:hover { color: #FFFFFF; text-decoration: underline; text-underline-offset: 3px; }
.fbar {
  display: flex; flex-wrap: wrap; gap: .5em 1.6em; justify-content: space-between; align-items: center;
  margin-top: 18px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, .14);
  font-family: var(--mono); font-size: .72rem; color: #7FA9E6;
}
@media (max-width: 640px) {
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .fcol-brand { grid-column: 1 / -1; max-width: none; }
}

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
