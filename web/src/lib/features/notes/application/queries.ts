import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { applyNoteEdit, createNote, type Note, type NoteInput } from '../domain/note';
import { noteRepository } from '../data/note.pouch';
import type { NoteRepository } from '../data/note.repository';

/** Repository is injectable so tests/stories can pass a fake. */
const repo: NoteRepository = noteRepository;

export const notesKeys = {
	all: ['notes'] as const,
	list: () => [...notesKeys.all, 'list'] as const
};

export const useNotes = () =>
	createQuery(() => ({
		queryKey: notesKeys.list(),
		queryFn: () => repo.list()
	}));

export const useCreateNote = () => {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: (input: NoteInput) => repo.create(createNote(input)),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKeys.all })
	}));
};

export const useUpdateNote = () => {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: ({ note, input }: { note: Note; input: NoteInput }) =>
			repo.update(applyNoteEdit(note, input)),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKeys.all })
	}));
};

export const useDeleteNote = () => {
	const queryClient = useQueryClient();
	return createMutation(() => ({
		mutationFn: (note: Note) => repo.remove(note),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: notesKeys.all })
	}));
};
