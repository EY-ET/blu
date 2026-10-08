import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FeedbackEntry, FeedbackExportRow, FeedbackStore, FeedbackSummary } from './feedback-core';

interface SubmissionRow {
  id: string;
  name: string;
  email: string | null;
  rating: number;
  message: string;
  created_at: string;
}

interface ExportRow extends SubmissionRow {
  source: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createSupabaseStore(): FeedbackStore {
  const client: SupabaseClient = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'));

  const toEntry = (row: SubmissionRow): FeedbackEntry => ({
    id: row.id,
    name: row.name,
    email: row.email,
    rating: row.rating,
    message: row.message,
    createdAt: row.created_at,
  });

  const toExportRow = (row: ExportRow): FeedbackExportRow => ({
    ...toEntry(row),
    source: row.source,
  });

  const unwrap = <T>(data: T | null, error: { message: string } | null, context: string): T => {
    if (error) throw new Error(`${context}: ${error.message}`);
    if (data === null) throw new Error(`${context}: no data returned`);
    return data;
  };

  return {
    async ping() {
      unwrap(await client.from('feedback_submissions').select('id', { count: 'exact', head: true }), null, 'Supabase ping');
    },
    async insertFeedback(entry: FeedbackEntry) {
      const { error } = await client.from('feedback_submissions').insert({
        id: entry.id,
        name: entry.name,
        email: entry.email,
        rating: entry.rating,
        message: entry.message,
        created_at: entry.createdAt,
      });
      if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    },
    async listFeedback(limit: number): Promise<FeedbackEntry[]> {
      const { data, error } = await client
        .from('feedback_submissions')
        .select('id, name, email, rating, message, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(`Supabase select failed: ${error.message}`);
      return (data ?? []).map(toEntry);
    },
    async listAllFeedback(): Promise<FeedbackExportRow[]> {
      const { data, error } = await client
        .from('feedback_submissions')
        .select('id, name, email, rating, message, source, created_at')
        .order('created_at', { ascending: false });
      if (error) throw new Error(`Supabase select failed: ${error.message}`);
      return (data ?? []).map(toExportRow);
    },
    async feedbackSummary(): Promise<FeedbackSummary> {
      const { data, error } = await client.rpc('feedback_summary');
      if (error) throw new Error(`Supabase summary failed: ${error.message}`);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return { total: 0, averageRating: null };
      return {
        total: Number(row.total ?? 0),
        averageRating: row.average_rating === null || row.average_rating === undefined ? null : Number(row.average_rating),
      };
    },
  };
}
