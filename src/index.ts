import { Hono } from 'hono'
import type { Context } from 'hono'
import { verifyIngestAuth } from './auth'
import {
  countArticles,
  deleteArticle,
  getArticle,
  listAllArticles,
  listArticles,
  listArticlesByDay,
  listArticlesByMonth,
  listArticlesByTag,
  listArticlesBySource,
  listArticlesPage,
  listHotTopics,
  listMonths,
  listPopular,
  listRelated,
  listSources,
  listTags,
  recordView,
  searchArticles,
  searchArticlesEn,
  upsertArticle,
} from './db'
import {
  contentSecurityPolicy,
  parseTags,
  renderAboutPage,
  renderAllPostsPage,
  renderArchiveIndexPage,
  renderArchiveMonthPage,
  renderArticleMarkdown,
  renderDayPage,
  renderArticlePage,
  renderIndexPage,
  renderListPage,
  renderNotFoundPage,
  renderPopularPage,
  renderRssFeed,
  renderSearchPage,
  renderSourcePage,
  renderTagPage,
  renderTagsIndexPage,
} from './render'
import { articleSchema } from './schema'

const MAX_BODY_BYTES = 100_000

const CANONICAL_HOST = 'blog.shiichan.etak64n.dev'
// Original launch domain with the misspelled romanization
const LEGACY_HOSTS = new Set(['blog.sheechan.etak64n.dev'])

const app = new Hono<{ Bindings: Env }>()

// Worker-owned security headers on every response (defense in depth; does not
// depend on zone configuration)
app.use('*', async (c, next) => {
  await next()
  const h = c.res.headers
  h.set('content-security-policy', await contentSecurityPolicy())
  h.set('x-content-type-options', 'nosniff')
  h.set('x-frame-options', 'DENY')
  h.set('referrer-policy', 'strict-origin-when-cross-origin')
})

app.use('*', async (c, next) => {
  const url = new URL(c.req.url)
  if (LEGACY_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL_HOST
    return c.redirect(url.toString(), 301)
  }
  await next()
})

// ---- public pages (registered for both '' (ja) and '/en' (en)) ----

const HOME_DAYS = 4
// Cards loaded per day for the home page's horizontal scroll row (4 show at
// full width; the rest are reachable by scrolling, or via the day page on mobile)
const HOME_PER_DAY = 8
const POPULAR_LIMIT = 40
type Lang = 'ja' | 'en'
type Ctx = Context<{ Bindings: Env }>

// Edge-cache a content-derived response (visitor-independent, no writes) in the
// data-center cache, keyed by full URL. The first request per colo is a MISS;
// subsequent ones are served without touching the Worker's D1 queries until the
// s-maxage TTL lapses. Excluded on purpose: the home page (per-visitor date and
// timezone) and article pages (the best-effort view counter needs the Worker to
// run). Security headers are (re)applied by the global middleware on every hit,
// so the cached copy only needs the route's own headers.
// 1 day. Publishing purges the edge cache (reporter's post_articles.py), so a
// long TTL is safe: list pages update instantly on publish and only fall back
// to the TTL as a self-heal if a purge is ever missed.
const EDGE_TTL = 86400
async function edgeCached(
  c: Ctx,
  render: () => Promise<Response> | Response,
  ttl: number = EDGE_TTL,
): Promise<Response> {
  const cache = caches.default
  const key = new Request(c.req.url, { method: 'GET' })
  const cached = await cache.match(key)
  if (cached) {
    const hit = new Response(cached.body, cached)
    hit.headers.set('x-edge-cache', 'HIT')
    return hit
  }
  const fresh = await render()
  if (fresh.status === 200) {
    fresh.headers.set('cache-control', `public, max-age=60, s-maxage=${ttl}`)
    c.executionCtx.waitUntil(cache.put(key, fresh.clone()))
    fresh.headers.set('x-edge-cache', 'MISS')
  }
  return fresh
}

async function home(c: Ctx, lang: Lang) {
  // Show the last HOME_DAYS calendar days relative to the visitor's *local*
  // date, not simply the most recent days that happen to have articles.
  // Cloudflare resolves the visitor's IANA timezone from geo-IP (request.cf);
  // fall back to Asia/Tokyo when it's unavailable (e.g. local dev).
  const tz = (c.req.raw as { cf?: { timezone?: string } }).cf?.timezone || 'Asia/Tokyo'
  // 'en-CA' formats as YYYY-MM-DD; with timeZone it yields the *local* calendar
  // date for a UTC instant. Group articles by their local date so the day rows
  // (and their headers) match the viewer's timezone, not UTC.
  const localFmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz })
  const today = localFmt.format(new Date())
  const localDays = Array.from({ length: HOME_DAYS }, (_, i) =>
    new Date(Date.parse(`${today}T00:00:00Z`) - i * 86400 * 1000).toISOString().slice(0, 10),
  )
  const [recent, tags, sources, hotTopics] = await Promise.all([
    listArticles(c.env.DB, 200),
    listTags(c.env.DB),
    listSources(c.env.DB),
    listHotTopics(c.env.DB, 10),
  ])
  const byDay = new Map<string, typeof recent>()
  for (const a of recent) {
    const d = localFmt.format(new Date(a.published_at))
    const arr = byDay.get(d)
    if (arr) arr.push(a)
    else byDay.set(d, [a])
  }
  const days = localDays.map((date) => {
    const arts = byDay.get(date) ?? []
    return { date, articles: arts.slice(0, HOME_PER_DAY), hasMore: arts.length > HOME_PER_DAY }
  })
  c.header('cache-control', 'public, max-age=300')
  return c.html(renderIndexPage({ days, tags, sources, hotTopics }, lang))
}

async function popular(c: Ctx, lang: Lang) {
  const rows = await listPopular(c.env.DB, POPULAR_LIMIT)
  return edgeCached(c, () => c.html(renderPopularPage(rows, lang)))
}

async function dayPage(c: Ctx, lang: Lang) {
  const date = c.req.param('date') ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.notFound()
  const articles = await listArticlesByDay(c.env.DB, date)
  if (articles.length === 0) return c.notFound()
  return edgeCached(c, () => c.html(renderDayPage(date, articles, lang)))
}

const POSTS_PER_PAGE = 28

async function posts(c: Ctx, lang: Lang) {
  const total = await countArticles(c.env.DB)
  const pages = Math.max(1, Math.ceil(total / POSTS_PER_PAGE))
  const requested = parseInt(c.req.query('page') ?? '1', 10)
  const page = Math.min(Math.max(1, Number.isNaN(requested) ? 1 : requested), pages)
  const articles = await listArticlesPage(c.env.DB, POSTS_PER_PAGE, (page - 1) * POSTS_PER_PAGE)
  return edgeCached(c, () => c.html(renderAllPostsPage(articles, total, page, pages, lang)))
}

async function listAll(c: Ctx, lang: Lang) {
  const source = (c.req.query('source') ?? '').trim().slice(0, 40) || undefined
  const rows = await listAllArticles(c.env.DB, source)
  if (source && rows.length === 0) return c.notFound()
  return edgeCached(c, () => c.html(renderListPage(rows, lang, source)))
}

async function search(c: Ctx, lang: Lang) {
  const query = (c.req.query('q') ?? '').trim().slice(0, 100)
  const results = query
    ? lang === 'en'
      ? await searchArticlesEn(c.env.DB, query)
      : await searchArticles(c.env.DB, query)
    : []
  c.header('cache-control', 'public, max-age=60')
  return c.html(renderSearchPage(query, results, lang))
}

async function archive(c: Ctx, lang: Lang) {
  const months = await listMonths(c.env.DB)
  return edgeCached(c, () => c.html(renderArchiveIndexPage(months, lang)))
}

async function archiveMonth(c: Ctx, lang: Lang) {
  const month = c.req.param('month') ?? ''
  if (!/^\d{4}-\d{2}$/.test(month)) return c.notFound()
  const articles = await listArticlesByMonth(c.env.DB, month)
  if (articles.length === 0) return c.notFound()
  return edgeCached(c, () => c.html(renderArchiveMonthPage(month, articles, lang)))
}

// `/posts/<slug>.md` serves the raw markdown (slugs themselves never contain dots)
async function post(c: Ctx, lang: Lang) {
  const param = c.req.param('slug') ?? ''
  const wantsMarkdown = param.endsWith('.md')
  const slug = wantsMarkdown ? param.slice(0, -'.md'.length) : param

  const article = await getArticle(c.env.DB, slug)
  if (!article) return c.notFound()
  c.header('cache-control', 'public, max-age=300')

  if (wantsMarkdown) {
    c.header('content-type', 'text/markdown; charset=utf-8')
    return c.body(renderArticleMarkdown(article, lang))
  }
  // Tally the view without delaying the response; popularity is best-effort
  c.executionCtx.waitUntil(recordView(c.env.DB, slug).catch(() => {}))
  const related = await listRelated(c.env.DB, slug, parseTags(article.tags))
  return c.html(await renderArticlePage(article, related, lang))
}

async function tags(c: Ctx, lang: Lang) {
  const [tagList, sources] = await Promise.all([listTags(c.env.DB), listSources(c.env.DB)])
  return edgeCached(c, () => c.html(renderTagsIndexPage(tagList, sources, lang)))
}

async function tag(c: Ctx, lang: Lang) {
  const tagName = c.req.param('tag') ?? ''
  const articles = await listArticlesByTag(c.env.DB, tagName)
  if (articles.length === 0) return c.notFound()
  return edgeCached(c, () => c.html(renderTagPage(tagName, articles, lang)))
}

async function source(c: Ctx, lang: Lang) {
  const name = c.req.param('name') ?? ''
  const articles = await listArticlesBySource(c.env.DB, name)
  if (articles.length === 0) return c.notFound()
  return edgeCached(c, () => c.html(renderSourcePage(name, articles, lang)))
}

function about(c: Ctx, lang: Lang) {
  return edgeCached(c, () => c.html(renderAboutPage(lang)))
}

async function feed(c: Ctx, lang: Lang) {
  const articles = await listArticles(c.env.DB, 30)
  return edgeCached(
    c,
    () => {
      c.header('content-type', 'application/rss+xml; charset=utf-8')
      return c.body(renderRssFeed(articles, lang))
    },
    900,
  )
}

for (const [base, lang] of [
  ['', 'ja'],
  ['/en', 'en'],
] as [string, Lang][]) {
  app.get(base || '/', (c) => home(c, lang))
  app.get(`${base}/posts`, (c) => posts(c, lang))
  app.get(`${base}/list`, (c) => listAll(c, lang))
  app.get(`${base}/posts/:slug`, (c) => post(c, lang))
  app.get(`${base}/popular`, (c) => popular(c, lang))
  app.get(`${base}/search`, (c) => search(c, lang))
  app.get(`${base}/archive`, (c) => archive(c, lang))
  app.get(`${base}/archive/:month`, (c) => archiveMonth(c, lang))
  app.get(`${base}/day/:date`, (c) => dayPage(c, lang))
  app.get(`${base}/tags`, (c) => tags(c, lang))
  app.get(`${base}/tags/:tag`, (c) => tag(c, lang))
  app.get(`${base}/source/:name`, (c) => source(c, lang))
  app.get(`${base}/about`, (c) => about(c, lang))
  app.get(`${base}/feed.xml`, (c) => feed(c, lang))
}
// Accept /en/ with a trailing slash as the English home
app.get('/en/', (c) => home(c, 'en'))

// ---- ingest API (GitHub Actions OIDC) ----

app.use('/api/*', async (c, next) => {
  const auth = await verifyIngestAuth(c.req.header('authorization'), c.env)
  if (!auth.ok) return c.json({ error: auth.reason }, 401)
  await next()
})

app.post('/api/articles', async (c) => {
  const len = Number(c.req.header('content-length') ?? '0')
  if (!len || len > MAX_BODY_BYTES) {
    return c.json({ error: 'payload missing or too large' }, 413)
  }

  const body = await c.req.json().catch(() => null)
  const parsed = articleSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: 'validation failed', issues: parsed.error.issues }, 400)
  }

  const article = parsed.data
  const sourceHost = new URL(article.source_url).hostname
  if (!c.env.ALLOWED_SOURCE_HOSTS.some((h) => h === sourceHost)) {
    return c.json({ error: `source_url host not allowed: ${sourceHost}` }, 400)
  }

  await upsertArticle(c.env.DB, article)
  return c.json({ ok: true, slug: article.slug }, 201)
})

app.delete('/api/articles/:slug', async (c) => {
  const deleted = await deleteArticle(c.env.DB, c.req.param('slug'))
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.json({ ok: true })
})

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'not found' }, 404)
  const lang: Lang = c.req.path === '/en' || c.req.path.startsWith('/en/') ? 'en' : 'ja'
  return c.html(renderNotFoundPage(lang), 404)
})

app.onError((err, c) => {
  console.log(JSON.stringify({ level: 'error', message: err.message, path: c.req.path }))
  return c.json({ error: 'internal error' }, 500)
})

export default app
