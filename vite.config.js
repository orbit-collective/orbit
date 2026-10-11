/// <reference types="vitest" />

import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        allowedHosts: ['vite'],
        // HMR websocket connects back through the host-mapped port.
        hmr: {
            host: 'localhost',
            port: 5173,
        },
        // Use polling instead of fs.watch to avoid stale watchers in Docker volumes.
        watch: {
            usePolling: true,
            interval: 100,
        },
    },
    resolve: {
        alias: {
            '@': '/resources/js',
            '@assets': path.resolve(__dirname, 'resources/js/assets'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        // Each test file gets its own VM context inside a long-lived worker
        // thread, instead of a fresh process: creating jsdom per file was
        // ~44% of the run. Needs the `performance` polyfill in setup.ts.
        pool: 'vmThreads',
        // Vitest leaves one core free by default; on the 4 vCPU CI runner that
        // is a quarter of the capacity. Locally the default is kept.
        maxWorkers: process.env.CI ? os.availableParallelism() : undefined,
        setupFiles: './resources/js/tests/setup.ts',
        css: true,

        coverage: {
            provider: 'v8',

            reporter: ['text', 'html', 'json-summary', 'lcov'],

            reportsDirectory: './coverage',

            thresholds: {
                statements: 80,
                branches: 75,
                functions: 80,
                lines: 80,
            },
        },
    },
});
