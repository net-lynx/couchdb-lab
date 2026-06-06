import { PUBLIC_COUCHDB_URL } from '$env/static/public';

/**
 * Base CouchDB URL with any embedded credentials (admin:password@) stripped.
 * The browser authenticates via the `_session` cookie, not URL credentials.
 */
export const COUCH_URL = PUBLIC_COUCHDB_URL.replace(/^(https?:\/\/)[^@/]+@/, '$1');

/** CouchDB user context, as returned by `GET /_session`. */
export interface SessionUser {
	name: string;
	roles: string[];
}

interface SessionResponse {
	ok: boolean;
	userCtx: { name: string | null; roles: string[] };
}

/** Thin fetch wrapper: sends cookies, parses JSON, throws CouchDB's reason on error. */
export async function couchFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(`${COUCH_URL}${path}`, {
		credentials: 'include',
		...init,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...init.headers
		}
	});

	const data = (await res.json().catch(() => null)) as
		| (T & { error?: string; reason?: string })
		| null;

	if (!res.ok) {
		const message = data?.reason || data?.error || `CouchDB request failed (${res.status})`;
		throw new Error(message);
	}

	return data as T;
}

/** Authenticate against `_users`; CouchDB sets the AuthSession cookie on success. */
export async function sessionLogin(input: { name: string; password: string }): Promise<SessionUser> {
	const res = await couchFetch<{ ok: boolean; name: string; roles: string[] }>('/_session', {
		method: 'POST',
		body: JSON.stringify(input)
	});
	return { name: res.name, roles: res.roles };
}

/** Clear the AuthSession cookie. */
export async function sessionLogout(): Promise<void> {
	await couchFetch('/_session', { method: 'DELETE' });
}

/** Current user from the session cookie, or null when anonymous. */
export async function getSession(): Promise<SessionUser | null> {
	const res = await couchFetch<SessionResponse>('/_session');
	if (!res.userCtx?.name) return null;
	return { name: res.userCtx.name, roles: res.userCtx.roles };
}
