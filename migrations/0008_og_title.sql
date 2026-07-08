-- Cache the source article's own title so the Index table can show the
-- original article name in the "original" column (not just an arrow).
ALTER TABLE articles ADD COLUMN og_title TEXT;
