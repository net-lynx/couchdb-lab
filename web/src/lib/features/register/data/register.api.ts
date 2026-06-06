import { PUBLIC_COUCHDB_URL } from '$env/static/public';
import { COUCH_URL, couchFetch } from '$lib/db/couch';

interface NotesSecurityDoc {
	admins: { names: string[]; roles: string[] };
	members: { names: string[]; roles: string[] };
}

function adminAuthHeader(): string {
	const match = PUBLIC_COUCHDB_URL.match(/^https?:\/\/([^:]+):([^@]+)@/);
	if (!match) return '';
	return 'Basic ' + btoa(`${match[1]}:${match[2]}`);
}

export async function createCouchUser(name: string, password: string): Promise<void> {
	await couchFetch(`/_users/org.couchdb.user:${encodeURIComponent(name)}`, {
		method: 'PUT',
		body: JSON.stringify({ name, password, roles: [], type: 'user' })
	});
}

export async function grantNotesAccess(username: string): Promise<void> {
	const auth = adminAuthHeader();

	const secRes = await fetch(`${COUCH_URL}/notes/_security`, {
		headers: { Authorization: auth, Accept: 'application/json' }
	});
	if (!secRes.ok) throw new Error('Failed to read notes security');

	const security = (await secRes.json()) as NotesSecurityDoc;
	security.members ??= { names: [], roles: [] };
	security.members.names ??= [];

	if (!security.members.names.includes(username)) {
		security.members.names.push(username);
	}

	const putRes = await fetch(`${COUCH_URL}/notes/_security`, {
		method: 'PUT',
		headers: {
			Authorization: auth,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		body: JSON.stringify(security)
	});
	if (!putRes.ok) throw new Error('Failed to update notes security');
}

export async function registerUser(name: string, password: string): Promise<void> {
	await createCouchUser(name, password);
	await grantNotesAccess(name);
}
