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
 * PouchDB remote instance with cookieFetch baked into the constructor.
 * PouchDB's HTTP adapter reads `fetch` from the DB options, not from
 * per-operation options — passing it here is the reliable path.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRemoteDb(): PouchDB.Database {
	// `fetch` is a valid runtime option for pouchdb-browser's HTTP adapter
	// but absent from the type definitions — suppress the any warning here.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return new PouchDB(REMOTE_URL, { fetch: cookieFetch } as any);
}

/**
 * Begin live, retrying sync to the remote using cookie auth. Idempotent —
 * if a live sync is already running this is a no-op.
 */
export function startSync(): void {
	if (!browser) return;
	if (syncHandler) return;

	syncHandler = getDb().sync(getRemoteDb(), { live: true, retry: true });

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

/** One-shot bidirectional sync — useful for manual "force sync" actions. */
export function forceSync(): Promise<void> {
	if (!browser) return Promise.resolve();
	return new Promise((resolve, reject) => {
		getDb()
			.sync(getRemoteDb())
			.on('complete', () => resolve())
			.on('error', reject);
	});
}

// Only instantiate in browser — SSR guard. Local-only usage (changes feed,
// allDocs, put, remove) works offline regardless of session state.
export const localDb = browser ? getDb() : (null as unknown as PouchDB.Database);
