// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PouchDB from 'pouchdb-browser';
import memoryAdapter from 'pouchdb-adapter-memory';
import { createNote } from '../domain/note';
import { PouchNoteRepository } from './note.pouch';

PouchDB.plugin(memoryAdapter);

describe('PouchNoteRepository', () => {
	let db: PouchDB.Database;
	let repo: PouchNoteRepository;

	beforeEach(() => {
		db = new PouchDB(`test-${crypto.randomUUID()}`, { adapter: 'memory' });
		repo = new PouchNoteRepository(db);
	});

	afterEach(async () => {
		await db.destroy();
	});

	it('creates and lists notes', async () => {
		await repo.create(createNote({ title: 'first', body: 'a' }));
		await repo.create(createNote({ title: 'second', body: 'b' }));

		const notes = await repo.list();
		expect(notes).toHaveLength(2);
		expect(notes.map((n) => n.title).sort()).toEqual(['first', 'second']);
	});

	it('ignores non-note documents in the store', async () => {
		await db.put({ _id: 'other:1', type: 'other', foo: 'bar' });
		await repo.create(createNote({ title: 'note', body: '' }));

		const notes = await repo.list();
		expect(notes).toHaveLength(1);
		expect(notes[0].title).toBe('note');
	});

	it('updates an existing note', async () => {
		const note = createNote({ title: 'original', body: '' });
		await repo.create(note);

		const [stored] = await repo.list();
		await repo.update({ ...stored, title: 'updated' });

		const [reloaded] = await repo.list();
		expect(reloaded.title).toBe('updated');
	});

	it('removes a note', async () => {
		const note = createNote({ title: 'doomed', body: '' });
		await repo.create(note);

		const [stored] = await repo.list();
		await repo.remove(stored);

		expect(await repo.list()).toHaveLength(0);
	});
});
