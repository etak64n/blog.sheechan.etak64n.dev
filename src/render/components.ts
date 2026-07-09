// Reusable UI pieces: article cards, chips, badges, Hot Topics rail.

import { type Lang, T } from './i18n'
import { artTitle, basePath, esc, fmtDate, heroImage, icon, localDate, localDateLink, sourceBrand, sourceColor, sourceVendor } from './helpers'
import { type ArticleListRow, SNIP_CLOSE, SNIP_OPEN, type SourceCount, type TagCount } from '../db'

export function tagChip(base: string, tag: string, count?: number, big = false): string {
  const n = count !== undefined ? `<span class="n">${count}</span>` : ''
  return `<a class="tag${big ? ' big' : ''}" href="${base}/tags/${encodeURIComponent(tag)}">#${esc(tag)}${n}</a>`
}

export function sourceBadge(name: string): string {
  return `<span class="src" style="--src-color:${sourceColor(name)}"><i></i>${esc(name)}</span>`
}

// External-link "blog card" (classmethod-style) shown right after the greeting,
// sending readers to the original announcement. Shows the source favicon and a
// representative site image on the right.
export function externalLinkCard(url: string, sourceName: string, ogImage: string | null): string {
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    host = ''
  }
  const vendor = sourceVendor(sourceName)
  const favicon = vendor
    ? `<img class="linkcard-favicon" src="/favicons/${vendor}.png" alt="" width="16" height="16" loading="lazy" decoding="async">`
    : ''
  // Prefer the source's Open Graph preview image (the link-embed thumbnail);
  // fall back to the vendor logo when we don't have one cached.
  let media = ''
  if (ogImage) {
    media = `<span class="linkcard-thumb"><img src="/ogp/${esc(ogImage)}" alt="" loading="lazy" decoding="async"></span>`
  } else if (vendor) {
    media = `<span class="linkcard-logo"><img src="/favicons/${vendor}.png" alt="${esc(sourceName)} logo" width="64" height="64" loading="lazy" decoding="async"></span>`
  }
  return `
<a class="linkcard" href="${esc(url)}" rel="noopener" target="_blank">
  <span class="linkcard-body">
    <span class="linkcard-title">${esc(sourceName)}${icon('arrow-up-right')}</span>
    <span class="linkcard-host">${favicon}<span>${esc(host)}</span></span>
  </span>
  ${media}
</a>`
}

// Importance rating: N gold stars (1-5, falls back to 1)
export function stars(importance: number | null): string {
  const n = Math.max(1, Math.min(5, importance ?? 1))
  return `<span class="stars" title="importance ${n}/5" aria-label="importance ${n} of 5">${'★'.repeat(n)}</span>`
}

// Category chip: a source (e.g. "Cloudflare Changelog") linking to its page
export function sourceCatChip(base: string, name: string, count?: number): string {
  const n = count !== undefined ? `<span class="n">${count}</span>` : ''
  return `<a class="cat" style="--brand:${sourceBrand(name)}" href="${base}/source/${encodeURIComponent(name)}">${esc(name)}${n}</a>`
}

export function sourceList(sources: SourceCount[]): string {
  return `<ul class="src-list">
    ${sources.map((s) => `<li><span class="src" style="--src-color:${sourceColor(s.source_name)}"><i></i></span>${esc(s.source_name)}<span class="n">${s.count}</span></li>`).join('\n    ')}
  </ul>`
}

// Uniform article card: every card is the same size. `latest` only adds a
// LATEST ribbon; `summaryHtml` (search snippets) shows a short excerpt.
export function articleCard(
  r: ArticleListRow,
  index: number,
  lang: Lang,
  opts: { latest?: boolean; summaryHtml?: string } = {},
): string {
  const { latest = false, summaryHtml } = opts
  const base = basePath(lang)
  const delay = Math.min(index * 45, 500)
  const brand = sourceBrand(r.source_name)
  // Thumbnail: the emotion-matched hero illustration for this article, over a
  // faint brand-tinted wash that shows through while the image loads
  const thumbStyle = `--thumb-a:color-mix(in srgb, ${brand} 12%, #DCEBFA);--thumb-b:color-mix(in srgb, ${brand} 20%, var(--aqua))`
  const summary = summaryHtml !== undefined ? `<p class="summary">${summaryHtml}</p>` : ''
  return `
<article class="card" style="animation-delay:${delay}ms">
  <div class="thumb" style="${thumbStyle}">
    ${latest ? '<span class="latest-label">LATEST</span>' : ''}
    <img src="${heroImage(r.source_name, r.emotion)}" alt="" loading="lazy" decoding="async" width="1200" height="676">
  </div>
  <div class="card-body">
    <span class="genre-tag" style="--brand:${brand}">${esc(r.source_name)}</span>
    <h3><a href="${base}/posts/${esc(r.slug)}">${esc(artTitle(r, lang))}</a></h3>
    ${summary}
    <p class="card-meta">${stars(r.importance)}<span class="card-date">${localDateLink(r.published_at, base)}</span></p>
  </div>
</article>`
}

// FTS snippets arrive with control-char markers; escape first, then mark
export function snippetHtml(snip: string): string {
  return esc(snip).replaceAll(SNIP_OPEN, '<mark>').replaceAll(SNIP_CLOSE, '</mark>')
}

export function popularPanel(popular: ArticleListRow[], lang: Lang): string {
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

export type DayGroup = { date: string; articles: ArticleListRow[]; hasMore: boolean }

export type IndexData = {
  latest: ArticleListRow[]
  tags: TagCount[]
  sources: SourceCount[]
  hotTopics: ArticleListRow[]
}

// How many cards stay visible per day on small screens before collapsing to
// a "more" link (wide screens show the full row and scroll horizontally)
export const DAY_MOBILE_SHOWN = 3

// "Hot Topics" rail: this week's highest-importance posts, ranked by their stars
export function hotTopicsPanel(
  items: ArticleListRow[],
  lang: Lang,
  recentDates: Set<string>,
): string {
  if (!items.length) return ''
  const base = basePath(lang)
  const sub = lang === 'en' ? 'this week' : '今週の注目'
  const li = items
    .map((r) => {
      const isNew = recentDates.has(fmtDate(r.published_at))
      return `
    <li class="hot-item">
      <a href="${base}/posts/${esc(r.slug)}">
        <span class="hot-cat-row">
          ${isNew ? '<span class="hot-new">NEW</span>' : ''}
          <span class="hot-cat" style="--brand:${sourceBrand(r.source_name)}">${esc(r.source_name)}</span>
        </span>
        <span class="hot-title">${esc(artTitle(r, lang))}</span>
        <span class="hot-meta">${stars(r.importance)}<span class="hot-date">${localDate(r.published_at)}</span></span>
      </a>
    </li>`
    })
    .join('')
  return `
<aside class="home-rail">
  <div class="panel hot-topics">
    <h2 class="section-title hot-head">${icon('wave')}Hot Topics <span class="pop-week">${sub}</span></h2>
    <ul class="hot-list">${li}</ul>
  </div>
</aside>`
}

