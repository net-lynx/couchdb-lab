<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { Note, NoteInput } from '../domain/note';

	interface Props {
		onsubmit: (data: NoteInput) => void;
		pending?: boolean;
		initial?: Pick<Note, 'title' | 'body'>;
		submitLabel?: string;
	}

	let { onsubmit, pending = false, initial, submitLabel = 'Add Note' }: Props = $props();

	let title = $state(untrack(() => initial?.title ?? ''));
	let body = $state(untrack(() => initial?.body ?? ''));

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!title.trim()) return;
		onsubmit({ title: title.trim(), body: body.trim() });
		if (!initial) {
			title = '';
			body = '';
		}
	}
</script>

<form onsubmit={handleSubmit} class="flex flex-col gap-3">
	<div class="flex flex-col gap-1">
		<Label for="note-title">Title</Label>
		<Input id="note-title" bind:value={title} placeholder="Note title" required />
	</div>
	<div class="flex flex-col gap-1">
		<Label for="note-body">Body</Label>
		<textarea
			id="note-body"
			bind:value={body}
			placeholder="Note body (optional)"
			rows={3}
			class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
		></textarea>
	</div>
	<Button type="submit" disabled={pending || !title.trim()}>
		{pending ? 'Saving…' : submitLabel}
	</Button>
</form>
