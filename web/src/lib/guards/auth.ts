import { authStore } from '$lib/stores/auth.svelte';
import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import { resolve } from '$app/paths';

/**
 * Auth guard for protected routes. Resolves the CouchDB `_session` cookie and
 * redirects to /login when there is no authenticated user.
 *
 * @example
 * // src/routes/(protected)/+layout.ts
 * import { requireAuth } from '$lib/guards/auth';
 * export const load = async () => {
 *   await requireAuth();
 *   return {};
 * };
 */
export async function requireAuth() {
	if (!browser) return;

	await authStore.ensureInitialized();

	if (!authStore.isAuthenticated) {
		throw redirect(302, resolve('/login'));
	}
}

/**
 * Redirect away from auth pages (login) when a session already exists.
 *
 * @example
 * // src/routes/login/+page.ts
 * import { redirectIfAuthenticated } from '$lib/guards/auth';
 * export const load = async () => {
 *   await redirectIfAuthenticated();
 *   return {};
 * };
 */
export async function redirectIfAuthenticated(redirectTo: '/home' = '/home') {
	if (!browser) return;

	await authStore.ensureInitialized();

	if (authStore.isAuthenticated) {
		throw redirect(302, resolve(redirectTo));
	}
}
