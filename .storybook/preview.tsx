import '../resources/css/global.css';
import type { Preview } from '@storybook/react-vite';
import { ACCENT_COLOR_OPTIONS } from '@/utils/accentColors';
import { withOrbitApp } from './decorators';
import { ThemedDocsContainer } from './docs';

const capitalize = (value: string) =>
    value.charAt(0).toUpperCase() + value.slice(1);

const preview: Preview = {
    // Every story file gets a generated docs page with its props table.
    tags: ['autodocs'],
    decorators: [withOrbitApp],
    initialGlobals: {
        theme: 'dark',
        accent: 'default',
    },
    globalTypes: {
        theme: {
            description: 'Color theme',
            toolbar: {
                title: 'Theme',
                icon: 'circlehollow',
                items: [
                    { value: 'dark', title: 'Dark', icon: 'moon' },
                    { value: 'light', title: 'Light', icon: 'sun' },
                ],
                dynamicTitle: true,
            },
        },
        accent: {
            description: 'Accent color (Preferences > Accent color)',
            toolbar: {
                title: 'Accent',
                icon: 'paintbrush',
                items: ACCENT_COLOR_OPTIONS.map((value) => ({
                    value,
                    title: capitalize(value),
                })),
                dynamicTitle: true,
            },
        },
    },
    parameters: {
        layout: 'padded',
        docs: { container: ThemedDocsContainer },
        // The theme toggle owns the canvas background.
        backgrounds: { disabled: true },
        controls: {
            matchers: { color: /(background|color)$/i, date: /Date$/i },
        },
        options: {
            storySort: {
                order: [
                    'Introduction',
                    'Foundations',
                    'Atoms',
                    'Molecules',
                    'Organisms',
                ],
            },
        },
    },
};

export default preview;
