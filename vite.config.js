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
        // Use polling instead of fs.watch to avoid stale watchers in Docker
        // volumes. A 100 ms interval kept the container at ~45% of a core
        // while idle; 1 s costs ~5% and HMR still reacts. Set
        // VITE_WATCH_POLLING=false to use native fs events (idle ~0%) on
        // storage where they work, or VITE_WATCH_INTERVAL to tune the poll.
        watch: {
            usePolling: process.env.VITE_WATCH_POLLING !== 'false',
            interval: Number(process.env.VITE_WATCH_INTERVAL) || 1000,
            // Not frontend sources, but thousands of files the poller would
            // otherwise stat on every tick. (node_modules and .git are
            // already ignored by Vite.)
            ignored: [
                '**/vendor/**',
                '**/storage/**',
                '**/backup/**',
                '**/coverage/**',
                '**/coverage-html/**',
                '**/public/build/**',
                '**/database/**',
            ],
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
        // is a quarter of the capacity, so CI uses them all. Locally 6 workers
        // finish the suite in the same time as the default (all cores but
        // one) with ~27% less CPU; override with VITEST_MAX_WORKERS.
        maxWorkers: process.env.CI
            ? os.availableParallelism()
            : Number(process.env.VITEST_MAX_WORKERS) || 6,
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
