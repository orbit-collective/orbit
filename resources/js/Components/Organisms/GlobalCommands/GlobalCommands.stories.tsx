import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import CommandPalette from '@/Components/Organisms/CommandPalette/CommandPalette';
import { useCommandPalette } from '@/context/CommandContext';
import GlobalCommands from './GlobalCommands';

/** GlobalCommands renders nothing: its effect is the app-wide commands in the palette. */
const Demo = () => {
    const { openPalette } = useCommandPalette();

    return (
        <>
            <GlobalCommands />
            <button
                type="button"
                onClick={() => openPalette()}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-1.5 text-sm text-[var(--text-color)]"
            >
                Open palette
            </button>
            <CommandPalette />
        </>
    );
};

const meta = {
    title: 'Organisms/GlobalCommands',
    component: GlobalCommands,
    render: () => <Demo />,
} satisfies Meta<typeof GlobalCommands>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Open palette' }),
        );
        await waitFor(() =>
            expect(
                within(document.body).getAllByRole('option').length,
            ).toBeGreaterThan(0),
        );
    },
};

/** Signed-out visitors get no app-wide commands. */
export const Guest: Story = {
    parameters: { inertia: { props: { auth: { user: null } } } },
};
