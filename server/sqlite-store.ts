import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { FeedbackEntry, FeedbackExportRow, FeedbackStore, FeedbackSummary } from './feedback-core';

export function createSqliteStore(databasePath: string): FeedbackStore {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS feedback_submissions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      message TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'laphto-mall',
      created_at TEXT NOT NULL
    )
  `);

  return {
    async ping() {
      db.prepare('SELECT 1').get();
    },
    async insertFeedback(entry: FeedbackEntry) {
      db.prepare(`INSERT INTO feedback_submissions (id, name, email, rating, message, created_at)
        VALUES (@id, @name, @email, @rating, @message, @createdAt)`).run(entry);
    },
    async listFeedback(limit: number): Promise<FeedbackEntry[]> {
      return db.prepare(`SELECT id, name, email, rating, message, created_at AS createdAt
        FROM feedback_submissions ORDER BY created_at DESC LIMIT ?`).all(limit) as FeedbackEntry[];
    },
    async listAllFeedback(): Promise<FeedbackExportRow[]> {
      return db.prepare(`SELECT id, name, email, rating, message, source, created_at AS createdAt
        FROM feedback_submissions ORDER BY created_at DESC`).all() as FeedbackExportRow[];
    },
    async feedbackSummary(): Promise<FeedbackSummary> {
      return db.prepare(`SELECT COUNT(*) AS total, ROUND(AVG(rating), 2) AS averageRating
        FROM feedback_submissions`).get() as FeedbackSummary;
    },
  };
}
