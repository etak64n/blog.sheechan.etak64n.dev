import type { Article } from './schema'

export type ArticleRow = {
  slug: string
  title: string
  summary: string
  body_md: string
  title_en: string | null
  summary_en: string | null
  body_md_en: string | null
  emotion: string | null
  importance: number | null
  og_image: string | null
  og_title: string | null
  source_url: string
  source_name: string
  tags: string
  published_at: string
}

export type ArticleListRow = Pick<
  ArticleRow,
  | 'slug'
  | 'title'
  | 'summary'
  | 'title_en'
  | 'summary_en'
  | 'source_name'
  | 'tags'
  | 'published_at'
  | 'emotion'
  | 'importance'
>

export type TagCount = { tag: string; count: number }

export type SourceCount = { source_name: string; count: number }

export type MonthCount = { month: string; count: number }

const LIST_COLUMNS =
  'slug, title, summary, title_en, summary_en, source_name, tags, published_at, emotion, importance'

export async function listArticles(db: D1Database, limit = 100): Promise<ArticleListRow[]> {
  const { results } = await db
    .prepare(`SELECT ${LIST_COLUMNS} FROM articles ORDER BY published_at DESC, created_at DESC, rowid DESC LIMIT ?`)
    .bind(limit)
    .all<ArticleListRow>()
  return results
}

export async function countArticles(db: D1Database): Promise<number> {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM articles').first<{ n: number }>()
  return row?.n ?? 0
}

// One row per article for the full index table: enough to link both the
// shiichan post and the original source, plus derive the content kind.
export type IndexRow = {
  slug: string
  title: string
  title_en: string | null
  source_name: string
  source_url: string
  og_title: string | null
  published_at: string
}

// Every article for the Index table, newest first; optionally limited to one
// source (the Index page filters by clicking a source).
export async function listAllArticles(db: D1Database, source?: string): Promise<IndexRow[]> {
  const cols = 'slug, title, title_en, source_name, source_url, og_title, published_at'
  const stmt = source
    ? db.prepare(
        `SELECT ${cols} FROM articles WHERE source_name = ?1 ORDER BY published_at DESC, created_at DESC, rowid DESC`,
      ).bind(source)
    : db.prepare(`SELECT ${cols} FROM articles ORDER BY published_at DESC, created_at DESC, rowid DESC`)
  const { results } = await stmt.all<IndexRow>()
  return results
}

export async function listArticlesPage(
  db: D1Database,
  limit: number,
  offset: number,
): Promise<ArticleListRow[]> {
  const { results } = await db
    .prepare(`SELECT ${LIST_COLUMNS} FROM articles ORDER BY published_at DESC, created_at DESC, rowid DESC LIMIT ?1 OFFSET ?2`)
    .bind(limit, offset)
    .all<ArticleListRow>()
  return results
}

// Record one view in today's bucket. Fire-and-forget from the request handler.
export async function recordView(db: D1Database, slug: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO article_views (slug, day, count) VALUES (?1, date('now'), 1)
       ON CONFLICT (slug, day) DO UPDATE SET count = count + 1`,
    )
    .bind(slug)
    .run()
}

// "Hot Topics": the highest-importance articles from the most recent week of
// posts. "This week" is anchored to the newest article's date (not the wall
// clock) so it stays populated regardless of when the query runs.
export async function listHotTopics(db: D1Database, limit = 8): Promise<ArticleListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLUMNS} FROM articles
       WHERE published_at >= (SELECT datetime(MAX(published_at), '-7 days') FROM articles)
       ORDER BY importance DESC, published_at DESC
       LIMIT ?1`,
    )
    .bind(limit)
    .all<ArticleListRow>()
  return results
}

// Most-viewed articles over the trailing 7 days (today + previous 6). Excludes
// articles that no longer exist via the join.
export async function listPopular(db: D1Database, limit = 5): Promise<ArticleListRow[]> {
  const cols = LIST_COLUMNS.split(', ')
    .map((c) => `a.${c}`)
    .join(', ')
  const { results } = await db
    .prepare(
      `SELECT ${cols}
       FROM article_views v JOIN articles a ON a.slug = v.slug
       WHERE v.day >= date('now', '-6 days')
       GROUP BY a.slug
       ORDER BY SUM(v.count) DESC, a.published_at DESC
       LIMIT ?1`,
    )
    .bind(limit)
    .all<ArticleListRow>()
  return results
}

export async function listArticlesByTag(
  db: D1Database,
  tag: string,
  limit = 100,
): Promise<ArticleListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLUMNS} FROM articles
       WHERE EXISTS (SELECT 1 FROM json_each(articles.tags) AS je WHERE je.value = ?1)
       ORDER BY published_at DESC, created_at DESC, rowid DESC LIMIT ?2`,
    )
    .bind(tag, limit)
    .all<ArticleListRow>()
  return results
}

export async function listArticlesBySource(
  db: D1Database,
  name: string,
  limit = 300,
): Promise<ArticleListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLUMNS} FROM articles
       WHERE source_name = ?1 ORDER BY published_at DESC, created_at DESC, rowid DESC LIMIT ?2`,
    )
    .bind(name, limit)
    .all<ArticleListRow>()
  return results
}

export async function listTags(db: D1Database, limit = 60): Promise<TagCount[]> {
  const { results } = await db
    .prepare(
      `SELECT je.value AS tag, COUNT(*) AS count
       FROM articles, json_each(articles.tags) AS je
       GROUP BY je.value ORDER BY count DESC, tag ASC LIMIT ?`,
    )
    .bind(limit)
    .all<TagCount>()
  return results
}

export async function listSources(db: D1Database): Promise<SourceCount[]> {
  const { results } = await db
    .prepare(
      `SELECT source_name, COUNT(*) AS count
       FROM articles GROUP BY source_name ORDER BY count DESC, source_name ASC`,
    )
    .all<SourceCount>()
  return results
}

export type SearchHit = ArticleListRow & { snip: string | null }

// Snippet match markers, replaced with <mark> after HTML-escaping at render time
export const SNIP_OPEN = ''
export const SNIP_CLOSE = ''

const splitTerms = (query: string) =>
  query
    .split(/[\s　]+/)
    .filter(Boolean)
    .slice(0, 5)

// Full-text search via FTS5 (trigram tokenizer, bm25 ranking weighted toward
// titles, highlighted snippets). Trigram cannot index terms shorter than
// 3 characters, so those queries fall back to a LIKE scan.
export async function searchArticles(
  db: D1Database,
  query: string,
  limit = 50,
): Promise<SearchHit[]> {
  const terms = splitTerms(query)
  if (terms.length === 0) return []

  if (terms.every((t) => [...t].length >= 3)) {
    const match = terms.map((t) => `"${t.replace(/"/g, '""')}"`).join(' AND ')
    try {
      const { results } = await db
        .prepare(
          `SELECT ${LIST_COLUMNS
            .split(', ')
            .map((c) => `a.${c}`)
            .join(', ')},
             snippet(articles_fts, -1, ?2, ?3, '…', 48) AS snip
           FROM articles_fts f JOIN articles a ON a.rowid = f.rowid
           WHERE articles_fts MATCH ?1
           ORDER BY bm25(articles_fts, 10.0, 4.0, 1.0) LIMIT ${limit}`,
        )
        .bind(match, SNIP_OPEN, SNIP_CLOSE)
        .all<SearchHit>()
      return results
    } catch (err) {
      // Never let a ranking upgrade break search
      console.log(
        JSON.stringify({ level: 'error', message: `fts search failed: ${String(err)}` }),
      )
    }
  }

  return searchArticlesLike(db, terms, limit)
}

async function searchArticlesLike(
  db: D1Database,
  terms: string[],
  limit: number,
): Promise<SearchHit[]> {
  const escaped = terms.map((t) => t.replace(/[\\%_]/g, (c) => `\\${c}`))
  const where = escaped
    .map((_, i) => `(title || ' ' || summary || ' ' || body_md) LIKE ?${i + 1} ESCAPE '\\'`)
    .join(' AND ')
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLUMNS}, NULL AS snip FROM articles
       WHERE ${where} ORDER BY published_at DESC, created_at DESC, rowid DESC LIMIT ${limit}`,
    )
    .bind(...escaped.map((t) => `%${t}%`))
    .all<SearchHit>()
  return results
}

// English search: LIKE over the English fields (falling back to Japanese where
// a translation is missing). No FTS/snippets on the English side yet.
export async function searchArticlesEn(
  db: D1Database,
  query: string,
  limit = 50,
): Promise<SearchHit[]> {
  const terms = splitTerms(query)
    .map((t) => t.replace(/[\\%_]/g, (c) => `\\${c}`))
    .slice(0, 5)
  if (terms.length === 0) return []
  const field =
    "(COALESCE(title_en, title) || ' ' || COALESCE(summary_en, summary) || ' ' || COALESCE(body_md_en, body_md))"
  const where = terms.map((_, i) => `${field} LIKE ?${i + 1} ESCAPE '\\'`).join(' AND ')
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLUMNS}, NULL AS snip FROM articles
       WHERE ${where} ORDER BY published_at DESC, created_at DESC, rowid DESC LIMIT ${limit}`,
    )
    .bind(...terms.map((t) => `%${t}%`))
    .all<SearchHit>()
  return results
}

// The N most recent distinct publication dates (YYYY-MM-DD), newest first
// Most recent distinct publish days, newest first. `since` (YYYY-MM-DD) bounds
// the window so the home page can show only the last N calendar days.
export async function listRecentDays(db: D1Database, n = 3, since?: string): Promise<string[]> {
  const stmt = since
    ? db
        .prepare(
          `SELECT DISTINCT substr(published_at, 1, 10) AS day
           FROM articles WHERE substr(published_at, 1, 10) >= ?2 ORDER BY day DESC LIMIT ?1`,
        )
        .bind(n, since)
    : db
        .prepare(
          `SELECT DISTINCT substr(published_at, 1, 10) AS day
           FROM articles ORDER BY day DESC LIMIT ?1`,
        )
        .bind(n)
  const { results } = await stmt.all<{ day: string }>()
  return results.map((r) => r.day)
}

export async function listArticlesByDay(
  db: D1Database,
  date: string,
  limit?: number,
): Promise<ArticleListRow[]> {
  const lim = limit ? `LIMIT ${Math.max(0, Math.floor(limit))}` : ''
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLUMNS} FROM articles
       WHERE substr(published_at, 1, 10) = ?1
       ORDER BY published_at DESC, created_at DESC, rowid DESC ${lim}`,
    )
    .bind(date)
    .all<ArticleListRow>()
  return results
}

// Articles whose UTC published_at falls in [startISO, endISO). Used by the day
// page to gather a window it then filters to the viewer's local calendar date.
export async function listArticlesBetween(
  db: D1Database,
  startISO: string,
  endISO: string,
): Promise<ArticleListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLUMNS} FROM articles
       WHERE published_at >= ?1 AND published_at < ?2
       ORDER BY published_at DESC, created_at DESC, rowid DESC`,
    )
    .bind(startISO, endISO)
    .all<ArticleListRow>()
  return results
}

// Archive months are bucketed by JST calendar month (site-wide fixed timezone),
// so an article at 2026-06-30T23:00Z lands in July like its displayed date.
export async function listMonths(db: D1Database): Promise<MonthCount[]> {
  const { results } = await db
    .prepare(
      `SELECT substr(datetime(published_at, '+9 hours'), 1, 7) AS month, COUNT(*) AS count
       FROM articles GROUP BY month ORDER BY month DESC`,
    )
    .all<MonthCount>()
  return results
}

export async function listArticlesByMonth(
  db: D1Database,
  month: string,
  limit = 200,
): Promise<ArticleListRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${LIST_COLUMNS} FROM articles
       WHERE substr(datetime(published_at, '+9 hours'), 1, 7) = ?1
       ORDER BY published_at DESC, created_at DESC, rowid DESC LIMIT ?2`,
    )
    .bind(month, limit)
    .all<ArticleListRow>()
  return results
}

export async function getArticle(db: D1Database, slug: string): Promise<ArticleRow | null> {
  return db.prepare('SELECT * FROM articles WHERE slug = ?').bind(slug).first<ArticleRow>()
}

// Related articles: most tag overlap first, then recency. Falls back to recent
// articles (excluding self) when there aren't enough tag matches.
export async function listRelated(
  db: D1Database,
  slug: string,
  tags: string[],
  limit = 4,
): Promise<ArticleListRow[]> {
  const cols = LIST_COLUMNS.split(', ')
    .map((c) => `a.${c}`)
    .join(', ')
  const related: ArticleListRow[] = []
  const seen = new Set<string>([slug])

  if (tags.length > 0) {
    const placeholders = tags.map((_, i) => `?${i + 2}`).join(', ')
    const { results } = await db
      .prepare(
        `SELECT ${cols}, COUNT(*) AS shared
         FROM articles a, json_each(a.tags) AS je
         WHERE a.slug != ?1 AND je.value IN (${placeholders})
         GROUP BY a.slug
         ORDER BY shared DESC, a.published_at DESC
         LIMIT ${limit}`,
      )
      .bind(slug, ...tags)
      .all<ArticleListRow>()
    for (const r of results) {
      related.push(r)
      seen.add(r.slug)
    }
  }

  if (related.length < limit) {
    const { results } = await db
      .prepare(
        `SELECT ${LIST_COLUMNS} FROM articles
         WHERE slug != ?1 ORDER BY published_at DESC, created_at DESC, rowid DESC LIMIT ${limit + 1}`,
      )
      .bind(slug)
      .all<ArticleListRow>()
    for (const r of results) {
      if (related.length >= limit) break
      if (!seen.has(r.slug)) {
        related.push(r)
        seen.add(r.slug)
      }
    }
  }
  return related
}

export async function upsertArticle(db: D1Database, a: Article): Promise<void> {
  await db
    .prepare(
      `INSERT INTO articles
         (slug, title, summary, body_md, title_en, summary_en, body_md_en,
          emotion, source_url, source_name, tags, published_at, importance, og_image, og_title)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
       ON CONFLICT (slug) DO UPDATE SET
         title = ?2, summary = ?3, body_md = ?4,
         title_en = ?5, summary_en = ?6, body_md_en = ?7, emotion = ?8,
         source_url = ?9, source_name = ?10, tags = ?11, published_at = ?12,
         importance = ?13, og_image = ?14, og_title = ?15, updated_at = datetime('now')`,
    )
    .bind(
      a.slug,
      a.title,
      a.summary,
      a.body_md,
      a.title_en ?? null,
      a.summary_en ?? null,
      a.body_md_en ?? null,
      a.emotion ?? null,
      a.source_url,
      a.source_name,
      JSON.stringify(a.tags),
      a.published_at,
      a.importance ?? null,
      a.og_image ?? null,
      a.og_title ?? null,
    )
    .run()
}

export async function deleteArticle(db: D1Database, slug: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM articles WHERE slug = ?').bind(slug).run()
  await db.prepare('DELETE FROM article_views WHERE slug = ?').bind(slug).run()
  return res.meta.changes > 0
}
