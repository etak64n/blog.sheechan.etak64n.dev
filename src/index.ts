import { Hono } from 'hono'
import { verifyIngestAuth } from './auth'
import {
  deleteArticle,
  getArticle,
  listArticles,
  listArticlesByMonth,
  listArticlesByTag,
  listMonths,
  listSources,
  listTags,
  searchArticles,
  upsertArticle,
} from './db'
import {
  contentSecurityPolicy,
  renderAboutPage,
  renderArchiveIndexPage,
  renderArchiveMonthPage,
  renderArticleMarkdown,
  renderArticlePage,
  renderIndexPage,
  renderNotFoundPage,
  renderRssFeed,
  renderSearchPage,
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

// ---- public pages ----

app.get('/', async (c) => {
  const [articles, tags, sources, months] = await Promise.all([
    listArticles(c.env.DB),
    listTags(c.env.DB),
    listSources(c.env.DB),
    listMonths(c.env.DB),
  ])
  c.header('cache-control', 'public, max-age=300')
  return c.html(renderIndexPage(articles, tags, sources, months))
})

app.get('/search', async (c) => {
  const query = (c.req.query('q') ?? '').trim().slice(0, 100)
  const results = query ? await searchArticles(c.env.DB, query) : []
  c.header('cache-control', 'public, max-age=60')
  return c.html(renderSearchPage(query, results))
})

app.get('/archive', async (c) => {
  const months = await listMonths(c.env.DB)
  c.header('cache-control', 'public, max-age=300')
  return c.html(renderArchiveIndexPage(months))
})

app.get('/archive/:month', async (c) => {
  const month = c.req.param('month')
  if (!/^\d{4}-\d{2}$/.test(month)) return c.notFound()
  const articles = await listArticlesByMonth(c.env.DB, month)
  if (articles.length === 0) return c.notFound()
  c.header('cache-control', 'public, max-age=300')
  return c.html(renderArchiveMonthPage(month, articles))
})

// `/posts/<slug>.md` serves the raw markdown (slugs themselves never contain dots)
app.get('/posts/:slug', async (c) => {
  const param = c.req.param('slug')
  const wantsMarkdown = param.endsWith('.md')
  const slug = wantsMarkdown ? param.slice(0, -'.md'.length) : param

  const article = await getArticle(c.env.DB, slug)
  if (!article) return c.notFound()
  c.header('cache-control', 'public, max-age=300')

  if (wantsMarkdown) {
    c.header('content-type', 'text/markdown; charset=utf-8')
    return c.body(renderArticleMarkdown(article))
  }
  return c.html(await renderArticlePage(article))
})

app.get('/tags', async (c) => {
  const [tags, sources] = await Promise.all([listTags(c.env.DB), listSources(c.env.DB)])
  c.header('cache-control', 'public, max-age=300')
  return c.html(renderTagsIndexPage(tags, sources))
})

app.get('/tags/:tag', async (c) => {
  const articles = await listArticlesByTag(c.env.DB, c.req.param('tag'))
  if (articles.length === 0) return c.notFound()
  c.header('cache-control', 'public, max-age=300')
  return c.html(renderTagPage(c.req.param('tag'), articles))
})

app.get('/about', async (c) => {
  const sources = await listSources(c.env.DB)
  c.header('cache-control', 'public, max-age=300')
  return c.html(renderAboutPage(sources))
})

app.get('/feed.xml', async (c) => {
  const articles = await listArticles(c.env.DB, 30)
  c.header('cache-control', 'public, max-age=900')
  c.header('content-type', 'application/rss+xml; charset=utf-8')
  return c.body(renderRssFeed(articles))
})

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
  return c.html(renderNotFoundPage(), 404)
})

app.onError((err, c) => {
  console.log(JSON.stringify({ level: 'error', message: err.message, path: c.req.path }))
  return c.json({ error: 'internal error' }, 500)
})

export default app
