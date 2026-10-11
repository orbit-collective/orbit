import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.resolve(import.meta.dirname, '..');

// A dedicated Vite config for Storybook. The app's vite.config.js loads
// laravel-vite-plugin, which needs a Laravel project, so it is not reused.
export default defineConfig({
    plugins: [react()],
    // Nothing in the stories reads from Laravel's public/ (and its storage
    // symlink dangles outside the Laravel container), so don't copy it.
    publicDir: false,
    resolve: {
        alias: {
            // The app's server-only dependencies are replaced by mocks, so
            // stories run without a Laravel backend (see .storybook/mocks).
            '@inertiajs/react': path.resolve(
                root,
                '.storybook/mocks/inertia.tsx',
            ),
            axios: path.resolve(root, '.storybook/mocks/axios.ts'),
            '@assets': path.resolve(root, 'resources/js/assets'),
            '@': path.resolve(root, 'resources/js'),
        },
    },
    server: {
        // Docker bind mounts do not deliver file events reliably.
        watch: process.env.STORYBOOK_USE_POLLING
            ? { usePolling: true, interval: 100 }
            : undefined,
    },
});
