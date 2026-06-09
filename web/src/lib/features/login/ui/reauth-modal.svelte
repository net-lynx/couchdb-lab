<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { authStore } from '$lib/stores/auth.svelte';
	import { toast } from 'svelte-sonner';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let username = $state('');
	let password = $state('');
	let submitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!username || password.length < 6) {
			toast.error('Please enter your username and password (min 6 chars).');
			return;
		}
		submitting = true;
		try {
			await authStore.login({ name: username, password });
			toast.success('Session restored — syncing resumed.');
			username = '';
			password = '';
			open = false;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Login failed');
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/50" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg"
		>
			<Dialog.Title class="mb-1 text-lg font-semibold">Session expired</Dialog.Title>
			<Dialog.Description class="mb-4 text-sm text-muted-foreground">
				Re-enter your credentials to resume syncing. Your local changes are safe.
			</Dialog.Description>

			<form onsubmit={handleSubmit} class="flex flex-col gap-3">
				<div class="flex flex-col gap-1.5">
					<label class="text-sm font-medium" for="reauth-username">Username</label>
					<Input id="reauth-username" bind:value={username} autocomplete="username" />
				</div>
				<div class="flex flex-col gap-1.5">
					<label class="text-sm font-medium" for="reauth-password">Password</label>
					<Input
						id="reauth-password"
						type="password"
						bind:value={password}
						autocomplete="current-password"
						placeholder="Enter your password"
					/>
				</div>
				<div class="mt-1 flex gap-2">
					<Button type="submit" class="flex-1" disabled={submitting}>
						{submitting ? 'Logging in…' : 'Log in'}
					</Button>
					<Dialog.Close>
						<Button type="button" variant="outline">Cancel</Button>
					</Dialog.Close>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
