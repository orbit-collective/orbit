import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
    stories: [
        '../resources/js/**/*.mdx',
        '../resources/js/**/*.stories.@(ts|tsx)',
    ],
    addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
    framework: {
        name: '@storybook/react-vite',
        options: {
            // Not the app's vite.config.js: that one loads the Laravel plugin,
            // which expects a Laravel project and a running Vite dev server.
            builder: { viteConfigPath: '.storybook/vite.config.ts' },
        },
    },
    core: { disableTelemetry: true },
};

export default config;
