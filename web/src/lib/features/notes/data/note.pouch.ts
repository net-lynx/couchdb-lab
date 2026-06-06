import { localDb } from '$lib/db/pouch';
import { isNote, type Note } from '../domain/note';
import type { NoteRepository } from './note.repository';

/**
 * PouchDB-backed implementation of NoteRepository.
 * The only file in the feature that knows PouchDB exists.
 */
export class PouchNoteRepository implements NoteRepository {
	constructor(private readonly db: PouchDB.Database = localDb) {}

	async list(): Promise<Note[]> {
		const result = await this.db.allDocs<Note>({
			include_docs: true,
			descending: true
		});
		return result.rows
			.map((row) => row.doc)
			.filter((doc): doc is PouchDB.Core.ExistingDocument<Note> => isNote(doc));
	}

	async create(note: Note): Promise<void> {
		await this.db.put(note);
	}

	async update(note: Note): Promise<void> {
		await this.db.put(note as PouchDB.Core.PutDocument<Note>);
	}

	async remove(note: Note): Promise<void> {
		await this.db.remove(note._id, note._rev!);
	}
}

/** Default instance wired to the app's local PouchDB. */
export const noteRepository: NoteRepository = new PouchNoteRepository();
