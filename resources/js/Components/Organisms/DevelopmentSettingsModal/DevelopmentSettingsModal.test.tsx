import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/utils/developmentSettings';
import DevelopmentSettingsModal from './DevelopmentSettingsModal';

const renderModal = (settings = DEFAULT_SETTINGS) => {
    const props = {
        settings,
        onChange: vi.fn(),
        onReset: vi.fn(),
        onClose: vi.fn(),
    };
    render(<DevelopmentSettingsModal {...props} />);

    return props;
};

describe('DevelopmentSettingsModal', () => {
    test('is a labelled dialog and says what the chosen range means', () => {
        renderModal();

        expect(
            screen.getByRole('dialog', {
                name: 'Customize the development view',
            }),
        ).toHaveAttribute('aria-modal', 'true');
        expect(
            screen.getByText('Updated in the last 90 days'),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '90 days' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    test('changes the time range and the most pull requests to read', async () => {
        const { onChange } = renderModal();

        await userEvent.click(screen.getByRole('button', { name: '1 year' }));
        await userEvent.click(screen.getByRole('button', { name: '500' }));

        expect(onChange).toHaveBeenNthCalledWith(1, { range: '365d' });
        expect(onChange).toHaveBeenNthCalledWith(2, { pullRequestLimit: 500 });
    });

    test('changes the weeks of activity and the commits shown', async () => {
        const { onChange } = renderModal();

        await userEvent.click(
            within(
                screen.getByRole('group', { name: 'Weeks of commit activity' }),
            ).getByRole('button', { name: '26' }),
        );
        await userEvent.click(
            within(
                screen.getByRole('group', { name: 'Latest commits shown' }),
            ).getByRole('button', { name: '15' }),
        );

        expect(onChange).toHaveBeenNthCalledWith(1, { activityWeeks: 26 });
        expect(onChange).toHaveBeenNthCalledWith(2, { commitsShown: 15 });
    });

    test('switches sections on and off, keeping the others as they are', async () => {
        const { onChange } = renderModal();

        const toggle = screen.getByRole('switch', { name: 'Branches' });
        expect(toggle).toHaveAttribute('aria-checked', 'true');
        await userEvent.click(toggle);

        expect(onChange).toHaveBeenCalledWith({
            sections: {
                stats: true,
                insights: true,
                branches: false,
                commits: true,
            },
        });
    });

    test('resets, and closes with Done or Escape', async () => {
        const { onReset, onClose } = renderModal();

        await userEvent.click(
            screen.getByRole('button', { name: 'Reset to defaults' }),
        );
        await userEvent.click(screen.getByRole('button', { name: 'Done' }));
        await userEvent.keyboard('{Escape}');

        expect(onReset).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});
