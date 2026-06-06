/**
 * Public API of the `notes` feature.
 * Other features/routes import ONLY from here — never reach into
 * domain/data/application/ui directly (enforce via lint no-restricted-imports).
 */

// Domain types
export type { Note, NoteInput } from './domain/note';

// Application (state hooks)
export { useNotes, useCreateNote, useUpdateNote, useDeleteNote, notesKeys } from './application/queries';
export { useLiveSync } from './application/live-sync';

// UI
export { default as NoteForm } from './ui/note-form.svelte';
export { default as NoteList } from './ui/note-list.svelte';

// Data contract (exported for DI/testing; the concrete Pouch impl stays internal)
export type { NoteRepository } from './data/note.repository';
