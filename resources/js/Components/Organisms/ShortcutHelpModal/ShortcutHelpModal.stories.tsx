import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { useShortcuts } from '@/context/ShortcutContext';
import { ShortcutDefinition } from '@/types/Shortcuts';
import { ShortcutHelpModal } from './ShortcutHelpModal';

const sampleShortcuts: ShortcutDefinition[] = [
    {
        key: '?',
        description: 'Show keyboard shortcuts',
        category: 'Action',
        action: fn(),
    },
    {
        key: 'mod+k',
        description: 'Open command palette',
        category: 'Search',
        action: fn(),
    },
    {
        key: 'g p',
        description: 'Go to Projects',
        category: 'Navigation',
        action: fn(),
    },
    {
        key: 'c',
        description: 'Create issue',
        category: 'Creation',
        scope: 'project',
        action: fn(),
    },
    {
        key: 'e',
        description: 'Edit issue',
        category: 'Action',
        scope: 'issue',
        action: fn(),
    },
];

/** Fills the real shortcut registry the modal reads from. */
const RegisterShortcuts = ({
    shortcuts,
}: {
    shortcuts: ShortcutDefinition[];
}) => {
    const { registerBatch } = useShortcuts();

    useEffect(() => registerBatch(shortcuts), [registerBatch, shortcuts]);

    return null;
};

const meta = {
    title: 'Organisms/ShortcutHelpModal',
    component: ShortcutHelpModal,
    decorators: [
        (Story, context) => (
            <div className="w-[640px] max-w-full rounded-2xl border border-solid border-[var(--border-color)] bg-[var(--surface-color)]">
                <RegisterShortcuts
                    shortcuts={
                        (context.parameters
                            .shortcuts as ShortcutDefinition[]) ??
                        sampleShortcuts
                    }
                />
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof ShortcutHelpModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findByText('Go to Projects')).toBeVisible();
        await expect(canvas.getByText('Create issue')).toBeVisible();
    },
};

export const Searching: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await canvas.findByText('Go to Projects');
        await userEvent.type(canvas.getByRole('textbox'), 'palette');
        await expect(
            await canvas.findByText('Open command palette'),
        ).toBeVisible();
        await expect(canvas.queryByText('Go to Projects')).toBeNull();
    },
};

export const Empty: Story = {
    parameters: { shortcuts: [] },
};
