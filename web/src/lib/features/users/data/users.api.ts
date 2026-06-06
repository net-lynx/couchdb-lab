import { COUCH_URL, couchFetch } from '$lib/db/couch';
import { PUBLIC_COUCHDB_URL } from '$env/static/public';

export interface CouchUserDoc {
	_id: string;
	_rev: string;
	name: string;
	roles: string[];
	type: string;
}

interface AllDocsRow {
	id: string;
	key: string;
	value: { rev: string };
	doc: CouchUserDoc;
}

function adminAuthHeader(): string {
	const match = PUBLIC_COUCHDB_URL.match(/^https?:\/\/([^:]+):([^@]+)@/);
	if (!match) return '';
	return 'Basic ' + btoa(`${match[1]}:${match[2]}`);
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(`${COUCH_URL}${path}`, {
		...init,
		headers: {
			Authorization: adminAuthHeader(),
			'Content-Type': 'application/json',
			Accept: 'application/json',
			...init.headers
		}
	});
	const data = (await res.json().catch(() => null)) as (T & { error?: string; reason?: string }) | null;
	if (!res.ok) {
		throw new Error(data?.reason ?? data?.error ?? `CouchDB error (${res.status})`);
	}
	return data as T;
}

export async function listUsers(): Promise<CouchUserDoc[]> {
	const res = await adminFetch<{ rows: AllDocsRow[] }>(
		'/_users/_all_docs?include_docs=true'
	);
	return res.rows
		.filter((r) => r.id.startsWith('org.couchdb.user:'))
		.map((r) => r.doc);
}

export async function createUser(name: string, password: string): Promise<void> {
	await adminFetch(`/_users/org.couchdb.user:${encodeURIComponent(name)}`, {
		method: 'PUT',
		body: JSON.stringify({ name, password, roles: [], type: 'user' })
	});
	await grantNotesAccess(name);
}

export async function deleteUser(id: string, rev: string): Promise<void> {
	await adminFetch(`/_users/${encodeURIComponent(id)}?rev=${encodeURIComponent(rev)}`, {
		method: 'DELETE'
	});
	const name = id.replace('org.couchdb.user:', '');
	await revokeNotesAccess(name);
}

async function grantNotesAccess(username: string): Promise<void> {
	const security = await adminFetch<{
		admins: { names: string[]; roles: string[] };
		members: { names: string[]; roles: string[] };
	}>('/notes/_security');
	security.members ??= { names: [], roles: [] };
	security.members.names ??= [];
	if (!security.members.names.includes(username)) {
		security.members.names.push(username);
	}
	await adminFetch('/notes/_security', {
		method: 'PUT',
		body: JSON.stringify(security)
	});
}

async function revokeNotesAccess(username: string): Promise<void> {
	const security = await adminFetch<{
		admins: { names: string[]; roles: string[] };
		members: { names: string[]; roles: string[] };
	}>('/notes/_security');
	if (security.members?.names) {
		security.members.names = security.members.names.filter((n) => n !== username);
		await adminFetch('/notes/_security', {
			method: 'PUT',
			body: JSON.stringify(security)
		});
	}
}
