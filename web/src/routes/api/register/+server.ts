import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { adminFetch } from '$lib/server/couch-admin';

// Public self-signup endpoint; never prerendered (static build omits it).
export const prerender = false;

export const POST: RequestHandler = async ({ request }) => {
	const { username, password } = (await request.json().catch(() => ({}))) as {
		username?: string;
		password?: string;
	};

	// Validate input server-side (mirrors registerSchema constraints).
	if (!username || username.length < 3) throw error(400, 'Username must be at least 3 characters');
	if (!password || password.length < 6) throw error(400, 'Password must be at least 6 characters');

	await adminFetch(`/_users/org.couchdb.user:${encodeURIComponent(username)}`, {
		method: 'PUT',
		body: JSON.stringify({ name: username, password, roles: [], type: 'user' })
	});
	return json({ ok: true });
};
