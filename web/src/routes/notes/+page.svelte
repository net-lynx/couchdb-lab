<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import {
		NoteForm,
		NoteList,
		useNotes,
		useCreateNote,
		useUpdateNote,
		useDeleteNote,
		useLiveSync,
		type Note,
		type NoteInput
	} from '$lib/features/notes';
	import { forceSync } from '$lib/db/pouch';
	import { onMount } from 'svelte';

	const notesQuery = useNotes();
	const createMutation = useCreateNote();
	const updateMutation = useUpdateNote();
	const deleteMutation = useDeleteNote();

	let pendingId = $state<string | null>(null);
	let syncing = $state(false);

	async function handleForceSync() {
		syncing = true;
		try {
			await forceSync();
			toast.success('Synced');
		} catch (err) {
			toast.error(`Sync failed: ${(err as Error).message}`);
		} finally {
			syncing = false;
		}
	}

	onMount(() => {
		return useLiveSync();
	});

	function handleCreate(input: NoteInput) {
		createMutation.mutate(input, {
			onSuccess: () => toast.success('Note added'),
			onError: (err: Error) => toast.error(`Failed to add note: ${err.message}`)
		});
	}

	function handleUpdate(note: Note, input: NoteInput) {
		pendingId = note._id;
		updateMutation.mutate({ note, input }, {
			onSuccess: () => {
				toast.success('Note updated');
				pendingId = null;
			},
			onError: (err: Error) => {
				toast.error(`Failed to update: ${err.message}`);
				pendingId = null;
			}
		});
	}

	function handleDelete(note: Note) {
		pendingId = note._id;
		deleteMutation.mutate(note, {
			onSuccess: () => {
				toast.success('Note deleted');
				pendingId = null;
			},
			onError: (err: Error) => {
				toast.error(`Failed to delete: ${err.message}`);
				pendingId = null;
			}
		});
	}
</script>

<div class="container mx-auto max-w-2xl p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Notes</h1>
		<button
			onclick={handleForceSync}
			disabled={syncing}
			class="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
		>
			{syncing ? 'Syncing…' : 'Force Sync'}
		</button>
	</div>
	<p class="mb-6 text-sm text-muted-foreground">
		Offline-first via PouchDB + live sync with CouchDB. Open two tabs to see live sync in action.
	</p>

	<Card class="mb-8">
		<CardHeader>
			<CardTitle>Add Note</CardTitle>
		</CardHeader>
		<CardContent>
			<NoteForm onsubmit={handleCreate} pending={createMutation.isPending} />
		</CardContent>
	</Card>

	{#if notesQuery.isLoading}
		<p class="text-sm text-muted-foreground">Loading…</p>
	{:else if notesQuery.isError}
		<p class="text-sm text-destructive">Error: {notesQuery.error?.message}</p>
	{:else}
		<NoteList
			notes={notesQuery.data ?? []}
			onupdate={handleUpdate}
			ondelete={handleDelete}
			{pendingId}
		/>
	{/if}
</div>
