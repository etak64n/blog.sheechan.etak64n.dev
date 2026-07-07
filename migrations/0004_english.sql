-- English translations of each article. Nullable: an article may be Japanese
-- only until its English version is ingested. Tags are shared (English slugs).
ALTER TABLE articles ADD COLUMN title_en TEXT;
ALTER TABLE articles ADD COLUMN summary_en TEXT;
ALTER TABLE articles ADD COLUMN body_md_en TEXT;
