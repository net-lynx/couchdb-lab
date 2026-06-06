import { describe, expect, it } from 'vitest';
import { applyNoteEdit, createNote, isNote, type Note, type NoteInput } from './note';

describe('createNote', () => {
	it('builds a valid note from input', () => {
		const note = createNote({ title: 'Hello', body: 'World' });
		expect(note.type).toBe('note');
		expect(note.title).toBe('Hello');
		expect(note.body).toBe('World');
		expect(note._id).toMatch(/^note:/);
		expect(() => new Date(note.createdAt).toISOString()).not.toThrow();
	});

	it('trims whitespace', () => {
		const note = createNote({ title: '  spaced  ', body: '  body  ' });
		expect(note.title).toBe('spaced');
		expect(note.body).toBe('body');
	});

	it('defaults body to empty string', () => {
		const note = createNote({ title: 'No body' } as unknown as NoteInput);
		expect(note.body).toBe('');
	});

	it('rejects an empty title', () => {
		expect(() => createNote({ title: '   ', body: 'x' })).toThrow();
	});

	it('generates unique ids', () => {
		const a = createNote({ title: 'a', body: '' });
		const b = createNote({ title: 'b', body: '' });
		expect(a._id).not.toBe(b._id);
	});
});

describe('applyNoteEdit', () => {
	it('updates fields while preserving identity', () => {
		const original = createNote({ title: 'old', body: 'old body' });
		const edited = applyNoteEdit(original, { title: 'new', body: 'new body' });
		expect(edited._id).toBe(original._id);
		expect(edited.createdAt).toBe(original.createdAt);
		expect(edited.title).toBe('new');
		expect(edited.body).toBe('new body');
	});

	it('rejects an empty title', () => {
		const original = createNote({ title: 'old', body: '' });
		expect(() => applyNoteEdit(original, { title: '', body: 'x' })).toThrow();
	});
});

describe('isNote', () => {
	it('accepts a note document', () => {
		expect(isNote({ type: 'note', title: 't' } as Partial<Note>)).toBe(true);
	});

	it('rejects non-note documents', () => {
		expect(isNote({ type: 'other' })).toBe(false);
		expect(isNote(undefined)).toBe(false);
		expect(isNote(null)).toBe(false);
	});
});
