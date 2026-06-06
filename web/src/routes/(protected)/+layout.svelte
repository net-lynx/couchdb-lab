<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { authStore } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	async function logout() {
		await authStore.logout();
		toast.success('Logged out successfully');
		await goto(resolve('/login'));
	}
</script>

<div class="flex min-h-svh flex-col">
	<header class="flex items-center justify-between border-b px-6 py-3">
		<a href={resolve('/home')} class="font-semibold">App</a>
		<div class="flex items-center gap-4">
			<span class="text-muted-foreground text-sm">{authStore.user?.name}</span>
			<Separator orientation="vertical" class="h-4" />
			<a href={resolve('/demo')} class="text-sm hover:underline">RBAC Demo</a>
			{#if authStore.user?.roles.includes('_admin')}
				<Separator orientation="vertical" class="h-4" />
				<a href={resolve('/admin/users')} class="text-sm hover:underline">Admin</a>
				<Separator orientation="vertical" class="h-4" />
				<a href={resolve('/admin/demo')} class="text-sm hover:underline">Demo Setup</a>
			{/if}
			<Separator orientation="vertical" class="h-4" />
			<Button variant="outline" size="sm" onclick={logout}>Logout</Button>
		</div>
	</header>

	<main class="flex-1">
		{@render children()}
	</main>
</div>
