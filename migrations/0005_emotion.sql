-- Per-article emotion, chosen at generation time to pick a matching hero
-- illustration (happy / confused / thinking / smug / energetic). Nullable;
-- the renderer falls back to "happy".
ALTER TABLE articles ADD COLUMN emotion TEXT;
