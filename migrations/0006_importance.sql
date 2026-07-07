-- Per-article importance (1-3), rated from an engineer's perspective: a
-- genuinely interesting technical update is 3, a business/announcement story
-- is 1. Drives the star rating on cards/articles and the "Hot Topics" rail.
-- Nullable; the UI treats a missing value as 1.
ALTER TABLE articles ADD COLUMN importance INTEGER;
