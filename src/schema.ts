import { z } from 'zod'

// Markdown only: raw HTML would be an XSS vector at render time
const noRawHtml = (s: string) => !/<\s*[a-zA-Z!/]/.test(s)

// Reject markdown links/images whose URL uses a dangerous scheme
// (javascript:, data:, vbscript:). marked does not sanitize these, so a
// `[x](javascript:...)` link would render as an executable href. This is the
// entry-side guard; render.ts neutralizes anything that slips through.
const DANGEROUS_URL = /\]\(\s*(?:javascript|data|vbscript)\s*:/i
const safeMarkdownUrls = (s: string) => !DANGEROUS_URL.test(s)
const mdRefine = (msg: string) => ({ message: msg })
const cleanText = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine(noRawHtml, mdRefine('raw HTML not allowed'))
    .refine(safeMarkdownUrls, mdRefine('unsafe link scheme not allowed'))

export const articleSchema = z.object({
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(300),
  summary: cleanText(1000),
  body_md: z
    .string()
    .min(100)
    .max(64_000)
    .refine(noRawHtml, mdRefine('raw HTML not allowed'))
    .refine(safeMarkdownUrls, mdRefine('unsafe link scheme not allowed')),
  // Host allowlist is checked in the handler (list lives in wrangler.jsonc vars)
  source_url: z.url(),
  // Not an enum: sources will grow over time (watcher's sources.json is the source of truth)
  source_name: z.string().min(1).max(40).refine(noRawHtml, mdRefine('raw HTML not allowed')),
  tags: z.array(z.string().min(1).max(40)).max(8).default([]),
  published_at: z.iso.datetime({ offset: true }),
})

export type Article = z.infer<typeof articleSchema>
