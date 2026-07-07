-- Full-text search index. The trigram tokenizer handles Japanese (no word
-- boundaries) at the cost of requiring 3+ character terms; shorter terms fall
-- back to LIKE in the app layer.
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title, summary, body_md,
  content='articles',
  content_rowid='rowid',
  tokenize='trigram'
);

INSERT INTO articles_fts(rowid, title, summary, body_md)
  SELECT rowid, title, summary, body_md FROM articles;

-- Keep the index in sync with the content table (covers the ingest API's
-- upsert and delete without any application-side bookkeeping)
CREATE TRIGGER IF NOT EXISTS articles_fts_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, summary, body_md)
  VALUES (new.rowid, new.title, new.summary, new.body_md);
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, body_md)
  VALUES ('delete', old.rowid, old.title, old.summary, old.body_md);
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_au AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, body_md)
  VALUES ('delete', old.rowid, old.title, old.summary, old.body_md);
  INSERT INTO articles_fts(rowid, title, summary, body_md)
  VALUES (new.rowid, new.title, new.summary, new.body_md);
END;
