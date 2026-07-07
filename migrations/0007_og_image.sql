-- Locally-cached Open Graph preview image for the source article (the picture
-- that shows up when the original link is pasted into Discord / Hatena, etc.).
-- Stores a filename served from /ogp/<file>; null falls back to the vendor logo.
ALTER TABLE articles ADD COLUMN og_image TEXT;
