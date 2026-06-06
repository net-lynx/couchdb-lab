import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	optimizeDeps: {
		include: ['pouchdb-browser']
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.{test,spec}.{ts,js}']
	}
});
