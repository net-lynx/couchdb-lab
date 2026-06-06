import { z } from 'zod';

/**
 * Domain entity. Knows nothing about PouchDB/persistence.
 * `_id` / `_rev` are storage concerns but kept here so the rest of the
 * app deals with a single Note shape; repositories own how they're filled.
 */
export interface Note {
	_id: string;
	_rev?: string;
	type: 'note';
	title: string;
	body: string;
	createdAt: string;
}

/** Input accepted from the UI when creating/editing a note. */
export const noteInputSchema = z.object({
	title: z.string().trim().min(1, 'Title is required'),
	body: z.string().trim().default('')
});

export type NoteInput = z.infer<typeof noteInputSchema>;

/**
 * Factory: the single place that turns raw input into a valid Note entity.
 * Owns ID generation + invariants so persistence layers stay dumb.
 */
export function createNote(input: NoteInput): Note {
	const data = noteInputSchema.parse(input);
	return {
		_id: `note:${crypto.randomUUID()}`,
		type: 'note',
		title: data.title,
		body: data.body,
		createdAt: new Date().toISOString()
	};
}

/** Apply an edit to an existing note, re-validating the changed fields. */
export function applyNoteEdit(note: Note, input: NoteInput): Note {
	const data = noteInputSchema.parse(input);
	return { ...note, title: data.title, body: data.body };
}

/** Type guard used by repositories to filter mixed document stores. */
export function isNote(doc: unknown): doc is Note {
	return !!doc && typeof doc === 'object' && (doc as { type?: unknown }).type === 'note';
}
