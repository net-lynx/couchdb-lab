import { COUCH_URL, couchFetch } from '$lib/db/couch';
import { PUBLIC_COUCHDB_URL } from '$env/static/public';

// ------------------------------------------------------------------ constants

export const DEMO_DBS = ['demo_alpha', 'demo_beta', 'demo_shared'] as const;
export type DemoDb = (typeof DEMO_DBS)[number];

export const DEMO_USERS = [
	{ name: 'alice',   password: 'alice1234', roles: ['team:alpha'],           desc: 'สาขา alpha เท่านั้น' },
	{ name: 'bob',     password: 'bob12345',  roles: ['team:beta'],            desc: 'สาขา beta เท่านั้น' },
	{ name: 'charlie', password: 'charlie1',  roles: ['team:alpha','team:beta'], desc: 'ทั้งสองสาขา' }
] as const;

export const DB_META: Record<DemoDb, { label: string; requiredRoles: string[]; pattern: string }> = {
	demo_alpha:  { label: 'Alpha DB',  requiredRoles: ['team:alpha'],          pattern: 'Pattern 1 — DB-level' },
	demo_beta:   { label: 'Beta DB',   requiredRoles: ['team:beta'],           pattern: 'Pattern 1 — DB-level' },
	demo_shared: { label: 'Shared DB', requiredRoles: ['team:alpha','team:beta'], pattern: 'Pattern 2 — Doc-level write' }
};

// ------------------------------------------------------------------ admin utils

function adminAuthHeader(): string {
	const match = PUBLIC_COUCHDB_URL.match(/^https?:\/\/([^:]+):([^@]+)@/);
	if (!match) return '';
	return 'Basic ' + btoa(`${match[1]}:${match[2]}`);
}

async function adminReq(
	path: string,
	method: string,
	body?: unknown
): Promise<{ status: number; data: unknown }> {
	const res = await fetch(`${COUCH_URL}${path}`, {
		method,
		headers: {
			Authorization: adminAuthHeader(),
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		...(body !== undefined ? { body: JSON.stringify(body) } : {})
	});
	const data = await res.json().catch(() => null);
	return { status: res.status, data };
}

// ------------------------------------------------------------------ setup

export interface SetupStep {
	label: string;
	status: 'ok' | 'skip' | 'error';
	detail?: string;
}

export async function setupDemo(): Promise<SetupStep[]> {
	const steps: SetupStep[] = [];

	// 1. Create databases
	for (const db of DEMO_DBS) {
		const { status, data } = await adminReq(`/${db}`, 'PUT');
		if (status === 201) steps.push({ label: `Create ${db}`, status: 'ok' });
		else if (status === 412) steps.push({ label: `Create ${db}`, status: 'skip', detail: 'already exists' });
		else steps.push({ label: `Create ${db}`, status: 'error', detail: (data as { reason?: string })?.reason });
	}

	// 2. _security per database
	const securities: [DemoDb, object][] = [
		['demo_alpha',  { admins: { names: [], roles: [] }, members: { names: [], roles: ['team:alpha'] } }],
		['demo_beta',   { admins: { names: [], roles: [] }, members: { names: [], roles: ['team:beta'] } }],
		['demo_shared', { admins: { names: [], roles: [] }, members: { names: [], roles: ['team:alpha','team:beta'] } }]
	];
	for (const [db, sec] of securities) {
		const { status } = await adminReq(`/${db}/_security`, 'PUT', sec);
		steps.push({
			label: `Security ${db}`,
			status: status === 200 ? 'ok' : 'error'
		});
	}

	// 3. validate_doc_update design doc in demo_shared
	const validateFn = `function(newDoc, oldDoc, userCtx) {
  if (userCtx.roles.indexOf('_admin') !== -1) return;
  if (newDoc._deleted) {
    if (oldDoc && oldDoc.team) {
      if (userCtx.roles.indexOf('team:' + oldDoc.team) === -1)
        throw({ forbidden: 'cannot delete: wrong team' });
    }
    return;
  }
  var team = newDoc.team;
  if (!team) throw({ forbidden: 'team field required' });
  if (userCtx.roles.indexOf('team:' + team) === -1)
    throw({ forbidden: 'Access denied: requires role team:' + team });
}`;

	// get current _rev if design doc exists
	const { data: existing } = await adminReq('/demo_shared/_design/access', 'GET');
	const rev = (existing as { _rev?: string })?._rev;
	const { status: dsStatus } = await adminReq(
		'/demo_shared/_design/access',
		'PUT',
		{ _id: '_design/access', ...(rev ? { _rev: rev } : {}), validate_doc_update: validateFn }
	);
	steps.push({ label: 'Design doc demo_shared', status: dsStatus === 201 || dsStatus === 200 ? 'ok' : 'error' });

	// 4. Create demo users + seed docs
	for (const u of DEMO_USERS) {
		const { data: existingUser } = await adminReq(`/_users/org.couchdb.user:${u.name}`, 'GET');
		const uRev = (existingUser as { _rev?: string })?._rev;
		const { status } = await adminReq(
			`/_users/org.couchdb.user:${u.name}`,
			'PUT',
			{ _id: `org.couchdb.user:${u.name}`, ...(uRev ? { _rev: uRev } : {}), name: u.name, password: u.password, roles: [...u.roles], type: 'user' }
		);
		steps.push({ label: `User ${u.name}`, status: status === 201 || status === 200 ? 'ok' : 'error' });
	}

	// 5. Seed initial documents so read test works even on empty DB
	const seeds = [
		{ db: 'demo_alpha',  id: '_seed_alpha', body: { type: 'seed', msg: 'Alpha data', team: 'alpha' } },
		{ db: 'demo_beta',   id: '_seed_beta',  body: { type: 'seed', msg: 'Beta data',  team: 'beta' } },
		{ db: 'demo_shared', id: '_seed_a',     body: { type: 'seed', msg: 'Shared alpha doc', team: 'alpha' } },
		{ db: 'demo_shared', id: '_seed_b',     body: { type: 'seed', msg: 'Shared beta doc',  team: 'beta' } }
	];
	for (const s of seeds) {
		const { data: sd } = await adminReq(`/${s.db}/${s.id}`, 'GET');
		const sRev = (sd as { _rev?: string })?._rev;
		await adminReq(`/${s.db}/${s.id}`, 'PUT', { ...s.body, ...(sRev ? { _rev: sRev } : {}) });
	}
	steps.push({ label: 'Seed documents', status: 'ok' });

	return steps;
}

export async function teardownDemo(): Promise<SetupStep[]> {
	const steps: SetupStep[] = [];
	for (const db of DEMO_DBS) {
		const { status } = await adminReq(`/${db}`, 'DELETE');
		steps.push({ label: `Delete ${db}`, status: status === 200 ? 'ok' : 'error' });
	}
	for (const u of DEMO_USERS) {
		const { data } = await adminReq(`/_users/org.couchdb.user:${u.name}`, 'GET');
		const rev = (data as { _rev?: string })?._rev;
		if (rev) {
			const { status } = await adminReq(`/_users/org.couchdb.user:${u.name}?rev=${rev}`, 'DELETE');
			steps.push({ label: `Delete user ${u.name}`, status: status === 200 ? 'ok' : 'error' });
		} else {
			steps.push({ label: `Delete user ${u.name}`, status: 'skip', detail: 'not found' });
		}
	}
	return steps;
}

// ------------------------------------------------------------------ access tests

export interface AccessResult {
	canRead:    boolean;
	canWrite:   boolean;
	readError?: string;
	writeError?: string;
	loading:    boolean;
}

export async function testDbAccess(db: string): Promise<Omit<AccessResult, 'loading'>> {
	// test read
	let canRead = false;
	let readError: string | undefined;
	try {
		await couchFetch(`/${db}/_all_docs?limit=0`);
		canRead = true;
	} catch (e) {
		readError = (e as Error).message;
	}

	// test write (use couchFetch so it uses the current session cookie)
	let canWrite = false;
	let writeError: string | undefined;
	const testId = `_rbacdemo_${Date.now()}`;
	try {
		await couchFetch<{ rev: string }>(`/${db}/${testId}`, {
			method: 'PUT',
			body: JSON.stringify({ type: '_demo_test', ts: Date.now() })
		});
		canWrite = true;
		// cleanup — best effort
		try {
			const doc = await couchFetch<{ _rev: string }>(`/${db}/${testId}`);
			await couchFetch(`/${db}/${testId}?rev=${doc._rev}`, { method: 'DELETE' });
		} catch { /* ignore */ }
	} catch (e) {
		writeError = (e as Error).message;
	}

	return { canRead, canWrite, readError, writeError };
}

export async function testSharedWrite(team: 'alpha' | 'beta'): Promise<{ ok: boolean; error?: string }> {
	const testId = `_rbacdemo_shared_${team}_${Date.now()}`;
	try {
		await couchFetch<{ rev: string }>(`/demo_shared/${testId}`, {
			method: 'PUT',
			body: JSON.stringify({ type: '_demo_test', team, ts: Date.now() })
		});
		// cleanup
		try {
			const doc = await couchFetch<{ _rev: string }>(`/demo_shared/${testId}`);
			await couchFetch(`/demo_shared/${testId}?rev=${doc._rev}`, { method: 'DELETE' });
		} catch { /* ignore */ }
		return { ok: true };
	} catch (e) {
		return { ok: false, error: (e as Error).message };
	}
}
