# blog.shiichan.etak64n.dev

Fully automated blog that publishes articles ingested from shiichan-reporter
(a GitHub Actions bot). Cloudflare Workers + Hono + D1.

## Endpoints

- `GET /` — index: latest post featured, all posts, tag/source sidebar
- `GET /posts/:slug` — article page (Markdown rendered server-side)
- `GET /posts/:slug.md` — raw Markdown with YAML front matter (`text/markdown`)
- `GET /tags` — tag cloud (sized by article count)
- `GET /tags/:tag` — articles carrying the tag (404 when the tag has no articles)
- `GET /about` — about page (how the automation works, sources)
- `GET /feed.xml` — RSS 2.0 feed (latest 30 articles)
- `POST /api/articles` — ingest (upsert), GitHub Actions OIDC auth
- `DELETE /api/articles/:slug` — remove an article (rollback path), same auth

The UI supports dark/light themes: it follows the system preference by
default, and the header toggle stores an explicit choice in localStorage.

**Reader-facing fiction**: to readers, this blog is written by a girl named
"shiichan" (しぃちゃん). Reader-facing pages must never mention that articles
are AI-generated or automated, nor explain the tech stack or ingest pipeline
(that belongs here in the README only).

## Auth model

The ingest API accepts only GitHub Actions OIDC tokens:

1. JWT verified with `jose` (signature against GitHub's JWKS, `iss`, `aud`, expiry)
2. `sub` must exactly equal `ALLOWED_OIDC_SUB`
   (= `repo:etak64n/shiichan-reporter:ref:refs/heads/main`)

No long-lived secret is stored anywhere. Nothing but the watcher repository's
Actions on `main` can publish.

For local development only, put `DEV_BEARER_TOKEN=<random string>` in `.dev.vars`
to allow that bearer token as well (empty in production = disabled).

## Ingest payload (validated with zod)

```json
{
  "slug": "aws-lambda-example",
  "title": "Article title (Japanese)",
  "summary": "One or two sentence summary",
  "body_md": "Markdown body (raw HTML rejected, 64KB max)",
  "source_url": "https://aws.amazon.com/blogs/aws/... (ALLOWED_SOURCE_HOSTS domains only)",
  "source_name": "AWS (free-form string; `name` from the watcher's sources.json)",
  "tags": ["lambda", "serverless"],
  "published_at": "2026-07-07T00:00:00Z"
}
```

## Setup

```sh
npm install
npx wrangler d1 create blog-shiichan   # paste the database_id into wrangler.jsonc
npm run db:migrate:remote
npm run check                          # typecheck
npm run deploy                         # served at blog.shiichan.etak64n.dev via routes (old sheechan domain 301-redirects)
```

Local development:

```sh
npm run db:migrate:local
npm run dev
```

## Adding a monitored site

Together with adding it to the watcher's `sources.json`, add the new site's
domain to `ALLOWED_SOURCE_HOSTS` in `wrangler.jsonc` and `npm run deploy`
(used for the source_url host allowlist check).

## Removing an article

```sh
# From the watcher repo's Actions, or locally using the .dev.vars token instead of OIDC
curl -X DELETE https://blog.shiichan.etak64n.dev/api/articles/<slug> \
  -H "Authorization: Bearer <token>"
```

Backups: the watcher side (`shiichan-reporter/articles/`) keeps a JSON archive of
every published article; the whole blog can be restored by re-POSTing them.
