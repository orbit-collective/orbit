import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import LinkIssueModal from './LinkIssueModal';

vi.mock('axios');
vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: Record<string, number>) =>
            `/${name}/${Object.values(params).join('/')}`,
    ),
);

const issues = [
    { id: 11, number: 1, title: 'Fix login' },
    { id: 12, number: 2, title: 'Fix logout' },
    { id: 13, number: 3, title: 'Fix signup' },
];

const renderModal = (
    overrides: Partial<Parameters<typeof LinkIssueModal>[0]> = {},
) => {
    const props = {
        projectId: 5,
        pullRequestNumber: 7,
        linked: [{ id: 13, number: 3, title: 'Fix signup' }],
        busy: false,
        onLink: vi.fn().mockResolvedValue(true),
        onClose: vi.fn(),
        ...overrides,
    };

    return { props, ...render(<LinkIssueModal {...props} />) };
};

beforeEach(() => {
    vi.mocked(axios.get).mockReset().mockResolvedValue({ data: { issues } });
});

describe('LinkIssueModal', () => {
    test('is a labelled dialog with the search field focused', () => {
        renderModal();

        expect(
            screen.getByRole('dialog', {
                name: 'Link an issue to pull request #7',
            }),
        ).toHaveAttribute('aria-modal', 'true');
        expect(
            screen.getByRole('combobox', { name: 'Search issues' }),
        ).toHaveFocus();
    });

    test('searches the project after a pause and hides issues that are already linked', async () => {
        renderModal();

        await userEvent.type(screen.getByRole('combobox'), 'fix');

        expect(
            await screen.findByRole('option', { name: /Fix login/ }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('option', { name: /Fix logout/ }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('option', { name: /Fix signup/ }),
        ).not.toBeInTheDocument();
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith(
            '/projects.development.issues.search/5',
            expect.objectContaining({ params: { q: 'fix' } }),
        );
    });

    test('links the clicked result and closes', async () => {
        const { props } = renderModal();

        await userEvent.type(screen.getByRole('combobox'), 'fix');
        await userEvent.click(
            await screen.findByRole('option', { name: /Fix logout/ }),
        );

        expect(props.onLink).toHaveBeenCalledWith(12);
        await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    });

    test('moves through the results with the arrows and links with Enter', async () => {
        const { props } = renderModal();
        const input = screen.getByRole('combobox');

        await userEvent.type(input, 'fix');
        await screen.findByRole('option', { name: /Fix login/ });
        expect(input).toHaveAttribute(
            'aria-activedescendant',
            expect.stringMatching(/-0$/),
        );

        await userEvent.keyboard('{ArrowDown}');
        expect(
            screen.getByRole('option', { name: /Fix logout/ }),
        ).toHaveAttribute('aria-selected', 'true');
        await userEvent.keyboard('{ArrowDown}');
        expect(
            screen.getByRole('option', { name: /Fix login/ }),
        ).toHaveAttribute('aria-selected', 'true');
        await userEvent.keyboard('{ArrowUp}{Enter}');

        expect(props.onLink).toHaveBeenCalledWith(12);
    });

    test('stays open when linking failed', async () => {
        const { props } = renderModal({
            onLink: vi.fn().mockResolvedValue(false),
        });

        await userEvent.type(screen.getByRole('combobox'), 'fix');
        await userEvent.click(
            await screen.findByRole('option', { name: /Fix login/ }),
        );

        expect(props.onLink).toHaveBeenCalled();
        expect(props.onClose).not.toHaveBeenCalled();
    });

    test('does not link while a write is in flight', async () => {
        const { props } = renderModal({ busy: true });

        await userEvent.type(screen.getByRole('combobox'), 'fix');
        await userEvent.click(
            await screen.findByRole('option', { name: /Fix login/ }),
        );

        expect(props.onLink).not.toHaveBeenCalled();
    });

    test('says when nothing matches and clears the list when the query is emptied', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: { issues: [] } });
        renderModal();
        const input = screen.getByRole('combobox');

        await userEvent.type(input, 'zzz');
        expect(
            await screen.findByText(
                'No matching issue that is not linked already.',
            ),
        ).toBeInTheDocument();

        await userEvent.clear(input);
        await waitFor(() =>
            expect(
                screen.queryByText(
                    'No matching issue that is not linked already.',
                ),
            ).not.toBeInTheDocument(),
        );
    });

    test('reports a failed search', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('x'));
        renderModal();

        await userEvent.type(screen.getByRole('combobox'), 'fix');

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Searching failed. Try again.',
        );
    });

    test('closes on Escape', async () => {
        const { props } = renderModal();

        await userEvent.keyboard('{Escape}');

        expect(props.onClose).toHaveBeenCalled();
    });
});
