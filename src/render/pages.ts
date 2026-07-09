// Page renderers: one function per route.

import { marked } from 'marked'
import { type Lang, T } from './i18n'
import { SITE_ORIGIN, WAVE_DIVIDER, artBody, artSummary, artTitle, autospace, autospaceHtml, basePath, esc, fmtFullDate, fmtMonth, heroImage, icon, localDate, parseTags, sourceBrand } from './helpers'
import { layout } from './layout'
import { DAY_MOBILE_SHOWN, type IndexData, articleCard, externalLinkCard, hotTopicsPanel, snippetHtml, sourceBadge, sourceCatChip, stars, tagChip } from './components'
import { type ArticleListRow, type ArticleRow, type IndexRow, type MonthCount, type SearchHit, type SourceCount, type TagCount } from '../db'

export function renderIndexPage(data: IndexData, lang: Lang): string {
  const { days, tags, sources, hotTopics } = data
  const t = T[lang]
  const base = basePath(lang)
  // Hot Topics items published on one of the recent days shown get a NEW badge
  const recentDates = new Set(days.map((g) => g.date))

  const hero = `
<img class="hero-banner" src="/hero.webp" srcset="/hero-800.webp 800w, /hero-1200.webp 1200w, /hero.webp 1731w"
  sizes="100vw" width="1731" height="909"
  alt="A smiling shiichan working at her laptop — Shiichan Tech Blog" fetchpriority="high" decoding="async">
<section class="hero wrap">
  <div class="hero-copy">
    <h1>${esc(t.heroH1)}</h1>
    <p class="lede">${esc(t.heroLede)}</p>
    <div class="hero-cats">${sources.map((s) => sourceCatChip(base, s.source_name, s.count)).join('')}</div>
    <div class="hero-tags">${tags.map((tg) => tagChip(base, tg.tag, tg.count)).join('')}</div>
  </div>
</section>`

  // Each recent day is a horizontal, scrollable row of cards (3 across); on
  // small screens the row collapses to the first few cards plus a "more" link
  // to that day's page. The newest post overall carries a LATEST ribbon.
  const mainCol = days.length
    ? `${days
        .map((g, gi) => {
          const collapses = g.articles.length > DAY_MOBILE_SHOWN
          return `
<section class="day-block">
  <h2 class="section-title"><a class="day-link" href="${base}/day/${g.date}">${fmtFullDate(g.date, lang)}</a></h2>
  <div class="day-row">${g.articles.map((r, i) => articleCard(r, i, lang)).join('\n')}</div>
  ${collapses ? `<p class="more-row day-more"><a class="panel-more" href="${base}/day/${g.date}">${t.more} ${icon('arrow-up-right')}</a></p>` : ''}
</section>`
        })
        .join('\n')}
<p class="viewall"><a class="viewall-btn" href="${base}/posts">${esc(t.viewAll)} ${icon('arrow-up-right')}</a></p>`
    : '<p>No articles yet.</p>'

  return layout(
    { title: T[lang].siteName, canonicalPath: '/', lang },
    `${hero}
<div class="wrap">${WAVE_DIVIDER}</div>
<div class="wrap home-cols">
  <main id="main" class="home-main-col">${mainCol}</main>
  ${hotTopicsPanel(hotTopics, lang, recentDates)}
</div>`,
  )
}

// Numbered pagination: 1 … 4 5 [6] 7 8 … 20, with prev/next arrows. Always
// shows the first and last page; a window of neighbours surrounds the current
// page and gaps collapse to an ellipsis.
export function pagination(base: string, page: number, pages: number, lang: Lang): string {
  if (pages <= 1) return ''
  const t = T[lang]
  const href = (p: number) => (p === 1 ? `${base}/posts` : `${base}/posts?page=${p}`)
  const num = (p: number) =>
    p === page
      ? `<span class="pg-num current" aria-current="page">${p}</span>`
      : `<a class="pg-num" href="${href(p)}" aria-label="Page ${p}">${p}</a>`
  const gap = '<span class="pg-gap" aria-hidden="true">…</span>'

  // Build the set of page numbers to show: first, last, and a window of ±1
  // around the current page.
  const show = new Set<number>([1, pages, page, page - 1, page + 1])
  const nums: string[] = []
  let prev = 0
  for (let p = 1; p <= pages; p++) {
    if (!show.has(p)) continue
    if (p - prev > 1) nums.push(gap)
    nums.push(num(p))
    prev = p
  }

  const prevBtn =
    page > 1
      ? `<a class="pg-btn prev" href="${href(page - 1)}" rel="prev" aria-label="${esc(t.prev)}">${icon('arrow-left')}</a>`
      : `<span class="pg-btn prev disabled" aria-hidden="true">${icon('arrow-left')}</span>`
  const nextBtn =
    page < pages
      ? `<a class="pg-btn next" href="${href(page + 1)}" rel="next" aria-label="${esc(t.next)}">${icon('arrow-right')}</a>`
      : `<span class="pg-btn next disabled" aria-hidden="true">${icon('arrow-right')}</span>`
  return `
<nav class="pagination" aria-label="Pagination">
  ${prevBtn}
  <span class="pg-nums">${nums.join('')}</span>
  ${nextBtn}
</nav>`
}

export function renderAllPostsPage(
  rows: ArticleListRow[],
  total: number,
  page: number,
  pages: number,
  lang: Lang,
): string {
  const t = T[lang]
  const base = basePath(lang)
  const main = `
<section class="page-head wrap">
  <h1>ALL POSTS</h1>
  <p class="count">${t.postsCount(total)}</p>
</section>
<section class="list-section wrap" id="main">
  <div class="card-grid">${rows.map((r, i) => articleCard(r, i, lang)).join('\n')}</div>
  ${pagination(base, page, pages, lang)}
</section>`
  return layout(
    {
      title: pages > 1 ? `Posts (${page}/${pages}) | ${T[lang].siteName}` : `Posts | ${T[lang].siteName}`,
      description: lang === 'en' ? 'All posts on shiichan blog' : `${T[lang].siteName} の全記事一覧`,
      canonicalPath: '/posts',
      nav: 'posts',
      lang,
    },
    main,
  )
}

// Host of a URL without the leading www., for the original-article fallback.
function urlHost(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Full index: one compact table row per article. Clicking a source narrows the
// page to that source (server-side, ?source=). Columns link the shiichan post,
// the source page, and show the original article's own title.
export function renderListPage(rows: IndexRow[], lang: Lang, activeSource?: string): string {
  const t = T[lang]
  const base = basePath(lang)
  const bodyRows = rows
    .map(
      (r) => `
    <tr class="lx-row">
      <td class="lx-date">${localDate(r.published_at)}</td>
      <td class="lx-src"><a class="genre-tag lx-srclink" style="--brand:${sourceBrand(r.source_name)}" href="${base}/list?source=${encodeURIComponent(r.source_name)}">${esc(r.source_name)}</a></td>
      <td class="lx-post"><a href="${base}/posts/${esc(r.slug)}">${esc(artTitle(r, lang))}</a></td>
      <td class="lx-orig"><a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.og_title?.trim() || urlHost(r.source_url))}${icon('arrow-up-right')}</a></td>
    </tr>`,
    )
    .join('')
  const activeChip = activeSource
    ? `<p class="lx-active">${esc(t.colSource)}: <span class="genre-tag" style="--brand:${sourceBrand(activeSource)}">${esc(activeSource)}</span> <a class="lx-clear" href="${base}/list">${icon('x')}${esc(t.listAll)}</a></p>`
    : ''
  const main = `
<section class="page-head wrap">
  <h1>INDEX</h1>
  <p class="count">${t.postsCount(rows.length)}</p>
  ${activeChip}
</section>
<section class="list-section wrap" id="main">
  <div class="lx-wrap">
    <table class="lx-table">
      <thead>
        <tr>
          <th class="lx-date">${esc(t.colDate)}</th>
          <th class="lx-src">${esc(t.colSource)}</th>
          <th class="lx-post">${esc(t.colPost)}</th>
          <th class="lx-orig">${esc(t.colOriginal)}</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>
</section>`
  return layout(
    {
      title: activeSource ? `${activeSource} | Index | ${t.siteName}` : `Index | ${t.siteName}`,
      description: t.listDesc,
      canonicalPath: '/list',
      nav: 'index',
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
      title: `Tags | ${T[lang].siteName}`,
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
      title: `#${tag} | ${T[lang].siteName}`,
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
      title: `About | ${T[lang].siteName}`,
      description: lang === 'en' ? 'About shiichan' : `${T[lang].siteName} としぃちゃんの紹介`,
      canonicalPath: '/about',
      nav: 'about',
      lang,
      ogImage: '/shiichan.webp',
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
      title: query ? `${query} | ${T[lang].siteName}` : `Search | ${T[lang].siteName}`,
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
      title: `Archive | ${T[lang].siteName}`,
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
      title: `${fmtMonth(month, lang)} | ${T[lang].siteName}`,
      description: lang === 'en' ? `Posts from ${fmtMonth(month, lang)}` : `${fmtMonth(month, lang)}の記事一覧`,
      canonicalPath: `/archive/${month}`,
      lang,
    },
    main,
  )
}

export function renderDayPage(date: string, rows: ArticleListRow[], lang: Lang): string {
  const t = T[lang]
  const label = fmtFullDate(date, lang)
  const main = `
<section class="page-head wrap">
  <h1>${esc(label)}</h1>
  <p class="count">${t.postsCount(rows.length)}</p>
</section>
<section class="list-section wrap" id="main">
  <div class="card-grid">${rows.map((r, i) => articleCard(r, i, lang)).join('\n')}</div>
</section>`
  return layout(
    {
      title: `${label} | ${T[lang].siteName}`,
      description: lang === 'en' ? `Posts from ${label}` : `${label}の記事一覧`,
      canonicalPath: `/day/${date}`,
      lang,
    },
    main,
  )
}

export function renderPopularPage(rows: ArticleListRow[], lang: Lang): string {
  const t = T[lang]
  const title = lang === 'en' ? 'Popular' : '人気の記事'
  const main = `
<section class="page-head wrap">
  <h1>${esc(title)}</h1>
  <p class="count">${t.postsCount(rows.length)}</p>
</section>
<section class="list-section wrap" id="main">
  ${
    rows.length
      ? `<div class="card-grid">${rows.map((r, i) => articleCard(r, i, lang)).join('\n')}</div>`
      : `<p>${esc(lang === 'en' ? 'No popular posts yet.' : 'まだ人気の記事がないよ。')}</p>`
  }
</section>`
  return layout(
    {
      title: `${title} | ${T[lang].siteName}`,
      description: lang === 'en' ? 'Most-read posts on shiichan blog' : 'よく読まれている記事一覧',
      canonicalPath: '/popular',
      lang,
      nav: 'popular',
    },
    main,
  )
}

export function renderSourcePage(name: string, rows: ArticleListRow[], lang: Lang): string {
  const t = T[lang]
  const main = `
<section class="page-head wrap">
  <p class="src-head">${sourceBadge(name)}</p>
  <h1>${esc(name)}</h1>
  <p class="count">${t.postsCount(rows.length)}</p>
</section>
<section class="list-section wrap" id="main">
  <div class="card-grid">${rows.map((r, i) => articleCard(r, i, lang)).join('\n')}</div>
</section>`
  return layout(
    {
      title: `${name} | ${T[lang].siteName}`,
      description: lang === 'en' ? `Posts from ${name}` : `${name} の記事一覧`,
      canonicalPath: `/source/${encodeURIComponent(name)}`,
      lang,
    },
    main,
  )
}

export async function renderArticlePage(
  row: ArticleRow,
  related: ArticleListRow[],
  lang: Lang,
): Promise<string> {
  const t = T[lang]
  const base = basePath(lang)
  const title = artTitle(row, lang)
  const tags = parseTags(row.tags)
  const mdPath = `${base}/posts/${row.slug}.md`

  // Tokenize first so we can assign heading ids and build a table of contents,
  // then render (body_md was validated HTML-free at ingest)
  const tokens = marked.lexer(artBody(row, lang))
  const toc: { depth: number; id: string; text: string }[] = []
  let hi = 0
  for (const tok of tokens) {
    const tk = tok as { type?: string; depth?: number; text?: string; id?: string }
    if (tk.type === 'heading' && (tk.depth === 2 || tk.depth === 3)) {
      tk.id = `sec-${hi++}`
      toc.push({ depth: tk.depth, id: tk.id, text: tk.text ?? '' })
    }
  }
  const rawBody = marked.parser(tokens)
  const bodyHtml = lang === 'en' ? rawBody : autospaceHtml(rawBody)

  // Original-source card sits right after the greeting (the first paragraph)
  const linkCard = externalLinkCard(row.source_url, row.source_name, row.og_image)
  const proseHtml = bodyHtml.includes('</p>')
    ? bodyHtml.replace('</p>', `</p>\n${linkCard}`)
    : `${linkCard}\n${bodyHtml}`

  const tocAside =
    toc.length >= 2
      ? `
<aside class="toc" aria-label="${esc(t.toc)}">
  <div class="toc-inner">
    <p class="toc-title">${esc(t.toc)}</p>
    <nav><ul>
      ${toc
        .map(
          (h) =>
            `<li class="toc-h${h.depth}"><a href="#${h.id}" data-toc="${h.id}">${esc(lang === 'en' ? h.text : autospace(h.text))}</a></li>`,
        )
        .join('\n      ')}
    </ul></nav>
  </div>
</aside>`
      : ''

  const relatedSection = related.length
    ? `
<section class="related">
  <h2 class="section-title">${esc(t.related)}</h2>
  <div class="card-grid">${related.map((r, i) => articleCard(r, i, lang)).join('\n')}</div>
</section>`
    : ''

  const main = `
<div class="article-layout wrap${toc.length >= 2 ? ' has-toc' : ''}">
  ${tocAside}
  <div class="article-col" id="main">
    <article class="article-card">
      <div class="article-hero">
        <img src="${heroImage(row.source_name, row.emotion)}" width="1200" height="675"
          alt="shiichan" fetchpriority="high" decoding="async">
      </div>
      <h1 class="article-title">${esc(title)}</h1>
      <div class="article-meta">
        ${sourceCatChip(base, row.source_name)}
        <span class="meta-date">${localDate(row.published_at)}</span>
        ${stars(row.importance)}
        <span class="spacer"></span>
        <a class="metabtn" href="${esc(mdPath)}">${icon('file-code')}${lang === 'en' ? 'View Markdown' : 'Markdown で見る'}</a>
      </div>
      ${tags.length ? `<div class="article-tags">${tags.map((tg) => tagChip(base, tg)).join('')}</div>` : ''}
      <div class="prose">${proseHtml}</div>
    </article>
  </div>
  ${relatedSection}
</div>`
  return layout(
    {
      title: `${title} | ${T[lang].siteName}`,
      description: artSummary(row, lang),
      canonicalPath: `/posts/${row.slug}`,
      ogImage: heroImage(row.source_name, row.emotion),
      head: `<link rel="alternate" type="text/markdown" href="${esc(mdPath)}">`,
      nav: 'posts',
      lang,
    },
    main,
  )
}

export function renderArticleMarkdown(row: ArticleRow, lang: Lang): string {
  return `# ${artTitle(row, lang)}\n\n${artBody(row, lang).trim()}\n`
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
  <title>${esc(T[lang].siteName)}</title>
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
    { title: `404 | ${T[lang].siteName}`, lang },
    `<div class="notfound wrap" id="main">
  <h1>404 // NOT FOUND</h1>
  <p>${esc(T[lang].notFoundBody)}</p>
  <p><a class="backlink" href="${base}/">${icon('arrow-left')}INDEX</a></p>
</div>`,
  )
}

