import { browser } from '$app/environment';
import { getSession, sessionLogin, sessionLogout, type SessionUser } from '$lib/db/couch';
import { startSync, stopSync } from '$lib/db/pouch';

/**
 * Session-backed auth store. The source of truth is CouchDB's `_session`
 * cookie — we cache the resolved userCtx here for synchronous UI access.
 */
class AuthStore {
	private state = $state<{ user: SessionUser | null }>({ user: null });
	private initPromise: Promise<void> | null = null;

	get user() {
		return this.state.user;
	}

	get isAuthenticated() {
		return this.state.user !== null;
	}

	/** Resolve the current session from CouchDB. Cached; safe to call repeatedly. */
	ensureInitialized(): Promise<void> {
		if (!browser) return Promise.resolve();
		if (!this.initPromise) {
			this.initPromise = getSession()
				.then((user) => {
					this.state.user = user;
					if (browser && user) startSync();
				})
				.catch(() => {
					this.state.user = null;
				});
		}
		return this.initPromise;
	}

	async login(input: { name: string; password: string }): Promise<SessionUser> {
		const user = await sessionLogin(input);
		this.state.user = user;
		this.initPromise = Promise.resolve();
		if (browser) startSync();
		return user;
	}

	async logout(): Promise<void> {
		try {
			await sessionLogout();
		} finally {
			if (browser) stopSync();
			this.state.user = null;
			this.initPromise = Promise.resolve();
		}
	}
}

export const authStore = new AuthStore();
