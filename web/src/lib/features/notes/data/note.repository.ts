import type { Note } from '../domain/note';

/**
 * Persistence contract for notes. The application layer depends on this
 * interface — never on a concrete store — so PouchDB can be swapped for
 * REST/IndexedDB/in-memory (tests) without touching queries or UI.
 */
export interface NoteRepository {
	list(): Promise<Note[]>;
	create(note: Note): Promise<void>;
	update(note: Note): Promise<void>;
	remove(note: Note): Promise<void>;
}
