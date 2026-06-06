<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import NoteForm from './note-form.svelte';
	import type { Note, NoteInput } from '../domain/note';

	interface Props {
		notes: Note[];
		onupdate: (note: Note, input: NoteInput) => void;
		ondelete: (note: Note) => void;
		pendingId?: string | null;
	}

	let { notes, onupdate, ondelete, pendingId = null }: Props = $props();

	let editingId = $state<string | null>(null);
</script>

{#if notes.length === 0}
	<p class="text-muted-foreground text-sm">No notes yet. Add one above.</p>
{:else}
	<div class="flex flex-col gap-3">
		{#each notes as note (note._id)}
			<Card>
				<CardHeader class="pb-2">
					{#if editingId === note._id}
						<NoteForm
							initial={note}
							submitLabel="Save"
							pending={pendingId === note._id}
							onsubmit={(input) => {
								onupdate(note, input);
								editingId = null;
							}}
						/>
						<Button
							variant="ghost"
							size="sm"
							class="mt-1 w-fit"
							onclick={() => (editingId = null)}
						>
							Cancel
						</Button>
					{:else}
						<div class="flex items-start justify-between gap-2">
							<CardTitle class="text-base">{note.title}</CardTitle>
							<div class="flex shrink-0 gap-1">
								<Button
									variant="outline"
									size="sm"
									onclick={() => (editingId = note._id)}
								>
									Edit
								</Button>
								<Button
									variant="destructive"
									size="sm"
									disabled={pendingId === note._id}
									onclick={() => ondelete(note)}
								>
									Delete
								</Button>
							</div>
						</div>
						{#if note.body}
							<CardContent class="px-0 pt-1 pb-0">
								<p class="text-muted-foreground whitespace-pre-wrap text-sm">{note.body}</p>
							</CardContent>
						{/if}
						<p class="text-muted-foreground mt-1 text-xs">
							{new Date(note.createdAt).toLocaleString()}
						</p>
					{/if}
				</CardHeader>
			</Card>
		{/each}
	</div>
{/if}
