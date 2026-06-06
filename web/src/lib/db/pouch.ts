import { browser } from '$app/environment';
import PouchDB from 'pouchdb-browser';
import { COUCH_URL } from './couch';

let db: PouchDB.Database | null = null;
let syncHandler: PouchDB.Replication.Sync<object> | null = null;

const REMOTE_URL = `${COUCH_URL}/notes`;

/** Fetch that forwards the CouchDB `_session` cookie on every remote request. */
const cookieFetch: typeof fetch = (url, opts) => fetch(url, { ...opts, credentials: 'include' });

function getDb(): PouchDB.Database {
	if (!db) {
		db = new PouchDB('notes');
	}
	return db;
}

/**
 * Begin live, retrying sync to the remote using cookie auth. Idempotent —
 * if a live sync is already running this is a no-op.
 */
export function startSync(): void {
	if (!browser) return;
	if (syncHandler) return;

	const d = getDb();
	// `fetch` is supported at runtime by pouchdb-browser but missing from
	// @types/pouchdb's per-operation option types, hence the cast.
	syncHandler = d.sync(REMOTE_URL, {
		live: true,
		retry: true,
		fetch: cookieFetch
	} as PouchDB.Replication.SyncOptions);

	syncHandler.on('error', (err) => {
		console.warn('[PouchDB] sync error', err);
	});
}

/** Cancel the live sync handler if one is running. */
export function stopSync(): void {
	if (syncHandler) {
		syncHandler.cancel();
		syncHandler = null;
	}
}

export function forceSync(): Promise<void> {
	if (!browser) return Promise.resolve();
	const d = getDb();
	return new Promise((resolve, reject) => {
		d.replicate
			.to(REMOTE_URL, { fetch: cookieFetch } as PouchDB.Replication.ReplicateOptions)
			.on('complete', () => resolve())
			.on('error', reject);
	});
}

// Only instantiate in browser — SSR guard. Local-only usage (changes feed,
// allDocs, put, remove) works offline regardless of session state.
export const localDb = browser ? getDb() : (null as unknown as PouchDB.Database);
