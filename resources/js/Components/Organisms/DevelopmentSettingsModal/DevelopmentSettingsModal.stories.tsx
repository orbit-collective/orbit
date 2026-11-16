import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { DEFAULT_SETTINGS } from '@/utils/developmentSettings';
import DevelopmentSettingsModal from './DevelopmentSettingsModal';

const meta = {
    title: 'Organisms/DevelopmentSettingsModal',
    component: DevelopmentSettingsModal,
    parameters: { layout: 'fullscreen' },
    args: {
        settings: DEFAULT_SETTINGS,
        onChange: () => {},
        onReset: () => {},
        onClose: () => {},
    },
} satisfies Meta<typeof DevelopmentSettingsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async () => {
        const dialog = within(await within(document.body).findByRole('dialog'));
        await expect(
            dialog.getByRole('button', { name: '90 days' }),
        ).toHaveAttribute('aria-pressed', 'true');
        await userEvent.tab();
    },
};

export const SectionsHidden: Story = {
    args: {
        settings: {
            ...DEFAULT_SETTINGS,
            range: '7d',
            sections: {
                stats: false,
                insights: false,
                branches: true,
                commits: false,
            },
        },
    },
    play: async () => {
        const dialog = within(await within(document.body).findByRole('dialog'));
        await expect(
            dialog.getByRole('switch', { name: 'Statistics' }),
        ).toHaveAttribute('aria-checked', 'false');
    },
};
