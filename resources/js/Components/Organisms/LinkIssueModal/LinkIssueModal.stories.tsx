import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import LinkIssueModal from './LinkIssueModal';

const meta = {
    title: 'Organisms/LinkIssueModal',
    component: LinkIssueModal,
    parameters: {
        layout: 'fullscreen',
        network: [
            {
                url: /issues\.search/,
                response: {
                    issues: [
                        { id: 11, number: 11, title: 'Fix the login redirect' },
                        { id: 14, number: 14, title: 'Fix the logout flicker' },
                    ],
                },
            },
        ],
    },
    args: {
        projectId: 1,
        pullRequestNumber: 7,
        linked: [],
        busy: false,
        onLink: async () => true,
        onClose: () => {},
    },
} satisfies Meta<typeof LinkIssueModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SearchAndPick: Story = {
    play: async () => {
        const dialog = within(await within(document.body).findByRole('dialog'));
        await userEvent.type(dialog.getByRole('combobox'), 'fix');
        await expect(
            await dialog.findByRole('option', { name: /login redirect/ }),
        ).toBeVisible();
        await userEvent.keyboard('{ArrowDown}');
        await expect(
            dialog.getByRole('option', { name: /logout flicker/ }),
        ).toHaveAttribute('aria-selected', 'true');
    },
};
