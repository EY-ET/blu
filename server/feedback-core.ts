export interface FeedbackEntry {
  id: string;
  name: string;
  email: string | null;
  rating: number;
  message: string;
  createdAt: string;
}

export interface FeedbackExportRow extends FeedbackEntry {
  source: string;
}

export interface FeedbackSummary {
  total: number;
  averageRating: number | null;
}

export interface FeedbackStore {
  ping(): Promise<void>;
  insertFeedback(entry: FeedbackEntry): Promise<void>;
  listFeedback(limit: number): Promise<FeedbackEntry[]>;
  listAllFeedback(): Promise<FeedbackExportRow[]>;
  feedbackSummary(): Promise<FeedbackSummary>;
}

export interface ValidFeedbackSubmission {
  name: string;
  email: string | null;
  rating: number;
  message: string;
}

export function validateFeedbackSubmission(body: unknown): ValidFeedbackSubmission | { error: string } {
  const record = (body ?? {}) as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  const email = typeof record.email === 'string' ? record.email.trim() : '';
  const message = typeof record.message === 'string' ? record.message.trim() : '';
  const rating = Number(record.rating);

  if (!name || name.length > 120) return { error: 'Enter a name under 120 characters.' };
  if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: 'Enter a valid email address.' };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Choose a rating from 1 to 5.' };
  }
  if (!message || message.length > 5000) return { error: 'Enter a comment under 5,000 characters.' };

  return { name, email: email || null, rating, message };
}

export function staffTokenError(authorization: string | undefined | null): string | null {
  const expectedToken = process.env.FEEDBACK_ADMIN_TOKEN;
  const suppliedToken = authorization?.replace(/^Bearer\s+/i, '');
  if (!expectedToken) return 'Feedback staff access is not configured.';
  if (suppliedToken !== expectedToken) return 'Enter a valid staff access token.';
  return null;
}

export function parseFeedbackLimit(rawLimit: unknown): number {
  const parsedLimit = Number(rawLimit || 100);
  if (!Number.isFinite(parsedLimit)) return 100;
  return Math.min(Math.max(Math.floor(parsedLimit), 1), 500);
}

export function buildFeedbackCsv(entries: FeedbackExportRow[]): string {
  const escapeCsv = (value: string | number | null) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const columns = ['id', 'name', 'email', 'rating', 'message', 'source', 'createdAt'];
  const lines = [columns.join(','), ...entries.map((entry) => columns.map((column) => escapeCsv(entry[column as keyof FeedbackExportRow])).join(','))];
  return lines.join('\r\n');
}
