import type { Article } from './schema'

export type ArticleRow = {
  slug: string
  title: string
  summary: string
  body_md: string
  source_url: string
  source_name: string
  tags: string
  published_at: string
}

export type ArticleListRow = Pick<
  ArticleRow,
  'slug' | 'title' | 'summary' | 'source_name' | 'tags' | 'published_at'
>

export type TagCount = { tag: string; count: number }

export type SourceCount = { source_name: string; count: number }

export type MonthCount = { month: string; count: number }

const LIST_COLUMNS = 'slug, title, summary, source_name, tags, published_at'

export async function listArticles(db: D1Database, limit = 100): Promise<ArticleListRow[]> {
  const { results } = await db
    .prepare(`SELECT ${LIST_COLUMNS} FROM articles ORDER BY published_at DESC LIMIT ?`)
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
       ORDER BY published_at DESC LIMIT ?2`,
    )
    .bind(tag, limit)
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
       WHERE ${where} ORDER BY published_at DESC LIMIT ${limit}`,
    )
    .bind(...escaped.map((t) => `%${t}%`))
    .all<SearchHit>()
  return results
}

export async function listMonths(db: D1Database): Promise<MonthCount[]> {
  const { results } = await db
    .prepare(
      `SELECT substr(published_at, 1, 7) AS month, COUNT(*) AS count
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
       WHERE substr(published_at, 1, 7) = ?1
       ORDER BY published_at DESC LIMIT ?2`,
    )
    .bind(month, limit)
    .all<ArticleListRow>()
  return results
}

export async function getArticle(db: D1Database, slug: string): Promise<ArticleRow | null> {
  return db.prepare('SELECT * FROM articles WHERE slug = ?').bind(slug).first<ArticleRow>()
}

export async function upsertArticle(db: D1Database, a: Article): Promise<void> {
  await db
    .prepare(
      `INSERT INTO articles (slug, title, summary, body_md, source_url, source_name, tags, published_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT (slug) DO UPDATE SET
         title = ?2, summary = ?3, body_md = ?4, source_url = ?5,
         source_name = ?6, tags = ?7, published_at = ?8, updated_at = datetime('now')`,
    )
    .bind(
      a.slug,
      a.title,
      a.summary,
      a.body_md,
      a.source_url,
      a.source_name,
      JSON.stringify(a.tags),
      a.published_at,
    )
    .run()
}

export async function deleteArticle(db: D1Database, slug: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM articles WHERE slug = ?').bind(slug).run()
  return res.meta.changes > 0
}
