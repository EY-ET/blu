const SESSION_KEY = 'bluAdminSession';

export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  email: string;
}

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session expired. Sign in again.');
    this.name = 'SessionExpiredError';
  }
}

export function getSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

function setSession(session: AdminSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

async function refreshSession(refreshToken: string): Promise<AdminSession | null> {
  try {
    const response = await fetch('/api/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh', refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const session: AdminSession = { accessToken: data.accessToken, refreshToken: data.refreshToken, email: data.user.email };
    setSession(session);
    return session;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AdminSession> {
  const response = await fetch('/api/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Sign-in failed.');
  const session: AdminSession = { accessToken: data.accessToken, refreshToken: data.refreshToken, email: data.user.email };
  setSession(session);
  return session;
}

export async function logout(): Promise<void> {
  const session = getSession();
  clearSession();
  if (session?.accessToken) {
    fetch('/api/admin-logout', { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` } }).catch(() => undefined);
  }
}

export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const session = getSession();
  if (!session) throw new SessionExpiredError();

  const doFetch = (token: string) =>
    fetch(path, {
      ...init,
      headers: {
        ...((init.headers ?? {}) as Record<string, string>),
        Authorization: `Bearer ${token}`,
      },
    });

  let response = await doFetch(session.accessToken);
  if (response.status === 401) {
    const refreshed = await refreshSession(session.refreshToken);
    if (!refreshed) {
      clearSession();
      throw new SessionExpiredError();
    }
    response = await doFetch(refreshed.accessToken);
  }
  return response;
}
