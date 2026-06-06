import { browser } from '$app/environment';
import { useQueryClient } from '@tanstack/svelte-query';
import { notesKeys } from './queries';
import { localDb } from '$lib/db/pouch';

export function useLiveSync() {
	if (!browser) return () => {};

	const queryClient = useQueryClient();

	const changes = localDb.changes({
		live: true,
		since: 'now'
	});

	changes.on('change', () => {
		queryClient.invalidateQueries({ queryKey: notesKeys.all });
	});

	return () => changes.cancel();
}
